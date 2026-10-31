import { audit, withTransaction } from '../db.js';
import { toolFailure } from './errors.js';
import { idOf, iso, kolkata, money, num } from '../util.js';

async function loadOpenCall(db, callId) {
  if (callId == null || callId === '') {
    return { error: { status: 404, body: { ok: false, error_code: 'unknown_call', say: 'I cannot find that call.', next: 'stop' }, events: [] } };
  }
  const rows = (await db.query(`SELECT * FROM calls WHERE id = $1`, [callId])).rows;
  if (!rows.length) {
    return { error: { status: 404, body: { ok: false, error_code: 'unknown_call', say: 'I cannot find that call.', next: 'stop' }, events: [] } };
  }
  if (rows[0].phase === 'ended') {
    return { error: { status: 200, body: { ok: false, error_code: 'call_closed', say: 'This call has ended.', next: 'stop' }, events: [] } };
  }
  return { call: rows[0] };
}

function relative(call) {
  return call.caller_is_relative === true || call.caller_is_relative === 't';
}

async function clinicNumbers(db, clinicId) {
  const rows = (await db.query(
    `SELECT hold_seconds, same_day_cutoff_minutes FROM clinic_settings WHERE clinic_id = $1`,
    [clinicId],
  )).rows;
  return rows[0];
}

async function resolveDoctor(db, clinicId, name) {
  const rows = (await db.query(
    `SELECT id, name, appointment_fee_inr, priority_fee_inr
       FROM doctors WHERE clinic_id = $1 AND active`,
    [clinicId],
  )).rows;
  const q = String(name || '').trim().toLowerCase();
  if (!q) return { error: 'missing' };
  const exact = rows.filter((d) => d.name.toLowerCase() === q);
  const hits = exact.length ? exact : rows.filter((d) => d.name.toLowerCase().includes(q));
  if (!hits.length) return { error: 'none' };
  if (hits.length > 1) return { error: 'ambiguous' };
  return { doctor: hits[0] };
}

async function resolvePool(db, clinicId, name) {
  const rows = (await db.query(
    `SELECT id, name FROM doctor_pools WHERE clinic_id = $1 AND lower(name) = lower($2)`,
    [clinicId, name],
  )).rows;
  return rows[0] || null;
}

function feePlan(doctor, args) {
  const appointment = num(doctor.appointment_fee_inr);
  const wantsPriority = args.priority === true || args.priority === 'priority';
  if (wantsPriority && (doctor.priority_fee_inr == null)) {
    return { error: { ok: false, error_code: 'no_priority', say: `${doctor.name} does not offer priority visits.`, next: 'continue' } };
  }
  const priorityFee = wantsPriority ? num(doctor.priority_fee_inr) : null;
  const needs = Boolean((appointment && appointment > 0) || (priorityFee && priorityFee > 0));
  if (needs && !args.fee_consent) {
    const bits = [];
    if (appointment) bits.push(`${money(appointment)} rupee appointment fee`);
    if (priorityFee) bits.push(`${money(priorityFee)} rupee priority fee`);
    return {
      error: {
        ok: false,
        error_code: 'fee_consent',
        say: `${doctor.name}'s visit has a ${bits.join(' and a ')}. Say yes if you want me to book it.`,
        next: 'continue',
      },
    };
  }
  return {
    priority: wantsPriority ? 'priority' : 'routine',
    appointment: needs ? appointment : null,
    priorityFee: wantsPriority ? priorityFee : null,
    consent: needs,
    method: needs ? (args.payment_method === 'upi_link' ? 'upi_link' : 'cash_desk') : null,
    paymentStatus: needs ? 'pending' : 'not_required',
  };
}

async function windowRow(db, windowId) {
  const rows = (await db.query(
    `SELECT w.id, w.starts_at, s.doctor_id, d.name AS doctor_name, d.appointment_fee_inr, d.priority_fee_inr, d.clinic_id
       FROM windows w
       JOIN doctor_sessions s ON s.id = w.session_id
       JOIN doctors d ON d.id = s.doctor_id
      WHERE w.id = $1`,
    [windowId],
  )).rows;
  return rows[0] || null;
}

