import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import fs from 'node:fs';

const repo = process.argv[2];
const db = new PGlite({ extensions: { btree_gist } });
await db.exec(fs.readFileSync(`${repo}/db/schema.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${repo}/db/seed.sql`, 'utf8'));

let pass = 0, fail = 0;
const ok = async (name, sql, params = []) => {
  try { await db.query(sql, params); pass++; console.log('PASS', name); }
  catch (e) { fail++; console.log('FAIL', name, '->', e.message); }
};
const rejects = async (name, sql, params, match) => {
  try { await db.query(sql, params); fail++; console.log('FAIL (no error)', name); }
  catch (e) {
    if (match && !e.message.includes(match)) { fail++; console.log('FAIL (wrong error)', name, '->', e.message); }
    else { pass++; console.log('PASS', name, '->', e.message); }
  }
};
const expect = async (name, sql, want, params = []) => {
  const got = JSON.stringify((await db.query(sql, params)).rows);
  if (got === JSON.stringify(want)) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, 'got', got, 'want', JSON.stringify(want)); }
};

// Test patients P1..P10, looked up by name so ids do not matter.
await db.exec(`INSERT INTO patients (clinic_id, full_name) SELECT 1, 'P' || g FROM generate_series(1, 10) g`);
const ids = Object.fromEntries((await db.query(`SELECT full_name, id FROM patients`)).rows.map(r => [r.full_name, r.id]));
const P = n => ids['P' + n];

// Session 1 = Dr Sharma (windows 1-6), session 2 = Dr Verma (windows 7-12). Doctor 3 = Dr Kaur.
const book = (p, w, d, cols = [], vals = []) =>
  `INSERT INTO bookings (patient_id, window_id, doctor_id, status, source${cols.map(c => ', ' + c).join('')})
   VALUES (${p}, ${w}, ${d}, 'booked', 'agent'${vals.map(v => ', ' + v).join('')})`;
const PRIO = [['priority', 'priority_fee_inr', 'payment_status', 'fee_consent_at'], [`'priority'`, 300, `'pending'`, 'now()']];

// ---- patient IDs (decision 6)
await expect('generated patient IDs carry a valid check digit',
  `SELECT patient_code, luhn_valid(patient_code) AS valid FROM patients WHERE id <= 2 ORDER BY id`,
  [{ patient_code: '1000017', valid: true }, { patient_code: '1000025', valid: true }]);
await expect('one misheard digit fails the check', `SELECT luhn_valid('1000027') AS v`, [{ v: false }]);
await expect('swapped neighbouring digits fail the check', `SELECT luhn_valid('1000071') AS v`, [{ v: false }]);
await expect('non-digit input is simply invalid', `SELECT luhn_valid('AB-12') AS v`, [{ v: false }]);
await ok('clinic-supplied ID kept as it is', `INSERT INTO patients (clinic_id, patient_code, full_name) VALUES (1, 'MC/2024/118', 'Old Card Demo')`);
await expect('digits column used for spoken matching',
  `SELECT patient_code_digits FROM patients WHERE patient_code = 'MC/2024/118'`, [{ patient_code_digits: '2024118' }]);
await rejects('duplicate patient ID rejected',
  `INSERT INTO patients (clinic_id, patient_code, full_name) VALUES (1, '1000017', 'Dup')`, [], 'duplicate');

// ---- capacity with priority places (decision 3)
await ok('window 1 routine 1', book(P(1), 1, 1));
await ok('window 1 routine 2', book(P(2), 1, 1));
await ok('window 1 routine 3', book(P(3), 1, 1));
await rejects('routine 4 blocked: the last place is the priority place', book(P(4), 1, 1), [], 'is full');
await rejects('priority without the caller\'s fee consent rejected',
  book(P(4), 1, 1, PRIO[0].slice(0, 3), PRIO[1].slice(0, 3)), [], 'check constraint');
await rejects('priority without a fee rejected',
  book(P(4), 1, 1, ['priority', 'payment_status', 'fee_consent_at'], [`'priority'`, `'pending'`, 'now()']), [], 'check constraint');
