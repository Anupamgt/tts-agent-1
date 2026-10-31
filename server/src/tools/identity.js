import { withTransaction, audit } from '../db.js';
import { namesMatch, normCode } from '../names.js';
import { asArray, idOf } from '../util.js';
import { toolFailure } from './errors.js';

const FAIL_SAY = 'Those details do not match. Please try again.';
const CALLBACK_SAY = 'I could not confirm the file. I can ask the desk to call you back.';
const LOCK_SAY = 'I cannot try again right now. I can ask the desk to call you back.';
const AMBIGUOUS_SAY = 'I need the last four digits of the mobile number on the file.';

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

async function settings(db, clinicId) {
  const rows = (await db.query(
    `SELECT verification_attempts, verification_lockout_failures FROM clinic_settings WHERE clinic_id = $1`,
    [clinicId],
  )).rows;
  return rows[0];
}

async function failureCount(db, callId) {
  const rows = (await db.query(
    `SELECT count(*)::int AS n FROM verification_attempts WHERE call_id = $1 AND result <> 'matched'`,
    [callId],
  )).rows;
  return rows[0].n;
}

async function locked(db, call, limit) {
  if (!call.from_number) return false;
  const rows = (await db.query(
    `SELECT failures FROM verification_failures_24h WHERE scope = 'number' AND key = $1`,
    [call.from_number],
  )).rows;
  return rows.length > 0 && rows[0].failures >= limit;
}

async function nextAttempt(db, callId) {
  const rows = (await db.query(
    `SELECT coalesce(max(attempt_no), 0)::int + 1 AS n FROM verification_attempts WHERE call_id = $1`,
    [callId],
  )).rows;
  return rows[0].n;
}

async function recordAttempt(db, call, method, result, patientId) {
  const n = await nextAttempt(db, call.id);
  await db.query(
    `INSERT INTO verification_attempts (call_id, patient_id, attempt_no, method, result)
     VALUES ($1, $2, $3, $4, $5)`,
    [call.id, patientId, n, method, result],
  );
  return n;
}

function failBody(failures, limit, result) {
  if (failures >= limit) {
    return {
      ok: false,
      error_code: 'verification_failed',
      say: CALLBACK_SAY,
      next: 'handoff',
      data: {},
    };
  }
  if (result === 'ambiguous') {
    return { ok: false, error_code: 'ambiguous', say: AMBIGUOUS_SAY, next: 'verify', data: {} };
  }
  return { ok: false, error_code: 'no_match', say: FAIL_SAY, next: 'verify', data: {} };
}

export async function lookupCaller(db, args) {
  const loaded = await loadOpenCall(db, args.call_id);
  if (loaded.error) return loaded.error;
  const rows = (await db.query(
    `SELECT count(DISTINCT patient_id)::int AS n FROM patient_phones WHERE phone = $1`,
    [loaded.call.from_number],
  )).rows;
  const n = Number(rows[0].n);
  const say = n === 1 ? 'There is 1 file on this number.' : `There are ${n} files on this number.`;
  return { status: 200, body: { ok: true, say, data: { patient_count: n }, next: 'continue' }, events: [] };
}

async function loadPatients(db, clinicId) {
  const rows = (await db.query(
    `SELECT p.id, p.full_name, p.patient_code, p.patient_code_norm, p.holder_code_norm,
            p.date_of_birth::text AS dob,
            coalesce(array_agg(ph.phone) FILTER (WHERE ph.phone IS NOT NULL), '{}') AS phones
       FROM patients p
       LEFT JOIN patient_phones ph ON ph.patient_id = p.id
      WHERE p.clinic_id = $1
      GROUP BY p.id`,
    [clinicId],
  )).rows;
  return rows.map((row) => ({ ...row, phones: asArray(row.phones) }));
}

