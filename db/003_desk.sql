-- Desk pins and nothing else. Loaded after the runtime seed.
-- Pins match the console switch-user sheet. They are demo secrets, not production credentials.

ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS pin text;

UPDATE staff_users SET pin = '2468' WHERE role = 'receptionist' AND pin IS NULL;
UPDATE staff_users SET pin = '1111' WHERE role = 'assistant' AND pin IS NULL;
UPDATE staff_users SET pin = '2222' WHERE name = 'Dr Demo Sharma';
UPDATE staff_users SET pin = '4444' WHERE name = 'Dr Demo Verma';
UPDATE staff_users SET pin = '3333' WHERE name = 'Dr Demo Kaur';
UPDATE staff_users SET pin = '1357' WHERE role = 'admin' AND pin IS NULL;
