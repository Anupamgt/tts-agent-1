-- Demo schema for the clinic voice agent (PostgreSQL 14+)
-- Source of truth for bookings, calls, callbacks, tickets, SMS. Google Calendar is a mirror.
-- Times are timestamptz; the clinic timezone lives in clinics.timezone (default Asia/Kolkata).
-- Personal data: names, phone numbers, dates of birth. No medical records in v1.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------- enums
CREATE TYPE visit_type      AS ENUM ('first_visit', 'follow_up', 'other');
CREATE TYPE booking_priority AS ENUM ('routine', 'urgent');
CREATE TYPE booking_status  AS ENUM ('held', 'booked', 'arrived', 'in_consult', 'done',
                                     'cancelled', 'no_show', 'rescheduled');
CREATE TYPE booking_source  AS ENUM ('agent', 'console', 'walk_in', 'follow_up');
CREATE TYPE session_status  AS ENUM ('planned', 'started', 'paused', 'ended', 'cancelled');
CREATE TYPE call_direction  AS ENUM ('inbound', 'outbound');
CREATE TYPE callback_priority AS ENUM ('P1', 'P2', 'P3');
CREATE TYPE callback_status AS ENUM ('open', 'in_progress', 'done', 'unreachable', 'cancelled');
CREATE TYPE ticket_type     AS ENUM ('refill', 'message', 'report_query');
CREATE TYPE ticket_status   AS ENUM ('new', 'seen', 'approved', 'declined', 'answered');
CREATE TYPE sms_status      AS ENUM ('queued', 'sent', 'delivered', 'failed');
CREATE TYPE outbound_kind   AS ENUM ('reminder', 'delay_update', 'reschedule_offer',
                                     'callback_result', 'follow_up_reminder');
CREATE TYPE outbound_status AS ENUM ('scheduled', 'calling', 'confirmed', 'rescheduled',
                                     'cancelled', 'unreached', 'skipped', 'opted_out');
CREATE TYPE staff_role      AS ENUM ('admin', 'receptionist', 'doctor');
CREATE TYPE consent_kind    AS ENUM ('reminder_call', 'sms', 'call_recording');

