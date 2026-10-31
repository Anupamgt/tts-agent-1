import { getAvailableWindows, holdWindow, createBooking, rescheduleBooking, cancelBooking, getBookingStatus, getDoctorDelay } from './booking.js';
import { getClinicInfo } from './desk.js';
import { lookupCaller, matchPatient, registerPatient } from './identity.js';
import { getPreviousInteractions, getReportStatus } from './records.js';

export const CATALOG = {
  lookup_caller: { mcp: 'identity', run: lookupCaller },
  match_patient: { mcp: 'identity', run: matchPatient },
  register_patient: { mcp: 'identity', run: registerPatient },
  get_available_windows: { mcp: 'booking', run: getAvailableWindows },
  hold_window: { mcp: 'booking', run: holdWindow },
  create_booking: { mcp: 'booking', run: createBooking },
  reschedule_booking: { mcp: 'booking', run: rescheduleBooking },
  cancel_booking: { mcp: 'booking', run: cancelBooking },
  get_booking_status: { mcp: 'booking', run: getBookingStatus },
  get_doctor_delay: { mcp: 'booking', run: getDoctorDelay },
  get_report_status: { mcp: 'records', run: getReportStatus },
  get_previous_interactions: { mcp: 'records', run: getPreviousInteractions },
  get_clinic_info: { mcp: 'desk', run: getClinicInfo },
  create_message_ticket: { mcp: 'desk', run: null },
  create_callback: { mcp: 'desk', run: null },
  flag_emergency: { mcp: 'desk', run: null },
  request_human: { mcp: 'desk', run: null },
  send_sms: { mcp: 'desk', run: null },
  create_payment_link: { mcp: 'desk', run: null },
  request_refund: { mcp: 'desk', run: null },
  set_disposition: { mcp: 'desk', run: null },
};