function doctorSay(found) {
  if (found.error === 'ambiguous') return 'Which doctor do you mean?';
  if (found.error === 'missing') return 'Which doctor, or the general check-up pool?';
  return 'I could not find that doctor.';
}

export async function getAvailableWindows(db, args) {
  try {
    const loaded = await loadOpenCall(db, args.call_id);
    if (loaded.error) return loaded.error;
    const call = loaded.call;
    const cfg = await clinicNumbers(db, call.clinic_id);
    const priority = args.priority === true || args.priority === 'priority';
    const poolName = args.pool_name || args.pool;
    const doctorName = args.doctor_name || args.doctor;
    return await withTransaction(db, async (tx) => {
      await tx.query(`SELECT require_verified_patient($1, $2, true)`, [call.id, call.patient_id]);
      let rows;
      if (poolName) {
        const pool = await resolvePool(tx, call.clinic_id, poolName);
        if (!pool) {
          return { status: 200, body: { ok: false, error_code: 'unknown_pool', say: 'I do not have that pool.', next: 'continue' }, events: [] };
        }
        rows = (await tx.query(
          `SELECT a.window_id, a.doctor_id, d.name AS doctor_name, d.appointment_fee_inr, a.priority_fee_inr,
                  a.shifted_start, a.shifted_end, a.routine_open, a.priority_open
             FROM pool_window_availability a
             JOIN doctors d ON d.id = a.doctor_id
            WHERE a.pool_id = $1
              AND a.shifted_start > now() + make_interval(mins => $2)
              AND (($3::boolean AND a.priority_open > 0) OR (NOT $3::boolean AND a.routine_open > 0))
            ORDER BY a.shifted_start
            LIMIT 16`,
          [pool.id, cfg.same_day_cutoff_minutes, priority],
        )).rows;
      } else {
        const found = await resolveDoctor(tx, call.clinic_id, doctorName);
        if (!found.doctor) {
          return { status: 200, body: { ok: false, error_code: 'unknown_doctor', say: doctorSay(found), next: 'continue' }, events: [] };
        }
        rows = (await tx.query(
          `SELECT a.window_id, a.doctor_id, d.name AS doctor_name, d.appointment_fee_inr, a.priority_fee_inr,
                  a.shifted_start, a.shifted_end, a.routine_open, a.priority_open
             FROM window_availability a
             JOIN doctors d ON d.id = a.doctor_id
            WHERE d.id = $1
              AND a.shifted_start > now() + make_interval(mins => $2)
              AND (($3::boolean AND a.priority_open > 0) OR (NOT $3::boolean AND a.routine_open > 0))
            ORDER BY a.shifted_start
            LIMIT 16`,
          [found.doctor.id, cfg.same_day_cutoff_minutes, priority],
        )).rows;
      }
      const windows = rows.map((row) => ({
        window_id: idOf(row.window_id),
        doctor_name: row.doctor_name,
        appointment_fee_inr: num(row.appointment_fee_inr),
        priority_fee_inr: num(row.priority_fee_inr),
        starts_at: iso(row.shifted_start),
        ends_at: iso(row.shifted_end),
        routine_open: Number(row.routine_open),
        priority_open: Number(row.priority_open),
      }));
      if (!windows.length) {
        return { status: 200, body: { ok: true, say: 'I do not have an open arrival window for that.', data: { windows: [] }, next: 'continue' }, events: [] };
      }
      const first = windows[0];
      const fee = first.appointment_fee_inr ? ` The appointment fee is ${money(first.appointment_fee_inr)} rupees.` : '';
      return {
        status: 200,
        body: {
          ok: true,
          say: `The next open arrival window with ${first.doctor_name} is ${kolkata(first.starts_at)}.${fee}`,
          data: { windows },
          next: 'continue',
        },
        events: [],
      };
    });
  } catch (err) {
    return toolFailure(err);
  }
}

