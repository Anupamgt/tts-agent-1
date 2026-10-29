"""Builds agent/functions.json: the Bolna custom-function definitions for every tool in api/app/tools.

Run:  python3 agent/build_functions.py
Then replace PUBLIC_BASE and TOKEN in the output with $PUBLIC_BASE_URL and $BOLNA_TOOL_TOKEN when pasting into Bolna
(never commit the real values). Shape follows docs/prd/TECHNICAL_PRD.md section 6.
"""
import json
from pathlib import Path

S = "string"
B = "boolean"
CALL_ID = (S, "The call reference from the prompt. Do not ask the caller.")
ONE_MOMENT = "One moment, please."

# name: (description, pre_call_message or None, {param: (type, description, [enum])}, [required besides call_id])
FUNCTIONS = {
    "lookup_caller": (
        "How many patient files are on the calling number. Returns a count only, never names.",
        None, {}, []),
    "match_patient": (
        "Verify the caller with full name plus the patient id on the card, or full name plus date of birth. "
        "Call this before any patient-specific fact or change.",
        "One moment, I am checking the file.",
        {
            "full_name": (S, "Patient full name, as spoken."),
            "patient_code": (S, "Id printed on the card, as spoken. Omit if they do not know it."),
            "date_of_birth": (S, "YYYY-MM-DD. Only when the id is unknown."),
            "phone_last4": (S, "Last four digits of the registered mobile. Only if the previous result asked for them."),
            "caller_is_patient": (B, "False when a relative or someone else is calling for the patient."),
        },
        ["full_name"]),
    "register_patient": (
        "Create a file for a new patient who wants to book. Only after two failed matches, or when the caller says "
        "they are new. The phone number is taken from the line, never from the caller.",
        ONE_MOMENT,
        {
            "full_name": (S, "New patient's full name."),
            "date_of_birth": (S, "YYYY-MM-DD, if known."),
            "age_years": (S, "Age in years, if the date of birth is not known."),
        },
        ["full_name"]),
    "get_clinic_info": (
        "Clinic facts: opening hours, address, fees, priority fee, payment options, refund rules, or the list of doctors. "
        "No verification needed.",
        None,
        {"topic": (S, "Which fact.", ["hours", "address", "fees", "priority_fee", "payment", "refunds", "doctors"])},
        ["topic"]),
    "get_doctor_delay": (
        "Whether a doctor is running late today. No verification needed.",
        ONE_MOMENT, {"doctor_name": (S, "Doctor's name as spoken.")}, ["doctor_name"]),
    "get_available_windows": (
        "Open arrival windows for one doctor, or for the general check-up pool when any doctor is fine. Verified callers only.",
        ONE_MOMENT,
        {
            "doctor_name": (S, "Doctor's name, for a named doctor or a specialist."),
            "pool_name": (S, "Use 'General check-up' when any doctor is fine."),
        },
        []),
    "hold_window": (
        "Hold the chosen arrival window for 90 seconds while the caller confirms. States any fee that needs a yes.",
        ONE_MOMENT,
        {
            "window_id": (S, "window_id from get_available_windows."),
            "any_doctor": (B, "True for the general check-up pool."),
            "priority": (B, "True only for a priority visit the caller asked for."),
        },
        ["window_id"]),
    "create_booking": (
        "Book the chosen window after a clear yes to the window and, when there is a fee, a clear yes to the amount.",
        "One moment, I am booking it.",
        {
            "window_id": (S, "Same window_id as the hold."),
            "fee_consent": (B, "True only if the caller said yes to the fee amount."),
            "payment_method": (S, "How the fee is paid.", ["upi_link", "cash_desk"]),
            "priority": (B, "True only for a priority visit."),
            "any_doctor": (B, "True for the general check-up pool."),
            "visit_type": (S, "Kind of visit.", ["first_visit", "follow_up", "general_checkup", "other"]),
        },
        ["window_id"]),
    "reschedule_booking": (
        "Move the caller's own visit to a new arrival window after a clear yes.",
        ONE_MOMENT,
        {"booking_id": (S, "booking_id from get_booking_status."), "window_id": (S, "New window_id.")},
        ["booking_id", "window_id"]),
    "cancel_booking": (
        "Cancel the caller's own visit after a clear yes.",
        ONE_MOMENT, {"booking_id": (S, "booking_id from get_booking_status.")}, ["booking_id"]),
    "get_booking_status": (
        "Upcoming visits for the verified patient only.", ONE_MOMENT, {}, []),
    "get_report_status": (
        "Status of the verified patient's reports: ready, pending or collected. Never values. Patient only, not relatives.",
        ONE_MOMENT, {}, []),
    "get_previous_interactions": (
        "Recent visits and calls for the verified patient. Patient only, not relatives.",
        ONE_MOMENT, {}, []),
    "create_message_ticket": (
        "Pass a message, or a medicine refill request, to the doctor or desk. Never a decision.",
        ONE_MOMENT,
        {
            "type": (S, "Kind of request.", ["message", "refill", "report_query"]),
            "body": (S, "Short message in the caller's words. Nothing clinical added."),
            "doctor_name": (S, "Doctor the message or medicine is for."),
            "medicine_name": (S, "Refills: the name exactly as read from the strip."),
            "days_left": (S, "Refills: days of medicine left, as a number."),
            "requester_is_guardian": (B, "Refills for a child: true only if the caller said they are the parent or guardian."),
            "new_symptoms_mentioned": (B, "True if the caller mentioned new or worse symptoms."),
        },
        ["type"]),
    "create_callback": (
        "Ask the desk to call the caller back. P1 emergency or self-harm, P2 same day, P3 next session.",
        None,
        {
            "priority": (S, "Callback priority.", ["P1", "P2", "P3"]),
            "reason": (S, "Short reason for the desk."),
            "phone": (S, "Only if the caller asks for a different Indian mobile number, +91 and 10 digits."),
        },
        ["priority", "reason"]),
    "flag_emergency": (
        "Alert the clinic to a possible emergency or self-harm. Call right after saying the emergency line.",
        None,
        {
            "kind": (S, "Kind of emergency.", ["medical", "self_harm"]),
            "snippet": (S, "A few of the caller's own words."),
        },
        ["kind"]),
    "request_human": (
        "Bring someone from the desk into the call. The prompt says the hand-over line itself, so there is no pre-call message.",
        None,
        {
            "priority": (S, "P1 emergency or self-harm, P2 distress or a failed booking, P3 everything else.", ["P1", "P2", "P3"]),
            "reason": (S, "Short reason for the desk."),
        },
        ["priority", "reason"]),
    "request_refund": (
        "Ask the desk to refund a paid fee, after one offer of another window. The amount comes from the clinic's rule; staff approve.",
        ONE_MOMENT, {"booking_id": (S, "booking_id of the paid visit.")}, ["booking_id"]),
    "send_sms": (
        "Text the verified patient's registered mobile with an approved template.",
        None,
        {
            "template_key": (S, "Which message.", ["patient_id", "booking_confirmed", "rescheduled", "cancelled"]),
            "booking_id": (S, "Required for booking_confirmed, rescheduled and cancelled."),
        },
        ["template_key"]),
    "create_payment_link": (
        "Send a UPI payment link for a booked visit's fee by WhatsApp.",
        ONE_MOMENT, {"booking_id": (S, "booking_id from create_booking.")}, ["booking_id"]),
    "set_disposition": (
        "Record how the call ended. Call exactly once, just before the goodbye.",
        None,
        {"disposition": (S, "Outcome.", [
            "booked", "rescheduled", "cancelled", "info_provided", "ticket_created", "callback_queued",
            "transferred_to_human", "emergency_redirected", "verification_failed", "out_of_scope", "abandoned"])},
        ["disposition"]),
}


