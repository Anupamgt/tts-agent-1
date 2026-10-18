-- Demo schema for the clinic voice agent (PostgreSQL 14+)
-- Source of truth for bookings, calls, callbacks, tickets, SMS. Google Calendar is a mirror.
-- Times are timestamptz; the clinic timezone lives in clinics.timezone (default Asia/Kolkata).
-- Personal data: names, phone numbers, dates of birth. No medical records in v1.
--
-- Decisions reflected here (docs/alignment.md):
--   1  named-doctor bookings stay with the doctor; any-doctor bookings belong to a pool and can roll over
--   3  "urgent" = paid priority visit (booking_priority 'priority'); emergencies are not bookings
--   6  verification by name + patient ID (patients.patient_code, numeric with a Luhn check digit)
--   12 at most 2 delay SMS, then the visit moves to the next available window (booking_changes)
--   13 hybrid "next patient": queue_events from doctor / assistant / reception, schedule fallback

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------- enums
CREATE TYPE visit_type        AS ENUM ('first_visit', 'follow_up', 'general_checkup', 'other');
CREATE TYPE booking_mode      AS ENUM ('named_doctor', 'any_doctor');
CREATE TYPE booking_priority  AS ENUM ('routine', 'priority');
CREATE TYPE payment_status    AS ENUM ('not_required', 'pending', 'paid', 'waived', 'refunded');
CREATE TYPE booking_status    AS ENUM ('held', 'booked', 'arrived', 'in_consult', 'done',
                                       'cancelled', 'no_show', 'rescheduled');
CREATE TYPE booking_source    AS ENUM ('agent', 'console', 'walk_in', 'follow_up', 'system');
CREATE TYPE booking_change_kind AS ENUM ('delay_shift', 'doctor_reassigned', 'auto_rescheduled',
                                         'rescheduled_by_patient', 'rescheduled_by_staff', 'cancelled');
CREATE TYPE session_status    AS ENUM ('planned', 'started', 'paused', 'ended', 'cancelled');
CREATE TYPE estimate_basis    AS ENUM ('live', 'schedule_only');
CREATE TYPE queue_event_kind  AS ENUM ('session_start', 'call_next', 'consult_end', 'pause', 'resume', 'session_end');
CREATE TYPE queue_event_source AS ENUM ('doctor', 'assistant', 'reception', 'system');
CREATE TYPE call_direction    AS ENUM ('inbound', 'outbound');
CREATE TYPE callback_priority AS ENUM ('P1', 'P2', 'P3');
CREATE TYPE callback_status   AS ENUM ('open', 'in_progress', 'done', 'unreachable', 'cancelled');
CREATE TYPE ticket_type       AS ENUM ('refill', 'message', 'report_query');
CREATE TYPE ticket_status     AS ENUM ('new', 'seen', 'approved', 'declined', 'answered');
CREATE TYPE sms_status        AS ENUM ('queued', 'sent', 'delivered', 'failed');
CREATE TYPE outbound_kind     AS ENUM ('reminder', 'delay_update', 'reschedule_notice', 'reschedule_offer',
                                       'doctor_changed', 'callback_result', 'follow_up_reminder');
CREATE TYPE outbound_status   AS ENUM ('scheduled', 'calling', 'confirmed', 'rescheduled',
                                       'cancelled', 'unreached', 'skipped', 'opted_out');
CREATE TYPE staff_role        AS ENUM ('admin', 'receptionist', 'assistant', 'doctor');
CREATE TYPE consent_kind      AS ENUM ('reminder_call', 'sms', 'call_recording');

-- ---------------------------------------------------------------- helpers
-- Luhn check digit for a string of digits (used for patient IDs spoken over the phone).
CREATE FUNCTION luhn_check_digit(payload text) RETURNS int AS $$
DECLARE
    total  int := 0;
    d      int;
    dbl    boolean := true;     -- rightmost payload digit is doubled