await ok('priority with fee and consent accepted', book(P(4), 1, 1, ...PRIO));
await rejects('second priority in the same window blocked', book(P(5), 1, 1, ...PRIO), [], 'no priority place');
await rejects('routine booking with a fee rejected', book(P(5), 2, 1, ['priority_fee_inr'], [300]), [], 'check constraint');
await ok('staff can book a waived priority visit without call consent',
  `INSERT INTO bookings (patient_id, window_id, doctor_id, status, source, priority, priority_fee_inr, payment_status)
   VALUES (${P(5)}, 5, 1, 'booked', 'console', 'priority', 0, 'waived')`);

// release of unsold priority places
await ok('window 2 routine 1', book(P(6), 2, 1));
await ok('window 2 routine 2', book(P(7), 2, 1));
await ok('window 2 routine 3', book(P(8), 2, 1));
await rejects('window 2 routine 4 blocked before release', book(P(9), 2, 1), [], 'is full');
await ok('release the unsold priority place of window 2', `UPDATE windows SET priority_released = true WHERE id = 2`);
await ok('window 2 routine 4 allowed after release', book(P(9), 2, 1));
await rejects('window 2 now completely full', book(P(10), 2, 1), [], 'full');

// ---- doctor consistency and pools (decision 1)
await rejects('booking doctor must run the window', book(P(10), 3, 2), [], 'does not run window');
await rejects('any-doctor booking needs a pool', book(P(10), 3, 1, ['booking_mode'], [`'any_doctor'`]), [], 'pool');
await ok('pool with Dr Kaur only', `INSERT INTO doctor_pools (clinic_id, name) VALUES (1, 'Paeds')`);
await ok('Dr Kaur joins it', `INSERT INTO doctor_pool_members VALUES (2, 3)`);
await rejects('doctor outside the pool rejected',
  book(P(10), 3, 1, ['booking_mode', 'pool_id'], [`'any_doctor'`, 2]), [], 'not in pool');
await ok('any-doctor booking with Dr Sharma in the general pool',
  book(P(10), 3, 1, ['booking_mode', 'pool_id', 'visit_type'], [`'any_doctor'`, 1, `'general_checkup'`]));
const bid = (await db.query(`SELECT id FROM bookings WHERE patient_id = $1`, [P(10)])).rows[0].id;
await rejects('rollover that forgets to change the doctor rejected',
  `UPDATE bookings SET window_id = 9 WHERE id = $1`, [bid], 'does not run window');
await ok('rollover to Dr Verma at the same time (pool member)',
  `UPDATE bookings SET window_id = 9, doctor_id = 2 WHERE id = $1`, [bid]);
await ok('rollover logged on the visit timeline',
  `INSERT INTO booking_changes (booking_id, kind, from_window_id, to_window_id, from_doctor_id, to_doctor_id, reason, notified_via)
   VALUES ($1, 'doctor_reassigned', 3, 9, 1, 2, 'Dr Sharma running 40 min late', '{sms}')`, [bid]);

// ---- holds and overlap
await ok('expired hold', `INSERT INTO bookings (patient_id, window_id, doctor_id, status, source, hold_expires_at)
  VALUES (${P(1)}, 4, 1, 'held', 'agent', now() - interval '1 minute')`);
await expect('expired hold does not count', `SELECT routine_taken FROM window_availability WHERE window_id = 4`, [{ routine_taken: 0 }]);
await rejects('overlapping windows in one session rejected',
  `INSERT INTO windows (session_id, starts_at, ends_at, capacity)
   SELECT 1, starts_at + interval '10 minutes', ends_at + interval '10 minutes', 4 FROM windows WHERE id = 1`, [], 'conflicting key');

// ---- availability views
await expect('availability: window 1 full; Verma window 7 has 3 routine + 1 priority',
  `SELECT window_id, routine_open, priority_open FROM window_availability WHERE window_id IN (1, 7) ORDER BY window_id`,
  [{ window_id: 1, routine_open: 0, priority_open: 0 }, { window_id: 7, routine_open: 3, priority_open: 1 }]);
