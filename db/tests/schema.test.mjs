// Schema checks for db/schema.sql + db/seed.sql on an in-process Postgres (PGlite).
// Run: node schema.test.mjs /path/to/repo   (needs @electric-sql/pglite installed nearby)
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
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];

// Test patients P1..P12, looked up by name so ids do not matter.
await db.exec(`INSERT INTO patients (clinic_id, full_name) SELECT 1, 'P' || g FROM generate_series(1, 12) g`);
const ids = Object.fromEntries((await db.query(`SELECT full_name, id FROM patients`)).rows.map(r => [r.full_name, r.id]));
const P = n => ids['P' + n];

// Windows: 1-6 Dr Sharma (doctor 1), 7-12 Dr Verma (2), 13-18 Dr Kaur (3, specialist, fees).
const book = (p, w, d, cols = [], vals = []) =>
  `INSERT INTO bookings (patient_id, window_id, doctor_id, status, source${cols.map(c => ', ' + c).join('')})
   VALUES (${p}, ${w}, ${d}, 'booked', 'agent'${vals.map(v => ', ' + v).join('')})`;
const APPT = [['appointment_fee_inr', 'fee_consent_at', 'payment_method', 'payment_status'],
              [200, 'now()', `'upi_link'`, `'pending'`]];
const PRIO = [['priority', 'priority_fee_inr', 'appointment_fee_inr', 'fee_consent_at', 'payment_method', 'payment_status'],
              [`'priority'`, 500, 200, 'now()', `'cash_desk'`, `'pending'`]];

// ---- patient IDs (decision 6)
await expect('generated patient IDs are 7 digits with a valid check digit',
  `SELECT bool_and(patient_code ~ '^[0-9]{7}$' AND luhn_valid(patient_code)) AS ok FROM patients
    WHERE full_name IN ('Asha Demo', 'Rohan Demo') OR full_name LIKE 'P%'`, [{ ok: true }]);
await db.exec(`INSERT INTO patients (clinic_id, full_name) SELECT 1, 'R' || g FROM generate_series(1, 200) g`);
await expect('200 generated IDs are unique and valid',
  `SELECT count(DISTINCT patient_code)::int AS n, bool_and(luhn_valid(patient_code)) AS ok FROM patients WHERE full_name ~ '^R[0-9]+$'`,
  [{ n: 200, ok: true }]);
await expect('generated IDs are not sequential (S-05)',
  `SELECT (count(*) FILTER (WHERE d = 1) < 5) AS random_enough FROM (
     SELECT left(patient_code, 6)::int - lag(left(patient_code, 6)::int) OVER (ORDER BY id) AS d
       FROM patients WHERE full_name ~ '^R[0-9]+$') t`, [{ random_enough: true }]);
const ashaCode = (await one(`SELECT patient_code FROM patients WHERE full_name = 'Asha Demo'`)).patient_code;
await expect('one misheard digit fails the check', `SELECT luhn_valid('1000027') AS v`, [{ v: false }]);
await expect('swapped neighbouring digits fail the check', `SELECT luhn_valid('1000071') AS v`, [{ v: false }]);
await expect('non-digit input is simply invalid', `SELECT luhn_valid('AB-12') AS v`, [{ v: false }]);
await expect('existing clinic IDs kept, matched without punctuation',
  `SELECT patient_code, patient_code_norm FROM patients WHERE full_name = 'Meera Demo'`,
  [{ patient_code: 'HC/2026/0412', patient_code_norm: 'HC20260412' }]);
await expect('card holder and dependant share the institute ID',
  `SELECT full_name, holder_relation FROM patients WHERE holder_code_norm = 'EMP1042' ORDER BY full_name`,
  [{ full_name: 'Kabir Demo', holder_relation: 'child' }, { full_name: 'Meera Demo', holder_relation: 'self' }]);
await rejects('duplicate patient ID rejected',
  `INSERT INTO patients (clinic_id, patient_code, full_name) VALUES (1, $1, 'Dup')`, [ashaCode], 'duplicate');
await rejects('unknown holder relation rejected',
  `INSERT INTO patients (clinic_id, full_name, holder_code, holder_relation) VALUES (1, 'X', 'EMP-1', 'cousin')`, [], 'check constraint');

