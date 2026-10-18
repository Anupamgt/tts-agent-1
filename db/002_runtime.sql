-- Runtime additions for the local voice prototype.
-- Apply after db/schema.sql:
--   psql "$DATABASE_URL" -f db/schema.sql
--   psql "$DATABASE_URL" -f db/seed.sql
--   psql "$DATABASE_URL" -f db/002_runtime.sql
--   psql "$DATABASE_URL" -f db/seed_runtime.sql
--
-- The clinic model (doctors, windows, bookings, payments, tickets) stays in schema.sql.
-- This file adds the call runtime the console needs: live phase, transcript segments,
-- hash-chained decision traces, recordings, human handoff, report status, and
-- previous operational interactions.
--
-- Report rows have no column for a result value, unit, or finding. The agent can
-- say whether a test is pending or ready to collect. It cannot read a result,
-- because the database does not store one.

ALTER TABLE calls
    ADD COLUMN phase text NOT NULL DEFAULT 'created'
        CHECK (phase IN (
            'created', 'ringing', 'ai_active', 'handoff_queued', 'with_staff', 'ended'
        )),
    ADD COLUMN persona_key text,
    ADD COLUMN livekit_room text,
    ADD COLUMN ai_leg_status text,
    ADD COLUMN disposition text
        CHECK (disposition IS NULL OR disposition IN (
            'in_progress', 'booked', 'rescheduled', 'cancelled', 'info_provided',
            'ticket_created', 'callback_queued', 'transferred_to_human',
            'emergency_redirected', 'abandoned', 'verification_failed', 'out_of_scope'
        )),
    ADD COLUMN disposition_by text
        CHECK (disposition_by IS NULL OR disposition_by IN ('agent', 'staff', 'system')),
    ADD COLUMN verification_mode text
        CHECK (verification_mode IS NULL OR verification_mode IN ('full', 'limited'));

CREATE INDEX calls_phase_idx ON calls (clinic_id, phase, started_at DESC);

-- Backstop for every patient read. MCPs call this inside the same transaction
-- as the read. A relative (limited mode) may book and see booking status.
-- Report status and previous interactions require full mode.
CREATE FUNCTION require_verified_patient(
    p_call_id bigint,
    p_patient_id bigint,
    p_allow_limited boolean
) RETURNS void AS $$
DECLARE
    c calls%ROWTYPE;
BEGIN
    SELECT * INTO c FROM calls WHERE id = p_call_id;
    IF NOT FOUND OR NOT c.verified OR c.patient_id IS DISTINCT FROM p_patient_id THEN
        RAISE EXCEPTION 'patient % is not verified on call %', p_patient_id, p_call_id
            USING ERRCODE = '42501';
    END IF;
    IF c.verification_mode = 'limited' AND NOT p_allow_limited THEN
        RAISE EXCEPTION 'limited mode on call % cannot read patient %', p_call_id, p_patient_id
            USING ERRCODE = '42501';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- One row per spoken turn, including turns after a person takes the call.
CREATE TABLE transcript_segments (
    id          bigserial PRIMARY KEY,
    call_id     bigint NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    seq         int NOT NULL,
    speaker     text NOT NULL CHECK (speaker IN ('caller', 'agent', 'staff', 'system')),
    leg         text NOT NULL CHECK (leg IN ('ai', 'human')),
    source      text NOT NULL CHECK (source IN ('room_stt', 'bolna', 'staff', 'system')),
    text_body   text NOT NULL,
    language    text,
    started_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (call_id, seq)
);
CREATE INDEX transcript_segments_call_idx ON transcript_segments (call_id, seq);

-- Hash-chained decision trace. seq 0 has prev_hash of 64 zeros.
-- record_hash = sha256(prev_hash || canonical_json(row without the two hash columns)).
-- Consumers ignore the row when event_id was already stored (webhook and Kafka retries).
CREATE TABLE decision_traces (
    id            bigserial PRIMARY KEY,
    call_id       bigint NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    seq           int NOT NULL,
    event_id      uuid NOT NULL UNIQUE,
    event_type    text NOT NULL CHECK (event_type IN (
                      'call_started', 'turn_user', 'turn_agent', 'turn_staff',
                      'tool_call', 'mcp_call', 'data_access', 'verification',
                      'decision', 'compliance_flag', 'escalation',
                      'disposition_set', 'call_ended'
                  )),
    severity      text NOT NULL CHECK (severity IN ('info', 'warning', 'violation')),
    ts            timestamptz NOT NULL,
    payload       jsonb NOT NULL,
    prev_hash     text NOT NULL,
    record_hash   text NOT NULL,
    UNIQUE (call_id, seq)
);
CREATE INDEX decision_traces_call_idx ON decision_traces (call_id, seq);
CREATE INDEX decision_traces_severity_idx ON decision_traces (severity, ts DESC);

