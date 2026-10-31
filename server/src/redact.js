const SECRET = /token|secret|password|api_key|pin/;
const PHONE = /phone|mobile|msisdn/;

export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (k.startsWith('_')) continue;
    const lk = k.toLowerCase();
    if (SECRET.test(lk)) {
      out[k] = 'redacted';
      continue;
    }
    if (lk.includes('dob') || lk.includes('date_of_birth') || lk === 'birth_date') {
      out.dob_provided = v != null && v !== '';
      continue;
    }
    if (PHONE.test(lk) && typeof v === 'string') {
      out[k] = v.slice(-4);
      continue;
    }
    out[k] = redact(v);
  }
  return out;
}