// ---- general doctor: no fees, no priority
await ok('Sharma window 1 routine 1', book(P(1), 1, 1));
await ok('Sharma window 1 routine 2', book(P(2), 1, 1));
await ok('Sharma window 1 routine 3', book(P(3), 1, 1));
await ok('Sharma window 1 routine 4 (no priority place held back)', book(P(4), 1, 1));
await rejects('Sharma window 1 full', book(P(5), 1, 1), [], 'is full');
await rejects('priority with a general doctor rejected', book(P(5), 2, 1, ...PRIO), [], 'does not offer priority');

// ---- specialist: appointment fee and priority (decision 3)
await rejects('agent booking with Dr Kaur without the appointment fee rejected', book(P(1), 13, 3), [], 'requires an appointment fee');
await rejects('fee without the caller\'s yes rejected',
  book(P(1), 13, 3, ['appointment_fee_inr', 'payment_method', 'payment_status'], [200, `'upi_link'`, `'pending'`]), [], 'check constraint');
await rejects('fee without a way to pay rejected',
  book(P(1), 13, 3, ['appointment_fee_inr', 'fee_consent_at', 'payment_status'], [200, 'now()', `'pending'`]), [], 'check constraint');
await rejects('fee marked not required rejected',
  book(P(1), 13, 3, ['appointment_fee_inr', 'fee_consent_at', 'payment_method'], [200, 'now()', `'upi_link'`]), [], 'check constraint');
await ok('Kaur routine 1 with appointment fee agreed (UPI)', book(P(1), 13, 3, ...APPT));
await ok('Kaur routine 2', book(P(2), 13, 3, ...APPT));
await ok('Kaur routine 3', book(P(3), 13, 3, ...APPT));
await rejects('Kaur routine 4 blocked: last place is the priority place', book(P(4), 13, 3, ...APPT), [], 'is full');
await ok('Kaur priority with both fees agreed (cash at desk)', book(P(4), 13, 3, ...PRIO));
await rejects('second priority in the same window blocked', book(P(5), 13, 3, ...PRIO), [], 'no priority place');
const RECEPTION = `(SELECT id FROM staff_users WHERE role = 'receptionist' LIMIT 1)`;
const ADMIN = `(SELECT id FROM staff_users WHERE role = 'admin' LIMIT 1)`;
await rejects('a waiver without who and why rejected (S-04)',
  `INSERT INTO bookings (patient_id, window_id, doctor_id, status, source, payment_status) VALUES (${P(6)}, 14, 3, 'booked', 'console', 'waived')`, [], 'check constraint');
await rejects('the agent can never waive a fee',
  `INSERT INTO bookings (patient_id, window_id, doctor_id, status, source, payment_status, waived_by, waive_reason)
   VALUES (${P(6)}, 2, 1, 'booked', 'agent', 'waived', ${RECEPTION}, 'caller asked')`, [], 'check constraint');
await ok('staff can book a waived visit, with who and why',
  `INSERT INTO bookings (patient_id, window_id, doctor_id, status, source, payment_status, waived_by, waive_reason)
   VALUES (${P(6)}, 14, 3, 'booked', 'console', 'waived', ${RECEPTION}, 'clinic staff family')`);

// release of unsold priority places (Kaur window 15)
for (const n of [7, 8, 9]) await ok(`Kaur window 15 routine (P${n})`, book(P(n), 15, 3, ...APPT));
await rejects('window 15 routine 4 blocked before release', book(P(10), 15, 3, ...APPT), [], 'is full');
await ok('release the unsold priority place of window 15', `UPDATE windows SET priority_released = true WHERE id = 15`);
await ok('window 15 routine 4 allowed after release', book(P(10), 15, 3, ...APPT));

// ---- payments and refunds
const kb = (await one(`SELECT id FROM bookings WHERE patient_id = $1 AND window_id = 13 AND priority = 'priority'`, [P(4)])).id;
await rejects('UPI payment needs an expiry', `INSERT INTO payments (booking_id, amount_inr, method) VALUES ($1, 700, 'upi_link')`, [kb], 'check constraint');
await ok('UPI link payment created', `INSERT INTO payments (booking_id, amount_inr, method, status, expires_at, link_url)
  VALUES ($1, 700, 'upi_link', 'link_sent', now() + interval '30 minutes', 'https://pay.example/abc')`, [kb]);