async function place(db, args, { asHold }) {
  const loaded = await loadOpenCall(db, args.call_id);
  if (loaded.error) return loaded.error;
  const call = loaded.call;
  if (!args.window_id) {
    return { status: 200, body: { ok: false, error_code: 'missing_window', say: 'Which arrival window should I use?', next: 'continue' }, events: [] };
  }
  const win = await windowRow(db, args.window_id);
  if (!win) {
    return { status: 200, body: { ok: false, error_code: 'unknown_window', say: 'I could not find that arrival window.', next: 'continue' }, events: [] };
  }
  const poolName = args.pool_name || args.pool;
  const doctorName = args.doctor_name || args.doctor;
  let mode = 'named_doctor';
  let poolId = null;
  let doctor = { id: win.doctor_id, name: win.doctor_name, appointment_fee_inr: win.appointment_fee_inr, priority_fee_inr: win.priority_fee_inr };
  if (poolName) {
    const pool = await resolvePool(db, call.clinic_id, poolName);
    if (!pool) return { status: 200, body: { ok: false, error_code: 'unknown_pool', say: 'I do not have that pool.', next: 'continue' }, events: [] };
    const member = (await db.query(
      `SELECT 1 FROM doctor_pool_members WHERE pool_id = $1 AND doctor_id = $2`,
      [pool.id, win.doctor_id],
    )).rows;
    if (!member.length) {
      return { status: 200, body: { ok: false, error_code: 'booking_rule', say: 'That doctor is not in the pool for this booking.', next: 'continue' }, events: [] };
    }
    mode = 'any_doctor';
    poolId = pool.id;
  } else if (doctorName) {
    const found = await resolveDoctor(db, call.clinic_id, doctorName);
    if (!found.doctor) return { status: 200, body: { ok: false, error_code: 'unknown_doctor', say: doctorSay(found), next: 'continue' }, events: [] };
    if (String(found.doctor.id) !== String(win.doctor_id)) {
      return { status: 200, body: { ok: false, error_code: 'booking_rule', say: 'A named booking stays with that doctor.', next: 'continue' }, events: [] };
    }
    doctor = found.doctor;
  } else {
    return { status: 200, body: { ok: false, error_code: 'missing_doctor', say: 'Tell me the doctor, or say it is a general check-up.', next: 'continue' }, events: [] };
  }
  const fees = feePlan(doctor, args);
  if (fees.error) return { status: 200, body: fees.error, events: [] };
  const cfg = await clinicNumbers(db, call.clinic_id);
  try {
    const saved = await withTransaction(db, async (tx) => {
      await tx.query(`SELECT require_verified_patient($1, $2, true)`, [call.id, call.patient_id]);
      if (!asHold) {
        const holds = (await tx.query(
          `SELECT id, window_id FROM bookings
            WHERE created_by_call_id = $1 AND status = 'held' AND hold_expires_at > now()`,
          [call.id],
        )).rows;
        const same = holds.find((h) => String(h.window_id) === String(args.window_id));
        if (holds.length && !same) {
          return { heldElsewhere: true };
        }
        if (same) {
          const row = (await tx.query(
            `UPDATE bookings
                SET status = 'booked',
                    hold_expires_at = NULL,
                    appointment_fee_inr = $2,
                    priority_fee_inr = $3,
                    priority = $4::booking_priority,
                    fee_consent_at = CASE WHEN $5::boolean THEN now() ELSE fee_consent_at END,
                    payment_method = $6::payment_method,
                    payment_status = $7::payment_status,
                    requested_by_relative = $8,
                    gcal_sync_status = 'not_needed'
              WHERE id = $1
              RETURNING id`,
            [same.id, fees.appointment, fees.priorityFee, fees.priority, fees.consent, fees.method, fees.paymentStatus, relative(call)],
          )).rows[0];
          await audit(tx, {
            clinic_id: idOf(call.clinic_id), actor_type: 'agent', action: 'booking.create',
            entity: 'bookings', entity_id: idOf(row.id), call_id: idOf(call.id), details: { from_hold: true },
          });
          return { id: row.id, converted: true };
        }
      }
      const inserted = (await tx.query(
        `INSERT INTO bookings (
           patient_id, window_id, doctor_id, booking_mode, pool_id, priority,
           priority_fee_inr, appointment_fee_inr, fee_consent_at, payment_method, payment_status,
           status, source, requested_by_relative, hold_expires_at, gcal_sync_status, created_by_call_id
         ) VALUES (
           $1, $2, $3, $4::booking_mode, $5, $6::booking_priority,
           $7, $8, CASE WHEN $9::boolean THEN now() ELSE NULL END, $10::payment_method, $11::payment_status,
           $12::booking_status, 'agent', $13,
           CASE WHEN $12::text = 'held' THEN now() + make_interval(secs => $14) ELSE NULL END,
           'not_needed', $15
         ) RETURNING id, hold_expires_at`,
        [
          call.patient_id, args.window_id, win.doctor_id, mode, poolId, fees.priority,
          fees.priorityFee, fees.appointment, fees.consent, fees.method, fees.paymentStatus,
          asHold ? 'held' : 'booked', relative(call), cfg.hold_seconds, call.id,
        ],
      )).rows[0];
      await audit(tx, {
        clinic_id: idOf(call.clinic_id),
        actor_type: 'agent',
        action: asHold ? 'booking.hold' : 'booking.create',
        entity: 'bookings',
        entity_id: idOf(inserted.id),
        call_id: idOf(call.id),
        details: { booking_mode: mode },
      });
      return inserted;
    });
    if (saved.heldElsewhere) {
      return { status: 200, body: { ok: false, error_code: 'booking_rule', say: 'This call already holds a different window.', next: 'continue' }, events: [] };
    }
    if (asHold) {
      const pay = fees.method === 'upi_link'
        ? ' I have not sent a payment link. You can pay at the desk.'
        : (fees.consent ? ' You can pay at the desk.' : '');
      return {
        status: 200,
        body: {
          ok: true,
          say: `I am holding that window for ${cfg.hold_seconds} seconds.${pay}`,
          data: { booking_id: idOf(saved.id), hold_expires_at: saved.hold_expires_at ? iso(saved.hold_expires_at) : null },
          next: 'continue',
        },
        events: [],
      };
    }
    const when = (await db.query(`SELECT starts_at FROM windows WHERE id = $1`, [args.window_id])).rows[0];
    const feeBit = fees.appointment ? ` You can pay the ${money(fees.appointment)} rupee fee at the desk.` : '';
    return {
      status: 200,
      body: {
        ok: true,
        say: `You are booked with ${doctor.name} for ${kolkata(when.starts_at)}.${feeBit}`,
        data: { booking_id: idOf(saved.id), gcal_sync_status: 'not_needed' },
        next: 'continue',
      },
      events: [],
    };
  } catch (err) {
    return toolFailure(err);
  }
}

