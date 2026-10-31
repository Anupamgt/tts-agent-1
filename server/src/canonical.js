import crypto from 'node:crypto';

// Canonical JSON: sorted keys, no spaces, UTF-8 characters left as characters,
// integral numbers written without a fraction, keys starting with _ dropped.
export function canonicalJson(value) {
  return stringify(value);
}

function stringify(value) {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('non-finite number in canonical json');
    if (Number.isInteger(value)) return String(value);
    return JSON.stringify(value);
  }
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stringify).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value)
      .filter((k) => !k.startsWith('_') && value[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stringify(value[k])}`).join(',')}}`;
  }
  throw new Error('unsupported canonical json value');
}

export function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

// record_hash = sha256(prev_hash + canonical_json(envelope without the two hash fields))
export function recordHash(envelope, prevHash) {
  return sha256Hex(String(prevHash) + canonicalJson(envelope));
}

export function verifyChain(events) {
  let prev = '0'.repeat(64);
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.seq !== i) return { ok: false, seq: event.seq, reason: 'seq' };
    if (event.prev_hash !== prev) return { ok: false, seq: event.seq, reason: 'prev_hash' };
    const { prev_hash, record_hash, ...rest } = event;
    const expect = recordHash(rest, prev);
    if (event.record_hash !== expect) return { ok: false, seq: event.seq, reason: 'record_hash' };
    prev = event.record_hash;
  }
  return { ok: true };
}
