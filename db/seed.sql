-- Demo seed: one clinic, three doctors (two in the general pool, one specialist),
-- today's evening sessions for the two general doctors, two patients sharing a phone,
-- and the starter DLT-format SMS templates. Safe to run once on a fresh schema.

INSERT INTO clinics (name, phone, address)
VALUES ('Demo Family Clinic', '+911100000000', '12 Example Road, Chandigarh');

INSERT INTO clinic_settings (clinic_id, staff_on_desk, staff_transfer_number)
VALUES (1, true, '+919800000000');

INSERT INTO staff_users (clinic_id, name, phone, role) VALUES
  (1, 'Front desk',     '+919800000000', 'receptionist'),
  (1, 'Cabin assistant','+919800000003', 'assistant'),
  (1, 'Dr Demo Sharma', '+919800000001', 'doctor'),
  (1, 'Clinic admin',   '+919800000002', 'admin');

-- priority_fee_inr NULL means that doctor offers no priority visits
INSERT INTO doctors (clinic_id, name, specialty, priority_fee_inr) VALUES
  (1, 'Dr Demo Sharma', 'General medicine', 300),   -- id 1
  (1, 'Dr Demo Verma',  'General medicine', 300),   -- id 2
  (1, 'Dr Demo Kaur',   'Paediatrics',      NULL);  -- id 3, specialist: named bookings only

INSERT INTO doctor_pools (clinic_id, name) VALUES (1, 'General check-up');
INSERT INTO doctor_pool_members (pool_id, doctor_id) VALUES (1, 1), (1, 2);

INSERT INTO schedule_templates (doctor_id, weekday, start_time, end_time) VALUES
  (1, 1, '17:00', '20:00'), (1, 2, '17:00', '20:00'), (1, 3, '17:00', '20:00'),
  (1, 4, '17:00', '20:00'), (1, 5, '17:00', '20:00'), (1, 6, '10:00', '13:00'),
  (2, 1, '17:00', '20:00'), (2, 3, '17:00', '20:00'), (2, 5, '17:00', '20:00'),
  (3, 2, '10:00', '13:00'), (3, 4, '10:00', '13:00');

INSERT INTO restricted_medicines (clinic_id, name, note) VALUES
  (1, 'Sleeping tablets',   'Doctor must see the patient'),
  (1, 'Strong painkillers', 'Doctor must see the patient');

INSERT INTO clinic_info (clinic_id, topic, language, answer) VALUES
  (1, 'hours',        'en', 'Monday to Friday 5 to 8 pm, Saturday 10 am to 1 pm. Closed Sunday.'),
  (1, 'address',      'en', '12 Example Road, Chandigarh, next to the post office.'),
  (1, 'fees',         'en', 'Consultation fee is 500 rupees; follow-up within 7 days is 300.'),
  (1, 'priority_fee', 'en', 'A priority visit costs 300 rupees extra, paid at the desk. You are seen before regular patients once you arrive.');

-- Today's evening sessions for Dr Sharma (session 1) and Dr Verma (session 2):
-- six 30-minute windows each, capacity 4, 1 priority place.
INSERT INTO doctor_sessions (doctor_id, session_date, planned_start, planned_end)
SELECT d, current_date,
       (current_date + time '17:00') AT TIME ZONE 'Asia/Kolkata',
       (current_date + time '20:00') AT TIME ZONE 'Asia/Kolkata'
  FROM (VALUES (1), (2)) AS t(d);

INSERT INTO windows (session_id, starts_at, ends_at, capacity, priority_places)
SELECT s,
       ((current_date + time '17:00') AT TIME ZONE 'Asia/Kolkata') + make_interval(mins => 30 * n),
       ((current_date + time '17:30') AT TIME ZONE 'Asia/Kolkata') + make_interval(mins => 30 * n),
       4, 1
  FROM (VALUES (1), (2)) AS t(s), generate_series(0, 5) AS n
 ORDER BY s, n;   -- windows 1-6 = session 1, 7-12 = session 2

-- Two patients on one family phone; patient IDs are generated with a check digit.
INSERT INTO patients (clinic_id, full_name, date_of_birth, file_complete, created_via) VALUES
  (1, 'Asha Demo',  '1961-03-14', true, 'console'),
  (1, 'Rohan Demo', '1994-11-02', true, 'console');
INSERT INTO patient_phones (patient_id, phone, relation, is_primary) VALUES
  (1, '+919811111111', 'self',  true),
  (2, '+919811111111', 'child', false);

INSERT INTO sms_templates (key, language, body) VALUES
  ('booking_confirmed',  'en', 'Dear {#var#}, your visit with Dr {#var#} is booked for {#var#}, arrival window {#var#}. Patient ID {#var#}. To change, call {#var#}. -{#var#}'),
  ('priority_confirmed', 'en', 'Dear {#var#}, your priority visit with Dr {#var#} is booked for {#var#}, arrival window {#var#}. Extra fee Rs {#var#}, pay at the desk. -{#var#}'),
  ('patient_id',         'en', 'Your patient ID at {#var#} is {#var#}. Please keep it for calls and visits. -{#var#}'),
  ('reminder',           'en', 'Reminder: your visit with Dr {#var#} is on {#var#}, arrival window {#var#}. Call {#var#} to cancel or reschedule. -{#var#}'),
  ('delay_update',       'en', 'Dr {#var#} is running about {#var#} min late. Your new arrival window is {#var#}. Sorry for the wait. -{#var#}'),
  ('doctor_changed',     'en', 'Your visit on {#var#} will now be with Dr {#var#}, arrival window {#var#}. Call {#var#} if this does not suit you. -{#var#}'),
  ('rescheduled',        'en', 'Your visit with Dr {#var#} has moved to {#var#}, arrival window {#var#}. Call {#var#} if this does not suit you. -{#var#}'),
  ('cancelled',          'en', 'Your visit with Dr {#var#} on {#var#} is cancelled. Call {#var#} to book again. -{#var#}'),
  ('callback_queued',    'en', 'We received your request. Our staff will call you back by {#var#}. For emergencies, call 112. -{#var#}');
