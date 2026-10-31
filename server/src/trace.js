import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { recordHash, verifyChain } from './canonical.js';
import { publishLive } from './redisbus.js';
import { idOf } from './util.js';

const tails = new Map();

function enqueue(callId, fn) {
  const key = String(callId);
  const prev = tails.get(key) || Promise.resolve();
  const run = prev.then(fn, fn);
  tails.set(key, run.then(() => {}, () => {}));
  return run;
}

export function traceFile(dir, callId) {
  return path.join(dir, `dtrace_${callId}.jsonl`);
}

export function readTraceFile(dir, callId) {
  const file = traceFile(dir, callId);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split(/\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

export { verifyChain };

export async function insertDecisionTrace(db, event) {
  await db.query(
    `INSERT INTO decision_traces
       (call_id, seq, event_id, event_type, severity, ts, payload, prev_hash, record_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
     ON CONFLICT (event_id) DO NOTHING`,
    [
      event.call_id,
      event.seq,
      event.event_id,
      event.event_type,
      event.severity,
      event.ts,
      JSON.stringify(event.payload || {}),
      event.prev_hash,
      event.record_hash,
    ],
  );
}

export async function publishKafka(config, metrics, event) {
  if (!config.kafkaBrokers) return;
  try {
    const { Kafka } = await import('kafkajs');
    const kafka = new Kafka({
      clientId: 'clinic-api',
      brokers: config.kafkaBrokers.split(',').map((s) => s.trim()).filter(Boolean),
      connectionTimeout: 1000,
      requestTimeout: 1000,
    });
    const producer = kafka.producer({ allowAutoTopicCreation: false });
    await Promise.race([
      (async () => {
        await producer.connect();
        await producer.send({
          topic: 'clinic.trace.events',
          acks: -1,
          messages: [{
            key: String(event.call_id),
            value: JSON.stringify({
              schema_version: 1,
              event_id: event.event_id,
              call_id: String(event.call_id),
              type: 'decision_trace',
              ts: event.ts,
              body: event,
            }),
          }],
        });
        await producer.disconnect();
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('kafka timeout')), 1500)),
    ]);
  } catch (err) {
    metrics.incTraceFailure('clinic.trace.events');
    console.error('trace kafka', err.message);
  }
}

export async function emitTrace(db, config, metrics, redis, input) {
  const call = input.call;
  return enqueue(call.id, async () => {
    const file = traceFile(config.traceDir, call.id);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const existing = readTraceFile(config.traceDir, call.id);
    const last = existing.length ? existing[existing.length - 1] : null;
    const seq = last ? last.seq + 1 : 0;
    const prev = last ? last.record_hash : '0'.repeat(64);
    const envelope = {
      schema_version: 1,
      event_id: crypto.randomUUID(),
      trace_id: `call-${call.id}`,
      call_id: String(call.id),
      clinic_id: idOf(call.clinic_id) || config.clinicId,
      seq,
      ts: new Date().toISOString(),
      event_type: input.event_type,
      severity: input.severity || 'info',
      payload: input.payload || {},
    };
    const stored = { ...envelope, prev_hash: prev, record_hash: recordHash(envelope, prev) };
    fs.appendFileSync(file, `${JSON.stringify(stored)}\n`);
    try {
      await insertDecisionTrace(db, stored);
    } catch (err) {
      console.error('trace insert', err.message);
    }
    try {
      await publishLive(redis, `live:call:${call.id}`, 'trace.appended', stored);
    } catch (err) {
      console.error('trace redis', err.message);
    }
    void publishKafka(config, metrics, stored);
    return stored;
  });
}
