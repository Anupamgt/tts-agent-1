-- Demo seed: one clinic, one doctor, one evening session, templates from the DLT starter set.
-- Safe to run once on a fresh schema.

INSERT INTO clinics (name, phone, address)
VALUES ('Demo Family Clinic', '+911100000000', '12 Example Road, Chandigarh');

INSERT INTO clinic_settings (clinic_id, staff_on_desk, staff_transfer_number)
VALUES (1, true, '+919800000000');

INSERT INTO staff_users (clinic_id, name, phone, role) VALUES
  (1, 'Front desk',   '+919800000000', 'receptionist'),
  (1, 'Dr Demo Sharma', '+919800000001', 'doctor'),
  (1, 'Clinic admin', '+919800000002', 'admin');

INSERT INTO doctors (clinic_id, name, specialty)
VALUES (1, 'Dr Demo Sharma', 'General medicine');

INSERT INTO schedule_templates (doctor_id, weekday, start_time, end_time) VALUES
  (1, 1, '17:00', '20:00'), (1, 2, '17:00', '20:00'), (1, 3, '17:00', '20:00'),
  (1, 4, '17:00', '20:00'), (1, 5, '17:00', '20:00'), (1, 6, '10:00', '13:00');

INSERT INTO urgent_criteria (doctor_id, label, keywords) VALUES
  (1, 'Fever in a child under 2 years', ARRAY['baby fever', 'infant fever', 'bachche ko bukhar']),
  (1, 'Pain or bleeding after a procedure', ARRAY['after surgery', 'stitches', 'operation ke baad']),
  (1, 'Missed critical medicine', ARRAY['missed insulin', 'ran out of medicine']);

INSERT INTO restricted_medicines (clinic_id, name, note) VALUES
  (1, 'Sleeping tablets', 'Doctor must see the patient'),
  (1, 'Strong painkillers', 'Doctor must see the patient');

INSERT INTO clinic_info (clinic_id, topic, language, answer) VALUES
  (1, 'hours',   'en', 'Monday to Friday 5 to 8 pm, Saturday 10 am to 1 pm. Closed Sunday.'),
  (1, 'address', 'en', '12 Example Road, Chandigarh, next to the post office.'),
  (1, 'fees',    'en', 'Consultation fee is 500 rupees; follow-up within 7 days is 300.');

-- Today's evening session with six 30-minute windows (capacity 4, 1 urgent place each)
INSERT INTO doctor_sessions (doctor_id, session_date, planned_start, planned_end)
SELECT 1, current_date,
       (current_date + time '17:00') AT TIME ZONE 'Asia/Kolkata',
       (current_date + time '20:00') AT TIME ZONE 'Asia/Kolkata';

INSERT INTO windows (session_id, starts_at, ends_at, capacity, urgent_places)
SELECT 1,
       ((current_date + time '17:00') AT TIME ZONE 'Asia/Kolkata') + make_interval(mins => 30 * n),
       ((current_date + time '17:30') AT TIME ZONE 'Asia/Kolkata') + make_interval(mins => 30 * n),
       4, 1
  FROM generate_series(0, 5) AS n;

INSERT INTO sms_templates (key, language, body) VALUES
  ('booking_confirmed', 'en', 'Dear {#var#}, your visit with Dr {#var#} is booked for {#var#}, arrival window {#var#}. To change, call {#var#}. -{#var#}'),
  ('reminder',          'en', 'Reminder: your visit with Dr {#var#} is on {#var#}, arrival window {#var#}. Call {#var#} to cancel or reschedule. -{#var#}'),
  ('delay_update',      'en', 'Dr {#var#} is running about {#var#} min late. Your new arrival window is {#var#}. Sorry for the wait. -{#var#}'),
  ('rescheduled',       'en', 'Your visit with Dr {#var#} has moved to {#var#}, arrival window {#var#}. Call {#var#} if this does not suit you. -{#var#}'),
  ('cancelled',         'en', 'Your visit with Dr {#var#} on {#var#} is cancelled. Call {#var#} to book again. -{#var#}'),
  ('callback_queued',   'en', 'We received your request. Our staff will call you back by {#var#}. For emergencies, call 112. -{#var#}');
