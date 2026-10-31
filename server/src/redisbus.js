import { EventEmitter } from 'node:events';

const TTL = 6 * 3600;

export function createMemoryRedis() {
  const kv = new Map();
  const hashes = new Map();
  const bus = new EventEmitter();
  bus.setMaxListeners(100);
  function alive(entry) {
    return entry && (!entry.exp || entry.exp > Date.now());
  }
  return {
    kind: 'memory',
    local: bus,
    async hset(key, obj, ttlSec) {
      const prev = hashes.get(key);
      const value = { ...(alive(prev) ? prev.value : {}), ...obj };
      hashes.set(key, { value, exp: ttlSec ? Date.now() + ttlSec * 1000 : null });
    },
    async hgetall(key) {
      const entry = hashes.get(key);
      if (!alive(entry)) return {};
      return { ...entry.value };
    },
    async set(key, value, ttlSec) {
      kv.set(key, { value: String(value), exp: ttlSec ? Date.now() + ttlSec * 1000 : null });
    },
    async get(key) {
      const entry = kv.get(key);
      if (!alive(entry)) return null;
      return entry.value;
    },
    async publish(channel, message) {
      bus.emit(channel, message);
    },
    subscribe(channel, fn) {
      bus.on(channel, fn);
      return () => bus.off(channel, fn);
    },
    async quit() {
      bus.removeAllListeners();
    },
  };
}

export async function createRedis(url) {
  if (!url) return createMemoryRedis();
  let Redis;
  try {
    Redis = (await import('ioredis')).default;
  } catch (err) {
    console.error('redis client missing, using memory', err.message);
    return createMemoryRedis();
  }
  const pub = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  pub.on('error', () => {});
  try {
    await pub.connect();
    await pub.ping();
  } catch (err) {
    console.error('redis unavailable, using memory:', err.message);
    try { pub.disconnect(); } catch { /* ignore */ }
    return createMemoryRedis();
  }
  const mem = createMemoryRedis();
  const sub = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 1000, lazyConnect: true });
  sub.on('error', () => {});
  try {
    await sub.connect();
    await sub.psubscribe('live:*');
    sub.on('pmessage', (_pattern, channel, wrapped) => {
      try {
        const parsed = JSON.parse(wrapped);
        if (parsed.origin === process.pid) return;
        mem.local.emit(channel, parsed.message);
      } catch {
        mem.local.emit(channel, wrapped);
      }
    });
  } catch (err) {
    console.error('redis subscribe failed', err.message);
  }
  return {
    kind: 'redis',
    local: mem.local,
    async hset(key, obj, ttlSec) {
      const flat = [];
      for (const [k, v] of Object.entries(obj)) flat.push(k, v == null ? '' : String(v));
      if (flat.length) await pub.hset(key, ...flat);
      if (ttlSec) await pub.expire(key, ttlSec);
    },
    async hgetall(key) {
      return pub.hgetall(key);
    },
    async set(key, value, ttlSec) {
      if (ttlSec) await pub.set(key, String(value), 'EX', ttlSec);
      else await pub.set(key, String(value));
    },
    get: (key) => pub.get(key),
    async publish(channel, message) {
      mem.local.emit(channel, message);
      try {
        await pub.publish(channel, JSON.stringify({ origin: process.pid, message }));
      } catch (err) {
        console.error('redis publish', err.message);
      }
    },
    subscribe: (channel, fn) => mem.subscribe(channel, fn),
    async quit() {
      mem.local.removeAllListeners();
      try { await sub.quit(); } catch { /* ignore */ }
      try { await pub.quit(); } catch { /* ignore */ }
    },
  };
}

export async function syncCallRedis(redis, call) {
  if (!call) return;
  await redis.hset(`call:${call.id}`, {
    phase: call.phase || '',
    persona: call.persona_key || '',
    from_number: call.from_number || '',
    patient_id: call.patient_id == null ? '' : String(call.patient_id),
    verified: call.verified ? '1' : '0',
    verification_mode: call.verification_mode || '',
    bolna_execution_id: call.bolna_execution_id || '',
    livekit_room: call.livekit_room || '',
  }, TTL);
  if (call.bolna_execution_id) await redis.set(`exec:${call.bolna_execution_id}`, String(call.id), TTL);
}

export async function rebuildRedis(db, redis) {
  const calls = (await db.query(`SELECT * FROM calls WHERE phase <> 'ended'`)).rows;
  for (const call of calls) await syncCallRedis(redis, call);
  const settings = (await db.query(`SELECT staff_on_desk FROM clinic_settings WHERE clinic_id = 1`)).rows[0];
  await redis.set('desk:open', settings?.staff_on_desk ? '1' : '0');
}

export async function publishLive(redis, channel, event, data) {
  await redis.publish(channel, JSON.stringify({ event, data }));
}
