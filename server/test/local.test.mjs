import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { WebSocket } from 'ws';
import { loadConfig } from '../src/config.js';
import { createApi } from '../src/http.js';
import { expireHolds } from '../src/holds.js';
import { createMcpServer } from '../src/mcp.js';
import { createMetrics } from '../src/metrics.js';
import { matchPatient } from '../src/tools/identity.js';
import { createMemoryRedis } from '../src/redisbus.js';
import { seedDevPins } from '../src/seedPins.js';
import { readTraceFile, verifyChain } from '../src/trace.js';
import { loadClinic } from '../support/clinic.js';

test('local api, identity, booking, and hold expiry', { timeout: 180000 }, async () => {
  const traceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clinic-traces-'));
  const db = await loadClinic();
  const redis = createMemoryRedis();
  const metrics = createMetrics();
  const config = loadConfig({
    ADAPTERS: 'local',
    DESK_PIN: '2468',
    INTERNAL_TOKEN: 'test-internal',
    BOLNA_TOOL_TOKEN: 'test-tool',
    BOLNA_WEBHOOK_TOKEN: 'test-webhook',
    SIMULATOR_ENABLED: '1',
    STAFF_DEV_PINS: 'Front desk=4242,Dr Demo Kaur=4343',
    PUBLIC_BASE_URL: 'http://127.0.0.1:8000',
    KAFKA_BOOTSTRAP_SERVERS: '',
    TRACE_DIR: traceDir,
    TRUST_PRIVATE_PEERS: '0',
    REDIS_URL: '',
    CLINIC_ID: '1',
  });
  await seedDevPins(db, config);
  const deps = { config, db, redis, metrics };
  const server = createApi(deps);
  const mcp = createMcpServer({ name: 'identity', db, config });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  await new Promise((resolve) => mcp.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const mcpBase = `http://127.0.0.1:${mcp.address().port}`;

  async function api(urlPath, { method = 'GET', body, token, cookie, pin } = {}) {
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers.authorization = `Bearer ${token}`;
    if (cookie) headers.cookie = cookie;
    if (pin) headers['x-desk-pin'] = pin;
    const res = await fetch(base + urlPath, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* metrics */ }
    return { status: res.status, json, text, cookie: res.headers.get('set-cookie') };
  }
  const tool = (name, args, token = 'test-tool') => api(`/v1/tools/${name}`, { method: 'POST', body: args, token });
  const patient = async (name) => (await db.query(
    `SELECT id, patient_code FROM patients WHERE full_name = $1`,
    [name],
  )).rows[0];
  const staff = async (name) => (await db.query(
    `SELECT id, doctor_id, role::text AS role FROM staff_users WHERE name = $1`,
    [name],
  )).rows[0];
  async function openPersona(key) {
    const res = await api('/api/calls', { method: 'POST', body: { persona_key: key } });
    assert.equal(res.status, 201, res.text);
    return res.json;
  }
  async function windowsFor(doctorId, { capacity = 4, priority = 0, count = 2, days = 7 } = {}) {
    const session = (await db.query(
      `INSERT INTO doctor_sessions (doctor_id, session_date, planned_start, planned_end)
       VALUES ($1, (now() AT TIME ZONE 'Asia/Kolkata')::date + $2::int,
               now() + make_interval(days => $2::int),
               now() + make_interval(days => $2::int, hours => 3))
       RETURNING id`,
      [doctorId, days],
    )).rows[0];
    const ids = [];
    for (let i = 0; i < count; i++) {
      const row = (await db.query(
        `INSERT INTO windows (session_id, starts_at, ends_at, capacity, priority_places)
         VALUES ($1,
                 now() + make_interval(days => $2::int, mins => $3::int),
                 now() + make_interval(days => $2::int, mins => $4::int),
                 $5, $6)
         RETURNING id`,
        [session.id, days, i * 30, i * 30 + 30, capacity, priority],
      )).rows[0];
      ids.push(row.id);
    }
    return ids;
  }

  try {
    const health = await api('/healthz');
    assert.deepEqual(health.json, { ok: true });
    const metricsText = await api('/metrics');
    assert.match(metricsText.text, /clinic_active_calls/);
    assert.match(metricsText.text, /clinic_tool_duration_seconds/);
    assert.match(metricsText.text, /clinic_tool_calls_total/);
    assert.match(metricsText.text, /clinic_handoff_wait_seconds/);
    assert.match(metricsText.text, /clinic_data_access_violations_total/);
    assert.match(metricsText.text, /clinic_trace_publish_failures_total/);
    assert.match(metricsText.text, /clinic_verification_attempts_total/);

    const front = await staff('Front desk');
    const kaurStaff = await staff('Dr Demo Kaur');
    const login = await api('/api/desk/login', { method: 'POST', body: { staff_id: String(front.id), pin: '4242' } });
    assert.equal(login.status, 200);
    assert.equal(login.json.role, 'receptionist');
    assert.equal(login.json.doctor_id, null);
    assert.match(login.cookie, /HttpOnly/);
    const cookie = login.cookie.split(';')[0];
    const missing = await api('/api/not-a-route', { cookie });
    assert.equal(missing.status, 404);
    assert.equal(missing.json.authenticated, true);
    assert.equal(missing.json.role, 'receptionist');
    const anon = await api('/api/not-a-route');
    assert.equal(anon.status, 401);
    assert.equal(anon.json.authenticated, undefined);
    const doctor = await api('/api/desk/login', { method: 'POST', body: { staff_id: String(kaurStaff.id), pin: '4343' } });
    assert.equal(doctor.status, 200);
    assert.equal(doctor.json.role, 'doctor');
    assert.equal(Number(doctor.json.doctor_id), Number(kaurStaff.doctor_id));
    const doctorPin = doctor.cookie.split(';')[0];
    const doctorMissing = await api('/api/not-a-route', { cookie: doctorPin });
    assert.equal(doctorMissing.json.role, 'doctor');
    assert.equal((await api('/api/desk/login', { method: 'POST', body: { staff_id: String(kaurStaff.id), pin: '2468' } })).status, 401);
    assert.equal((await api('/api/desk/login', { method: 'POST', body: { staff_id: String(front.id), pin: '2468' } })).status, 401);
    const headerGate = await api('/api/not-a-route', { pin: '2468' });
    assert.equal(headerGate.json.role, 'receptionist');

    const family = await openPersona('family');
    assert.equal(family.patient_count, 2);
    assert.equal(family.livekit_token, undefined);
    assert.doesNotMatch(JSON.stringify(family), /Asha|Rohan|Meera|Kabir/);
    const looked = await tool('lookup_caller', { call_id: family.call_id });
    assert.equal(looked.status, 200);
    assert.equal(looked.json.data.patient_count, 2);
    assert.doesNotMatch(JSON.stringify(looked.json), /Asha|Rohan|Meera|Kabir/);
    assert.equal((await api('/v1/tools/lookup_caller', { method: 'POST', body: { call_id: family.call_id } })).status, 401);
    assert.equal((await tool('not_a_tool', { call_id: family.call_id })).status, 404);
    const unbuilt = await tool('request_human', { call_id: family.call_id, reason: 'fee' });
    assert.equal(unbuilt.status, 200);
    assert.equal(unbuilt.json.error_code, 'not_built');

    const mcpDenied = await fetch(`${mcpBase}/tools/lookup_caller`, {
      method: 'POST',
      headers: { authorization: 'Bearer nope', 'content-type': 'application/json' },
      body: JSON.stringify({ call_id: family.call_id }),
    });
    assert.equal(mcpDenied.status, 401);
    const mcpOk = await fetch(`${mcpBase}/tools/lookup_caller`, {
      method: 'POST',
      headers: { authorization: 'Bearer test-internal', 'content-type': 'application/json' },
      body: JSON.stringify({ call_id: family.call_id }),
    });
    assert.equal(mcpOk.status, 200);
    assert.equal((await mcpOk.json()).data.patient_count, 2);

    const meera = await patient('Meera Demo');
    const asha = await patient('Asha Demo');
    const rohan = await patient('Rohan Demo');
    const kabir = await patient('Kabir Demo');
    const sharma = (await db.query(`SELECT id FROM doctors WHERE name = 'Dr Demo Sharma'`)).rows[0];
    const kaur = (await db.query(`SELECT id FROM doctors WHERE name = 'Dr Demo Kaur'`)).rows[0];

    let patientReads = 0;
    const spy = {
      query(sql, params) {
        if (/\bfrom\s+patients\b/i.test(sql)) patientReads += 1;
        return db.query(sql, params);
      },
      transaction(fn) {
        return db.transaction(async (tx) => fn({
          query(sql, params) {
            if (/\bfrom\s+patients\b/i.test(sql)) patientReads += 1;
            return tx.query(sql, params);
          },
        }));
      },
    };
    const badCode = `${asha.patient_code.slice(0, -1)}${(Number(asha.patient_code.slice(-1)) + 1) % 10}`;
    const luhn = await db.query(`SELECT luhn_valid($1) AS v`, [badCode]);
    assert.equal(luhn.rows[0].v, false);
    const badCall = await openPersona('family');
    patientReads = 0;
    const bad = await matchPatient(spy, {
      call_id: badCall.call_id,
      full_name: 'Asha Demo',
      patient_code: badCode,
      caller_is_patient: true,
    });
    assert.equal(bad.body.ok, false);
    assert.equal(patientReads, 0);
    const attempt = (await db.query(
      `SELECT result, patient_id FROM verification_attempts WHERE call_id = $1`,
      [badCall.call_id],
    )).rows[0];
    assert.equal(attempt.result, 'bad_check_digit');
    assert.equal(attempt.patient_id, null);

    const wrong = await openPersona('meera');
    const wrongMatch = await tool('match_patient', {
      call_id: wrong.call_id, full_name: 'Totally Different', patient_code: meera.patient_code, caller_is_patient: true,
    });
    assert.equal(wrongMatch.json.ok, false);
    assert.doesNotMatch(JSON.stringify(wrongMatch.json), /Meera/);
    const attributed = (await db.query(
      `SELECT patient_id FROM verification_attempts WHERE call_id = $1`,
      [wrong.call_id],
    )).rows[0];
    assert.equal(Number(attributed.patient_id), Number(meera.id));

    const meeraCall = await openPersona('meera');
    const matched = await tool('match_patient', {
      call_id: meeraCall.call_id, full_name: 'Meera Demoo', patient_code: meera.patient_code, caller_is_patient: true,
    });
    assert.equal(matched.json.ok, true, JSON.stringify(matched.json));
    assert.equal(matched.json.data.verification_mode, 'full');
    assert.equal(matched.json.data.patient_id, undefined);
    const meeraRow = (await db.query(`SELECT verified, verification_mode, caller_is_relative, patient_id FROM calls WHERE id = $1`, [meeraCall.call_id])).rows[0];
    assert.equal(meeraRow.verified, true);
    assert.equal(meeraRow.verification_mode, 'full');
    assert.equal(meeraRow.caller_is_relative, false);
    assert.equal(Number(meeraRow.patient_id), Number(meera.id));

    const report = await tool('get_report_status', { call_id: meeraCall.call_id });
    assert.equal(report.json.ok, true);
    assert.deepEqual(report.json.data.reports, [{ label: 'Blood test', status: 'ready_for_pickup' }]);
    assert.equal(Object.keys(report.json.data.reports[0]).join(','), 'label,status');
    const history = await tool('get_previous_interactions', { call_id: meeraCall.call_id });
    assert.equal(history.json.data.interactions.length, 2);
    assert.doesNotMatch(JSON.stringify(history.json), /Kabir|pending/);

    const kaurWindows = await windowsFor(kaur.id, { count: 2, days: 9 });
    const noFee = await tool('hold_window', {
      call_id: meeraCall.call_id, window_id: kaurWindows[0], doctor_name: 'Dr Demo Kaur',
    });
    assert.equal(noFee.status, 200);
    assert.equal(noFee.json.ok, false);
    assert.match(noFee.json.say, /200/);
    const none = (await db.query(`SELECT count(*)::int AS n FROM bookings WHERE created_by_call_id = $1`, [meeraCall.call_id])).rows[0].n;
    assert.equal(none, 0);
    const held = await tool('hold_window', {
      call_id: meeraCall.call_id, window_id: kaurWindows[0], doctor_name: 'Dr Demo Kaur', fee_consent: true,
    });
    assert.equal(held.json.ok, true, JSON.stringify(held.json));
    const again = await tool('hold_window', {
      call_id: meeraCall.call_id, window_id: kaurWindows[0], doctor_name: 'Dr Demo Kaur', fee_consent: true,
    });
    assert.equal(again.json.ok, true);
    const holdRows = (await db.query(
      `SELECT count(*)::int AS n FROM bookings WHERE created_by_call_id = $1 AND status = 'held'`,
      [meeraCall.call_id],
    )).rows[0].n;
    assert.equal(holdRows, 1);
    const otherHold = await tool('hold_window', {
      call_id: meeraCall.call_id, window_id: kaurWindows[1], doctor_name: 'Dr Demo Kaur', fee_consent: true,
    });
    assert.equal(otherHold.json.ok, false);
    assert.match(otherHold.json.say, /hold/i);
    const booked = await tool('create_booking', {
      call_id: meeraCall.call_id, window_id: kaurWindows[0], doctor_name: 'Dr Demo Kaur', fee_consent: true,
    });
    assert.equal(booked.json.ok, true, JSON.stringify(booked.json));
    const booking = (await db.query(
      `SELECT status::text AS status, gcal_sync_status, appointment_fee_inr, payment_status::text AS payment_status,
              requested_by_relative, fee_consent_at
         FROM bookings WHERE id = $1`,
      [booked.json.data.booking_id],
    )).rows[0];
    assert.equal(booking.status, 'booked');
    assert.equal(booking.gcal_sync_status, 'not_needed');
    assert.equal(Number(booking.appointment_fee_inr), 200);
    assert.equal(booking.payment_status, 'pending');
    assert.equal(booking.requested_by_relative, false);
    assert.ok(booking.fee_consent_at);
    const moved = await tool('reschedule_booking', {
      call_id: meeraCall.call_id, booking_id: booked.json.data.booking_id, window_id: kaurWindows[1],
    });
    assert.equal(moved.json.ok, true, JSON.stringify(moved.json));
    const cancelled = await tool('cancel_booking', { call_id: meeraCall.call_id, booking_id: booked.json.data.booking_id });
    assert.equal(cancelled.json.ok, true);

    const sharmaWindows = await windowsFor(sharma.id, { count: 2, days: 8 });
    const soonSession = (await db.query(
      `INSERT INTO doctor_sessions (doctor_id, session_date, planned_start, planned_end)
       VALUES ($1, (now() AT TIME ZONE 'Asia/Kolkata')::date, now(), now() + interval '2 hours')
       RETURNING id`,
      [sharma.id],
    )).rows[0];
    const soon = (await db.query(
      `INSERT INTO windows (session_id, starts_at, ends_at, capacity, priority_places)
       VALUES ($1, now() + interval '10 minutes', now() + interval '40 minutes', 4, 0)
       RETURNING id`,
      [soonSession.id],
    )).rows[0];
    const open = await tool('get_available_windows', { call_id: meeraCall.call_id, doctor_name: 'Dr Demo Sharma' });
    assert.equal(open.json.ok, true, JSON.stringify(open.json));
    const openIds = open.json.data.windows.map((w) => Number(w.window_id));
    assert.equal(openIds.includes(Number(soon.id)), false);
    assert.equal(openIds.includes(Number(sharmaWindows[0])), true);
    const priority = await tool('hold_window', {
      call_id: meeraCall.call_id, window_id: sharmaWindows[0], doctor_name: 'Sharma', priority: true,
    });
    assert.equal(priority.json.ok, false);
    assert.match(priority.json.say, /priority/i);

    const fullIds = await windowsFor(sharma.id, { capacity: 1, priority: 0, count: 1, days: 11 });
    const filled = await tool('create_booking', {
      call_id: meeraCall.call_id, window_id: fullIds[0], doctor_name: 'Dr Demo Sharma',
    });
    assert.equal(filled.json.ok, true, JSON.stringify(filled.json));
    const rohanCall = await openPersona('family');
    const rohanMatch = await tool('match_patient', {
      call_id: rohanCall.call_id, full_name: 'Rohan Demo', patient_code: rohan.patient_code, caller_is_patient: true,
    });
    assert.equal(rohanMatch.json.ok, true, JSON.stringify(rohanMatch.json));
    const full = await tool('hold_window', {
      call_id: rohanCall.call_id, window_id: fullIds[0], doctor_name: 'Dr Demo Sharma',
    });
    assert.equal(full.status, 200);
    assert.equal(full.json.ok, false);
    assert.match(full.json.say, /full/);
    assert.doesNotMatch(JSON.stringify(full.json), /window \d+ is full/);
    const rohanReports = await tool('get_report_status', { call_id: rohanCall.call_id });
    assert.deepEqual(rohanReports.json.data.reports, []);
    assert.doesNotMatch(JSON.stringify(rohanReports.json), /X-ray|Asha/);
    const leaked = await tool('get_report_status', { call_id: rohanCall.call_id, patient_id: asha.id });
    assert.deepEqual(leaked.json.data.reports, []);
    assert.doesNotMatch(JSON.stringify(leaked.json), /X-ray|Asha/);
    const violations = (await db.query(
      `SELECT count(*)::int AS n FROM decision_traces WHERE call_id = $1 AND severity = 'violation'`,
      [rohanCall.call_id],
    )).rows[0].n;
    assert.ok(violations >= 1);
    await assert.rejects(
      () => db.query(`SELECT require_verified_patient($1, $2, true)`, [rohanCall.call_id, asha.id]),
      /not verified|42501/,
    );
    const rohanCancel = await tool('cancel_booking', { call_id: rohanCall.call_id, booking_id: filled.json.data.booking_id });
    assert.equal(rohanCancel.json.ok, false);

    const ashaCall = await openPersona('family');
    const ashaMatch = await tool('match_patient', {
      call_id: ashaCall.call_id, full_name: 'Asha Demo', patient_code: asha.patient_code, caller_is_patient: true,
    });
    assert.equal(ashaMatch.json.ok, true, JSON.stringify(ashaMatch.json));
    const ashaWindows = await windowsFor(sharma.id, { count: 2, days: 12 });
    const firstHold = await tool('hold_window', {
      call_id: ashaCall.call_id, window_id: ashaWindows[0], doctor_name: 'Dr Demo Sharma',
    });
    assert.equal(firstHold.json.ok, true, JSON.stringify(firstHold.json));
    const secondHold = await tool('hold_window', {
      call_id: ashaCall.call_id, window_id: ashaWindows[1], doctor_name: 'Dr Demo Sharma',
    });
    assert.equal(secondHold.json.ok, false);
    await db.query(`UPDATE bookings SET hold_expires_at = now() - interval '1 minute' WHERE id = $1`, [firstHold.json.data.booking_id]);
    assert.equal(await expireHolds(db), 1);
    assert.equal(await expireHolds(db), 0);
    const rehold = await tool('hold_window', {
      call_id: ashaCall.call_id, window_id: ashaWindows[0], doctor_name: 'Dr Demo Sharma',
    });
    assert.equal(rehold.json.ok, true, JSON.stringify(rehold.json));

    const kabirCall = await openPersona('kabir');
    const limited = await tool('match_patient', {
      call_id: kabirCall.call_id, full_name: 'Kabir Demo', patient_code: kabir.patient_code, caller_is_patient: false,
    });
    assert.equal(limited.json.data.verification_mode, 'limited');
    const limitedRow = (await db.query(`SELECT verification_mode, caller_is_relative FROM calls WHERE id = $1`, [kabirCall.call_id])).rows[0];
    assert.equal(limitedRow.verification_mode, 'limited');
    assert.equal(limitedRow.caller_is_relative, true);
    const kabirWindow = (await windowsFor(sharma.id, { count: 1, days: 13 }))[0];
    const kabirHold = await tool('hold_window', {
      call_id: kabirCall.call_id,
      window_id: kabirWindow,
      doctor_name: 'Dr Demo Sharma',
      patient_id: asha.id,
      requested_by_relative: false,
    });
    assert.equal(kabirHold.json.ok, true, JSON.stringify(kabirHold.json));
    const kabirBooking = (await db.query(
      `SELECT patient_id, requested_by_relative FROM bookings WHERE id = $1`,
      [kabirHold.json.data.booking_id],
    )).rows[0];
    assert.equal(Number(kabirBooking.patient_id), Number(kabir.id));
    assert.equal(kabirBooking.requested_by_relative, true);
    const hidden = await tool('get_report_status', { call_id: kabirCall.call_id });
    assert.equal(hidden.json.ok, false);
    await assert.rejects(
      () => db.query(`SELECT require_verified_patient($1, $2, false)`, [kabirCall.call_id, kabir.id]),
      /limited mode|42501/,
    );

    const pool = await tool('get_available_windows', { call_id: meeraCall.call_id, pool_name: 'General check-up' });
    assert.equal(pool.json.ok, true, JSON.stringify(pool.json));
    assert.ok(pool.json.data.windows.every((w) => !/Kaur/.test(w.doctor_name)));
    assert.ok(pool.json.data.windows.some((w) => Number(w.window_id) === Number(sharmaWindows[1])));

    const unknown = await openPersona('unknown');
    const hours = await tool('get_clinic_info', { call_id: unknown.call_id, topic: 'hours' });
    assert.equal(hours.json.ok, true);
    assert.match(hours.json.say, /Monday/);
    const refused = await tool('get_report_status', { call_id: unknown.call_id });
    assert.equal(refused.json.ok, false);
    const fail1 = await tool('match_patient', {
      call_id: unknown.call_id, full_name: 'Nobody Here', date_of_birth: '1900-01-01', caller_is_patient: true,
    });
    assert.equal(fail1.json.ok, false);
    assert.notEqual(fail1.json.error_code, 'verification_failed');
    const fail2 = await tool('match_patient', {
      call_id: unknown.call_id, full_name: 'Nobody Else', date_of_birth: '1901-02-02', caller_is_patient: true,
    });
    assert.equal(fail2.json.error_code, 'verification_failed');
    assert.match(fail2.json.say, /call you back/i);
    const registered = await tool('register_patient', {
      call_id: unknown.call_id,
      purpose: 'booking',
      full_name: 'New Caller',
      date_of_birth: '1991-02-02',
      phone: '+910000000000',
    });
    assert.equal(registered.json.ok, true, JSON.stringify(registered.json));
    assert.equal(registered.json.data.file_complete, false);
    const created = (await db.query(
      `SELECT p.file_complete, ph.phone
         FROM patients p JOIN patient_phones ph ON ph.patient_id = p.id
        WHERE p.full_name = 'New Caller'`,
    )).rows[0];
    assert.equal(created.file_complete, false);
    assert.equal(created.phone, '+919800000099');

    const openToday = (await db.query(
      `SELECT id FROM doctor_sessions
        WHERE doctor_id = $1
          AND session_date = (now() AT TIME ZONE 'Asia/Kolkata')::date
          AND planned_end > now()`,
      [sharma.id],
    )).rows;
    if (!openToday.length) {
      await db.query(
        `INSERT INTO doctor_sessions (doctor_id, session_date, planned_start, planned_end, est_delay_min, est_basis)
         VALUES ($1, (now() AT TIME ZONE 'Asia/Kolkata')::date, now() - interval '5 minutes', now() + interval '2 hours', 0, 'schedule_only')`,
        [sharma.id],
      );
    } else {
      await db.query(
        `UPDATE doctor_sessions SET est_delay_min = 0, est_basis = 'schedule_only' WHERE id = ANY($1::bigint[])`,
        [openToday.map((row) => row.id)],
      );
    }
    const onTime = await tool('get_doctor_delay', { call_id: meeraCall.call_id, doctor_name: 'Dr Demo Sharma' });
    assert.match(onTime.json.say, /on time/, JSON.stringify(onTime.json));
    await db.query(
      `UPDATE doctor_sessions SET est_delay_min = 25
        WHERE doctor_id = $1
          AND session_date = (now() AT TIME ZONE 'Asia/Kolkata')::date
          AND planned_end > now()`,
      [sharma.id],
    );
    const late = await tool('get_doctor_delay', { call_id: meeraCall.call_id, doctor: 'Dr Demo Sharma' });
    assert.match(late.json.say, /25 minutes late/);

    const hook = { id: 'exec-test-1', status: 'ringing' };
    const firstHook = await api('/v1/bolna/webhook', { method: 'POST', body: hook, token: 'test-webhook' });
    const secondHook = await api('/v1/bolna/webhook', { method: 'POST', body: hook, token: 'test-webhook' });
    assert.equal(secondHook.json.duplicate, true);
    const hookCount = (await db.query(
      `SELECT count(*)::int AS n FROM calls WHERE bolna_execution_id = 'exec-test-1'`,
    )).rows[0].n;
    assert.equal(hookCount, 1);
    await db.query(`UPDATE calls SET phase = 'with_staff' WHERE bolna_execution_id = 'exec-test-1'`);
    const done = await api('/v1/bolna/webhook', {
      method: 'POST', body: { id: 'exec-test-1', status: 'completed' }, token: 'test-webhook',
    });
    assert.equal(done.json.ok, true);
    const after = (await db.query(
      `SELECT phase, ai_leg_status FROM calls WHERE bolna_execution_id = 'exec-test-1'`,
    )).rows[0];
    assert.equal(after.phase, 'with_staff');
    assert.equal(after.ai_leg_status, 'completed');
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM calls WHERE bolna_execution_id = 'exec-test-1'`)).rows[0].n, 1);

    const sim = await api('/api/simulate/utterance', {
      method: 'POST',
      body: { call_id: unknown.call_id, text: 'What are your hours?', tool: 'get_clinic_info', args: { topic: 'hours' } },
    });
    assert.equal(sim.json.ok, true);
    assert.match(sim.json.say, /Monday/);
    const afterMetrics = await api('/metrics');
    assert.match(afterMetrics.text, /clinic_tool_duration_seconds_bucket\{tool="get_clinic_info"/);

    const chain = readTraceFile(traceDir, family.call_id);
    assert.ok(chain.length >= 1);
    assert.equal(verifyChain(chain).ok, true);
    const tampered = chain.map((event) => ({ ...event }));
    tampered[0] = { ...tampered[0], record_hash: 'cd'.repeat(32) };
    assert.equal(verifyChain(tampered).ok, false);
    const replay = await api('/api/admin/traces/replay', { method: 'POST', cookie, body: { call_id: family.call_id } });
    assert.equal(replay.json.ok, true);
    const replay2 = await api('/api/admin/traces/replay', { method: 'POST', cookie, body: { call_id: family.call_id } });
    assert.equal(replay2.json.events, replay.json.events);

    const ws = new WebSocket(`${base.replace('http', 'ws')}/ws?token=${family.caller_token}`);
    await new Promise((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });
    const frame = new Promise((resolve) => ws.once('message', (buf) => resolve(JSON.parse(String(buf)))));
    const phased = await api(`/api/calls/${family.call_id}/phase`, {
      method: 'POST', token: family.caller_token, body: { phase: 'ai_active' },
    });
    assert.equal(phased.json.phase, 'ai_active');
    const message = await frame;
    assert.equal(message.event, 'call.phase');
    assert.equal(message.data.phase, 'ai_active');
    ws.close();
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => mcp.close(resolve));
    await redis.quit();
    await db.close();
  }
});