BEGIN
    IF payload !~ '^[0-9]+$' THEN
        RAISE EXCEPTION 'luhn_check_digit expects digits only, got %', payload;
    END IF;
    FOR i IN REVERSE length(payload)..1 LOOP
        d := substr(payload, i, 1)::int;
        IF dbl THEN
            d := d * 2;
            IF d > 9 THEN d := d - 9; END IF;
        END IF;
        total := total + d;
        dbl := NOT dbl;
    END LOOP;
    RETURN (10 - (total % 10)) % 10;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- True when the last digit is a valid Luhn check digit for the rest.
CREATE FUNCTION luhn_valid(code text) RETURNS boolean AS $$
    SELECT CASE WHEN code ~ '^[0-9]{2,}$'
                THEN luhn_check_digit(left(code, length(code) - 1)) = right(code, 1)::int
                ELSE false END;
$$ LANGUAGE sql IMMUTABLE;

-- ---------------------------------------------------------------- clinic and people
CREATE TABLE clinics (
    id          bigserial PRIMARY KEY,
    name        text NOT NULL,
    phone       text,                                  -- the number callers dial
    address     text,
    timezone    text NOT NULL DEFAULT 'Asia/Kolkata',
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- One row per clinic: every default from docs/flows/README.md, editable.
CREATE TABLE clinic_settings (
    clinic_id                  bigint PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
    window_minutes             int  NOT NULL DEFAULT 30  CHECK (window_minutes > 0),
    window_capacity            int  NOT NULL DEFAULT 4   CHECK (window_capacity > 0),
    priority_places_per_window int  NOT NULL DEFAULT 1   CHECK (priority_places_per_window >= 0),
    priority_release_minutes   int  NOT NULL DEFAULT 120 CHECK (priority_release_minutes >= 0),
    priority_payment_method    text NOT NULL DEFAULT 'desk' CHECK (priority_payment_method IN ('desk', 'upi_link')),
    hold_seconds               int  NOT NULL DEFAULT 90,
    same_day_cutoff_minutes    int  NOT NULL DEFAULT 30,
    delay_sms_threshold_min    int  NOT NULL DEFAULT 20,
    delay_sms_min_change_min   int  NOT NULL DEFAULT 15,
    delay_sms_cap              int  NOT NULL DEFAULT 2,     -- decided
    after_cap_action           text NOT NULL DEFAULT 'move_to_next_available'   -- decided
                               CHECK (after_cap_action IN ('move_to_next_available', 'silent_shift')),
    next_tap_watchdog_min      int  NOT NULL DEFAULT 30,
    no_show_grace_min          int  NOT NULL DEFAULT 30,
    max_offer_rounds           int  NOT NULL DEFAULT 3,
    verification_attempts      int  NOT NULL DEFAULT 2,
    p1_callback_minutes        int  NOT NULL DEFAULT 15,
    p2_callback_minutes        int  NOT NULL DEFAULT 120,
    outbound_start_hour        int  NOT NULL DEFAULT 9  CHECK (outbound_start_hour BETWEEN 0 AND 23),
    outbound_end_hour          int  NOT NULL DEFAULT 21 CHECK (outbound_end_hour BETWEEN 0 AND 23),
    outbound_max_retries       int  NOT NULL DEFAULT 2,
    outbound_retry_gap_hours   int  NOT NULL DEFAULT 2,
    staff_on_desk              boolean NOT NULL DEFAULT false,   -- the switch the transfer flow checks
    staff_transfer_number      text,
    CHECK (priority_places_per_window <= window_capacity)
);

CREATE TABLE staff_users (
    id         bigserial PRIMARY KEY,
    clinic_id  bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name       text NOT NULL,
    phone      text,
    role       staff_role NOT NULL,
    active     boolean NOT NULL DEFAULT true
);

CREATE TABLE doctors (
    id                  bigserial PRIMARY KEY,
    clinic_id           bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name                text NOT NULL,
    specialty           text,
    priority_fee_inr    numeric(10,2) CHECK (priority_fee_inr >= 0),  -- NULL = no priority visits
    planned_consult_min numeric(5,2) CHECK (planned_consult_min > 0), -- NULL = window / capacity
    google_calendar_id  text,        -- doctor's personal calendar: read for busy time only
    clinic_calendar_id  text,        -- shared "Clinic bookings" calendar: written as a mirror
    active              boolean NOT NULL DEFAULT true
);

-- Doctors who can stand in for each other on any-doctor bookings (decision 1).
CREATE TABLE doctor_pools (
    id         bigserial PRIMARY KEY,
    clinic_id  bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name       text NOT NULL,                  -- e.g. 'General check-up'
    UNIQUE (clinic_id, name)
);

CREATE TABLE doctor_pool_members (
    pool_id    bigint NOT NULL REFERENCES doctor_pools(id) ON DELETE CASCADE,
    doctor_id  bigint NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    PRIMARY KEY (pool_id, doctor_id)
);

-- Weekly pattern; sessions and windows are generated from it.
CREATE TABLE schedule_templates (
    id          bigserial PRIMARY KEY,
    doctor_id   bigint NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    weekday     smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),   -- 0 = Sunday
    start_time  time NOT NULL,
    end_time    time NOT NULL,
    CHECK (end_time > start_time)
);

