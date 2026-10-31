export function idOf(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(v);
  return Number.isSafeInteger(n) ? n : String(v);
}

export function num(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function money(v) {
  const n = num(v);
  if (n == null) return null;
  return Number.isInteger(n) ? String(n) : String(n);
}

export function last4(phone) {
  if (!phone) return null;
  const s = String(phone);
  return s.slice(-4);
}

export function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  if (typeof v === 'string' && v.startsWith('{') && v.endsWith('}')) {
    const inner = v.slice(1, -1);
    if (!inner) return [];
    return inner.split(',').map((part) => part.replace(/^"(.*)"$/, '$1'));
  }
  return [v];
}

export function kolkata(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function iso(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}