def build():
    out = []
    for name, (description, pre_call, params, required) in FUNCTIONS.items():
        properties = {"call_id": {"type": CALL_ID[0], "description": CALL_ID[1]}}
        for key, spec in params.items():
            prop = {"type": spec[0], "description": spec[1]}
            if len(spec) > 2:
                prop["enum"] = spec[2]
            properties[key] = prop
        fn = {
            "name": name,
            "description": description,
            "parameters": {"type": "object", "properties": properties, "required": ["call_id", *required]},
            "key": "custom_task",
            "value": {
                "method": "POST",
                "url": f"https://PUBLIC_BASE/v1/tools/{name}",
                "api_token": "Bearer TOKEN",
                "param": {key: f"%({key})s" for key in properties},
            },
        }
        if pre_call:
            fn["pre_call_message"] = pre_call
        if name == "request_human":
            fn["pre_call_webhook_url"] = "https://PUBLIC_BASE/v1/bolna/pre-handoff"
            fn["pre_call_webhook_param"] = {"call_id": "%(call_id)s", "reason": "%(reason)s"}
        out.append(fn)
    return out


if __name__ == "__main__":
    path = Path(__file__).with_name("functions.json")
    path.write_text(json.dumps(build(), indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {path} ({len(FUNCTIONS)} functions)")
