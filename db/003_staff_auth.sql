-- Staff PIN hashes (implementation plan phase 2).
-- No plaintext PIN. No INSERT. Demo hashes are written at API start from STAFF_DEV_PINS,
-- and only when pin_hash is still empty. That variable is dev-only and is not a production secret.
--
-- Fresh Docker volumes run this from deploy/docker-compose.yml as
-- docker-entrypoint-initdb.d/05_staff_auth.sql (after the four clinic files).
-- A volume that already has data does not re-run entrypoint scripts. Apply it with:
--   psql "$DATABASE_URL" -f db/003_staff_auth.sql
-- or, from the compose network:
--   docker compose -f deploy/docker-compose.yml exec -T postgres \
--     psql -U clinic -d clinic -f /docker-entrypoint-initdb.d/05_staff_auth.sql
--
-- Until this file is applied, DESK_PIN is the temporary receptionist-only gate.
-- DESK_PIN must not be treated as a doctor PIN.

ALTER TABLE staff_users
    ADD COLUMN IF NOT EXISTS pin_hash text,
    ADD COLUMN IF NOT EXISTS pin_updated_at timestamptz;

COMMENT ON COLUMN staff_users.pin_hash IS
    'scrypt hash of the staff PIN. The PIN itself is never stored.';