-- ---------------------------------------------------------------- clinic and people
CREATE TABLE clinics (
    id          bigserial PRIMARY KEY,
    name        text NOT NULL,
    phone       text,                                  -- the number callers dial
    address     text,
    timezone    text NOT NULL DEFAULT 'Asia/Kolkata',
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- One row per clinic: every proposed default from flows/README.md, editable.
CREATE TABLE clinic_settings (
    clinic_id                 bigint PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
    window_minutes            int  NOT NULL DEFAULT 30  CHECK (window_minutes > 0),
    window_capacity           int  NOT NULL DEFAULT 4   CHECK (window_capacity > 0),
    urgent_places_per_window  int  NOT NULL DEFAULT 1   CHECK (urgent_places_per_window >= 0),
    urgent_release_minutes    int  NOT NULL DEFAULT 120 CHECK (urgent_release_minutes >= 0),
    hold_seconds              int  NOT NULL DEFAULT 90,
    same_day_cutoff_minutes   int  NOT NULL DEFAULT 30,
    delay_sms_threshold_min   int  NOT NULL DEFAULT 20,
    delay_sms_cap             int  NOT NULL DEFAULT 2,
    delay_staff_alert_min     int  NOT NULL DEFAULT 60,
    next_patient_watchdog_min int  NOT NULL DEFAULT 30,
    max_offer_rounds          int  NOT NULL DEFAULT 3,
    verification_attempts     int  NOT NULL DEFAULT 2,
    urgent_callback_minutes   int  NOT NULL DEFAULT 15,
    outbound_start_hour       int  NOT NULL DEFAULT 9  CHECK (outbound_start_hour BETWEEN 0 AND 23),
    outbound_end_hour         int  NOT NULL DEFAULT 21 CHECK (outbound_end_hour BETWEEN 0 AND 23),
    outbound_max_retries      int  NOT NULL DEFAULT 2,
    outbound_retry_gap_hours  int  NOT NULL DEFAULT 2,
    staff_on_desk             boolean NOT NULL DEFAULT false,   -- the switch the transfer flow checks
    staff_transfer_number     text
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
    id                 bigserial PRIMARY KEY,
    clinic_id          bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name               text NOT NULL,
    specialty          text,
    google_calendar_id text,        -- doctor's personal calendar: read for busy time only
    clinic_calendar_id text,        -- shared "Clinic bookings" calendar: written as a mirror
    active             boolean NOT NULL DEFAULT true
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

CREATE TABLE urgent_criteria (        -- doctor-owned list used by check_urgent_criteria
    id         bigserial PRIMARY KEY,
    doctor_id  bigint NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    label      text NOT NULL,
    keywords   text[] NOT NULL DEFAULT '{}',
    active     boolean NOT NULL DEFAULT true
);

CREATE TABLE restricted_medicines (   -- "visit required" list for the refill flow
    id         bigserial PRIMARY KEY,
    clinic_id  bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name       text NOT NULL,
    note       text
);

-- ---------------------------------------------------------------- patients
CREATE TABLE patients (
    id             bigserial PRIMARY KEY,
    clinic_id      bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    full_name      text NOT NULL,
    name_phonetic  text,                -- e.g. double metaphone or soundex, for fuzzy match
    date_of_birth  date,
    age_years      int,                 -- used when only an age is known
    file_number    text,                -- clinic's own patient / UHID-style number
    file_complete  boolean NOT NULL DEFAULT false,   -- false = provisional record from the agent
    created_via    booking_source NOT NULL DEFAULT 'agent',
    created_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (clinic_id, file_number)
);
CREATE INDEX patients_name_idx  ON patients (clinic_id, lower(full_name));
CREATE INDEX patients_phon_idx  ON patients (clinic_id, name_phonetic);

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
    id             bigserial PRIMARY KEY,
    doctor_id      bigint NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    session_date   date NOT NULL,
    planned_start  timestamptz NOT NULL,
    planned_end    timestamptz NOT NULL,
    status         session_status NOT NULL DEFAULT 'planned',
    actual_start   timestamptz,                -- staff tap "Session started"
    cancel_reason  text,                       -- internal only, never read to callers
    avg_consult_min numeric(5,2),              -- rolling average, updated by the console
    last_next_tap  timestamptz,                -- feeds the 30-minute watchdog
    est_delay_min  int NOT NULL DEFAULT 0,     -- current estimate, 0 when on time
    est_updated_at timestamptz,
    CHECK (planned_end > planned_start),
    UNIQUE (doctor_id, planned_start)
);

CREATE TABLE windows (
    id               bigserial PRIMARY KEY,
    session_id       bigint NOT NULL REFERENCES doctor_sessions(id) ON DELETE CASCADE,
    starts_at        timestamptz NOT NULL,     -- planned
    ends_at          timestamptz NOT NULL,
    shift_minutes    int NOT NULL DEFAULT 0,   -- delay shift applied after threshold is crossed
    capacity         int NOT NULL CHECK (capacity > 0),
    urgent_places    int NOT NULL DEFAULT 0 CHECK (urgent_places >= 0),
    urgent_released  boolean NOT NULL DEFAULT false,   -- true once urgent places go to routine
    CHECK (ends_at > starts_at),
    CHECK (urgent_places <= capacity),
    -- Windows of one session never overlap (this is where a GiST exclusion IS the right tool):
    EXCLUDE USING gist (session_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
);

CREATE TABLE bookings (
    id                    bigserial PRIMARY KEY,
    patient_id            bigint NOT NULL REFERENCES patients(id),
    window_id             bigint NOT NULL REFERENCES windows(id),
    doctor_id             bigint NOT NULL REFERENCES doctors(id),
    visit_type            visit_type NOT NULL DEFAULT 'first_visit',
    priority              booking_priority NOT NULL DEFAULT 'routine',
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
    delay_sms_count       int NOT NULL DEFAULT 0,
    created_by_call_id    bigint,                -- FK added after calls table
    created_at            timestamptz NOT NULL DEFAULT now(),
    CHECK ((status = 'held') = (hold_expires_at IS NOT NULL))
);
CREATE INDEX bookings_window_idx  ON bookings (window_id);
CREATE INDEX bookings_patient_idx ON bookings (patient_id, status);
CREATE INDEX bookings_doctor_day  ON bookings (doctor_id, status);

-- A patient cannot hold two live bookings in the same window.
-- Note: an expired hold keeps status 'held' until a cleanup job (every minute) sets it to
-- 'cancelled'; until then it still blocks that same patient from re-booking that window.
CREATE UNIQUE INDEX bookings_one_live_per_patient_window
    ON bookings (patient_id, window_id)
    WHERE status IN ('held', 'booked', 'arrived', 'in_consult');

-- Capacity rule. A window has many places, so a time-range exclusion cannot protect it;
-- a row lock on the window plus a count does. Held bookings count only while the hold is live.
-- Routine places = capacity - urgent_places, unless urgent places were released.
CREATE FUNCTION enforce_window_capacity() RETURNS trigger AS $$
DECLARE
    w            windows%ROWTYPE;
    live_routine int;
    live_urgent  int;
BEGIN
    IF NEW.status NOT IN ('held', 'booked', 'arrived', 'in_consult') THEN
        RETURN NEW;
    END IF;

    SELECT * INTO w FROM windows WHERE id = NEW.window_id FOR UPDATE;   -- serialises writers

    SELECT count(*) FILTER (WHERE priority = 'routine'),
           count(*) FILTER (WHERE priority = 'urgent')
      INTO live_routine, live_urgent
      FROM bookings b
     WHERE b.window_id = NEW.window_id
       AND b.id IS DISTINCT FROM NEW.id
       AND b.status IN ('held', 'booked', 'arrived', 'in_consult')
       AND (b.status <> 'held' OR b.hold_expires_at > now());

    IF NEW.priority = 'urgent' THEN
        IF live_urgent + 1 > w.urgent_places THEN
            RAISE EXCEPTION 'window % has no urgent place left', w.id USING ERRCODE = 'P0001';
        END IF;
    ELSIF w.urgent_released THEN
        -- urgent places were released: routine may use any place nobody else holds
        IF live_routine + live_urgent + 1 > w.capacity THEN
            RAISE EXCEPTION 'window % is full', w.id USING ERRCODE = 'P0001';
        END IF;
    ELSE
        IF live_routine + 1 > w.capacity - w.urgent_places THEN
            RAISE EXCEPTION 'window % is full', w.id USING ERRCODE = 'P0001';
        END IF;
    END IF;

    IF live_routine + live_urgent + 1 > w.capacity THEN
        RAISE EXCEPTION 'window % is over capacity', w.id USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_capacity
    BEFORE INSERT OR UPDATE OF window_id, status, priority ON bookings
    FOR EACH ROW EXECUTE FUNCTION enforce_window_capacity();

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
    intent              text,                   -- booking, change, cancel, info, message, ...
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
    method      text NOT NULL,                           -- name_dob, phone_last4
    result      text NOT NULL CHECK (result IN ('matched', 'no_match', 'ambiguous', 'failed')),
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
    due_at           timestamptz,                         -- P1: created + urgent_callback_minutes
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
-- Open places per window, routine and urgent shown separately. Expired holds do not count.
CREATE VIEW window_availability AS
SELECT w.id                       AS window_id,
       s.doctor_id,
       s.id                       AS session_id,
       w.starts_at + make_interval(mins => w.shift_minutes) AS shifted_start,
       w.ends_at   + make_interval(mins => w.shift_minutes) AS shifted_end,
       w.capacity,
       w.urgent_places,
       w.urgent_released,
       COALESCE(c.live_routine, 0) AS routine_taken,
       COALESCE(c.live_urgent, 0)  AS urgent_taken,
       GREATEST(CASE WHEN w.urgent_released
                     THEN w.capacity - COALESCE(c.live_routine, 0) - COALESCE(c.live_urgent, 0)
                     ELSE w.capacity - w.urgent_places - COALESCE(c.live_routine, 0)
                END, 0)                                                   AS routine_open,
       GREATEST(LEAST(w.urgent_places - COALESCE(c.live_urgent, 0),
                      w.capacity - COALESCE(c.live_routine, 0) - COALESCE(c.live_urgent, 0)), 0)
                                                                          AS urgent_open
  FROM windows w
  JOIN doctor_sessions s ON s.id = w.session_id AND s.status IN ('planned', 'started')
  LEFT JOIN LATERAL (
        SELECT count(*) FILTER (WHERE b.priority = 'routine') AS live_routine,
               count(*) FILTER (WHERE b.priority = 'urgent')  AS live_urgent
          FROM bookings b
         WHERE b.window_id = w.id
           AND b.status IN ('held', 'booked', 'arrived', 'in_consult')
           AND (b.status <> 'held' OR b.hold_expires_at > now())
  ) c ON true;
