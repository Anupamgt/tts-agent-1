import crypto from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function safeEqualString(a, b) {
  if (a == null || b == null || a === '' || b === '') return false;
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  const len = Math.max(ba.length, bb.length, 1);
  const pa = Buffer.alloc(len);
  const pb = Buffer.alloc(len);
  ba.copy(pa);
  bb.copy(pb);
  return crypto.timingSafeEqual(pa, pb) && ba.length === bb.length;
}

export function hashPin(pin) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pin), salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function verifyPin(pin, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!N || !r || !p) return false;
  const salt = Buffer.from(parts[4], 'base64url');
  const expect = Buffer.from(parts[5], 'base64url');
  const got = crypto.scryptSync(String(pin), salt, expect.length, { N, r, p, maxmem: SCRYPT.maxmem });
  if (got.length !== expect.length) return false;
  return crypto.timingSafeEqual(got, expect);
}

export function parsePinList(s) {
  if (!s || !String(s).trim()) return [];
  return String(s).split(',').map((part) => {
    const p = part.trim();
    const eq = p.indexOf('=');
    const colon = p.indexOf(':');
    const i = eq >= 0 ? eq : colon;
    if (i < 0) return null;
    return { key: p.slice(0, i).trim(), pin: p.slice(i + 1).trim() };
  }).filter((row) => row && row.key && row.pin);
}

function publicStaff(staff) {
  return {
    staff_id: staff.id,
    role: staff.role,
    doctor_id: staff.role === 'doctor' ? staff.doctor_id : null,
    name: staff.name,
  };
}

// DESK_PIN is only the receptionist gate, and only until a hash is stored.
export function decideLogin({ staff, pin, deskPin, columnExists }) {
  if (!staff || staff.active === false) return null;
  if (!columnExists || !staff.pin_hash) {
    if (staff.role !== 'receptionist') return null;
    if (!safeEqualString(pin, deskPin)) return null;
    return publicStaff(staff);
  }
  if (!verifyPin(pin, staff.pin_hash)) return null;
  return publicStaff(staff);
}