export function holdWindow(db, args) {
  return place(db, args, { asHold: true });
}

export function createBooking(db, args) {
  return place(db, args, { asHold: false });
}

async function ownBookings(tx, patientId) {
  return (await tx.query(
    `SELECT b.id, b.window_id, b.doctor_id, b.booking_mode, b.pool_id, b.status, b.priority
       FROM bookings b
       JOIN windows w ON w.id = b.window_id
      WHERE b.patient_id = $1
        AND b.status IN ('held', 'booked')
        AND (b.status <> 'held' OR b.hold_expires_at > now())
        AND w.ends_at > now()
      ORDER BY w.starts_at`,
    [patientId],
  )).rows;
}

export async function rescheduleBooking(db, args) {
  try {
    const loaded = await loadOpenCall(db, args.call_id);
    if (loaded.error) return loaded.error;
    const call = loaded.call;
    if (!args.window_id) {
      return { status: 200, body: { ok: false, error_code: 'missing_window', say: 'Which arrival window should I move it to?', next: 'continue' }, events: [] };
    }
    const target = await windowRow(db, args.window_id);
    if (!target) {
      return { status: 200, body: { ok: false, error_code: 'unknown_window', say: 'I could not find that arrival window.', next: 'continue' }, events: [] };
    }
    return await withTransaction(db, async (tx) => {
      await tx.query(`SELECT require_verified_patient($1, $2, true)`, [call.id, call.patient_id]);
      const rows = await ownBookings(tx, call.patient_id);
      const booking = args.booking_id
        ? rows.find((r) => String(r.id) === String(args.booking_id))
        : (rows.length === 1 ? rows[0] : null);
      if (!booking) {
        const say = rows.length > 1 ? 'You have more than one visit. Tell me which one to move.' : 'I do not see that visit on this file.';
        return { status: 200, body: { ok: false, error_code: 'not_found', say, next: 'continue' }, events: [] };
      }
      if (booking.booking_mode === 'named_doctor' && String(booking.doctor_id) !== String(target.doctor_id)) {
        return { status: 200, body: { ok: false, error_code: 'booking_rule', say: 'A named booking stays with that doctor.', next: 'continue' }, events: [] };
      }
      if (booking.booking_mode === 'any_doctor') {
        const member = (await tx.query(
          `SELECT 1 FROM doctor_pool_members WHERE pool_id = $1 AND doctor_id = $2`,
          [booking.pool_id, target.doctor_id],
        )).rows;
        if (!member.length) {
          return { status: 200, body: { ok: false, error_code: 'booking_rule', say: 'That doctor is not in the pool for this booking.', next: 'continue' }, events: [] };
        }
      }
      await tx.query(
        `UPDATE bookings SET window_id = $2, doctor_id = $3 WHERE id = $1`,
        [booking.id, target.id, target.doctor_id],
      );
      await tx.query(
        `INSERT INTO booking_changes (booking_id, kind, from_window_id, to_window_id, from_doctor_id, to_doctor_id, reason)
         VALUES ($1, 'rescheduled_by_patient', $2, $3, $4, $5, 'agent')`,
        [booking.id, booking.window_id, target.id, booking.doctor_id, target.doctor_id],
      );
      await audit(tx, {
        clinic_id: idOf(call.clinic_id), actor_type: 'agent', action: 'booking.reschedule',
        entity: 'bookings', entity_id: idOf(booking.id), call_id: idOf(call.id), details: {},
      });
      return {
        status: 200,
        body: {
          ok: true,
          say: `I have moved that visit to ${kolkata(target.starts_at)}.`,
          data: { booking_id: idOf(booking.id) },
          next: 'continue',
        },
        events: [],
      };
    });
  } catch (err) {
    return toolFailure(err);
  }
}

