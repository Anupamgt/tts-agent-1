-- Demo seed. Safe to run once on a fresh schema. All people and numbers are fictional.
--   Doctors: Dr Sharma and Dr Verma (general medicine, "General check-up" pool, no fees, no priority),
--            Dr Kaur (paediatrics specialist: appointment fee 200, priority fee 500, named bookings only)
--   Today:   evening sessions for all three. Windows 1-6 Sharma, 7-12 Verma, 13-18 Kaur.
--   Patients: two sharing a family phone; a card holder and a dependant sharing an institute ID.

INSERT INTO clinics (name, phone, address)
VALUES ('Demo Family Clinic', '+911100000000', '12 Example Road, Chandigarh');

INSERT INTO clinic_settings (clinic_id, staff_on_desk, staff_transfer_number)
VALUES (1, true, '+919800000000');

INSERT INTO doctors (clinic_id, name, specialty, priority_fee_inr, appointment_fee_inr) VALUES
  (1, 'Dr Demo Sharma', 'General medicine', NULL, NULL),   -- id 1
  (1, 'Dr Demo Verma',  'General medicine', NULL, NULL),   -- id 2
  (1, 'Dr Demo Kaur',   'Paediatrics',      500,  200);    -- id 3

-- Staff accounts. Each doctor's account is tied to their doctor record (flow 11: only the
-- patient's own doctor decides a refill).
INSERT INTO staff_users (clinic_id, name, phone, role, doctor_id) VALUES
  (1, 'Front desk',      '+919800000000', 'receptionist', NULL),
  (1, 'Cabin assistant', '+919800000003', 'assistant',    NULL),
  (1, 'Dr Demo Sharma',  '+919800000001', 'doctor',       1),
  (1, 'Clinic admin',    '+919800000002', 'admin',        NULL),
  (1, 'Dr Demo Verma',   '+919800000004', 'doctor',       2),
  (1, 'Dr Demo Kaur',    '+919800000005', 'doctor',       3);

INSERT INTO doctor_pools (clinic_id, name) VALUES (1, 'General check-up');
INSERT INTO doctor_pool_members (pool_id, doctor_id) VALUES (1, 1), (1, 2);

INSERT INTO schedule_templates (doctor_id, weekday, start_time, end_time) VALUES
  (1, 1, '17:00', '20:00'), (1, 2, '17:00', '20:00'), (1, 3, '17:00', '20:00'),
  (1, 4, '17:00', '20:00'), (1, 5, '17:00', '20:00'), (1, 6, '10:00', '13:00'),
  (2, 1, '17:00', '20:00'), (2, 3, '17:00', '20:00'), (2, 5, '17:00', '20:00'),
  (3, 2, '17:00', '20:00'), (3, 4, '17:00', '20:00');

INSERT INTO clinic_info (clinic_id, topic, language, answer) VALUES
  (1, 'hours',        'en', 'Monday to Friday 5 to 8 pm, Saturday 10 am to 1 pm. Closed Sunday.'),
  (1, 'address',      'en', '12 Example Road, Chandigarh, next to the post office.'),
  (1, 'fees',         'en', 'General consultation is 500 rupees; follow-up within 7 days is 300. Dr Kaur (child specialist) needs a 200 rupee appointment fee when booking.'),
  (1, 'priority_fee', 'en', 'Priority visits are offered by our specialists. With Dr Kaur it costs 500 rupees extra. You are seen before regular patients once you arrive.'),
  (1, 'payment',      'en', 'You can pay by UPI with the link we send on WhatsApp, or in cash at the desk.'),
  (1, 'refunds',      'en', 'If the doctor cannot see you, we first offer another slot; if you prefer, we refund in full. If you cancel 24 hours or more before, you get a full refund; later than that, half.');

-- Today's evening sessions: 1 = Sharma, 2 = Verma, 3 = Kaur (demo session even on other weekdays)
INSERT INTO doctor_sessions (doctor_id, session_date, planned_start, planned_end)
SELECT d, current_date,
       (current_date + time '17:00') AT TIME ZONE 'Asia/Kolkata',
       (current_date + time '20:00') AT TIME ZONE 'Asia/Kolkata'
  FROM (VALUES (1), (2), (3)) AS t(d)
 ORDER BY d;

-- Six 30-minute windows per session, capacity 4. Priority places only for the specialist.
INSERT INTO windows (session_id, starts_at, ends_at, capacity, priority_places)
SELECT s,
       ((current_date + time '17:00') AT TIME ZONE 'Asia/Kolkata') + make_interval(mins => 30 * n),
       ((current_date + time '17:30') AT TIME ZONE 'Asia/Kolkata') + make_interval(mins => 30 * n),
       4,
       CASE WHEN s = 3 THEN 1 ELSE 0 END
  FROM (VALUES (1), (2), (3)) AS t(s), generate_series(0, 5) AS n
 ORDER BY s, n;   -- windows 1-6 = Sharma, 7-12 = Verma, 13-18 = Kaur