const pay = (await one(`SELECT id FROM payments WHERE booking_id = $1`, [kb])).id;
await rejects('paid needs a paid time', `UPDATE payments SET status = 'paid' WHERE id = $1`, [pay], 'check constraint');
await rejects('refund on an unpaid payment rejected',
  `INSERT INTO refunds (payment_id, amount_inr, reason, requested_by) VALUES ($1, 700, 'doctor_unavailable', 'agent')`, [pay], 'is not paid');
await ok('gateway confirms payment', `UPDATE payments SET status = 'paid', paid_at = now(), provider_payment_id = 'pay_demo_1' WHERE id = $1`, [pay]);
await ok('partial refund 350 requested (late cancellation, 50%)',
  `INSERT INTO refunds (payment_id, amount_inr, reason, requested_by, policy_note) VALUES ($1, 350, 'patient_cancelled_late', 'agent', '50% under 24 h')`, [pay]);
await rejects('staff refund request must name the staff member',
  `INSERT INTO refunds (payment_id, amount_inr, reason, requested_by) VALUES ($1, 100, 'staff_goodwill', 'staff')`, [pay], 'check constraint');
await rejects('refunds beyond the amount paid rejected',
  `INSERT INTO refunds (payment_id, amount_inr, reason, requested_by, requested_by_staff_id) VALUES ($1, 400, 'staff_goodwill', 'staff', ${RECEPTION})`, [pay], 'would exceed');
await ok('a rejected refund does not count', `INSERT INTO refunds (payment_id, amount_inr, reason, requested_by, requested_by_staff_id, status)
  VALUES ($1, 700, 'staff_goodwill', 'staff', ${RECEPTION}, 'rejected')`, [pay]);
await ok('remaining 350 can still be requested',
  `INSERT INTO refunds (payment_id, amount_inr, reason, requested_by, requested_by_staff_id) VALUES ($1, 350, 'staff_goodwill', 'staff', ${RECEPTION})`, [pay]);
await rejects('reviving the rejected refund would exceed the amount paid',
  `UPDATE refunds SET status = 'approved', approved_by = ${ADMIN} WHERE payment_id = $1 AND status = 'rejected'`, [pay], 'would exceed');

// refund approval (S-04)
const agentRefund = (await one(`SELECT id FROM refunds WHERE payment_id = $1 AND requested_by = 'agent'`, [pay])).id;
const staffRefund = (await one(`SELECT id FROM refunds WHERE payment_id = $1 AND requested_by = 'staff' AND status = 'requested'`, [pay])).id;
await rejects('approving without an approver rejected', `UPDATE refunds SET status = 'approved' WHERE id = $1`, [agentRefund], 'needs approval');
await rejects('a receptionist cannot approve a refund',
  `UPDATE refunds SET status = 'approved', approved_by = ${RECEPTION} WHERE id = $1`, [agentRefund], 'active admin');
await ok('an admin approves the agent-raised refund',
  `UPDATE refunds SET status = 'approved', approved_by = ${ADMIN} WHERE id = $1`, [agentRefund]);
await expect('approval time recorded automatically', `SELECT approved_at IS NOT NULL AS t FROM refunds WHERE id = $1`, [{ t: true }], [agentRefund]);
await ok('admin raises a refund themselves', `UPDATE refunds SET requested_by_staff_id = ${ADMIN} WHERE id = $1`, [staffRefund]);
await rejects('the requester cannot approve their own refund',
  `UPDATE refunds SET status = 'approved', approved_by = ${ADMIN} WHERE id = $1`, [staffRefund], 'cannot approve it');
await rejects('duplicate gateway payment ID rejected (webhook replay)',
  `INSERT INTO payments (booking_id, amount_inr, method, status, paid_at, provider_payment_id) VALUES ($1, 700, 'cash_desk', 'paid', now(), 'pay_demo_1')`, [kb], 'duplicate');

