from app.tools.booking import (
    cancel_booking,
    create_booking,
    get_available_windows,
    get_booking_status,
    get_doctor_delay,
    hold_window,
    reschedule_booking,
)
from app.tools.desk import (
    create_callback,
    create_message_ticket,
    create_payment_link,
    flag_emergency,
    get_clinic_info,
    request_human,
    request_refund,
    send_sms,
    set_disposition,
)
from app.tools.identity import lookup_caller, match_patient, register_patient
from app.tools.records import get_previous_interactions, get_report_status

TOOLS = {
    "lookup_caller": lookup_caller,
    "match_patient": match_patient,
    "register_patient": register_patient,
    "get_doctor_delay": get_doctor_delay,
    "get_available_windows": get_available_windows,
    "hold_window": hold_window,
    "create_booking": create_booking,
    "reschedule_booking": reschedule_booking,
    "cancel_booking": cancel_booking,
    "get_booking_status": get_booking_status,
    "get_report_status": get_report_status,
    "get_previous_interactions": get_previous_interactions,
    "get_clinic_info": get_clinic_info,
    "create_message_ticket": create_message_ticket,
    "create_callback": create_callback,
    "flag_emergency": flag_emergency,
    "request_human": request_human,
    "request_refund": request_refund,
    "send_sms": send_sms,
    "create_payment_link": create_payment_link,
    "set_disposition": set_disposition,
}
