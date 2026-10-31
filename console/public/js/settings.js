/* Settings catalog: sections, rows, and per-role access. Vanilla IIFE, no modules. */
(function () {
  'use strict';

  function roles(receptionist, assistant, doctor, admin) {
    return {
      receptionist: receptionist,
      assistant: assistant,
      doctor: doctor,
      admin: admin
    };
  }

  var ALL_W = roles('w', 'w', 'w', 'w');
  var ALL_R = roles('r', 'r', 'r', 'r');
  var DESK_LOCK = roles('w', '', 'r', 'w');
  var WAITING_PRIVACY = roles('w', 'w', 'r', 'w');
  var DESK_STATUS = roles('r', '', '', 'r');
  var CLINIC_INFO = roles('r', '', 'r', 'w');
  var ADMIN_REC = roles('r', '', '', 'w');
  var DOCTOR_FIELDS = roles('r', '', 'r', 'w');
  var SAFETY_ADMIN = roles('', '', '', 'w');
  var SAFETY_REFILL = roles('', '', 'r', 'w');
  var RETENTION = roles('r', '', 'r', 'w');
  var ADMIN_ONLY = roles('', '', '', 'w');
  var AUDIT_VIEW = roles('r', '', '', 'r');

  function row(id, section, label, help, bind, type, def, roleMap, options) {
    var item = {
      id: id,
      section: section,
      label: label,
      help: help,
      bind: bind,
      type: type,
      def: def,
      roles: roleMap
    };
    if (options) item.options = options;
    return item;
  }

  var LANG_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' }
  ];
  var AFTER_CAP_OPTIONS = [
    { value: 'ask_patient', label: 'Ask the patient' },
    { value: 'move_to_next_available', label: 'Move to next available' },
    { value: 'silent_shift', label: 'Silent shift' }
  ];
  var REMINDER_OPTIONS = [
    { value: 'sms', label: 'SMS' },
    { value: 'call', label: 'Call' }
  ];

  function doctorRows(slug, index, name, defaults) {
    var prefix = 'doctors.' + index + '.';
    var idPrefix = 'doc-' + slug + '-';
    return [
      row(idPrefix + 'window', 'doctors', name + ' · Window length (min)', 'Default ' + defaults.windowMin + '. Places are shared inside the window.', prefix + 'windowMin', 'number', defaults.windowMin, DOCTOR_FIELDS),
      row(idPrefix + 'capacity', 'doctors', name + ' · Capacity', 'Default ' + defaults.capacity + ' places in each arrival window.', prefix + 'capacity', 'number', defaults.capacity, DOCTOR_FIELDS),
      row(idPrefix + 'priority-places', 'doctors', name + ' · Priority places', 'Specialists only. General doctors stay at 0.', prefix + 'priorityPlaces', 'number', defaults.priorityPlaces, DOCTOR_FIELDS),
      row(idPrefix + 'appointment-fee', 'doctors', name + ' · Appointment fee', 'Empty means none. Doctors cannot edit fees.', prefix + 'appointmentFee', 'number', defaults.appointmentFee, DOCTOR_FIELDS),
      row(idPrefix + 'priority-fee', 'doctors', name + ' · Priority fee', 'Not offered by general doctors. Empty means none.', prefix + 'priorityFee', 'number', defaults.priorityFee, DOCTOR_FIELDS),
      row(idPrefix + 'consult', 'doctors', name + ' · Planned consult (min)', 'Default ' + defaults.consultMin + '. Used only for the finish estimate.', prefix + 'consultMin', 'number', defaults.consultMin, DOCTOR_FIELDS)
    ];
  }

  window.SETTINGS_NAV = [
    { group: 'you', label: 'Your preferences', id: 'profile' },
    { group: 'you', id: 'language', label: 'Language' },
    { group: 'you', id: 'notifications', label: 'Notifications' },
    { group: 'you', id: 'desk', label: 'Desk and lock' },
    { group: 'clinic', label: 'Clinic', id: 'clinic' },
    { group: 'clinic', id: 'hours', label: 'Hours and info' },
    { group: 'clinic', id: 'doctors', label: 'Doctors' },
    { group: 'clinic', id: 'payments', label: 'Payments and refunds' },
    { group: 'clinic', id: 'delays', label: 'Delays and queue' },
    { group: 'clinic', id: 'calls', label: 'Calls and callbacks' },
    { group: 'clinic', id: 'limits', label: 'Safety and limits' },
    { group: 'clinic', id: 'privacy', label: 'Privacy and retention' },
    { group: 'clinic', id: 'staff', label: 'Staff and devices' },
    { group: 'clinic', id: 'audit', label: 'Audit' }
  ];

  window.SETTINGS_ROWS = [].concat(
    [
      row('profile-name', 'profile', 'Name', 'The name on this signed-in session.', 'user.name', 'status', '', ALL_R),
      row('profile-role', 'profile', 'Role', 'Reception, cabin, doctor, or admin. Demo PIN stays on the sign-in card.', 'user.role', 'status', '', ALL_R),
      row('language', 'language', 'Language', 'English or Hindi for this desk. Does not change the caller’s language.', 'lang', 'select', 'en', ALL_W, LANG_OPTIONS),
      row('notify-callback', 'notifications', 'New callback', 'Toast when a new callback lands in the queue.', 'settings.notifyCallback', 'switch', true, ALL_W),
      row('notify-failed', 'notifications', 'Failed message', 'Toast when an SMS or WhatsApp send fails.', 'settings.notifyFailed', 'switch', true, ALL_W),
      row('notify-delay', 'notifications', 'Live delay', 'Toast when a cabin delay crosses the SMS threshold.', 'settings.notifyDelay', 'switch', true, ALL_W),
      row('auto-lock', 'desk', 'Auto-lock (minutes)', 'Default 3. Locks this shared PC after idle time.', 'settings.autoLockMin', 'number', 3, DESK_LOCK),
      row('privacy-numbers', 'desk', 'Waiting-room privacy numbers', 'Show patient numbers instead of names on the waiting-room display.', 'privacyNumbers', 'switch', false, WAITING_PRIVACY),
      row('staff-on-desk', 'desk', 'Staff on desk', 'Live switch stays on the Today top bar. Settings only shows the current state.', 'staffOnDesk', 'status', true, DESK_STATUS),
      row('clinic-name', 'clinic', 'Clinic name', 'The name the agent speaks. Patients never hear “Deskie”.', 'clinic', 'text', 'Demo Family Clinic', CLINIC_INFO),
      row('clinic-address', 'clinic', 'Address', 'Default: 12 Example Road, Chandigarh.', 'address', 'text', '12 Example Road, Chandigarh', CLINIC_INFO),
      row('timezone', 'clinic', 'Timezone', 'Default Asia/Kolkata. Outbound hours follow this zone.', 'settings.timezone', 'text', 'Asia/Kolkata', ADMIN_REC),
      row('clinic-phone', 'clinic', 'Clinic phone', 'Default +91 98000 00000. Printed on messages and the day summary.', 'settings.clinicPhone', 'text', '+91 98000 00000', ADMIN_REC),
      row('hours', 'hours', 'Hours', 'Default: Mon–Fri 5:00–8:00 pm, Sat 10:00 am–1:00 pm.', 'settings.hours', 'area', 'Monday to Friday 5:00–8:00 pm, Saturday 10:00 am–1:00 pm. Closed Sunday.', CLINIC_INFO),
      row('hours-hi', 'hours', 'Hours in Hindi', 'Shown when the console language is Hindi. Needs a native speaker’s review before a real clinic.', 'settings.hoursHi', 'area', 'Somvar se Shukravaar sham 5 se 8 baje, Shanivar subah 10 se 1 baje. Ravivar band.', CLINIC_INFO),
      row('address-hi', 'hours', 'Address in Hindi', 'Hindi info answer for the agent and the desk.', 'settings.addressHi', 'area', '12 Example Road, Chandigarh, post office ke paas.', CLINIC_INFO),
      row('holidays', 'hours', 'Holidays', 'Default: Sunday and 2 Oct.', 'settings.holidays', 'text', 'Sunday. 2 Oct.', CLINIC_INFO),
      row('parking-en', 'hours', 'Parking', 'Info answer.', 'settings.parkingEn', 'area', 'Street parking on Example Road. The clinic has no own parking.', CLINIC_INFO),
      row('parking-hi', 'hours', 'Parking in Hindi', 'Hindi info answer.', 'settings.parkingHi', 'area', 'Example Road par sadak par gaadi khadi kar sakte hain. Clinic ki apni parking nahi hai.', CLINIC_INFO),
      row('fees-en', 'hours', 'Fees', 'Info answer. General visits have no booking fee.', 'settings.feesEn', 'area', 'General consultation has no booking fee. Dr Kaur (paediatrics) has an appointment fee of ₹200. A priority visit with her is ₹500 more.', CLINIC_INFO),
      row('fees-hi', 'hours', 'Fees in Hindi', 'Hindi info answer.', 'settings.feesHi', 'area', 'General doctor ki booking fee nahi hai. Dr Kaur ki appointment fee ₹200 hai. Priority visit ₹500 extra hai.', CLINIC_INFO),
      row('pay-en', 'hours', 'Payment', 'UPI link or cash. Never ask for a PIN.', 'settings.payEn', 'area', 'Pay by the UPI link we send on WhatsApp, or in cash at the desk. We never ask for a UPI PIN.', CLINIC_INFO),
      row('pay-hi', 'hours', 'Payment in Hindi', 'Hindi info answer.', 'settings.payHi', 'area', 'WhatsApp par UPI link se, ya desk par cash. Hum kabhi UPI PIN nahi maangte.', CLINIC_INFO),
      row('refund-en', 'hours', 'Refunds', 'Clinic-caused: full. 24 h or more: full. Later: half.', 'settings.refundEn', 'area', 'If the doctor cannot see you, we refund in full. Cancel 24 hours or more before and the refund is full. Later than that, half.', CLINIC_INFO),
      row('refund-hi', 'hours', 'Refunds in Hindi', 'Hindi info answer.', 'settings.refundHi', 'area', 'Doctor na dekh payein to poori refund. 24 ghante pehle cancel karne par poori, uske baad aadhi.', CLINIC_INFO)
    ],
    doctorRows('sharma', 0, 'Dr Sharma', { windowMin: 30, capacity: 4, priorityPlaces: 0, appointmentFee: null, priorityFee: null, consultMin: 12 }),
    doctorRows('verma', 1, 'Dr Verma', { windowMin: 30, capacity: 4, priorityPlaces: 0, appointmentFee: null, priorityFee: null, consultMin: 12 }),
    doctorRows('kaur', 2, 'Dr Kaur', { windowMin: 30, capacity: 4, priorityPlaces: 1, appointmentFee: 200, priorityFee: 500, consultMin: 15 }),
    [
      row('link-minutes', 'payments', 'Link validity (min)', 'Default 30 min. After that the link expires and the desk can take cash.', 'settings.linkMinutes', 'number', 30, ADMIN_REC),
      row('reminders', 'payments', 'Reminders', 'Default 1 reminder before a link expires.', 'settings.reminders', 'number', 1, ADMIN_REC),
      row('pay-to-keep', 'payments', 'Payment required to keep the booking', 'Default off. Unpaid UPI links stay booked and can be paid at the desk.', 'settings.payToKeep', 'switch', false, ADMIN_REC),
      row('sms-payment-links', 'payments', 'Payment links by SMS', 'Default off. WhatsApp is the usual channel. SMS only if the clinic allows it.', 'settings.smsPaymentLinks', 'switch', false, ADMIN_REC),
      row('refund-full-hours', 'payments', 'Full refund if cancelled before (hours)', 'Default 24. Cancel sooner than this and the later share applies.', 'settings.refundFullHours', 'number', 24, ADMIN_REC),
      row('refund-late-share', 'payments', 'Later cancellation refund (%)', 'Default 50. Clinic-caused cancellations stay at 100%.', 'settings.refundLateShare', 'number', 50, ADMIN_REC),
      row('refund-approval', 'payments', 'Refund approval required', 'Default on. The person who raised a refund cannot approve it.', 'settings.refundApproval', 'switch', true, ADMIN_REC),
      row('delay-threshold', 'delays', 'SMS threshold (min)', 'Default 20 min. Delay messages start at this lateness. The chip turns amber, never red.', 'settings.delayThreshold', 'number', 20, ADMIN_REC),
      row('delay-min-change', 'delays', 'Minimum delay change (min)', 'Default 15. A later update is sent only when the delay moves by this much.', 'settings.delayMinChange', 'number', 15, ADMIN_REC),
      row('max-delay-sms', 'delays', 'Max delay messages', 'Default 2. After that, a delay-choice call asks the patient to keep the place or move.', 'settings.maxDelaySms', 'number', 2, ADMIN_REC),
      row('after-cap-action', 'delays', 'After the delay cap', 'Default: ask the patient. Keep, move, or cancel. Not a silent move.', 'settings.afterCapAction', 'select', 'ask_patient', ADMIN_REC, AFTER_CAP_OPTIONS),
      row('watchdog', 'delays', 'Call next watchdog (min)', 'Default 30 min. With no tap, the delay is marked schedule only.', 'settings.watchdog', 'number', 30, ADMIN_REC),
      row('hold-seconds', 'delays', 'Hold length (seconds)', 'Default 90. How long the agent keeps a window while details are collected.', 'settings.holdSeconds', 'number', 90, ADMIN_REC),
      row('same-day-cutoff', 'delays', 'Same-day cutoff (min)', 'Default 30. A same-day window must start at least this many minutes from now.', 'settings.sameDayCutoff', 'number', 30, ADMIN_REC),
      row('no-show-grace', 'delays', 'No-show grace (min)', 'Default 30. Arrived patients are marked no-show after this wait.', 'settings.noShowGrace', 'number', 30, ADMIN_REC),
      row('priority-release', 'delays', 'Priority place release (min)', 'Default 120. Unsold priority places open to regular booking this many minutes before the session.', 'settings.priorityRelease', 'number', 120, ADMIN_REC),
      row('max-offer-rounds', 'delays', 'Max offer rounds', 'Default 3. How many times a booking can be offered a move.', 'settings.maxOfferRounds', 'number', 3, ADMIN_REC),
      row('transfer', 'calls', 'Staff transfer number', 'Default +91 98000 00000. Used only when staff on desk is on.', 'settings.transfer', 'text', '+91 98000 00000', ADMIN_REC),
      row('outbound-from', 'calls', 'Outbound from', 'Default 9:00 am. Reminders and delay calls stay inside these hours.', 'settings.outboundFrom', 'text', '9:00 am', ADMIN_REC),
      row('outbound-to', 'calls', 'Outbound to', 'Default 9:00 pm.', 'settings.outboundTo', 'text', '9:00 pm', ADMIN_REC),
      row('retries', 'calls', 'Retries', 'Default 2. After two no-answers the desk sends an SMS.', 'settings.retries', 'number', 2, ADMIN_REC),
      row('retry-gap-hours', 'calls', 'Retry gap (hours)', 'Default 2. Wait at least this long between outbound retries.', 'settings.retryGapHours', 'number', 2, ADMIN_REC),
      row('reminder-channel', 'calls', 'Reminder channel', 'Default SMS in the pilot. Calls only after the clinic number is registered.', 'settings.reminderChannel', 'select', 'sms', ADMIN_REC, REMINDER_OPTIONS),
      row('p1-minutes', 'calls', 'P1 callback (min)', 'Default 15. Emergency and self-harm callbacks are due within this time.', 'settings.p1Minutes', 'number', 15, ADMIN_REC),
      row('p2-minutes', 'calls', 'P2 callback (min)', 'Default 120. Standard callbacks due the same day if before 6 pm.', 'settings.p2Minutes', 'number', 120, ADMIN_REC),
      row('verify-attempts', 'limits', 'Verification attempts', 'Default 2. Name + patient ID, then name + date of birth.', 'settings.verifyAttempts', 'number', 2, SAFETY_ADMIN),
      row('verify-lockout', 'limits', 'Verification lockout', 'Default 5 failed checks in 24 hours lock the number.', 'settings.verifyLockout', 'number', 5, SAFETY_ADMIN),
      row('max-upcoming', 'limits', 'Max upcoming visits', 'Default 3 open upcoming bookings per patient.', 'settings.maxUpcoming', 'number', 3, SAFETY_ADMIN),
      row('max-agent-bookings', 'limits', 'Max agent bookings per number / day', 'Default 4. Abuse limit on agent-made bookings from one phone.', 'settings.maxAgentBookings', 'number', 4, SAFETY_ADMIN),
      row('refill-followup-days', 'limits', 'Refill follow-up (days)', 'Default 180. Same doctor, in-person visit within this window.', 'settings.refillFollowupDays', 'number', 180, SAFETY_REFILL),
      row('refill-runout-days', 'limits', 'Refill runout (days)', 'Default 2. Same-day callback when tablets left are at or below this.', 'settings.refillRunoutDays', 'number', 2, SAFETY_REFILL),
      row('refill-per-30', 'limits', 'Refill requests / 30 days', 'Default 4. Extra requests become a staff callback.', 'settings.refillPer30', 'number', 4, SAFETY_REFILL),
      row('recording-days', 'privacy', 'Call recordings (days)', 'Default 30. Audio is kept this long, then purged.', 'settings.recordingDays', 'number', 30, RETENTION),
      row('transcript-days', 'privacy', 'Transcripts (days)', 'Default 180. Transcript and trace text retention.', 'settings.transcriptDays', 'number', 180, RETENTION),
      row('access-log-days', 'privacy', 'Access and audit logs (days)', 'Default 365. Access and audit logs kept one year.', 'settings.accessLogDays', 'number', 365, RETENTION),
      row('refill-record-days', 'privacy', 'Refill records (days)', 'Default 1095. Refill and doctor-message tickets kept three years.', 'settings.refillRecordDays', 'number', 1095, RETENTION),
      row('export-day', 'staff', 'Export day summary', 'Download today’s counts for the clinic folder.', 'export-day', 'action', 'export-day', ADMIN_ONLY),
      row('signout', 'staff', 'Sign this device out', 'Signs out this browser only. Cabin and doctor phones stay signed in.', 'signout', 'action', 'signout', ALL_W),
      row('remote-signout', 'staff', 'Remote sign-out', 'Sign out a doctor or cabin phone from this desk. Writes an audit line.', 'remote-signout', 'action', 'remote-signout', ADMIN_ONLY),
      row('audit-log', 'audit', 'Recent settings changes', 'Who changed a setting, when, and which field. The list is rendered by the app.', 'audit', 'status', '', AUDIT_VIEW)
    ]
  );

  function queryText(query) {
    return String(query || '').toLowerCase().replace(/^\s+|\s+$/g, '');
  }

  function rowMatchesQuery(item, query) {
    var q = queryText(query);
    if (!q) return true;
    var label = String(item.label || '').toLowerCase();
    var help = String(item.help || '').toLowerCase();
    return label.indexOf(q) !== -1 || help.indexOf(q) !== -1;
  }

  window.settingAccess = function (role, item) {
    if (!item || !item.roles) return '';
    var access = item.roles[role];
    return access === 'w' || access === 'r' ? access : '';
  };

  window.settingsRowsFor = function (role, section, query) {
    return window.SETTINGS_ROWS.filter(function (item) {
      if (section && item.section !== section) return false;
      if (!window.settingAccess(role, item)) return false;
      return rowMatchesQuery(item, query);
    });
  };

  window.settingsNavFor = function (role, query) {
    return window.SETTINGS_NAV.filter(function (nav) {
      if (role === 'assistant' && nav.group === 'clinic') return false;
      return window.settingsRowsFor(role, nav.id, query).length > 0;
    });
  };
})();