export async function cancelBooking(db, args) {
  try {
    const loaded = await loadOpenCall(db, args.call_id);
    if (loaded.error) return loaded.error;
    const call = loaded.call;
    return await withTransaction(db, async (tx) => {
      await tx.query(`SELECT require_verified_patient($1, $2, true)`, [call.id, call.patient_id]);
      const rows = await ownBookings(tx, call.patient_id);
      const booking = args.booking_id
        ? rows.find((r) => String(r.id) === String(args.booking_id))
        : (rows.length === 1 ? rows[0] : null);
      if (!booking) {
        const say = rows.length > 1 ? 'You have more than one visit. Tell me which one to cancel.' : 'I do not see that visit on this file.';
        return { status: 200, body: { ok: false, error_code: 'not_found', say, next: 'continue' }, events: [] };
      }
      await tx.query(
        `UPDATE bookings
            SET status = 'cancelled', hold_expires_at = NULL, cancelled_at = now(), cancel_reason = 'patient_cancelled'
          WHERE id = $1`,
        [booking.id],
      );
      await tx.query(
        `INSERT INTO booking_changes (booking_id, kind, from_window_id, from_doctor_id, reason)
         VALUES ($1, 'cancelled', $2, $3, 'agent')`,
        [booking.id, booking.window_id, booking.doctor_id],
      );
      await audit(tx, {
        clinic_id: idOf(call.clinic_id), actor_type: 'agent', action: 'booking.cancel',
        entity: 'bookings', entity_id: idOf(booking.id), call_id: idOf(call.id), details: {},
      });
      return { status: 200, body: { ok: true, say: 'I have cancelled that visit.', data: { booking_id: idOf(booking.id) }, next: 'continue' }, events: [] };
    });
  } catch (err) {
    return toolFailure(err);
  }
}

