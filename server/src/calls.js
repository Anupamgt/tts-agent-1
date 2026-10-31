import crypto from 'node:crypto';
import { audit, withTransaction } from './db.js';
import { publishLive, syncCallRedis } from './redisbus.js';
import { emitTrace } from './trace.js';
import { idOf, last4 } from './util.js';

const RANK = {
  queued: 1,
  initiated: 2,
  ringing: 3,
  'in-progress': 4,
  'call-disconnected': 5,
  busy: 6,
  'no-answer': 6,
  failed: 6,
  error: 6,
  completed: 7,
};

export async function createCall(deps, personaKey) {
  const persona = (await deps.db.query(
    `SELECT key, phone FROM caller_personas WHERE key = $1`,
    [personaKey],
  )).rows[0];
  if (!persona) return { status: 404, body: { error: 'unknown_persona' } };
  const n = Number((await deps.db.query(
    `SELECT count(DISTINCT patient_id)::int AS n FROM patient_phones WHERE phone = $1`,
    [persona.phone],
  )).rows[0].n);
  const inserted = (await deps.db.query(
    `INSERT INTO calls (clinic_id, direction, from_number, started_at, phase, persona_key)
     VALUES ($1, 'inbound', $2, now(), 'created', $3)
     RETURNING id`,
    [deps.config.clinicId, persona.phone, persona.key],
  )).rows[0];
  const room = `clinic-${inserted.id}`;
  await deps.db.query(`UPDATE calls SET livekit_room = $2 WHERE id = $1`, [inserted.id, room]);
  const call = (await deps.db.query(`SELECT * FROM calls WHERE id = $1`, [inserted.id])).rows[0];
  await syncCallRedis(deps.redis, call);
  const token = crypto.randomBytes(32).toString('base64url');
  await deps.redis.set(`caller:${token}`, String(call.id), 6 * 3600);
  await emitTrace(deps.db, deps.config, deps.metrics, deps.redis, {
    call,
    event_type: 'call_started',
    severity: 'info',
    payload: { persona_key: persona.key, patient_count: n },
  });
  return {
    status: 201,
    body: {
      call_id: String(call.id),
      patient_count: n,
      caller_token: token,
      livekit_room: room,
      livekit_url: deps.config.livekitPublicUrl,
    },
  };
}

export async function setPhase(deps, callId, phase, callerToken) {
  const owned = await deps.redis.get(`caller:${callerToken}`);
  if (!owned || String(owned) !== String(callId)) return { status: 401, body: { error: 'unauthenticated' } };
  if (phase !== 'ai_active' && phase !== 'ended') return { status: 400, body: { error: 'bad_phase' } };
  const call = (await deps.db.query(`SELECT * FROM calls WHERE id = $1`, [callId])).rows[0];
  if (!call) return { status: 404, body: { error: 'unknown_call' } };
  if (phase === 'ai_active') {
    await deps.db.query(
      `UPDATE calls SET phase = 'ai_active' WHERE id = $1 AND phase IN ('created', 'ringing')`,
      [callId],
    );
  } else if (call.phase !== 'ended') {
    await deps.db.query(`UPDATE calls SET phase = 'ended', ended_at = now() WHERE id = $1`, [callId]);
  }
  const fresh = (await deps.db.query(`SELECT * FROM calls WHERE id = $1`, [callId])).rows[0];
  await syncCallRedis(deps.redis, fresh);
  await publishLive(deps.redis, `live:call:${callId}`, 'call.phase', { call_id: String(callId), phase: fresh.phase });
  return { status: 200, body: { call_id: String(callId), phase: fresh.phase } };
}

export function presentCall(row, handoffStatus) {
  return {
    id: idOf(row.id),
    phase: row.phase,
    persona_key: row.persona_key,
    from_last4: last4(row.from_number),
    disposition: row.disposition,
    started_at: row.started_at,
    verified: row.verified,
    verification_mode: row.verification_mode,
    ai_leg_status: row.ai_leg_status,
    livekit_room: row.livekit_room,
    handoff_status: handoffStatus || null,
  };
}

export async function listCalls(db, clinicId, phase) {
  const rows = (await db.query(
    `SELECT id, phase, persona_key, from_number, disposition, started_at, verified
       FROM calls
      WHERE clinic_id = $1 AND ($2::text IS NULL OR phase = $2)
      ORDER BY started_at DESC NULLS LAST
      LIMIT 50`,
    [clinicId, phase || null],
  )).rows;
  return rows.map((row) => ({
    id: idOf(row.id),
    phase: row.phase,
    persona_key: row.persona_key,
    from_last4: last4(row.from_number),
    disposition: row.disposition,
    started_at: row.started_at,
    verified: row.verified,
  }));
}

function executionOf(body) {
  return body?.id || body?.execution_id || body?.run_id || body?.data?.id || null;
}