-- Idempotency for Bolna tool retries. The gateway returns the stored response
-- when the same call, tool, and args hash succeeded in the last 15 seconds.
CREATE TABLE tool_invocations (
    id             bigserial PRIMARY KEY,
    call_id        bigint NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    tool_name      text NOT NULL,
    args_hash      text NOT NULL,
    request_json   jsonb NOT NULL,
    response_json  jsonb,
    ok             boolean,
    http_status    int,
    latency_ms     int,
    created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tool_invocations_dedupe_idx
    ON tool_invocations (call_id, tool_name, args_hash, created_at DESC);

-- full  = the LiveKit room mix, from the first audio frame through staff hangup
-- ai_bolna = Bolna's own recording URL, available only after the AI leg completes
CREATE TABLE recordings (
    id          bigserial PRIMARY KEY,
    call_id     bigint NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    leg         text NOT NULL CHECK (leg IN ('full', 'ai_bolna')),
    storage     text NOT NULL CHECK (storage IN ('local', 'bolna')),
    uri         text NOT NULL,
    started_at  timestamptz,
    ended_at    timestamptz,
    byte_size   bigint,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (call_id, leg)
);

-- One handoff attempt per call. transcript_snapshot is the turns up to the
-- moment staff were asked, so the handoff page renders even if the socket drops.
-- Later turns keep appending to transcript_segments.
CREATE TABLE handoff_sessions (
    id                    bigserial PRIMARY KEY,
    call_id               bigint NOT NULL UNIQUE REFERENCES calls(id) ON DELETE CASCADE,
    clinic_id             bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    status                text NOT NULL CHECK (status IN (
                              'queued', 'accepted', 'timeout', 'completed', 'cancelled'
                          )),
    priority              callback_priority NOT NULL,
    reason                text NOT NULL,
    summary               text NOT NULL,
    transcript_snapshot   jsonb NOT NULL DEFAULT '[]',
    patient_id            bigint REFERENCES patients(id),
    verified              boolean NOT NULL DEFAULT false,
    verification_mode     text,
    queued_at             timestamptz NOT NULL DEFAULT now(),
    accepted_at           timestamptz,
    accepted_by           bigint REFERENCES staff_users(id),
    ended_at              timestamptz,
    staff_note            text
);
CREATE INDEX handoff_queue_idx ON handoff_sessions (clinic_id, status, priority, queued_at);

-- Non-clinical report status. There is no result column on purpose.
CREATE TABLE lab_orders (
    id          bigserial PRIMARY KEY,
    clinic_id   bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id  bigint NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    label       text NOT NULL,
    status      text NOT NULL CHECK (status IN ('pending', 'ready_for_pickup', 'collected')),
    ordered_on  date NOT NULL,
    ready_on    date,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CHECK (status <> 'ready_for_pickup' OR ready_on IS NOT NULL)
);
CREATE INDEX lab_orders_patient_idx ON lab_orders (patient_id, ordered_on DESC);

-- Operational history the agent may read back: visits, calls, tickets.
-- Summaries describe what the desk did, not a diagnosis or a measurement.
CREATE TABLE patient_interactions (
    id           bigserial PRIMARY KEY,
    clinic_id    bigint NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id   bigint NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    happened_on  date NOT NULL,
    kind         text NOT NULL CHECK (kind IN ('visit', 'call', 'ticket')),
    summary      text NOT NULL,
    doctor_name  text,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX patient_interactions_patient_idx
    ON patient_interactions (patient_id, happened_on DESC);

-- Personas the mock phone offers. Fictional numbers only.
CREATE TABLE caller_personas (
    key           text PRIMARY KEY,
    display_name  text NOT NULL,
    phone         text NOT NULL,
    note          text NOT NULL
);
