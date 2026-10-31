import crypto from 'node:crypto';
import { columnExists } from './db.js';
import { decideLogin, hashPin, safeEqualString } from './pins.js';
import { idOf } from './util.js';

const COOKIE = 'desk_session';
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

export function cookies(req) {
  const out = {};
  const raw = req.headers?.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function signSession(staffId, token) {
  const payload = Buffer.from(JSON.stringify({
    staff_id: staffId,
    exp: Date.now() + TWELVE_HOURS,
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', token).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySession(raw, token) {
  if (!raw || !raw.includes('.')) return null;
  const i = raw.lastIndexOf('.');
  const payload = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const expect = crypto.createHmac('sha256', token).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let body;
  try { body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
  catch { return null; }
  if (!body.exp || body.exp < Date.now()) return null;
  return body;
}

export function sessionCookie(staffId, token) {
  return `${COOKIE}=${signSession(staffId, token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`;
}

async function loadStaff(db, staffId, withHash) {
  const sql = withHash
    ? `SELECT id, name, role::text AS role, doctor_id, active, pin_hash
         FROM staff_users WHERE id = $1`
    : `SELECT id, name, role::text AS role, doctor_id, active
         FROM staff_users WHERE id = $1`;
  const rows = (await db.query(sql, [staffId])).rows;
  return rows[0] || null;
}

export async function authenticateDesk(req, db, config) {
  const raw = cookies(req)[COOKIE];
  if (raw) {
    const session = verifySession(raw, config.internalToken);
    if (session) {
      const has = await columnExists(db, 'staff_users', 'pin_hash');
      const staff = await loadStaff(db, session.staff_id, has);
      if (staff?.active) {
        return {
          staff_id: idOf(staff.id),
          role: staff.role,
          doctor_id: staff.role === 'doctor' ? idOf(staff.doctor_id) : null,
          name: staff.name,
          via: 'cookie',
        };
      }
    }
  }
  const header = req.headers?.['x-desk-pin'];
  if (header && safeEqualString(String(header), config.deskPin)) {
    const rows = (await db.query(
      `SELECT id, name, role::text AS role, doctor_id
         FROM staff_users WHERE role = 'receptionist' AND active
        ORDER BY id LIMIT 1`,
    )).rows;
    if (rows[0]) {
      return {
        staff_id: idOf(rows[0].id),
        role: 'receptionist',
        doctor_id: null,
        name: rows[0].name,
        via: 'desk_pin',
      };
    }
  }
  return null;
}

export async function loginStaff(db, config, body) {
  const pin = body?.pin == null ? '' : String(body.pin);
  if (!/^\d+$/.test(String(body?.staff_id ?? '')) || pin.length === 0 || pin.length > 64) return null;
  const has = await columnExists(db, 'staff_users', 'pin_hash');
  const staff = await loadStaff(db, body.staff_id, has);
  if (!staff) {
    hashPin(pin);
    return null;
  }
  const session = decideLogin({
    staff: { ...staff, id: idOf(staff.id), doctor_id: idOf(staff.doctor_id) },
    pin,
    deskPin: config.deskPin,
    columnExists: has,
  });
  return session;
}