function statusOf(body) {
  return body?.status || body?.data?.status || null;
}

export async function applyWebhook(deps, body) {
  const execId = executionOf(body);
  const status = statusOf(body);
  if (!execId || !status) return { status: 400, body: { ok: false, error: 'missing_execution' } };
  const existing = (await deps.db.query(
    `SELECT id, phase, status FROM calls WHERE bolna_execution_id = $1`,
    [execId],
  )).rows[0];
  if (existing && (existing.status === status || (RANK[existing.status] || 0) >= (RANK[status] || 0))) {
    return { status: 200, body: { ok: true, duplicate: true, call_id: String(existing.id) } };
  }
  let callId = existing?.id || null;
  const hinted = body.call_id || body.user_data?.call_id;
  if (!callId && hinted) {
    const row = (await deps.db.query(
      `SELECT id, bolna_execution_id FROM calls WHERE id = $1`,
      [hinted],
    )).rows[0];
    if (row && (!row.bolna_execution_id || row.bolna_execution_id === execId)) callId = row.id;
  }
  try {
    if (!callId) {
      const inserted = (await deps.db.query(
        `INSERT INTO calls (clinic_id, direction, bolna_execution_id, status, raw_payload, phase, started_at, ai_leg_status)
         VALUES ($1, 'inbound', $2, $3, $4::jsonb, 'created', now(), $3)
         RETURNING id`,
        [deps.config.clinicId, execId, status, JSON.stringify(body)],
      )).rows[0];
      callId = inserted.id;
      await deps.db.query(`UPDATE calls SET livekit_room = 'clinic-' || id::text WHERE id = $1`, [callId]);
    } else {
      await deps.db.query(
        `UPDATE calls
            SET bolna_execution_id = COALESCE(bolna_execution_id, $2),
                status = $3,
                ai_leg_status = $3,
                raw_payload = $4::jsonb
          WHERE id = $1`,
        [callId, execId, status, JSON.stringify(body)],
      );
    }
  } catch (err) {
    if (err.code === '23505') {
      const row = (await deps.db.query(`SELECT id FROM calls WHERE bolna_execution_id = $1`, [execId])).rows[0];
      return { status: 200, body: { ok: true, duplicate: true, call_id: row ? String(row.id) : null } };
    }
    throw err;
  }
  if (status === 'completed') {
    const phase = (await deps.db.query(`SELECT phase FROM calls WHERE id = $1`, [callId])).rows[0].phase;
    if (['created', 'ringing', 'ai_active'].includes(phase)) {
      await deps.db.query(
        `UPDATE calls SET phase = 'ended', ended_at = now(), ai_leg_status = 'completed' WHERE id = $1`,
        [callId],
      );
    } else if (phase === 'with_staff') {
      await deps.db.query(`UPDATE calls SET ai_leg_status = 'completed' WHERE id = $1`, [callId]);
    }
  }
  const fresh = (await deps.db.query(`SELECT * FROM calls WHERE id = $1`, [callId])).rows[0];
  await syncCallRedis(deps.redis, fresh);
  return { status: 200, body: { ok: true, duplicate: false, call_id: String(callId) } };
}

export async function appendSegment(db, callId, speaker, text) {
  await withTransaction(db, async (tx) => {
    await tx.query(`SELECT id FROM calls WHERE id = $1 FOR UPDATE`, [callId]);
    const seq = (await tx.query(
      `SELECT coalesce(max(seq), 0)::int + 1 AS n FROM transcript_segments WHERE call_id = $1`,
      [callId],
    )).rows[0].n;
    await tx.query(
      `INSERT INTO transcript_segments (call_id, seq, speaker, leg, source, text_body)
       VALUES ($1, $2, $3, 'ai', 'system', $4)`,
      [callId, seq, speaker, text],
    );
  });
}

export async function replayTraces(deps, callId) {
  const { readTraceFile, verifyChain, insertDecisionTrace } = await import('./trace.js');
  const { publishLive } = await import('./redisbus.js');
  const events = readTraceFile(deps.config.traceDir, callId);
  if (!events.length) return { status: 404, body: { ok: false, error: 'no_trace' } };
  const check = verifyChain(events);
  if (!check.ok) return { status: 400, body: { ok: false, ...check } };
  for (const event of events) {
    await insertDecisionTrace(deps.db, event);
    await publishLive(deps.redis, `live:call:${callId}`, 'trace.appended', event);
  }
  await audit(deps.db, {
    clinic_id: deps.config.clinicId,
    actor_type: 'staff',
    action: 'trace.replay',
    entity: 'calls',
    entity_id: idOf(callId),
    call_id: idOf(callId),
    details: { events: events.length },
  });
  return { status: 200, body: { ok: true, events: events.length } };
}