// ---- messages
await ok('WhatsApp payment link message recorded', `INSERT INTO messages (clinic_id, channel, booking_id, payment_id, template_key, language, to_number, rendered_body)
  VALUES (1, 'whatsapp', $1, $2, 'payment_link', 'en', '+919811111111', 'Hello ...')`, [kb, pay]);
await rejects('template must exist on that channel', `INSERT INTO messages (clinic_id, channel, template_key, language, to_number, rendered_body)
  VALUES (1, 'sms', 'payment_link', 'en', '+919811111111', 'x')`, [], 'foreign key');

// ---- doctor consistency and pools (decision 1)
await rejects('booking doctor must run the window', book(P(11), 3, 2), [], 'does not run window');
await rejects('any-doctor booking needs a pool', book(P(11), 3, 1, ['booking_mode'], [`'any_doctor'`]), [], 'pool');
await ok('pool with Dr Kaur only', `INSERT INTO doctor_pools (clinic_id, name) VALUES (1, 'Paeds')`);
await ok('Dr Kaur joins it', `INSERT INTO doctor_pool_members VALUES (2, 3)`);
await rejects('doctor outside the pool rejected', book(P(11), 3, 1, ['booking_mode', 'pool_id'], [`'any_doctor'`, 2]), [], 'not in pool');
await ok('any-doctor booking with Dr Sharma in the general pool',
  book(P(11), 3, 1, ['booking_mode', 'pool_id', 'visit_type'], [`'any_doctor'`, 1, `'general_checkup'`]));
const bid = (await one(`SELECT id FROM bookings WHERE patient_id = $1`, [P(11)])).id;
await rejects('rollover that forgets to change the doctor rejected', `UPDATE bookings SET window_id = 9 WHERE id = $1`, [bid], 'does not run window');
await ok('rollover to Dr Verma at the same time', `UPDATE bookings SET window_id = 9, doctor_id = 2 WHERE id = $1`, [bid]);
await ok('rollover logged on the visit timeline',
  `INSERT INTO booking_changes (booking_id, kind, from_window_id, to_window_id, from_doctor_id, to_doctor_id, reason, notified_via)
   VALUES ($1, 'doctor_reassigned', 3, 9, 1, 2, 'Dr Sharma running 40 min late', '{sms}')`, [bid]);

// ---- holds and overlap
await ok('expired hold', `INSERT INTO bookings (patient_id, window_id, doctor_id, status, source, hold_expires_at)
  VALUES (${P(12)}, 4, 1, 'held', 'agent', now() - interval '1 minute')`);
await expect('expired hold does not count', `SELECT routine_taken FROM window_availability WHERE window_id = 4`, [{ routine_taken: 0 }]);
await rejects('overlapping windows in one session rejected',
  `INSERT INTO windows (session_id, starts_at, ends_at, capacity)
   SELECT 1, starts_at + interval '10 minutes', ends_at + interval '10 minutes', 4 FROM windows WHERE id = 1`, [], 'conflicting key');

// ---- availability views
await expect('availability: general doctor has no priority places; specialist has one',
  `SELECT window_id, routine_open, priority_open FROM window_availability WHERE window_id IN (7, 16) ORDER BY window_id`,
  [{ window_id: 7, routine_open: 4, priority_open: 0 }, { window_id: 16, routine_open: 3, priority_open: 1 }]);
await expect('pool view lists both general doctors',
  `SELECT count(DISTINCT doctor_id)::int AS n FROM pool_window_availability WHERE pool_id = 1`, [{ n: 2 }]);

// ---- queue order: priority first, then arrival order (Kaur window 13)
await ok('routine patient arrives first',
  `UPDATE bookings SET status = 'arrived', arrived_at = now() - interval '10 minutes' WHERE patient_id = $1 AND window_id = 13`, [P(1)]);
await ok('priority patient arrives later',
  `UPDATE bookings SET status = 'arrived', arrived_at = now() WHERE patient_id = $1 AND window_id = 13`, [P(4)]);
await expect('priority patient is first in the queue',
  `SELECT patient_id, queue_position::int AS pos FROM session_queue WHERE session_id = 3 ORDER BY pos`,
  [{ patient_id: P(4), pos: 1 }, { patient_id: P(1), pos: 2 }]);