CREATE TABLE holidays (
    clinic_id  bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    day        date NOT NULL,
    note       text,
    PRIMARY KEY (clinic_id, day)
);

CREATE TABLE clinic_info (            -- answers for the info flow (05), per language
    clinic_id  bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    topic      text NOT NULL,         -- hours, address, fees, parking, services, ...
    language   text NOT NULL DEFAULT 'en',
    answer     text NOT NULL,
    PRIMARY KEY (clinic_id, topic, language)
);

CREATE TABLE restricted_medicines (   -- "visit required" list for the refill flow
    id         bigserial PRIMARY KEY,
    clinic_id  bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name       text NOT NULL,
    note       text
);

-- ---------------------------------------------------------------- patients
CREATE SEQUENCE patient_code_seq START 100001;

CREATE TABLE patients (
    id                  bigserial PRIMARY KEY,
    clinic_id           bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_code        text NOT NULL,       -- the "patient ID" on the card (decision 6)
    patient_code_digits text GENERATED ALWAYS AS (regexp_replace(patient_code, '[^0-9]', '', 'g')) STORED,
    full_name           text NOT NULL,
    name_phonetic       text,                -- e.g. double metaphone, for fuzzy match
    date_of_birth       date,
    age_years           int,                 -- used when only an age is known
    file_complete       boolean NOT NULL DEFAULT false,   -- false = provisional record from the agent
    created_via         booking_source NOT NULL DEFAULT 'agent',
    created_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (clinic_id, patient_code)
);
CREATE INDEX patients_code_digits_idx ON patients (clinic_id, patient_code_digits);
CREATE INDEX patients_name_idx        ON patients (clinic_id, lower(full_name));
CREATE INDEX patients_phon_idx        ON patients (clinic_id, name_phonetic);

-- New patients get a 7-digit ID: 6 from the sequence + 1 Luhn check digit (e.g. 1000011).
-- Clinics that already have their own IDs insert them as they are; matching uses the digits.
CREATE FUNCTION assign_patient_code() RETURNS trigger AS $$
DECLARE
    base text;
BEGIN
    IF NEW.patient_code IS NULL OR NEW.patient_code = '' THEN
        base := nextval('patient_code_seq')::text;
        NEW.patient_code := base || luhn_check_digit(base)::text;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_assign_code
    BEFORE INSERT ON patients
    FOR EACH ROW EXECUTE FUNCTION assign_patient_code();