export async function matchPatient(db, args) {
  try {
    const loaded = await loadOpenCall(db, args.call_id);
    if (loaded.error) return loaded.error;
    const call = loaded.call;
    if (args.caller_is_patient == null) {
      return {
        status: 200,
        body: { ok: false, error_code: 'need_caller_role', say: 'Are you the patient, or calling for someone else?', next: 'verify' },
        events: [],
      };
    }
    const cfg = await settings(db, call.clinic_id);
    const limit = cfg.verification_attempts;
    if (await locked(db, call, cfg.verification_lockout_failures)) {
      return { status: 200, body: { ok: false, error_code: 'locked', say: LOCK_SAY, next: 'handoff' }, events: [] };
    }
    if (await failureCount(db, call.id) >= limit) {
      return { status: 200, body: { ok: false, error_code: 'verification_failed', say: CALLBACK_SAY, next: 'handoff' }, events: [] };
    }
    if (!args.full_name) {
      return { status: 200, body: { ok: false, error_code: 'missing_name', say: 'Please tell me the full name on the file.', next: 'verify' }, events: [] };
    }
    if (!args.patient_code && !args.date_of_birth) {
      return { status: 200, body: { ok: false, error_code: 'missing_id', say: 'Please tell me the id on the card, or the date of birth.', next: 'verify' }, events: [] };
    }

    if (args.patient_code) {
      const compact = String(args.patient_code).replace(/[\s-]/g, '');
      if (/^\d+$/.test(compact)) {
        const valid = (await db.query(`SELECT luhn_valid($1) AS v`, [compact])).rows[0].v;
        if (!valid) {
          await recordAttempt(db, call, 'name_patient_id', 'bad_check_digit', null);
          const failures = await failureCount(db, call.id);
          return {
            status: 200,
            body: failBody(failures, limit, 'bad_check_digit'),
            events: [{ event_type: 'verification', severity: 'info', payload: { method: 'name_patient_id', result: 'bad_check_digit' } }],
          };
        }
      }
    }

    return await withTransaction(db, async (tx) => {
      const people = await loadPatients(tx, call.clinic_id);
      let method = 'name_patient_id';
      let hits = [];
      let attributed = null;
      if (args.patient_code) {
        const code = normCode(args.patient_code);
        const byCode = people.filter((p) => p.patient_code_norm === code);
        const byHolder = people.filter((p) => p.holder_code_norm && p.holder_code_norm === code);
        const pool = byCode.length ? byCode : byHolder;
        method = byCode.length ? 'name_patient_id' : 'name_holder_id';
        hits = pool.filter((p) => namesMatch(args.full_name, p.full_name));
        if (!hits.length && pool.length === 1) attributed = pool[0].id;
        if (!hits.length && !pool.length) {
          method = byHolder.length ? 'name_holder_id' : 'name_patient_id';
        }
        if (hits.length > 1) {
          method = byCode.length ? 'name_patient_id' : 'name_holder_id';
        }
      } else {
        const day = String(args.date_of_birth).slice(0, 10);
        hits = people.filter((p) => p.dob && String(p.dob).slice(0, 10) === day && namesMatch(args.full_name, p.full_name));
        method = 'name_dob';
        if (args.phone_last4) {
          const last = String(args.phone_last4).replace(/\D/g, '').slice(-4);
          hits = hits.filter((p) => p.phones.some((phone) => String(phone).endsWith(last)));
          method = 'phone_last4';
        }
      }

      let result = 'no_match';
      let patient = null;
      if (hits.length === 1) {
        result = 'matched';
        patient = hits[0];
      } else if (hits.length > 1) {
        result = 'ambiguous';
      }

      await recordAttempt(tx, call, method, result, patient ? patient.id : attributed);
      if (result === 'matched') {
        const mode = args.caller_is_patient ? 'full' : 'limited';
        const relative = !args.caller_is_patient;
        await tx.query(
          `UPDATE calls
              SET verified = true, patient_id = $2, verification_mode = $3, caller_is_relative = $4
            WHERE id = $1`,
          [call.id, patient.id, mode, relative],
        );
        await audit(tx, {
          clinic_id: idOf(call.clinic_id),
          actor_type: 'agent',
          action: 'verification.match',
          entity: 'patients',
          entity_id: idOf(patient.id),
          call_id: idOf(call.id),
          details: { method, verification_mode: mode },
        });
        return {
          status: 200,
          body: {
            ok: true,
            say: mode === 'limited' ? 'I have the file for bookings and messages.' : 'I have the file.',
            data: { matched: true, verification_mode: mode },
            next: 'continue',
          },
          events: [{ event_type: 'verification', severity: 'info', payload: { method, result, verification_mode: mode } }],
        };
      }
      const failures = await failureCount(tx, call.id);
      return {
        status: 200,
        body: failBody(failures, limit, result),
        events: [{ event_type: 'verification', severity: 'info', payload: { method, result } }],
      };
    });
  } catch (err) {
    return toolFailure(err);
  }
}

export async function registerPatient(db, args) {
  try {
    const loaded = await loadOpenCall(db, args.call_id);
    if (loaded.error) return loaded.error;
    const call = loaded.call;
    if (call.verified) {
      return { status: 200, body: { ok: false, error_code: 'already_verified', say: 'This call already has a file open.', next: 'continue' }, events: [] };
    }
    const cfg = await settings(db, call.clinic_id);
    if (await failureCount(db, call.id) < cfg.verification_attempts) {
      return { status: 200, body: { ok: false, error_code: 'not_ready', say: 'I need to try the name and the id first.', next: 'verify' }, events: [] };
    }
    if (args.purpose !== 'booking') {
      return { status: 200, body: { ok: false, error_code: 'not_booking', say: 'I can only create a file when you are booking a visit.', next: 'continue' }, events: [] };
    }
    if (!args.full_name) {
      return { status: 200, body: { ok: false, error_code: 'missing_name', say: 'Please tell me the full name for the new file.', next: 'verify' }, events: [] };
    }
    if (!call.from_number) {
      return { status: 200, body: { ok: false, error_code: 'no_phone', say: 'I do not have a phone number for this call.', next: 'handoff' }, events: [] };
    }
    return await withTransaction(db, async (tx) => {
      const created = (await tx.query(
        `INSERT INTO patients (clinic_id, full_name, date_of_birth, file_complete, created_via)
         VALUES ($1, $2, $3, false, 'agent')
         RETURNING id, patient_code`,
        [call.clinic_id, args.full_name, args.date_of_birth || null],
      )).rows[0];
      await tx.query(
        `INSERT INTO patient_phones (patient_id, phone, relation, is_primary) VALUES ($1, $2, 'self', true)`,
        [created.id, call.from_number],
      );
      await tx.query(
        `UPDATE calls
            SET verified = true, patient_id = $2, verification_mode = 'full', caller_is_relative = false
          WHERE id = $1`,
        [call.id, created.id],
      );
      await audit(tx, {
        clinic_id: idOf(call.clinic_id),
        actor_type: 'agent',
        action: 'patient.register',
        entity: 'patients',
        entity_id: idOf(created.id),
        call_id: idOf(call.id),
        details: { file_complete: false },
      });
      return {
        status: 200,
        body: {
          ok: true,
          // Local mode has no SMS sender yet, so the new id is spoken once.
          // A date-of-birth match of an existing file does not return an id.
          say: `I have created the file. The patient ID is ${created.patient_code}. Please keep it for the next call.`,
          data: { patient_code: created.patient_code, file_complete: false },
          next: 'continue',
        },
        events: [{ event_type: 'verification', severity: 'info', payload: { method: 'register', result: 'matched', verification_mode: 'full' } }],
      };
    });
  } catch (err) {
    return toolFailure(err);
  }
}