export async function getBookingStatus(db, args) {
  try {
    const loaded = await loadOpenCall(db, args.call_id);
    if (loaded.error) return loaded.error;
    const call = loaded.call;
    const rows = await withTransaction(db, async (tx) => {
      await tx.query(`SELECT require_verified_patient($1, $2, true)`, [call.id, call.patient_id]);
      return (await tx.query(
        `SELECT b.id, b.status::text AS status, b.priority::text AS priority, b.payment_status::text AS payment_status,
                d.name AS doctor_name, w.starts_at, w.ends_at
           FROM bookings b
           JOIN windows w ON w.id = b.window_id
           JOIN doctors d ON d.id = b.doctor_id
          WHERE b.patient_id = $1
            AND (b.status IN ('booked', 'arrived', 'in_consult') OR (b.status = 'held' AND b.hold_expires_at > now()))
            AND w.ends_at > now()
          ORDER BY w.starts_at`,
        [call.patient_id],
      )).rows;
    });
    const bookings = rows.map((row) => ({
      booking_id: idOf(row.id),
      status: row.status,
      priority: row.priority,
      payment_status: row.payment_status,
      doctor_name: row.doctor_name,
      starts_at: iso(row.starts_at),
      ends_at: iso(row.ends_at),
    }));
    const say = bookings.length
      ? `You have ${bookings.length} upcoming visit${bookings.length === 1 ? '' : 's'}. The next is with ${bookings[0].doctor_name} at ${kolkata(bookings[0].starts_at)}.`
      : 'You have no upcoming visit.';
    return { status: 200, body: { ok: true, say, data: { bookings }, next: 'continue' }, events: [] };
  } catch (err) {
    return toolFailure(err);
  }
}

export async function getDoctorDelay(db, args) {
  try {
    const loaded = await loadOpenCall(db, args.call_id);
    if (loaded.error) return loaded.error;
    const found = await resolveDoctor(db, loaded.call.clinic_id, args.doctor_name || args.doctor);
    if (!found.doctor) {
      return { status: 200, body: { ok: false, error_code: 'unknown_doctor', say: doctorSay(found), next: 'continue' }, events: [] };
    }
    const rows = (await db.query(
      `SELECT s.est_delay_min, s.est_basis::text AS est_basis
         FROM doctor_sessions s
        WHERE s.doctor_id = $1
          AND s.session_date = (now() AT TIME ZONE 'Asia/Kolkata')::date
          AND s.status IN ('planned', 'started')
          AND s.planned_end > now()
        ORDER BY s.planned_start
        LIMIT 1`,
      [found.doctor.id],
    )).rows;
    if (!rows.length) {
      return {
        status: 200,
        body: { ok: true, say: `I do not have a session for ${found.doctor.name} today.`, data: { est_delay_min: null, est_basis: null }, next: 'continue' },
        events: [],
      };
    }
    const delay = Number(rows[0].est_delay_min || 0);
    const basis = rows[0].est_basis;
    const say = delay > 0
      ? `${found.doctor.name} is running about ${delay} minutes late.`
      : `${found.doctor.name} is on time.`;
    return { status: 200, body: { ok: true, say, data: { est_delay_min: delay, est_basis: basis }, next: 'continue' }, events: [] };
  } catch (err) {
    return toolFailure(err);
  }
}