-- Phones are shared in real life: one number can belong to several patients.
CREATE TABLE patient_phones (
    patient_id  bigint NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    phone       text NOT NULL,          -- E.164, e.g. +919876543210
    relation    text NOT NULL DEFAULT 'self',   -- self, parent, spouse, child, other
    is_primary  boolean NOT NULL DEFAULT false,
    PRIMARY KEY (patient_id, phone)
);
CREATE INDEX patient_phones_phone_idx ON patient_phones (phone);

CREATE TABLE consents (
    id          bigserial PRIMARY KEY,
    patient_id  bigint NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    kind        consent_kind NOT NULL,
    given_at    timestamptz NOT NULL DEFAULT now(),
    source      text NOT NULL,                -- 'call', 'desk', 'sms_reply'
    revoked_at  timestamptz                   -- opt-out from an outbound call lands here
);

-- ---------------------------------------------------------------- sessions, windows, bookings
CREATE TABLE doctor_sessions (
    id              bigserial PRIMARY KEY,
    doctor_id       bigint NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    session_date    date NOT NULL,
    planned_start   timestamptz NOT NULL,
    planned_end     timestamptz NOT NULL,
    status          session_status NOT NULL DEFAULT 'planned',
    actual_start    timestamptz,                -- "Session started"
    cancel_reason   text,                       -- internal only, never read to callers
    avg_consult_min numeric(5,2),               -- rolling average from queue_events
    last_next_tap   timestamptz,                -- feeds the watchdog
    est_delay_min   int NOT NULL DEFAULT 0,     -- current estimate, 0 when on time
    est_basis       estimate_basis NOT NULL DEFAULT 'schedule_only',
    est_updated_at  timestamptz,
    CHECK (planned_end > planned_start),
    UNIQUE (doctor_id, planned_start)
);