await expect('pool view lists both general doctors',
  `SELECT count(DISTINCT doctor_id)::int AS n FROM pool_window_availability WHERE pool_id = 1`, [{ n: 2 }]);
await ok('session for Dr Kaur (no priority fee)',
  `INSERT INTO doctor_sessions (doctor_id, session_date, planned_start, planned_end)
   VALUES (3, current_date, now() + interval '1 day', now() + interval '1 day 3 hours')`);
await ok('window for Dr Kaur with a priority place configured',
  `INSERT INTO windows (session_id, starts_at, ends_at, capacity, priority_places)
   SELECT id, planned_start, planned_start + interval '30 minutes', 4, 1 FROM doctor_sessions WHERE doctor_id = 3`);
await expect('doctor without a priority fee shows no priority places',
  `SELECT priority_open FROM window_availability WHERE doctor_id = 3`, [{ priority_open: 0 }]);

// ---- queue order: priority first, then arrival order
await ok('routine patient arrives first',
  `UPDATE bookings SET status = 'arrived', arrived_at = now() - interval '10 minutes' WHERE patient_id = $1 AND window_id = 1`, [P(1)]);
await ok('priority patient arrives later',
  `UPDATE bookings SET status = 'arrived', arrived_at = now() WHERE patient_id = $1 AND window_id = 1`, [P(4)]);
await expect('priority patient is first in the queue',
  `SELECT patient_id, queue_position::int AS pos FROM session_queue WHERE session_id = 1 ORDER BY pos`,
  [{ patient_id: P(4), pos: 1 }, { patient_id: P(1), pos: 2 }]);

// ---- cancellation frees a place
await ok('cancel a routine booking in window 1',
  `UPDATE bookings SET status = 'cancelled', cancelled_at = now() WHERE patient_id = $1 AND window_id = 1`, [P(2)]);
await expect('the place is free again', `SELECT routine_open FROM window_availability WHERE window_id = 1`, [{ routine_open: 1 }]);

// ---- hybrid next-patient signal and the delay-message cap (decisions 12, 13)
await ok('doctor taps Call next', `INSERT INTO queue_events (session_id, booking_id, kind, source)
  SELECT 1, id, 'call_next', 'doctor' FROM bookings WHERE patient_id = $1 AND window_id = 1`, [P(4)]);
await ok('assistant taps Next', `INSERT INTO queue_events (session_id, kind, source) VALUES (1, 'call_next', 'assistant')`);
await rejects('delay SMS count cannot go negative',
  `UPDATE bookings SET delay_sms_count = -1 WHERE patient_id = $1`, [P(3)], 'check constraint');
await ok('move after the cap: old visit marked rescheduled',
  `UPDATE bookings SET status = 'rescheduled', delay_sms_count = 2 WHERE patient_id = $1 AND window_id = 1`, [P(3)]);
await ok('move after the cap: new visit in a later window',
  `INSERT INTO bookings (patient_id, window_id, doctor_id, status, source, rescheduled_from)
   SELECT patient_id, 6, doctor_id, 'booked', 'system', id FROM bookings WHERE patient_id = $1 AND window_id = 1`, [P(3)]);
await ok('move after the cap: logged', `INSERT INTO booking_changes (booking_id, kind, from_window_id, to_window_id, reason, notified_via)
  SELECT id, 'auto_rescheduled', 1, 6, 'delay message cap reached', '{sms}' FROM bookings WHERE patient_id = $1 AND window_id = 6`, [P(3)]);

// ---- settings
await expect('decided defaults in settings',
  `SELECT delay_sms_cap, after_cap_action FROM clinic_settings`, [{ delay_sms_cap: 2, after_cap_action: 'move_to_next_available' }]);
await rejects('priority places cannot exceed window capacity',
  `UPDATE clinic_settings SET priority_places_per_window = 9`, [], 'check constraint');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