-- Patients. New ones get a generated ID with a check digit (1000017, 1000025, ...).
INSERT INTO patients (clinic_id, full_name, date_of_birth, file_complete, created_via) VALUES
  (1, 'Asha Demo',  '1961-03-14', true, 'console'),
  (1, 'Rohan Demo', '1994-11-02', true, 'console');
INSERT INTO patient_phones (patient_id, phone, relation, is_primary) VALUES
  (1, '+919811111111', 'self',  true),
  (2, '+919811111111', 'child', false);

-- Institution-style card: holder and dependant share the holder's institute ID.
INSERT INTO patients (clinic_id, patient_code, full_name, date_of_birth, holder_code, holder_relation, file_complete, created_via) VALUES
  (1, 'HC/2026/0412', 'Meera Demo', '1988-07-21', 'EMP-1042', 'self',  true, 'console'),
  (1, 'HC/2026/0413', 'Kabir Demo', '2016-01-09', 'EMP-1042', 'child', true, 'console');

INSERT INTO message_templates (key, language, channel, category, body) VALUES
  -- SMS (DLT format, service implicit)
  ('booking_confirmed',  'en', 'sms', 'service_implicit', 'Dear {#var#}, your visit with Dr {#var#} is booked for {#var#}, arrival window {#var#}. Patient ID {#var#}. To change, call {#var#}. -{#var#}'),
  ('priority_confirmed', 'en', 'sms', 'service_implicit', 'Dear {#var#}, your priority visit with Dr {#var#} is booked for {#var#}, arrival window {#var#}. Fee Rs {#var#}: pay by the UPI link on WhatsApp or at the desk. -{#var#}'),
  ('patient_id',         'en', 'sms', 'service_implicit', 'Your patient ID at {#var#} is {#var#}. Please keep it for calls and visits. -{#var#}'),
  ('reminder',           'en', 'sms', 'service_implicit', 'Reminder: your visit with Dr {#var#} is on {#var#}, arrival window {#var#}. Call {#var#} to cancel or reschedule. -{#var#}'),
  ('delay_update',       'en', 'sms', 'service_implicit', 'Dr {#var#} is running about {#var#} min late. Your new arrival window is {#var#}. Sorry for the wait. -{#var#}'),
  ('doctor_changed',     'en', 'sms', 'service_implicit', 'Your visit on {#var#} will now be with Dr {#var#}, arrival window {#var#}. Call {#var#} if this does not suit you. -{#var#}'),
  ('slot_kept',          'en', 'sms', 'service_implicit', 'Dr {#var#} is running late. We have kept a place for you on {#var#}, arrival window {#var#}. Call {#var#} to change it. -{#var#}'),
  ('rescheduled',        'en', 'sms', 'service_implicit', 'Your visit with Dr {#var#} has moved to {#var#}, arrival window {#var#}. Call {#var#} if this does not suit you. -{#var#}'),
  ('cancelled',          'en', 'sms', 'service_implicit', 'Your visit with Dr {#var#} on {#var#} is cancelled. Call {#var#} to book again. -{#var#}'),
  ('callback_queued',    'en', 'sms', 'service_implicit', 'We received your request. Our staff will call you back by {#var#}. For emergencies, call 112. -{#var#}'),
  -- prescription refills (flow 11): never a medicine name, always to the patient's registered number
  ('refill_received',    'en', 'sms', 'service_implicit', 'Your medicine request is with Dr {#var#}. You will get an SMS when the doctor has responded. This SMS is not a prescription. -{#var#}'),
  ('refill_collect',     'en', 'sms', 'service_implicit', 'Dr {#var#} has responded to your medicine request. Please collect your prescription at the clinic desk with your patient card. -{#var#}'),
  ('refill_doctor_reply','en', 'sms', 'service_implicit', 'Dr {#var#} has responded to your medicine request and sent the reply to this number. Call {#var#} with any questions. -{#var#}'),
  ('refill_visit_needed','en', 'sms', 'service_implicit', 'Dr {#var#} needs to see you before renewing your medicine. Call {#var#} to book a visit. If you feel unwell, call 112. -{#var#}'),
  -- WhatsApp (utility templates, need Meta approval)
  ('payment_link',       'en', 'whatsapp', 'utility', 'Hello {{1}}, your visit with Dr {{2}} on {{3}} needs a payment of Rs {{4}} ({{5}}). Pay by UPI here: {{6}}. The link is valid for {{7}} minutes. You can also pay in cash at the desk. We never ask for your UPI PIN or OTP.'),
  ('payment_reminder',   'en', 'whatsapp', 'utility', 'Reminder: Rs {{1}} for your visit with Dr {{2}} on {{3}} is still due. Pay here: {{4}}, or in cash at the desk. We never ask for your UPI PIN or OTP.'),
  ('payment_received',   'en', 'whatsapp', 'utility', 'Thank you. We received Rs {{1}} for your visit with Dr {{2}} on {{3}}. Receipt number {{4}}.'),
  ('refund_update',      'en', 'whatsapp', 'utility', 'Your refund of Rs {{1}} for the visit on {{2}} has been {{3}}. UPI refunds usually reach your account in {{4}} working days. You never need a PIN to receive a refund, and we never ask for one.');