-- Who signalled what in the cabin queue (decision 13: doctor, assistant or reception).
CREATE TABLE queue_events (
    id          bigserial PRIMARY KEY,
    session_id  bigint NOT NULL REFERENCES doctor_sessions(id) ON DELETE CASCADE,
    booking_id  bigint,                         -- FK added after bookings
    kind        queue_event_kind NOT NULL,
    source      queue_event_source NOT NULL,
    staff_id    bigint REFERENCES staff_users(id),
    at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX queue_events_session_idx ON queue_events (session_id, at);

CREATE TABLE windows (
    id                bigserial PRIMARY KEY,
    session_id        bigint NOT NULL REFERENCES doctor_sessions(id) ON DELETE CASCADE,
    starts_at         timestamptz NOT NULL,     -- planned
    ends_at           timestamptz NOT NULL,
    shift_minutes     int NOT NULL DEFAULT 0,   -- delay shift applied after the threshold is crossed
    capacity          int NOT NULL CHECK (capacity > 0),
    priority_places   int NOT NULL DEFAULT 0 CHECK (priority_places >= 0),
    priority_released boolean NOT NULL DEFAULT false,   -- true once unsold priority places go to routine
    CHECK (ends_at > starts_at),
    CHECK (priority_places <= capacity),
    -- Windows of one session never overlap (this is where a GiST exclusion IS the right tool):
    EXCLUDE USING gist (session_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
);

CREATE TABLE bookings (
    id                    bigserial PRIMARY KEY,
    patient_id            bigint NOT NULL REFERENCES patients(id),
    window_id             bigint NOT NULL REFERENCES windows(id),
    doctor_id             bigint NOT NULL REFERENCES doctors(id),   -- doctor it is with right now
    booking_mode          booking_mode NOT NULL DEFAULT 'named_doctor',
    pool_id               bigint REFERENCES doctor_pools(id),       -- any_doctor only
    visit_type            visit_type NOT NULL DEFAULT 'first_visit',
    priority              booking_priority NOT NULL DEFAULT 'routine',
    priority_fee_inr      numeric(10,2),         -- fee quoted on the call (snapshot)
    fee_consent_at        timestamptz,           -- when the caller said yes to the fee
    payment_status        payment_status NOT NULL DEFAULT 'not_required',
    payment_ref           text,
    status                booking_status NOT NULL,
    source                booking_source NOT NULL,
    reason_category       text,                  -- short category only, nothing medical in detail
    reason_note           text,                  -- staff-visible, caller's own words if needed
    requested_by_relative boolean NOT NULL DEFAULT false,
    hold_expires_at       timestamptz,           -- only for status = 'held'
    arrived_at            timestamptz,
    consult_started_at    timestamptz,
    consult_ended_at      timestamptz,
    cancelled_at          timestamptz,
    cancel_reason         text,
    rescheduled_from      bigint REFERENCES bookings(id),
    gcal_event_id         text,
    gcal_sync_status      text NOT NULL DEFAULT 'pending'
                          CHECK (gcal_sync_status IN ('pending', 'synced', 'failed', 'not_needed')),
    delay_sms_count       int NOT NULL DEFAULT 0 CHECK (delay_sms_count >= 0),
    created_by_call_id    bigint,                -- FK added after calls table
    created_at            timestamptz NOT NULL DEFAULT now(),
    CHECK ((status = 'held') = (hold_expires_at IS NOT NULL)),
    CHECK ((booking_mode = 'any_doctor') = (pool_id IS NOT NULL)),
    -- routine visits carry no fee; priority visits always carry the quoted fee
    CHECK ((priority = 'routine' AND payment_status = 'not_required' AND priority_fee_inr IS NULL)
        OR (priority = 'priority' AND payment_status <> 'not_required' AND priority_fee_inr IS NOT NULL)),
    -- a priority visit booked by the agent needs the caller's recorded yes to the fee
    CHECK (priority = 'routine' OR source <> 'agent' OR fee_consent_at IS NOT NULL)
);
CREATE INDEX bookings_window_idx  ON bookings (window_id);
CREATE INDEX bookings_patient_idx ON bookings (patient_id, status);
CREATE INDEX bookings_doctor_day  ON bookings (doctor_id, status);

ALTER TABLE queue_events
    ADD CONSTRAINT queue_events_booking_fk FOREIGN KEY (booking_id) REFERENCES bookings(id);

-- A patient cannot hold two live bookings in the same window.
-- Note: an expired hold keeps status 'held' until a cleanup job (every minute) sets it to
-- 'cancelled'; until then it still blocks that same patient from re-booking that window.
CREATE UNIQUE INDEX bookings_one_live_per_patient_window
    ON bookings (patient_id, window_id)
    WHERE status IN ('held', 'booked', 'arrived', 'in_consult');

-- Consistency and capacity rules.
-- 1. The booking's doctor must be the doctor of the window's session.
-- 2. Any-doctor bookings may only sit with a doctor of their pool.
-- 3. Capacity: a window has many places, so a time-range exclusion cannot protect it;
--    a row lock on the window plus a count does. Held bookings count only while the hold is live.
--    Routine places = capacity - priority places, unless unsold priority places were released.
CREATE FUNCTION enforce_booking_rules() RETURNS trigger AS $$
DECLARE
    w             windows%ROWTYPE;
    w_doctor      bigint;
    live_routine  int;
    live_priority int;
BEGIN
    SELECT * INTO w FROM windows WHERE id = NEW.window_id FOR UPDATE;   -- serialises writers
    SELECT doctor_id INTO w_doctor FROM doctor_sessions WHERE id = w.session_id;

    IF NEW.doctor_id IS DISTINCT FROM w_doctor THEN
        RAISE EXCEPTION 'booking doctor % does not run window %', NEW.doctor_id, w.id USING ERRCODE = 'P0001';
    END IF;

    IF NEW.booking_mode = 'any_doctor' AND NOT EXISTS (
            SELECT 1 FROM doctor_pool_members m
             WHERE m.pool_id = NEW.pool_id AND m.doctor_id = NEW.doctor_id) THEN
        RAISE EXCEPTION 'doctor % is not in pool %', NEW.doctor_id, NEW.pool_id USING ERRCODE = 'P0001';
    END IF;

    IF NEW.status NOT IN ('held', 'booked', 'arrived', 'in_consult') THEN
        RETURN NEW;
    END IF;

    SELECT count(*) FILTER (WHERE priority = 'routine'),
           count(*) FILTER (WHERE priority = 'priority')
      INTO live_routine, live_priority
      FROM bookings b
     WHERE b.window_id = NEW.window_id
       AND b.id IS DISTINCT FROM NEW.id
       AND b.status IN ('held', 'booked', 'arrived', 'in_consult')
       AND (b.status <> 'held' OR b.hold_expires_at > now());

    IF NEW.priority = 'priority' THEN
        IF live_priority + 1 > w.priority_places THEN
            RAISE EXCEPTION 'window % has no priority place left', w.id USING ERRCODE = 'P0001';
        END IF;
    ELSIF w.priority_released THEN
        -- unsold priority places were released: routine may use any place nobody else holds
        IF live_routine + live_priority + 1 > w.capacity THEN
            RAISE EXCEPTION 'window % is full', w.id USING ERRCODE = 'P0001';
        END IF;
    ELSE
        IF live_routine + 1 > w.capacity - w.priority_places THEN
            RAISE EXCEPTION 'window % is full', w.id USING ERRCODE = 'P0001';
        END IF;
    END IF;

    IF live_routine + live_priority + 1 > w.capacity THEN
        RAISE EXCEPTION 'window % is over capacity', w.id USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_rules
    BEFORE INSERT OR UPDATE OF window_id, doctor_id, booking_mode, pool_id, status, priority ON bookings
    FOR EACH ROW EXECUTE FUNCTION enforce_booking_rules();

-- Every move the system or a person makes, so the console can show one timeline per visit
-- (delay shifts, pool rollovers, the move after the delay-message cap, staff and patient changes).
CREATE TABLE booking_changes (
    id              bigserial PRIMARY KEY,
    booking_id      bigint NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    kind            booking_change_kind NOT NULL,
    from_window_id  bigint REFERENCES windows(id),
    to_window_id    bigint REFERENCES windows(id),
    from_doctor_id  bigint REFERENCES doctors(id),
    to_doctor_id    bigint REFERENCES doctors(id),
    shift_minutes   int,
    reason          text,
    notified_via    text[] NOT NULL DEFAULT '{}',   -- sms, call
    at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX booking_changes_booking_idx ON booking_changes (booking_id, at);

-- ---------------------------------------------------------------- calls and what they produce
CREATE TABLE calls (
    id                  bigserial PRIMARY KEY,
    clinic_id           bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    bolna_execution_id  text UNIQUE,            -- idempotency key for webhook retries
    direction           call_direction NOT NULL,
    from_number         text,
    to_number           text,
    started_at          timestamptz,
    ended_at            timestamptz,
    duration_seconds    int,
    language            text,                   -- en, hi, hinglish, or the last one used
    status              text,                   -- Bolna status as received
    hangup_reason       text,
    patient_id          bigint REFERENCES patients(id),   -- set only after verification
    verified            boolean NOT NULL DEFAULT false,
    caller_is_relative  boolean NOT NULL DEFAULT false,
    intent              text,                   -- booking, priority, change, cancel, info, message, ...
    outcome             text,                   -- resolved, transferred, callback, emergency, abandoned
    transfer_attempted  boolean NOT NULL DEFAULT false,
    transfer_connected  boolean,
    tags                text[] NOT NULL DEFAULT '{}',   -- sales, non-patient, abusive, silent, ...
    summary             text,
    transcript          jsonb,                  -- [{speaker, text, ts}]
    recording_url       text,
    cost_cents          numeric(10,2),
    raw_payload         jsonb,                  -- full webhook body, kept for debugging
    created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX calls_from_idx    ON calls (from_number, started_at DESC);
CREATE INDEX calls_started_idx ON calls (clinic_id, started_at DESC);

ALTER TABLE bookings
    ADD CONSTRAINT bookings_created_by_call_fk
    FOREIGN KEY (created_by_call_id) REFERENCES calls(id);

CREATE TABLE verification_attempts (
    id          bigserial PRIMARY KEY,
    call_id     bigint NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    patient_id  bigint REFERENCES patients(id),          -- null when nothing matched
    attempt_no  int NOT NULL,
    method      text NOT NULL CHECK (method IN ('name_patient_id', 'name_dob', 'phone_last4')),
    result      text NOT NULL CHECK (result IN ('matched', 'no_match', 'ambiguous', 'bad_check_digit', 'failed')),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE callbacks (
    id               bigserial PRIMARY KEY,
    clinic_id        bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    call_id          bigint REFERENCES calls(id),
    patient_id       bigint REFERENCES patients(id),
    phone            text NOT NULL,
    priority         callback_priority NOT NULL,
    reason           text NOT NULL,
    preferred_from   timestamptz,
    preferred_to     timestamptz,
    due_at           timestamptz,     -- P1: +p1_callback_minutes; P2: +p2 or session end if sooner
    status           callback_status NOT NULL DEFAULT 'open',
    attempts         int NOT NULL DEFAULT 0,
    assigned_to      bigint REFERENCES staff_users(id),
    outcome_note     text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    closed_at        timestamptz
);
CREATE INDEX callbacks_queue_idx ON callbacks (clinic_id, status, priority, created_at);

CREATE TABLE message_tickets (
    id                    bigserial PRIMARY KEY,
    clinic_id             bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    call_id               bigint REFERENCES calls(id),
    patient_id            bigint NOT NULL REFERENCES patients(id),
    doctor_id             bigint REFERENCES doctors(id),
    type                  ticket_type NOT NULL,
    medicine_name         text,                           -- refill only
    body                  text,                           -- caller's words
    requested_by_relative boolean NOT NULL DEFAULT false,
    status                ticket_status NOT NULL DEFAULT 'new',
    response_note         text,
    responded_by          bigint REFERENCES staff_users(id),
    responded_at          timestamptz,
    created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE emergency_alerts (
    id               bigserial PRIMARY KEY,
    clinic_id        bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    call_id          bigint REFERENCES calls(id),
    kind             text NOT NULL CHECK (kind IN ('medical', 'self_harm')),
    snippet          text,
    caller_number    text,
    acknowledged_by  bigint REFERENCES staff_users(id),
    acknowledged_at  timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- SMS and outbound
CREATE TABLE sms_templates (
    key              text NOT NULL,                       -- booking_confirmed, reminder, delay_update, ...
    language         text NOT NULL,                       -- en, hi (Unicode template)
    dlt_template_id  text,                                -- null in the demo
    category         text NOT NULL DEFAULT 'service_implicit',
    body             text NOT NULL,                       -- with {#var#} placeholders
    PRIMARY KEY (key, language)
);

CREATE TABLE sms_messages (
    id                   bigserial PRIMARY KEY,
    clinic_id            bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id           bigint REFERENCES patients(id),
    booking_id           bigint REFERENCES bookings(id),
    callback_id          bigint REFERENCES callbacks(id),
    template_key         text NOT NULL,
    language             text NOT NULL,
    to_number            text NOT NULL,
    rendered_body        text NOT NULL,
    status               sms_status NOT NULL DEFAULT 'queued',
    provider_message_id  text,
    error                text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    sent_at              timestamptz,
    FOREIGN KEY (template_key, language) REFERENCES sms_templates (key, language)
);

CREATE TABLE outbound_jobs (
    id              bigserial PRIMARY KEY,
    clinic_id       bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    kind            outbound_kind NOT NULL,
    booking_id      bigint REFERENCES bookings(id),
    patient_id      bigint NOT NULL REFERENCES patients(id),
    phone           text NOT NULL,
    scheduled_for   timestamptz NOT NULL,
    attempts        int NOT NULL DEFAULT 0,
    last_attempt_at timestamptz,
    status          outbound_status NOT NULL DEFAULT 'scheduled',
    call_id         bigint REFERENCES calls(id),
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outbound_due_idx ON outbound_jobs (status, scheduled_for);

-- ---------------------------------------------------------------- audit
CREATE TABLE audit_log (
    id          bigserial PRIMARY KEY,
    clinic_id   bigint REFERENCES clinics(id) ON DELETE CASCADE,
    actor_type  text NOT NULL CHECK (actor_type IN ('agent', 'staff', 'system')),
    actor_id    bigint,                    -- staff_users.id when actor_type = 'staff'
    action      text NOT NULL,             -- booking.create, verification.fail, patient.view, ...
    entity      text NOT NULL,
    entity_id   bigint,
    call_id     bigint REFERENCES calls(id),
    details     jsonb,
    at          timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- views the agent and console use
-- Open places per window, routine and priority shown separately. Expired holds do not count.
CREATE VIEW window_availability AS
SELECT w.id                       AS window_id,
       s.doctor_id,
       d.priority_fee_inr,
       s.id                       AS session_id,
       w.starts_at + make_interval(mins => w.shift_minutes) AS shifted_start,
       w.ends_at   + make_interval(mins => w.shift_minutes) AS shifted_end,
       w.capacity,
       w.priority_places,
       w.priority_released,
       COALESCE(c.live_routine, 0)  AS routine_taken,
       COALESCE(c.live_priority, 0) AS priority_taken,
       GREATEST(CASE WHEN w.priority_released
                     THEN w.capacity - COALESCE(c.live_routine, 0) - COALESCE(c.live_priority, 0)
                     ELSE w.capacity - w.priority_places - COALESCE(c.live_routine, 0)
                END, 0)                                                   AS routine_open,
       CASE WHEN d.priority_fee_inr IS NULL THEN 0
            ELSE GREATEST(LEAST(w.priority_places - COALESCE(c.live_priority, 0),
                                w.capacity - COALESCE(c.live_routine, 0) - COALESCE(c.live_priority, 0)), 0)
       END                                                                AS priority_open
  FROM windows w
  JOIN doctor_sessions s ON s.id = w.session_id AND s.status IN ('planned', 'started')
  JOIN doctors d         ON d.id = s.doctor_id AND d.active
  LEFT JOIN LATERAL (
        SELECT count(*) FILTER (WHERE b.priority = 'routine')  AS live_routine,
               count(*) FILTER (WHERE b.priority = 'priority') AS live_priority
          FROM bookings b
         WHERE b.window_id = w.id
           AND b.status IN ('held', 'booked', 'arrived', 'in_consult')
           AND (b.status <> 'held' OR b.hold_expires_at > now())
  ) c ON true;

-- Same, for any-doctor bookings: every window of every doctor in a pool.
CREATE VIEW pool_window_availability AS
SELECT m.pool_id, a.*
  FROM window_availability a
  JOIN doctor_pool_members m ON m.doctor_id = a.doctor_id;

-- Waiting-room order for each running session: priority first, then arrival order.
CREATE VIEW session_queue AS
SELECT w.session_id,
       b.id          AS booking_id,
       b.patient_id,
       b.priority,
       b.arrived_at,
       row_number() OVER (PARTITION BY w.session_id
                          ORDER BY (b.priority = 'priority') DESC, b.arrived_at) AS queue_position
  FROM bookings b
  JOIN windows w ON w.id = b.window_id
 WHERE b.status = 'arrived';
