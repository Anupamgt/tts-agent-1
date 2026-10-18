-- Prototype seed. Run once after db/seed.sql and db/002_runtime.sql.
-- All people and numbers are fictional. Report rows carry a status and a label only.

INSERT INTO patient_phones (patient_id, phone, relation, is_primary)
SELECT id, '+919822222222', 'self', true FROM patients WHERE full_name = 'Meera Demo';

INSERT INTO patient_phones (patient_id, phone, relation, is_primary)
SELECT id, '+919833333333', 'self', true FROM patients WHERE full_name = 'Kabir Demo';

INSERT INTO caller_personas (key, display_name, phone, note) VALUES
  ('meera',   'Meera Demo',   '+919822222222',
   'Calling as herself. Card HC/2026/0412. Blood test is ready to collect. Last visit was with Dr Kaur.'),
  ('kabir',   'Kabir Demo',   '+919833333333',
   'Child patient, card HC/2026/0413, holder EMP-1042. Blood test is still pending.'),
  ('family',  'Family phone', '+919811111111',
   'Shared by Asha Demo and Rohan Demo. The agent must not assume which of them is calling.'),
  ('unknown', 'New caller',   '+919800000099',
   'No file on this number. Hours and a new booking are allowed. Reports are not.');

INSERT INTO lab_orders (clinic_id, patient_id, label, status, ordered_on, ready_on)
SELECT clinic_id, id, 'Blood test', 'ready_for_pickup', current_date - 3, current_date - 1
  FROM patients WHERE full_name = 'Meera Demo';

INSERT INTO lab_orders (clinic_id, patient_id, label, status, ordered_on)
SELECT clinic_id, id, 'Blood test', 'pending', current_date - 1
  FROM patients WHERE full_name = 'Kabir Demo';

INSERT INTO lab_orders (clinic_id, patient_id, label, status, ordered_on, ready_on)
SELECT clinic_id, id, 'X-ray', 'collected', current_date - 20, current_date - 18
  FROM patients WHERE full_name = 'Asha Demo';

INSERT INTO patient_interactions (clinic_id, patient_id, happened_on, kind, summary, doctor_name)
SELECT clinic_id, id, current_date - 14, 'visit',
       'Came for a follow-up visit. Seen by the doctor. Next visit was left open.',
       'Dr Demo Kaur'
  FROM patients WHERE full_name = 'Meera Demo';

INSERT INTO patient_interactions (clinic_id, patient_id, happened_on, kind, summary, doctor_name)
SELECT clinic_id, id, current_date - 30, 'call',
       'Phoned the desk to move a visit to the next evening session.',
       'Dr Demo Kaur'
  FROM patients WHERE full_name = 'Meera Demo';

INSERT INTO patient_interactions (clinic_id, patient_id, happened_on, kind, summary, doctor_name)
SELECT clinic_id, id, current_date - 10, 'visit',
       'Came for a general check-up. Seen and sent home. No follow-up booked.',
       'Dr Demo Sharma'
  FROM patients WHERE full_name = 'Asha Demo';

INSERT INTO patient_interactions (clinic_id, patient_id, happened_on, kind, summary, doctor_name)
SELECT clinic_id, id, current_date - 40, 'visit',
       'Came for a general check-up with a parent. Seen and sent home.',
       'Dr Demo Verma'
  FROM patients WHERE full_name = 'Rohan Demo';