// ---- cancellation frees a place
await ok('cancel a routine booking in Sharma window 1',
  `UPDATE bookings SET status = 'cancelled', cancelled_at = now() WHERE patient_id = $1 AND window_id = 1`, [P(2)]);
await expect('the place is free again', `SELECT routine_open FROM window_availability WHERE window_id = 1`, [{ routine_open: 1 }]);

// ---- hybrid next-patient signal and the delay-message cap (decisions 12, 13)
await ok('doctor taps Call next', `INSERT INTO queue_events (session_id, booking_id, kind, source)
  SELECT 3, id, 'call_next', 'doctor' FROM bookings WHERE patient_id = $1 AND window_id = 13`, [P(4)]);
await ok('assistant taps Next', `INSERT INTO queue_events (session_id, kind, source) VALUES (3, 'call_next', 'assistant')`);
await rejects('delay SMS count cannot go negative', `UPDATE bookings SET delay_sms_count = -1 WHERE patient_id = $1`, [P(3)], 'check constraint');
await ok('patient chose to move: old visit marked rescheduled',
  `UPDATE bookings SET status = 'rescheduled', delay_sms_count = 2 WHERE patient_id = $1 AND window_id = 1`, [P(3)]);
await ok('patient chose to move: new visit in a later window',
  `INSERT INTO bookings (patient_id, window_id, doctor_id, status, source, rescheduled_from)
   SELECT patient_id, 6, doctor_id, 'booked', 'agent', id FROM bookings WHERE patient_id = $1 AND window_id = 1`, [P(3)]);
await ok('the move is on the visit timeline', `INSERT INTO booking_changes (booking_id, kind, from_window_id, to_window_id, reason, notified_via)
  SELECT id, 'rescheduled_by_patient', 1, 6, 'chose to move after 2 delay messages', '{call,sms}' FROM bookings WHERE patient_id = $1 AND window_id = 6`, [P(3)]);

// ---- settings
await expect('decided defaults in settings',
  `SELECT delay_sms_cap, after_cap_action, refund_needs_approval FROM clinic_settings`,
  [{ delay_sms_cap: 2, after_cap_action: 'ask_patient', refund_needs_approval: true }]);
await rejects('priority places cannot exceed window capacity', `UPDATE clinic_settings SET priority_places_per_window = 9`, [], 'check constraint');
await rejects('refund share must be a percentage', `UPDATE clinic_settings SET refund_late_cancel_percent = 150`, [], 'check constraint');

// ---- security hardening (docs/security/threat-model.md)
// A future session for Dr Verma (doctor 2) so "upcoming" checks do not depend on the clock.
await ok('future session for abuse-limit tests',
  `INSERT INTO doctor_sessions (doctor_id, session_date, planned_start, planned_end)
   VALUES (2, current_date + 2, now() + interval '2 days', now() + interval '2 days 3 hours')`);
const fs2 = (await one(`SELECT id FROM doctor_sessions WHERE doctor_id = 2 ORDER BY planned_start DESC LIMIT 1`)).id;
await ok('six future windows with room',
  `INSERT INTO windows (session_id, starts_at, ends_at, capacity)
   SELECT $1, now() + interval '2 days' + make_interval(mins => 30 * n), now() + interval '2 days' + make_interval(mins => 30 * n + 30), 10
     FROM generate_series(0, 5) n`, [fs2]);
const fw = (await db.query(`SELECT id FROM windows WHERE session_id = $1 ORDER BY starts_at`, [fs2])).rows.map(r => r.id);
const R = n => ids['R' + n] ?? null;
const rid = Object.fromEntries((await db.query(`SELECT full_name, id FROM patients WHERE full_name LIKE 'R%'`)).rows.map(r => [r.full_name, r.id]));
const call = async (num, exec) => (await one(`INSERT INTO calls (clinic_id, direction, from_number, bolna_execution_id) VALUES (1, 'inbound', $1, $2) RETURNING id`, [num, exec])).id;

// one live hold per call (S-03)
const c1 = await call('+919800011111', 'exec-hold-1');
const hold = (p, w, c) => `INSERT INTO bookings (patient_id, window_id, doctor_id, status, source, hold_expires_at, created_by_call_id)
  VALUES (${p}, ${w}, 2, 'held', 'agent', now() + interval '90 seconds', ${c})`;
await ok('first hold on a call', hold(rid.R1, fw[0], c1));
await rejects('a second live hold on the same call rejected', hold(rid.R2, fw[1], c1), [], 'already holds');

// upcoming visits per patient (S-03)
const bookF = (p, w, c = 'NULL') => `INSERT INTO bookings (patient_id, window_id, doctor_id, status, source, created_by_call_id)
  VALUES (${p}, ${w}, 2, 'booked', 'agent', ${c})`;
await ok('patient R3 upcoming 1', bookF(rid.R3, fw[0]));
await ok('patient R3 upcoming 2', bookF(rid.R3, fw[1]));
await ok('patient R3 upcoming 3', bookF(rid.R3, fw[2]));
await rejects('a 4th upcoming visit by the agent rejected', bookF(rid.R3, fw[3]), [], 'maximum number of upcoming');
await ok('staff can still book a 4th', `INSERT INTO bookings (patient_id, window_id, doctor_id, status, source) VALUES (${rid.R3}, ${fw[3]}, 2, 'booked', 'console')`);

// agent bookings per calling number per day (S-03)
const spam = '+919800099999';
for (let i = 0; i < 4; i++) await ok(`booking ${i + 1} from one number`, bookF(rid['R' + (10 + i)], fw[4], await call(spam, `exec-spam-${i}`)));
await rejects('5th booking from the same number in 24 h rejected', bookF(rid.R14, fw[4], await call(spam, 'exec-spam-4')), [], 'daily booking limit');
await ok('another number is not affected', bookF(rid.R15, fw[4], await call('+919800088888', 'exec-other')));

// numbers (S-08)
await rejects('outbound call to an international number rejected',
  `INSERT INTO outbound_jobs (clinic_id, kind, patient_id, phone, scheduled_for) VALUES (1, 'reminder', ${rid.R1}, '+12025550100', now())`, [], 'check constraint');
await rejects('outbound call to a landline rejected',
  `INSERT INTO outbound_jobs (clinic_id, kind, patient_id, phone, scheduled_for) VALUES (1, 'reminder', ${rid.R1}, '+911123456789', now())`, [], 'check constraint');
await ok('outbound call to an Indian mobile accepted',
  `INSERT INTO outbound_jobs (clinic_id, kind, patient_id, phone, scheduled_for) VALUES (1, 'reminder', ${rid.R1}, '+919811111111', now())`);
await rejects('SMS to an international number rejected', `INSERT INTO messages (clinic_id, channel, template_key, language, to_number, rendered_body)
  VALUES (1, 'sms', 'reminder', 'en', '+447700900123', 'x')`, [], 'check constraint');
await rejects('callback to an international number rejected',
  `INSERT INTO callbacks (clinic_id, phone, priority, reason) VALUES (1, '+12025550100', 'P3', 'x')`, [], 'check constraint');
await ok('callback to an Indian landline accepted, flagged as different from caller',
  `INSERT INTO callbacks (clinic_id, phone, priority, reason, differs_from_caller) VALUES (1, '+911123456789', 'P3', 'x', true)`);

// verification lockout data (S-05)
const c9 = await call('+919800077777', 'exec-verify');
for (let i = 1; i <= 3; i++)
  await ok(`failed verification ${i}`, `INSERT INTO verification_attempts (call_id, attempt_no, method, result) VALUES ($1, ${i}, 'name_dob', 'no_match')`, [c9]);
await expect('failures counted per calling number',
  `SELECT failures FROM verification_failures_24h WHERE scope = 'number' AND key = '+919800077777'`, [{ failures: 3 }]);

// audit log is append-only (S-10)
await ok('audit entry written', `INSERT INTO audit_log (clinic_id, actor_type, action, entity) VALUES (1, 'staff', 'patient.view', 'patients')`);
await rejects('audit entry cannot be edited', `UPDATE audit_log SET action = 'x'`, [], 'append-only');
await rejects('audit entry cannot be deleted', `DELETE FROM audit_log`, [], 'append-only');
await rejects('audit log cannot be truncated', `TRUNCATE audit_log`, [], 'append-only');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
