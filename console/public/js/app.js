(function () {
  'use strict';

  var state = Object.assign(JSON.parse(JSON.stringify(window.SEED)), {
    signedIn: true,
    locked: false,
    userId: 'priya',
    lang: 'en',
    staffOnDesk: true,
    emergencyAck: false,
    search: '',
    callbackFilter: 'open',
    callbackId: 'cb-new',
    cbQuery: '',
    cbNote: '',
    callId: 'call-kabir',
    callOutcome: 'all',
    callIntent: 'all',
    callQuery: '',
    paymentTab: 'due',
    messageTab: 'tickets',
    outboxFilter: 'all',
    patientId: 'kabir',
    settingsSection: 'clinic',
    bookingsView: 'day',
    calDoctor: 'all',
    calPool: 'all',
    calSource: 'all',
    calPay: 'all',
    cell: null,
    dismissed: {},
    syncOk: false,
    poorNetwork: false,
    undo: null,
    pin: '',
    pinFor: '',
    otp: '',
    needOtp: false,
    pinError: '',
    switchOpen: false,
    playing: false,
    privacyNumbers: false,
    phoneMode: 'doctor',
    focusDoctor: 'sharma',
    drawer: null,
    modal: null,
    form: {},
    toast: '',
    flash: '',
    audit: [{ at: '5:21 pm', who: 'Priya Shah', text: 'Acknowledged a medical emergency' }],
    dragId: ''
  });

  var HI = {
    'Today': 'आज',
    'Bookings': 'बुकिंग',
    'Callbacks': 'कॉलबैक',
    'Calls': 'कॉल',
    'Payments': 'भुगतान',
    'Messages': 'संदेश',
    'Patients': 'मरीज़',
    'Settings': 'सेटिंग',
    'Staff on desk': 'डेस्क पर स्टाफ़',
    'Calls transfer to the desk phone': 'कॉल डेस्क फ़ोन पर ट्रांसफ़र होंगी',
    'Callers are offered a callback': 'कॉल करने वालों को कॉलबैक मिलेगा',
    'Walk-in': 'वॉक-इन',
    'Day summary': 'दिन का सार',
    'Waiting room': 'प्रतीक्षा कक्ष',
    'Search name, ID or phone': 'नाम, आईडी या फ़ोन खोजें',
    'Acknowledge': 'देख लिया',
    'Call back now': 'अभी कॉल करें',
    'Open call': 'कॉल खोलें',
    'Mark arrived': 'पहुँच गए',
    'Send in': 'अंदर भेजें',
    'Call next': 'अगला बुलाएँ',
    'Next': 'अगला',
    'No callbacks. Nice.': 'कोई कॉलबैक नहीं। अच्छा है।',
    'No patients waiting': 'कोई मरीज़ इंतज़ार में नहीं',
    'Pause': 'रोकें',
    'Resume': 'फिर शुरू करें',
    'End session': 'सेशन समाप्त',
    'Start session': 'सेशन शुरू करें',
    'Mark session cancelled': 'सेशन रद्द करें',
    'Live queue': 'लाइव कतार',
    'On time': 'समय पर',
    'live': 'लाइव',
    'schedule only': 'सिर्फ़ शेड्यूल',
    'Paused': 'रुका हुआ',
    'Ended': 'समाप्त',
    'Session cancelled': 'सेशन रद्द',
    'Held by agent': 'एजेंट ने रोका है',
    'Booked': 'बुक',
    'Arrived': 'पहुँच गए',
    'In consult': 'डॉक्टर के पास',
    'Done': 'हो गया',
    'No-show': 'नहीं आए',
    'Cancelled': 'रद्द',
    'Rescheduled': 'समय बदला',
    'Priority': 'प्रायोरिटी',
    'Any doctor': 'कोई भी डॉक्टर',
    'Via agent': 'एजेंट से',
    'Console': 'डेस्क से',
    'Booked by relative': 'रिश्तेदार ने बुक किया',
    'Due': 'बाकी',
    'Links sent': 'लिंक भेजे',
    'Paid': 'भुगतान हो गया',
    'Refunds': 'रिफ़ंड',
    'Tickets': 'टिकट',
    'Outbox': 'भेजे गए संदेश',
    'All': 'सभी',
    'Open': 'खुले',
    'Overdue': 'देर',
    'Sign out': 'साइन आउट',
    'Switch user': 'यूज़र बदलें',
    'Lock desk': 'डेस्क लॉक करें',
    'Unlock': 'अनलॉक',
    'Back to desk': 'डेस्क पर वापस',
    'Confirm booking': 'बुकिंग पक्की करें',
    'Collect cash': 'नकद लें',
    'Show UPI QR': 'UPI QR दिखाएँ',
    'Mark paid': 'भुगतान हो गया',
    'Waive fee': 'फ़ीस माफ़ करें',
    'Approve': 'मंज़ूर करें',
    'Reject': 'अस्वीकार करें',
    'Change amount': 'राशि बदलें',
    'Retry': 'फिर भेजें',
    'Close': 'बंद करें',
    'Save': 'सेव करें',
    'Calling…': 'कॉल हो रही है…',
    'Reached': 'बात हो गई',
    'No answer': 'कोई जवाब नहीं',
    'Wrong number': 'गलत नंबर',
    'Book for them': 'इनके लिए बुक करें',
    'Doctor phone': 'डॉक्टर का फ़ोन',
    'English': 'English',
    'Hindi': 'हिंदी'
  };

  var STATUS = {
    held: ['held', 'Held by agent'],
    booked: ['neutral', 'Booked'],
    arrived: ['info', 'Arrived'],
    in_consult: ['ok', 'In consult'],
    done: ['neutral', 'Done'],
    no_show: ['attention', 'No-show'],
    cancelled: ['neutral', 'Cancelled'],
    rescheduled: ['neutral', 'Rescheduled']
  };
  var SOURCE = { agent: 'Via agent', walk_in: 'Walk-in', console: 'Console' };
  var NAV = [
    ['today', 'Today', 'cal'],
    ['bookings', 'Bookings', 'grid'],
    ['callbacks', 'Callbacks', 'phone'],
    ['calls', 'Calls', 'list'],
    ['payments', 'Payments', 'rupee'],
    ['messages', 'Messages', 'msg'],
    ['patients', 'Patients', 'user'],
    ['settings', 'Settings', 'gear']
  ];
  var GLYPH = {
    check: '<path d="M3 8.5 6.5 12 13 4.5"/>',
    clock: '<circle cx="8" cy="8" r="6"/><path d="M8 4.8V8l2.4 1.6"/>',
    alert: '<path d="M8 2.2 14.2 13.3H1.8Z"/><path d="M8 6.4v3.3"/><path d="M8 11.6v.2"/>',
    up: '<path d="M8 13V3.5M4 7.5 8 3.5l4 4"/>',
    phone: '<path d="M5.2 2.5h1.9l.9 2.9-1.4 1a7.2 7.2 0 0 0 3 3l1-1.4 2.9.9v1.9a1.4 1.4 0 0 1-1.5 1.4A10.8 10.8 0 0 1 3.7 4a1.4 1.4 0 0 1 1.5-1.5Z"/>',
    pause: '<path d="M6 4v8M10 4v8"/>',
    arrow: '<path d="M3 8h10M9 4l4 4-4 4"/>',
    cal: '<rect x="2.5" y="3.5" width="11" height="10" rx="1.2"/><path d="M2.5 6.5h11M5.5 2.2v2.4M10.5 2.2v2.4"/>',
    grid: '<rect x="2.4" y="2.4" width="4.4" height="4.4" rx=".6"/><rect x="9.2" y="2.4" width="4.4" height="4.4" rx=".6"/><rect x="2.4" y="9.2" width="4.4" height="4.4" rx=".6"/><rect x="9.2" y="9.2" width="4.4" height="4.4" rx=".6"/>',
    list: '<path d="M6 4h8M6 8h8M6 12h8"/><path d="M3 4h.1M3 8h.1M3 12h.1"/>',
    rupee: '<path d="M4 3.5h8M4 6.5h8M4 3.5c3 0 5 1.2 5 3S7 9.5 4 9.5L9.5 13"/>',
    msg: '<path d="M3 3.5h10v7H6.2L3 12.5v-9Z"/>',
    user: '<circle cx="8" cy="5.5" r="2.2"/><path d="M3.5 13.2c.6-2.3 2.3-3.4 4.5-3.4s3.9 1.1 4.5 3.4"/>',
    gear: '<circle cx="8" cy="8" r="2.2"/><path d="M8 2.4v1.6M8 12v1.6M2.4 8h1.6M12 8h1.6M4 4l1.2 1.2M10.8 10.8 12 12M12 4l-1.2 1.2M5.2 10.8 4 12"/>',
    search: '<circle cx="7" cy="7" r="3.2"/><path d="M9.5 9.5 13 13"/>',
    lock: '<rect x="4" y="7" width="8" height="6" rx="1"/><path d="M6 7V5.2a2 2 0 0 1 4 0V7"/>'
  };
  var TONE_ICON = { ok: 'check', attention: 'alert', emergency: 'alert', priority: 'up', info: null, held: 'clock', neutral: null };
  var PRIO = { P1: '!!!', P2: '!!', P3: '!' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function t(s) { return state.lang === 'hi' && HI[s] ? HI[s] : s; }
  function e(s) { return esc(t(s)); }
  function money(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
  function icon(name, size) {
    var body = GLYPH[name];
    if (!body) return '';
    var s = size || 16;
    return '<svg class="bn-glyph" viewBox="0 0 16 16" width="' + s + '" height="' + s + '" aria-hidden="true" focusable="false">' + body + '</svg>';
  }
  function user() { return state.users.filter(function (u) { return u.id === state.userId; })[0]; }
  function doctor(id) { return state.doctors.filter(function (d) { return d.id === id; })[0]; }
  function patient(id) { return state.patients.filter(function (p) { return p.id === id; })[0]; }
  function booking(id) { return state.bookings.filter(function (b) { return b.id === id; })[0]; }
  function callBy(id) { return state.calls.filter(function (c) { return c.id === id; })[0]; }
  function cbBy(id) { return state.callbacks.filter(function (c) { return c.id === id; })[0]; }

  /* ---- prescription refills (docs/flows/11-prescription-refills.md, security review S-20) ----
     Only the patient's own doctor sees the medicine and decides. Approval needs an in-person visit
     with that doctor within refillFollowupDays, the doctor's three checks, how the prescription was
     issued, and the doctor's PIN. Bolnai never creates a prescription. */
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var REFILL_STATUS = {
    open: ['attention', 'Waiting for the doctor'],
    seen: ['attention', 'Seen by the desk'],
    approved: ['ok', 'Approved by the doctor'],
    declined: ['neutral', 'Declined by the doctor'],
    visit_requested: ['info', 'Visit requested']
  };
  function ticketBy(id) { return state.tickets.filter(function (x) { return x.id === id; })[0]; }
  function isRefill(tk) { return tk && tk.type === 'Refill'; }
  function refillOpen(tk) { return tk.status === 'open' || tk.status === 'seen'; }
  function ownDoctor(tk) {
    var u = user();
    return !!(u && u.role === 'doctor' && tk.doctorId && u.doctorId === tk.doctorId);
  }
  function dayNum(key) { var p = String(key).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000; }
  function dayLabel(key) {
    var p = String(key).split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return DAYS[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()];
  }
  function lastInPerson(patientId, doctorId) {
    var p = patient(patientId);
    var best = '';
    ((p && p.past) || []).forEach(function (v) { if (v.doctorId === doctorId && v.dateKey && v.dateKey > best) best = v.dateKey; });
    state.bookings.forEach(function (b) { if (b.patientId === patientId && b.doctorId === doctorId && b.status === 'done' && b.dateKey > best) best = b.dateKey; });
    return best;
  }
  function refillCheck(tk) {
    var last = lastInPerson(tk.patientId, tk.doctorId);
    var limit = Number(state.settings.refillFollowupDays) || 180;
    var ago = last ? dayNum(state.dateKey) - dayNum(last) : null;
    return { last: last, ago: ago, limit: limit, ok: !!last && ago <= limit };
  }
  // Booking drawer (audit fix): any open day this week, any window that has not started yet.
  function dayClosed(docId, key) {
    if ((state.holidays || []).indexOf(key) >= 0) return 'clinic closed';
    if ((state.cancelledSessions || []).some(function (c) { return c.doctorId === docId && c.dateKey === key; })) return 'session cancelled';
    return '';
  }
  function windowStart(label) {
    var parts = String(label).split('–');
    var ap = (parts[1] && parts[1].match(/am|pm/i) || ['pm'])[0];
    return /am|pm/i.test(parts[0]) ? parseTime(parts[0]) : parseTime(parts[0] + ' ' + ap);
  }
  function windowEnd(label) { return parseTime(String(label).split('–')[1] || ''); }
  function bookableLabels(key, docId) {
    var now = parseTime(state.timeLabel);
    var cur = key === state.dateKey && docId ? state.windows.filter(function (w) { return w.doctorId === docId && w.dateKey === key && w.isNow; })[0] : null;
    // today: windows that have not ended, plus the doctor's current window (it may be running late)
    return state.dayWindows.filter(function (lab) { return key !== state.dateKey || windowEnd(lab) > now || (cur && cur.label === lab); });
  }
  function findWindow(docId, label, key) {
    return state.windows.filter(function (w) { return w.doctorId === docId && w.label === label && w.dateKey === key; })[0];
  }
  function defaultLabel(docId, key) {
    var labs = bookableLabels(key, docId);
    if (key === state.dateKey) {
      var cur = state.windows.filter(function (w) { return w.doctorId === docId && w.dateKey === key && w.isNow; })[0];
      if (cur && labs.indexOf(cur.label) >= 0) return cur.label;
    }
    return labs[0] || '';
  }

  function requesterText(tk) {
    if (tk.requester === 'guardian') return 'Asked by registered parent ' + tk.requesterName;
    if (tk.requester === 'relative') return 'Asked by a relative, ' + tk.requesterName;
    return 'Asked by the patient';
  }
  function queueSms(patientId, template, text) {
    state.outbox.unshift({ id: 'mx-' + Date.now(), at: state.timeLabel, patientId: patientId, channel: 'SMS', template: template, status: 'sent', text: text + ' - ' + state.clinic });
  }
  function refillCard(tk) {
    var p = patient(tk.patientId);
    var d = doctor(tk.doctorId);
    var st = REFILL_STATUS[tk.status] || REFILL_STATUS.open;
    var open = refillOpen(tk);
    var head = '<header class="panel-hd"><div><h2 class="heading">Medicine request · ' + esc(p.name) + '</h2><p class="caption bn-num">' + esc(p.pid) + ' · ' + p.age + ' y · ' + esc(tk.at) + ' · ' + esc(requesterText(tk)) + ' · for ' + esc(d.name) + '</p></div>' + badge(st[0], st[1], null) + '</header>';
    var flags = (tk.runsOutSoon ? badge('attention', tk.daysLeft === 0 ? 'None left' : 'Runs out in ' + tk.daysLeft + ' days') : '') +
      (tk.newSymptoms ? badge('attention', 'New symptoms mentioned') : '') +
      (tk.requester === 'guardian' ? badge('neutral', 'Guardian', null) : tk.requester === 'relative' ? badge('neutral', 'Relative', null) : '');
    var body = flags ? '<div class="row-actions">' + flags + '</div>' : '';
    if (!ownDoctor(tk)) {
      body += '<p class="bn-muted">Only ' + esc(d.name) + ' can see the medicine and decide. The desk can mark it seen, remind the doctor, and return the patient’s call.</p>';
      if (tk.outcome) body += '<p class="caption">' + esc(tk.outcome) + '</p>';
      if (open && user().role !== 'doctor') {
        body += '<div class="row-actions">' + (tk.status === 'open' ? '<button type="button" class="bn-btn" data-act="refill-seen" data-id="' + tk.id + '">Mark seen</button>' : '') +
          '<button type="button" class="bn-btn" data-act="refill-remind" data-id="' + tk.id + '">Remind ' + esc(d.name) + '</button></div>';
      }
      return '<section class="panel">' + head + '<div class="panel-bd">' + body + '</div></section>';
    }
    var chk = refillCheck(tk);
    body += '<p><span class="label">Caller said: </span>“' + esc(tk.words) + '”</p>' +
      '<p>Medicine, as the caller read it: <strong>' + esc(tk.medicine) + '</strong>' + (tk.daysLeft === 0 ? ' · none left' : tk.daysLeft != null ? ' · about ' + tk.daysLeft + ' day' + (tk.daysLeft === 1 ? '' : 's') + ' left' : '') + '</p>' +
      '<p>' + (chk.last ? 'Last in-person visit with you: <strong class="bn-num">' + esc(dayLabel(chk.last)) + '</strong> <span class="caption bn-muted bn-num">(' + chk.ago + ' days ago)</span>' : '<strong>No in-person visit with you on record.</strong>') + '</p>' +
      '<div><div class="label">Earlier requests</div>' + ((tk.prior || []).length ? tk.prior.slice(0, 5).map(function (r) { return '<p class="caption"><span class="bn-num">' + esc(r.at) + '</span> · ' + esc(r.text) + '</p>'; }).join('') : '<p class="caption bn-muted">None</p>') + '</div>';
    if (tk.outcome) body += '<p class="caption">' + esc(tk.outcome) + '</p>';
    if (open) {
      var why = chk.ok ? '' : chk.last
        ? 'Approve is off: the last visit with you was more than ' + chk.limit + ' days ago. Ask the patient to visit.'
        : 'Approve is off: no in-person visit with you in the last 6 months. Ask the patient to visit.';
      body += '<div class="row-actions">' +
        '<button type="button" class="bn-btn bn-btn-primary" data-act="refill-approve" data-id="' + tk.id + '"' + (chk.ok ? '' : ' disabled') + '>' + e('Approve') + '</button>' +
        '<button type="button" class="bn-btn" data-act="refill-call" data-id="' + tk.id + '">' + icon('phone') + 'Call patient</button>' +
        '<button type="button" class="bn-btn" data-act="refill-visit" data-id="' + tk.id + '">Ask to visit</button>' +
        '<button type="button" class="bn-btn" data-act="refill-decline" data-id="' + tk.id + '">Decline</button></div>' +
        (why ? '<p class="caption bn-muted">' + esc(why) + '</p>' : '') +
        '<p class="caption bn-muted">Approve only after you have issued the prescription yourself, signed and with your registration number. Never for Schedule X or NDPS medicines. Bolnai does not create prescriptions.</p>';
    }
    return '<section class="panel">' + head + '<div class="panel-bd">' + body + '</div></section>';
  }
  function route() {
    var h = (location.hash || '#today').replace(/^#/, '').split('?')[0];
    return h || 'today';
  }
  function go(r) {
    if (location.hash === '#' + r) render();
    else location.hash = r;
  }
  function setPath(path, value) {
    var parts = path.split('.');
    var obj = state;
    for (var i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
  }
  function toast(msg) {
    state.toast = msg;
    clearTimeout(state._toast);
    state._toast = setTimeout(function () { state.toast = ''; render(); }, 3400);
  }
  function audit(text, extra) {
    state.audit.unshift({ at: state.timeLabel, who: user() ? user().name : 'Staff', text: text });
    if (extra && extra.patientId) {
      var p = patient(extra.patientId);
      if (p) p.history.unshift({ at: state.timeLabel, text: text });
    }
    toast(text);
  }
  function parseTime(s) {
    var m = String(s).match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (!m) return 0;
    var h = Number(m[1]) % 12;
    if (m[3].toLowerCase() === 'pm') h += 12;
    return h * 60 + Number(m[2]);
  }
  function fmtTime(mins) {
    mins = ((mins % 1440) + 1440) % 1440;
    var h24 = Math.floor(mins / 60);
    var mm = mins % 60;
    var ap = h24 >= 12 ? 'pm' : 'am';
    var h = h24 % 12 || 12;
    return h + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap;
  }
  function shiftRange(label, delay) {
    if (!delay) return '';
    var parts = String(label).split('–');
    if (parts.length < 2) return '';
    var ap = (parts[1].match(/am|pm/i) || ['pm'])[0];
    var start = /am|pm/i.test(parts[0]) ? parseTime(parts[0]) : parseTime(parts[0] + ' ' + ap);
    var end = parseTime(parts[1]);
    var a = fmtTime(start + delay);
    var b = fmtTime(end + delay);
    if (a.slice(-2) === b.slice(-2)) a = a.slice(0, -3);
    return a + '\u2013' + b;
  }
  function maskPhone(p) {
    var d = String(p).replace(/\D/g, '');
    if (d.length < 12) return p;
    return '+91 ' + d.slice(2, 4) + '••• ••' + d.slice(-3);
  }
  function sharedWith(p) {
    var mine = p.phones.map(function (ph) { return ph.number; });
    return state.patients.filter(function (o) { return o.id !== p.id && o.phones.some(function (ph) { return mine.indexOf(ph.number) >= 0; }); });
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function searchPatients(q) {
    var raw = String(q || '').trim().toLowerCase();
    if (!raw) return state.patients.slice();
    var n = norm(raw);
    var digits = raw.replace(/\D/g, '');
    return state.patients.filter(function (p) {
      if (p.name.toLowerCase().indexOf(raw) >= 0) return true;
      if (n && norm(p.pid).indexOf(n) >= 0) return true;
      if (digits && p.pid.replace(/\D/g, '').indexOf(digits) >= 0) return true;
      return digits.length >= 4 && p.phones.some(function (ph) { return ph.number.replace(/\D/g, '').indexOf(digits) >= 0; });
    });
  }
  function badge(tone, text, ic) {
    var iconName = ic === undefined ? TONE_ICON[tone] : ic;
    return '<span class="bn-badge bn-badge-' + tone + ' label">' + (iconName ? icon(iconName, 14) : '') + '<span class="bn-num">' + esc(t(text)) + '</span></span>';
  }
  function prio(level, quiet) {
    var word = level === 'P1' ? 'high' : level === 'P2' ? 'medium' : 'low';
    return '<span class="bn-prio bn-prio-' + level + (quiet ? ' is-quiet' : '') + ' label" role="img" aria-label="' + level + ', ' + word + ' priority"><span class="bn-prio-marks" aria-hidden="true">' + PRIO[level] + '</span><span aria-hidden="true">' + level + '</span></span>';
  }
  function chip(d) {
    var running = d.status === 'started';
    var basis = d.basis === 'schedule' ? 'schedule' : 'live';
    var tone = d.status === 'cancelled' ? 'cancelled' : d.status === 'ended' ? 'ended' : d.status === 'paused' ? 'paused' : running && basis === 'schedule' ? 'schedule' : running && d.delayMin >= (Number(d.threshold) || 20) ? 'late' : 'ontime';
    var delayText = t('On time');
    if (d.status === 'cancelled') delayText = t('Session cancelled');
    else if (d.status === 'paused') delayText = t('Paused');
    else if (d.status === 'ended') delayText = t('Ended');
    else if (d.status === 'planned') delayText = t('Starts 5:00 pm');
    else if (d.delayMin > 0) delayText = '+' + d.delayMin + ' min';
    var title = running && basis === 'schedule' && d.watchdogMin ? 'No update from the cabin for ' + d.watchdogMin + ' min' : '';
    var basisHtml = '';
    if (running) {
      basisHtml = basis === 'live'
        ? '<span class="bn-chip-basis caption">' + e('live') + '</span>'
        : '<span class="bn-chip-basis caption">' + icon('clock', 12) + ' ' + e('schedule only') + '</span>';
    }
    return '<span class="bn-chip bn-chip-' + tone + '" title="' + esc(title) + '"><span class="bn-chip-dot" aria-hidden="true"></span><span class="body-strong">' + esc(d.name) + '</span><span class="bn-chip-sep" aria-hidden="true">·</span><span class="label bn-num">' + esc(delayText) + '</span>' + basisHtml + '</span>';
  }
  function places(cap, pp, taken, pt) {
    var reg = cap - pp;
    var dots = '';
    var i;
    for (i = 0; i < reg; i++) dots += '<span class="bn-place ' + (i < taken ? 'is-taken' : 'is-free') + '"></span>';
    for (i = 0; i < pp; i++) dots += '<span class="bn-place bn-place-priority ' + (i < pt ? 'is-taken' : 'is-free') + '"></span>';
    var label = taken + ' of ' + reg + ' regular places taken' + (pp ? ', ' + pt + ' of ' + pp + ' priority' : '');
    return '<span class="bn-places" role="img" aria-label="' + esc(label) + '">' + dots + '</span>';
  }
  function occupancy(w) {
    var list = state.bookings.filter(function (b) {
      return b.windowId === w.id && ['cancelled', 'rescheduled', 'no_show'].indexOf(b.status) < 0;
    });
    var pri = list.filter(function (b) { return b.priority; });
    var reg = list.filter(function (b) { return !b.priority; });
    return { list: list, taken: reg.length, priorityTaken: pri.length };
  }
  function card(b) {
    var p = patient(b.patientId);
    var st = STATUS[b.status] ? b.status : 'booked';
    var meta = [p ? p.pid : '', p && p.age != null ? p.age + ' y' : ''].filter(Boolean).join(' · ');
    var badges = '';
    if (b.priority) badges += badge('priority', 'Priority');
    if (b.anyDoctor) badges += badge('neutral', 'Any doctor', null);
    if (b.movedFrom) badges += badge('attention', 'Moved from ' + b.movedFrom, null);
    if (b.source === 'agent' && b.callId) badges += '<button type="button" class="bn-badge label" data-act="open-call" data-id="' + esc(b.callId) + '">' + e('Via agent') + '</button>';
    else if (b.source && SOURCE[b.source]) badges += badge('neutral', SOURCE[b.source], null);
    if (b.relativeName) badges += badge('neutral', 'Booked by ' + b.relativeName.split(' ')[0], null);
    if (b.fee && b.fee.amount) {
      var paid = b.fee.state === 'paid' || b.fee.state === 'waived';
      var feeWord = b.fee.state === 'waived' ? 'Waived ' : paid ? 'Paid ' : 'Fee due ';
      badges += badge(paid ? 'ok' : 'attention', feeWord + money(b.fee.amount), paid ? 'check' : null);
    }
    var action = '';
    if (b.status === 'booked') action = '<div class="bn-card-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="arrive" data-id="' + b.id + '">' + e('Mark arrived') + '</button></div>';
    if (b.status === 'arrived') action = '<div class="bn-card-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="send-in" data-id="' + b.id + '">' + e('Send in') + '</button></div>';
    var note = b.delayChoice === 'keep' ? 'Delay call: chose to keep place' : b.delayChoice === 'unconfirmed' ? 'Delay call: unconfirmed' : '';
    return '<article class="bn-card bn-card-' + st + (b.priority ? ' is-priority' : '') + '" data-act="open-booking" data-id="' + b.id + '">' +
      '<div class="bn-card-main"><div class="bn-card-who"><span class="body-strong bn-card-name" title="' + esc(p ? p.name : '') + '">' + esc(p ? p.name : 'Patient') + '</span>' +
      (meta ? '<span class="caption bn-muted bn-num">' + esc(meta) + '</span>' : '') + '</div>' +
      '<div class="bn-card-state">' + badge(STATUS[st][0], STATUS[st][1]) +
      (b.statusNote ? '<span class="caption bn-muted bn-num">' + esc(b.statusNote) + '</span>' : '') + '</div></div>' +
      (badges ? '<div class="bn-card-badges">' + badges + '</div>' : '') +
      (note ? '<span class="caption bn-muted">' + esc(note) + '</span>' : '') +
      (b.outreach === 'calling' ? '<span class="caption">Outreach: calling now</span>' : '') +
      (b.outreach === 'refund' ? '<span class="caption">Asked for money back</span>' : '') +
      action + '</article>';
  }
  function windowBlock(w, doctorDelay, cardsHtml) {
    var occ = occupancy(w);
    var shifted = doctorDelay > 0 ? shiftRange(w.label, doctorDelay) : '';
    var cap = w.capacity || 4;
    var pp = w.priorityPlaces || 0;
    var time = shifted
      ? '<span class="caption bn-muted bn-strike bn-num">' + esc(w.label) + '</span>' + icon('arrow', 14) + '<span class="body-strong bn-num">' + esc(shifted) + '</span>'
      : '<span class="body-strong bn-num">' + esc(w.label) + '</span>';
    var freeReg = (cap - pp) - occ.taken;
    var note = pp ? (freeReg > 0 ? freeReg + ' regular places free' : '') : '';
    return '<section class="bn-window' + (w.isNow && doctorDelay >= 0 ? ' is-now' : '') + '" aria-label="Arrival window ' + esc(shifted || w.label) + '">' +
      '<header class="bn-window-head"><div class="bn-window-time">' + time + (note ? '<span class="caption bn-muted">' + esc(note) + '</span>' : '') + '</div>' +
      '<div class="bn-window-places">' + places(cap, pp, Math.min(occ.taken, cap - pp), Math.min(occ.priorityTaken, pp)) +
      '<span class="label bn-muted bn-num">' + (occ.taken + occ.priorityTaken) + '/' + cap + '</span></div></header>' +
      (cardsHtml ? '<div class="bn-window-body">' + cardsHtml + '</div>' : '') + '</section>';
  }
  function openCallbacks() {
    return state.callbacks.filter(function (c) { return c.status === 'open' || c.status === 'calling'; });
  }
  function failedMsgs() {
    return state.outbox.filter(function (m) { return m.status === 'failed'; });
  }
  function waitingRefunds() {
    return state.refunds.filter(function (r) { return r.status === 'requested'; });
  }

  function emergencyChip() {
    var cb = cbBy('cb-new');
    if (!state.emergencyAck || !cb || (cb.status !== 'open' && cb.status !== 'calling')) return '';
    var al = state.alerts.filter(function (a) { return a.id === 'al-new'; })[0] || {};
    return '<button type="button" class="emerg-chip" data-act="emerg-open">' + icon('alert', 14) + '<span><strong>Emergency 6:08 pm</strong> · acknowledged by ' + esc(al.by || '') + ' at ' + esc(al.ackAt || '') + ' · P1 callback ' + (cb.status === 'calling' ? 'in progress' : 'still open') + '</span></button>';
  }
  function emergencyBanner() {
    if (state.emergencyAck) return '';
    return '<div class="emergency-wrap"><div class="bn-emergency is-new" role="alert">' +
      '<div class="bn-emergency-icon" aria-hidden="true">' + icon('alert', 28) + '</div>' +
      '<div class="bn-emergency-body"><div class="bn-emergency-title"><span class="bn-prio-marks heading" aria-hidden="true">!!!</span>' +
      '<span class="heading">Possible medical emergency on a call</span><span class="label bn-num">6:08 pm</span></div>' +
      '<p class="body"><span class="label">Caller said: </span>“Papa ko seene mein dard ho raha hai, saans phool rahi hai”</p>' +
      '<p class="caption bn-num">+91 98777 77777 · Agent said 112 / 108 · transfer did not connect · P1 callback created</p></div>' +
      '<div class="bn-emergency-actions">' +
      '<button type="button" class="bn-btn bn-btn-onred" data-act="open-call" data-id="call-emerg">' + e('Open call') + '</button>' +
      '<button type="button" class="bn-btn bn-btn-onred" data-act="call-emergency">' + icon('phone') + '<span class="body-strong">' + e('Call back now') + '</span></button>' +
      '<button type="button" class="bn-btn bn-btn-onred-solid" data-act="ack"><span class="body-strong">' + e('Acknowledge') + '</span></button>' +
      '</div></div></div>';
  }

  function banners() {
    var html = '';
    var verma = doctor('verma');
    if (verma && verma.status === 'started' && verma.basis === 'schedule' && verma.watchdogMin >= 30 && !state.dismissed.watch) {
      html += '<div class="banner"><p><strong>No update from Dr Verma’s cabin for ' + verma.watchdogMin + ' min.</strong> The delay is schedule only until someone taps Call next.</p><button type="button" class="bn-btn" data-act="dismiss" data-id="watch">' + e('Close') + '</button></div>';
    }
    state.doctors.forEach(function (d) {
      if (d.status === 'started' && d.delayMin >= 60 && !state.dismissed['late' + d.id]) {
        html += '<div class="banner"><p><strong>' + esc(d.name) + ' is ' + d.delayMin + ' min late.</strong> Offer reschedule to affected patients?</p><button type="button" class="bn-btn bn-btn-primary" data-act="offer-reschedule" data-id="' + d.id + '">Offer reschedule</button><button type="button" class="bn-btn" data-act="dismiss" data-id="late' + d.id + '">' + e('Close') + '</button></div>';
      }
    });
    if (failedMsgs().length && !state.dismissed.failed) {
      html += '<div class="banner"><p><strong>' + failedMsgs().length + ' messages failed.</strong> Patients may not have the link or the delay update.</p><a class="bn-btn" href="#messages">' + e('Messages') + '</a><button type="button" class="bn-btn" data-act="dismiss" data-id="failed">' + e('Close') + '</button></div>';
    }
    if (!state.staffOnDesk && !state.dismissed.desk) {
      html += '<div class="banner"><p>Staff on desk is off. Callers who ask for a person get a callback instead of a transfer.</p><button type="button" class="bn-btn" data-act="dismiss" data-id="desk">' + e('Close') + '</button></div>';
    }
    if (state.poorNetwork && !state.dismissed.offline) {
      html += '<div class="banner"><p>Offline: changes will sync.</p><button type="button" class="bn-btn" data-act="dismiss" data-id="offline">' + e('Close') + '</button></div>';
    }
    return html;
  }

  function rail() {
    var u = user();
    var items = NAV.filter(function (n) {
      if (u.role === 'assistant') return n[0] === 'today';
      return true;
    });
    var links = items.map(function (n) {
      var count = '';
      if (n[0] === 'callbacks') count = '<span class="nav-count bn-num">' + openCallbacks().length + '</span>';
      if (n[0] === 'payments') count = '<span class="nav-count bn-num">' + waitingRefunds().length + '</span>';
      if (n[0] === 'messages') count = '<span class="nav-count bn-num">' + failedMsgs().length + '</span>';
      var cur = route() === n[0] ? ' aria-current="page"' : '';
      return '<a href="#' + n[0] + '"' + cur + '>' + icon(n[2]) + '<span>' + e(n[1]) + '</span>' + count + '</a>';
    }).join('');
    return '<aside class="rail"><div class="brand"><div class="body-strong">Bolnai</div><div class="caption bn-muted">' + esc(roleName(u.role)) + '</div></div>' +
      '<nav class="nav" aria-label="Console">' + links + '</nav>' +
      '<div class="rail-foot">' +
      '<div class="lang-toggle" role="group" aria-label="Language"><button type="button" class="bn-btn' + (state.lang === 'en' ? ' bn-btn-primary' : '') + '" data-act="lang" data-value="en">English</button><button type="button" class="bn-btn' + (state.lang === 'hi' ? ' bn-btn-primary' : '') + '" data-act="lang" data-value="hi" lang="hi">हिंदी</button></div>' +
      '<button type="button" class="user-btn" data-act="switch-open"><span class="body-strong">' + esc(u.name) + '</span><span class="caption bn-muted">' + esc(roleName(u.role)) + ' · ' + e('Switch user') + '</span></button>' +
      '<button type="button" class="bn-btn" data-act="lock">' + icon('lock') + e('Lock desk') + '</button>' +
      '<button type="button" class="bn-btn bn-btn-quiet" data-act="signout">' + e('Sign out') + '</button></div></aside>';
  }
  function roleName(r) {
    return { receptionist: 'Reception', assistant: 'Cabin assistant', doctor: 'Doctor', admin: 'Admin' }[r] || r;
  }
  function topbar() {
    var p1 = openCallbacks().filter(function (c) { return c.priority === 'P1'; }).length;
    var p2 = openCallbacks().filter(function (c) { return c.priority === 'P2'; }).length;
    var held = state.bookings.filter(function (b) { return b.status === 'held'; }).length;
    var hits = state.search.trim() ? searchPatients(state.search).slice(0, 6) : [];
    var pop = hits.length ? '<div class="search-pop" role="listbox">' + hits.map(function (p) {
      return '<button type="button" class="search-hit" data-act="pick-patient" data-id="' + p.id + '"><span class="body-strong">' + esc(p.name) + '</span><span class="caption bn-muted bn-num">' + esc(p.pid) + ' · ' + esc(p.phones[0].number) + (sharedWith(p).length ? ' · shared phone' : '') + '</span></button>';
    }).join('') + '</div>' : '';
    var chips = state.doctors.map(chip).join('');
    return '<header class="topbar"><div class="clinic-lockup"><div class="heading">' + esc(state.clinic) + '</div><div class="caption bn-muted">Bolnai</div></div>' +
      '<div class="when"><span class="body-strong bn-num">' + esc(state.dateLabel) + '</span><span class="caption bn-muted bn-num">' + esc(state.timeLabel) + '</span></div>' +
      '<label class="bn-switch ' + (state.staffOnDesk ? 'is-on' : 'is-off') + '"><input class="bn-switch-input" type="checkbox" role="switch" data-bind="staffOnDesk" data-act="desk" ' + (state.staffOnDesk ? 'checked' : '') + ' aria-checked="' + (state.staffOnDesk ? 'true' : 'false') + '"><span class="bn-switch-track" aria-hidden="true"><span class="bn-switch-thumb"></span></span><span class="bn-switch-text"><span class="body-strong">' + e('Staff on desk') + '</span><span class="caption">' + e(state.staffOnDesk ? 'Calls transfer to the desk phone' : 'Callers are offered a callback') + '</span></span></label>' +
      '<div class="chip-row" aria-label="Doctors in session">' + chips + '</div>' +
      (held ? '<span class="caption bn-muted">Agent: ' + held + ' call in progress</span>' : '') +
      '<div class="search"><input id="q" data-bind="search" data-live="1" placeholder="' + e('Search name, ID or phone') + '" aria-label="' + e('Search name, ID or phone') + '" value="' + esc(state.search) + '" title="Press / to search">' + pop + '</div>' +
      emergencyChip() +
      '<div class="counters"><a class="counter" href="#callbacks"><strong>' + p1 + ' P1 · ' + p2 + ' P2</strong> <span class="caption">' + e('Callbacks') + '</span></a>' +
      '<a class="counter" href="#payments"><strong>' + waitingRefunds().length + '</strong> <span class="caption">' + e('Refunds') + '</span></a>' +
      '<a class="counter" href="#messages"><strong>' + failedMsgs().length + '</strong> <span class="caption">Failed</span></a></div></header>';
  }

  function todayScreen() {
    var docs = state.doctors.filter(function (d) {
      return user().role !== 'assistant' || d.id === user().doctorId;
    });
    var q = state.search.trim();
    var cols = docs.map(function (d) {
      var wins = state.windows.filter(function (w) { return w.doctorId === d.id && w.dateKey === state.dateKey; })
        .sort(function (a, b) { return parseTime(a.label.split('–')[0] + ' pm') - parseTime(b.label.split('–')[0] + ' pm'); });
      var delay = d.status === 'started' ? d.delayMin : 0;
      var blocks = wins.map(function (w) {
        var cards = state.bookings.filter(function (b) { return b.windowId === w.id; }).filter(function (b) {
          if (!q) return true;
          return searchPatients(q).some(function (p) { return p.id === b.patientId; });
        }).map(card).join('');
        if (q && !cards) return '';
        return windowBlock(w, delay, cards);
      }).join('');
      var order = state.bookings.filter(function (b) { return b.doctorId === d.id && b.dateKey === state.dateKey && b.status === 'arrived'; })
        .sort(function (a, b) { return (b.priority - a.priority) || (a.arrivedMin - b.arrivedMin); });
      var affected = state.bookings.filter(function (b) { return b.originDoctorId === d.id || (d.status === 'cancelled' && b.doctorId === d.id && b.dateKey === state.dateKey); });
      var headActions = '';
      if (d.status === 'planned') headActions += '<button type="button" class="bn-btn bn-btn-primary" data-act="start-session" data-id="' + d.id + '">' + e('Start session') + '</button>';
      if (d.status === 'started') {
        headActions += '<button type="button" class="bn-btn" data-act="pause" data-id="' + d.id + '">' + icon('pause') + e('Pause') + '</button>';
        headActions += '<button type="button" class="bn-btn bn-btn-primary" data-act="call-next" data-id="' + d.id + '">' + e('Call next') + '</button>';
      }
      if (d.status === 'paused') headActions += '<button type="button" class="bn-btn bn-btn-primary" data-act="resume" data-id="' + d.id + '">' + e('Resume') + '</button>';
      if (d.status === 'started' || d.status === 'paused') {
        headActions += '<button type="button" class="bn-btn" data-act="end-session" data-id="' + d.id + '">' + e('End session') + '</button>';
        headActions += '<button type="button" class="bn-btn bn-btn-danger" data-act="cancel-session" data-id="' + d.id + '">' + e('Mark session cancelled') + '</button>';
      }
      headActions += '<button type="button" class="bn-btn bn-btn-quiet" data-act="doctor-open" data-id="' + d.id + '">' + e('Doctor phone') + '</button>';
      var now = d.nowName ? '<p class="caption bn-num">Now with doctor: <strong>' + esc(d.nowName) + '</strong> · since ' + esc(d.nowSince) + '</p>' : '<p class="caption bn-muted">Nobody in the cabin</p>';
      var warn = d.status === 'started' && d.basis === 'schedule' && d.watchdogMin >= 30 ? '<p class="caption" style="color:var(--attention-ink)">No update from the cabin for ' + d.watchdogMin + ' min</p>' : '';
      var queueHtml = '<div class="queue"><div class="label">Waiting room order</div><p class="caption bn-muted">Priority visits first, then arrival order. Token is the queue position.</p>' +
        (order.length ? '<ol>' + order.map(function (b, i) {
          var p = patient(b.patientId);
          return '<li class="bn-num"><strong>' + esc(p.name) + '</strong> · token ' + (i + 1) + (b.priority ? ' · priority' : '') + ' · arrived ' + esc(b.statusNote) + '</li>';
        }).join('') + '</ol>' : '<p class="caption bn-muted">No one waiting.</p>') + '</div>';
      var absent = '';
      if (d.status === 'cancelled') {
        absent = '<div class="stack"><p class="body-strong">Affected bookings</p>' + (affected.length ? affected.map(function (b) {
          var p = patient(b.patientId);
          var line = b.movedFrom ? 'Moved to ' + (doctor(b.doctorId) ? doctor(b.doctorId).name : 'another doctor') : (b.outreach === 'refund' ? 'Asked for money back' : 'Outreach call queued');
          return '<p class="caption">' + esc(p.name) + ' · ' + esc(line) + '</p>';
        }).join('') : '<p class="caption bn-muted">No bookings in this session.</p>') + '</div>';
      }
      return '<section class="doctor-col' + (d.status === 'cancelled' || d.status === 'ended' ? ' is-' + (d.status === 'cancelled' ? 'cancelled' : 'ended') : '') + '">' +
        '<div class="col-top"><div><h2 class="heading">' + esc(d.name) + '</h2><p class="caption bn-muted">' + esc(d.specialty) + ' · ' + esc(d.session) + (d.pool ? ' · ' + esc(d.pool) : '') + '</p></div>' + badge('neutral', capWord(d.status), null) + '</div>' +
        chip(d) + now + warn + '<div class="row-actions">' + headActions + '</div>' +
        (q && !blocks ? '<div class="empty"><p class="heading">No patients match</p></div>' : blocks) +
        absent + queueHtml + '</section>';
    }).join('');
    var activity = '<div class="activity" aria-label="Agent activity">' + state.activity.map(function (a) {
      return '<div class="activity-item"><p>' + esc(a.text) + '</p><p class="caption bn-muted">' + esc(a.ago) + '</p></div>';
    }).join('') + '</div>';
    return '<div class="page-head"><div><h1 class="heading-lg">' + e('Today') + '</h1><p class="caption bn-muted">' + e('Live queue') + ' · ' + esc(state.dateLabel) + ' · evening session</p></div>' +
      '<div class="page-actions"><a class="bn-btn" href="#summary">' + e('Day summary') + '</a><a class="bn-btn" href="#waiting">' + e('Waiting room') + '</a><button type="button" class="bn-btn bn-btn-primary" data-act="walk-in">+ ' + e('Walk-in') + '</button></div></div>' +
      activity + '<div class="cols">' + cols + '</div>';
  }
  function capWord(status) {
    return { planned: 'Planned', started: 'Started', paused: 'Paused', ended: 'Ended', cancelled: 'Cancelled' }[status] || status;
  }

  function bookingsScreen() {
    var sync = state.syncOk
      ? '<div class="banner banner-sync"><p>Calendar mirror is up to date.</p></div>'
      : '<div class="banner banner-sync"><p><strong>4 bookings not synced, retrying.</strong> The Google Calendar mirror is behind the console.</p><button type="button" class="bn-btn bn-btn-primary" data-act="retry-sync">' + e('Retry') + '</button></div>';
    var limit = state.dismissed.limit ? '' : '<div class="banner banner-quiet"><p>+91 97999 88821 is at the daily booking limit (3). The agent did not add another booking. <button type="button" class="bn-btn bn-btn-quiet" data-act="open-call" data-id="call-unknown">' + e('Open call') + '</button></p><button type="button" class="bn-btn" data-act="dismiss" data-id="limit">' + e('Close') + '</button></div>';
    var docs = state.doctors.filter(function (d) {
      if (state.calDoctor !== 'all' && d.id !== state.calDoctor) return false;
      if (state.calPool === 'general' && d.tier !== 'general') return false;
      if (state.calPool === 'specialist' && d.tier !== 'specialist') return false;
      return true;
    });
    var viewToggle = '<div class="filters"><button type="button" class="bn-btn" data-act="cal-view" data-value="day" aria-pressed="' + (state.bookingsView === 'day') + '">Day</button><button type="button" class="bn-btn" data-act="cal-view" data-value="week" aria-pressed="' + (state.bookingsView === 'week') + '">Week</button></div>';
    var filters = '<div class="filters"><label class="field"><span class="caption">Doctor</span><select data-bind="calDoctor" data-act="refresh"><option value="all"' + (state.calDoctor === 'all' ? ' selected' : '') + '>All doctors</option>' +
      state.doctors.map(function (d) { return '<option value="' + d.id + '"' + (state.calDoctor === d.id ? ' selected' : '') + '>' + esc(d.name) + '</option>'; }).join('') +
      '</select></label><label class="field"><span class="caption">Pool</span><select data-bind="calPool" data-act="refresh"><option value="all">All</option><option value="general"' + (state.calPool === 'general' ? ' selected' : '') + '>General check-up</option><option value="specialist"' + (state.calPool === 'specialist' ? ' selected' : '') + '>Specialist</option></select></label>' +
      '<label class="field"><span class="caption">Source</span><select data-bind="calSource" data-act="refresh"><option value="all">All</option><option value="agent"' + (state.calSource === 'agent' ? ' selected' : '') + '>Via agent</option><option value="console"' + (state.calSource === 'console' ? ' selected' : '') + '>Console</option><option value="walk_in"' + (state.calSource === 'walk_in' ? ' selected' : '') + '>Walk-in</option></select></label>' +
      '<label class="field"><span class="caption">Fees</span><select data-bind="calPay" data-act="refresh"><option value="all">All</option><option value="unpaid"' + (state.calPay === 'unpaid' ? ' selected' : '') + '>Unpaid fees</option></select></label></div>';
    var grid = state.bookingsView === 'week' ? weekGrid(docs) : dayGrid(docs);
    var detail = '';
    if (state.cell) {
      var list = cellBookings(state.cell.doctorId, state.cell.windowLabel, state.cell.dateKey);
      detail = '<section class="panel"><header class="panel-hd"><h2 class="heading">' + esc(doctor(state.cell.doctorId).name) + ' · ' + esc(state.cell.windowLabel || state.cell.dateKey) + '</h2><button type="button" class="bn-btn" data-act="clear-cell">' + e('Close') + '</button></header><div class="panel-bd">' +
        (list.length ? list.map(function (b) {
          var p = patient(b.patientId);
          return '<div class="row-actions" style="justify-content:space-between"><div><strong>' + esc(p.name) + '</strong><div class="caption bn-num">' + esc(p.pid) + ' · ' + esc(b.status.replace('_', ' ')) + '</div></div><button type="button" class="bn-btn" data-act="open-booking" data-id="' + b.id + '">Open</button></div>';
        }).join('') : '<p class="bn-muted">No one in this window.</p>') + '</div></section>';
    }
    return '<div class="page-head"><div><h1 class="heading-lg">' + e('Bookings') + '</h1><p class="caption bn-muted">Arrival windows. Drag a name to another window. The patient is told only if you confirm.</p></div><div class="page-actions">' + viewToggle + '<button type="button" class="bn-btn bn-btn-primary" data-act="walk-in">+ ' + e('Walk-in') + '</button></div></div>' +
      sync + limit + filters + grid + detail;
  }
  function passFilters(b) {
    if (state.calSource !== 'all' && b.source !== state.calSource) return false;
    if (state.calPay === 'unpaid') {
      if (!b.fee || (b.fee.state !== 'due' && b.fee.state !== 'link')) return false;
    }
    return true;
  }
  function cellBookings(doctorId, windowLabel, dateKey) {
    return state.bookings.filter(function (b) {
      if (b.doctorId !== doctorId || b.dateKey !== dateKey) return false;
      if (!passFilters(b)) return false;
      if (!windowLabel) return true;
      var w = state.windows.filter(function (x) { return x.id === b.windowId; })[0];
      return w && w.label === windowLabel;
    });
  }
  function dayGrid(docs) {
    var cols = state.dayWindows;
    var head = '<div class="cal-head"></div>' + cols.map(function (c) { return '<div class="cal-head label bn-num">' + esc(c) + '</div>'; }).join('');
    var rows = docs.map(function (d) {
      var cells = cols.map(function (label) {
        var list = cellBookings(d.id, label, state.dateKey);
        var cap = d.capacity || 4;
        var pri = list.some(function (b) { return b.priority && b.status !== 'cancelled'; });
        var pills = list.slice(0, 3).map(function (b) {
          var p = patient(b.patientId);
          return '<span class="pill' + (b.priority ? ' is-priority' : '') + '" draggable="true" data-drag="' + b.id + '">' + esc(p.name.split(' ')[0]) + '</span>';
        }).join('');
        return '<button type="button" class="cal-cell" data-act="cell" data-doctor="' + d.id + '" data-window="' + esc(label) + '" data-date="' + state.dateKey + '" data-drop="1" data-doctor-drop="' + d.id + '" data-window-drop="' + esc(label) + '" data-date-drop="' + state.dateKey + '"><span class="label bn-num">' + list.length + '/' + cap + (pri ? ' <span class="dot-pri" aria-label="Priority visit"></span>' : '') + '</span>' + pills + '</button>';
      }).join('');
      return '<div class="cal-head"><div class="body-strong">' + esc(d.name) + '</div><div class="caption bn-muted">' + esc(d.specialty) + '</div></div>' + cells;
    }).join('');
    return '<div class="cal" style="grid-template-columns:148px repeat(6,minmax(100px,1fr))">' + head + rows + '</div>';
  }
  function weekGrid(docs) {
    var head = '<div class="cal-head"></div>' + state.week.map(function (d) {
      var closed = state.holidays.indexOf(d.key) >= 0;
      return '<div class="cal-head label">' + esc(d.label) + (closed ? '<div class="caption">Closed</div>' : '') + '</div>';
    }).join('');
    var rows = docs.map(function (doc) {
      var cells = state.week.map(function (day) {
        var closed = state.holidays.indexOf(day.key) >= 0;
        var cancelled = state.cancelledSessions.some(function (s) { return s.doctorId === doc.id && s.dateKey === day.key; });
        if (closed) return '<div class="cal-cell is-holiday"><span class="caption">Holiday</span></div>';
        var list = cellBookings(doc.id, '', day.key);
        var pri = list.some(function (b) { return b.priority; });
        return '<button type="button" class="cal-cell' + (cancelled ? ' is-cancelled' : '') + '" data-act="cell" data-doctor="' + doc.id + '" data-window="" data-date="' + day.key + '"><span class="label bn-num">' + list.length + (pri ? ' · priority' : '') + '</span>' + (cancelled ? '<span class="caption">Session cancelled</span>' : '') + '</button>';
      }).join('');
      return '<div class="cal-head body-strong">' + esc(doc.name) + '</div>' + cells;
    }).join('');
    return '<div class="cal" style="grid-template-columns:148px repeat(7,minmax(72px,1fr))">' + head + rows + '</div>';
  }

  function callbacksScreen() {
    var rank = { P1: 1, P2: 2, P3: 3 };
    var list = state.callbacks.filter(function (c) {
      if (state.callbackFilter === 'open' && c.status !== 'open' && c.status !== 'calling') return false;
      if (state.callbackFilter === 'overdue' && !c.overdue) return false;
      if (state.callbackFilter === 'done' && c.status !== 'done') return false;
      if (state.cbQuery) {
        var blob = (c.caller + ' ' + c.number + ' ' + c.reason).toLowerCase();
        if (blob.indexOf(state.cbQuery.toLowerCase()) < 0) return false;
      }
      return true;
    }).sort(function (a, b) { return rank[a.priority] - rank[b.priority] || a.dueMin - b.dueMin; });
    var filters = '<div class="filters">' + ['open', 'overdue', 'done', 'all'].map(function (f) {
      var label = { open: 'Open', overdue: 'Overdue', done: 'Done', all: 'All' }[f];
      return '<button type="button" class="bn-btn" data-act="cb-filter" data-value="' + f + '" aria-pressed="' + (state.callbackFilter === f) + '">' + e(label) + '</button>';
    }).join('') + '<input id="cbq" data-bind="cbQuery" data-live="1" placeholder="Filter by name or number" aria-label="Filter callbacks" value="' + esc(state.cbQuery) + '" style="height:40px;border:1px solid var(--line-strong);border-radius:6px;padding:0 12px;background:var(--surface)"></div>';
    var rows = list.length ? list.map(cbRow).join('') : '<div class="empty"><p class="heading">' + e('No callbacks. Nice.') + '</p><p class="bn-muted">New callbacks from the agent show up here.</p></div>';
    var acked = state.alerts.length ? '<section class="panel"><header class="panel-hd"><h2 class="heading">Alerts</h2></header><div class="panel-bd">' + state.alerts.map(function (a) {
      return '<p><span class="bn-badge bn-badge-emergency label">Acknowledged</span> <span class="bn-num">' + esc(a.at) + '</span> · ' + esc(a.kind) + ' · ' + esc(a.number) + '<br><span class="caption bn-muted">By ' + esc(a.by) + (a.ackAt ? ' at ' + esc(a.ackAt) : '') + '. Caller said: “' + esc(a.snippet) + '”</span></p>';
    }).join('') + '</div></section>' : '';
    var selected = cbBy(state.callbackId);
    var detail = selected ? cbDetail(selected) : '<section class="panel"><div class="empty"><p class="bn-muted">Select a callback.</p></div></section>';
    return '<div class="page-head"><div><h1 class="heading-lg">' + e('Callbacks') + '</h1><p class="caption bn-muted">P1 within 15 min · P2 within 2 hours · P3 next session. Sorted by priority, then by due time.</p></div></div>' +
      filters + '<div class="split"><div class="list-clip">' + rows + '</div><div class="stack">' + detail + acked + '</div></div>';
  }
  function cbRow(c) {
    var dueTone = c.overdue ? 'emergency' : c.dueSoon ? 'attention' : 'neutral';
    var quiet = c.priority === 'P1' && !c.overdue && !c.isNew;
    var who = c.caller || 'Unknown caller';
    var meta = [c.number, c.language, c.verified ? 'verified' : 'not verified'].join(' · ');
    var sel = c.id === state.callbackId ? ' is-selected' : '';
    return '<div class="bn-cbrow' + (c.overdue ? ' is-overdue' : '') + sel + '" data-act="pick-callback" data-id="' + c.id + '" role="button" tabindex="0">' +
      prio(c.priority, quiet) +
      '<div class="bn-cbrow-who"><span class="body-strong">' + esc(who) + '</span><span class="caption bn-muted bn-num">' + esc(meta) + '</span></div>' +
      '<p class="body bn-cbrow-reason">' + esc(c.reason) + (c.callId ? ' <button type="button" class="bn-btn bn-btn-quiet" data-act="open-call" data-id="' + c.callId + '">' + e('Via agent') + '</button>' : '') + '</p>' +
      '<div class="bn-cbrow-due">' + badge(dueTone, c.dueText, c.overdue ? 'alert' : 'clock') +
      (c.differs ? badge('attention', 'Different number', 'phone') : '') +
      (c.smsSent ? badge('ok', 'SMS sent', 'check') : '') +
      (c.lockout ? badge('attention', 'Verification paused', 'lock') : '') + '</div>' +
      '<button type="button" class="bn-btn ' + (c.overdue ? 'bn-btn-primary' : '') + '" data-act="cb-call" data-id="' + c.id + '">' + icon('phone') + (c.status === 'calling' ? e('Calling…') : 'Call') + '</button></div>';
  }
  function cbDetail(c) {
    var attempts = c.attempts.length ? '<ul class="timeline">' + c.attempts.map(function (a) { return '<li><span class="caption bn-num">' + esc(a.at) + '</span><span>' + esc(a.outcome) + '</span></li>'; }).join('') + '</ul>' : '<p class="caption bn-muted">No attempts yet.</p>';
    return '<section class="panel"><header class="panel-hd"><h2 class="heading">' + esc(c.caller || 'Unknown caller') + '</h2>' + prio(c.priority, c.priority === 'P1' && !c.overdue && !c.isNew) + '</header><div class="panel-bd">' +
      '<p class="bn-num">' + esc(c.number) + (c.differs ? ' · callback number ' + esc(c.callbackNumber) : '') + '</p>' +
      (c.snippet ? '<p><span class="label">Caller said: </span>“' + esc(c.snippet) + '”</p>' : '') +
      '<p class="caption bn-muted">Wanted: ' + esc(c.wanted) + '</p>' +
      '<p class="caption bn-muted">Preferred: ' + esc(c.preferred) + ' · ' + esc(c.language) + ' · ' + (c.verified ? 'verified' : 'not verified') + '</p>' +
      (c.lockout ? '<p>' + badge('attention', 'Phone verification paused: 5 failed attempts today', 'lock') + '</p><button type="button" class="bn-btn" data-act="clear-lockout" data-id="' + c.id + '">Clear after in-person check</button>' : '') +
      (c.smsSent ? '<p>' + badge('ok', 'SMS sent', 'check') + ' <span class="caption">Two no-answer attempts.</span></p>' : '') +
      '<div><div class="label">Attempts</div>' + attempts + '</div>' +
      '<label class="field"><span class="label">Note</span><textarea id="cbnote" data-bind="cbNote">' + esc(state.cbNote) + '</textarea></label>' +
      '<div class="row-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="cb-call" data-id="' + c.id + '">' + e('Calling…') + '</button>' +
      '<button type="button" class="bn-btn" data-act="cb-outcome" data-id="' + c.id + '" data-value="reached">' + e('Reached') + '</button>' +
      '<button type="button" class="bn-btn" data-act="cb-outcome" data-id="' + c.id + '" data-value="no_answer">' + e('No answer') + '</button>' +
      '<button type="button" class="bn-btn" data-act="cb-outcome" data-id="' + c.id + '" data-value="wrong">' + e('Wrong number') + '</button>' +
      '<button type="button" class="bn-btn" data-act="cb-book" data-id="' + c.id + '">' + e('Book for them') + '</button></div></div></section>';
  }

  function callsScreen() {
    var list = state.calls.filter(function (c) {
      if (state.callOutcome !== 'all' && c.outcome !== state.callOutcome) return false;
      if (state.callIntent !== 'all' && c.intent !== state.callIntent) return false;
      if (state.callQuery) {
        var blob = (c.caller + ' ' + c.number + ' ' + c.intent + ' ' + c.outcome).toLowerCase();
        if (blob.indexOf(state.callQuery.toLowerCase()) < 0) return false;
      }
      return true;
    }).sort(function (a, b) { return b.mins - a.mins; });
    var outcomes = ['all', 'resolved', 'transferred', 'callback', 'emergency', 'abandoned'];
    var intents = ['all', 'booking', 'change', 'cancel', 'info', 'message', 'priority', 'emergency'];
    var filters = '<div class="filters"><span class="caption">Outcome</span>' + outcomes.map(function (o) {
      return '<button type="button" class="bn-btn" data-act="call-outcome" data-value="' + o + '" aria-pressed="' + (state.callOutcome === o) + '">' + esc(o === 'all' ? t('All') : o) + '</button>';
    }).join('') + '</div><div class="filters"><span class="caption">Intent</span>' + intents.map(function (o) {
      return '<button type="button" class="bn-btn" data-act="call-intent" data-value="' + o + '" aria-pressed="' + (state.callIntent === o) + '">' + esc(o === 'all' ? t('All') : o) + '</button>';
    }).join('') + '<input id="callq" data-bind="callQuery" data-live="1" placeholder="Filter" aria-label="Filter calls" value="' + esc(state.callQuery) + '" style="height:40px;border:1px solid var(--line-strong);border-radius:6px;padding:0 12px;background:var(--surface)"></div>';
    var table = list.length ? '<div class="table-wrap"><table class="data"><thead><tr><th>Time</th><th>Direction</th><th>Caller</th><th>Language</th><th>Intent</th><th>Outcome</th><th>Duration</th></tr></thead><tbody>' +
      list.map(function (c) {
        var tags = (c.tags || []).map(function (tag) { return badge('neutral', tag, null); }).join(' ');
        return '<tr data-act="pick-call" data-id="' + c.id + '" class="' + (c.id === state.callId ? 'is-selected' : '') + '"><td class="bn-num">' + esc(c.time) + '</td><td>' + (c.direction === 'out' ? 'Out' : 'In') + (c.outbound ? '<div class="caption">Via outbound job</div>' : '') + '</td><td>' + esc(c.caller) + '<div class="caption bn-num">' + esc(maskPhone(c.number)) + '</div>' + tags + '</td><td>' + esc(c.language) + '</td><td>' + esc(c.intent) + '</td><td>' + esc(c.outcome) + '</td><td class="bn-num">' + esc(c.duration) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty"><p class="heading">No calls match those filters</p></div>';
    var selected = callBy(state.callId);
    return '<div class="page-head"><div><h1 class="heading-lg">' + e('Calls') + '</h1><p class="caption bn-muted bn-num">31 handled by the agent · 4 transferred · 3 callbacks created · 1 emergency flagged. Latest calls are listed below.</p></div></div>' +
      filters + '<div class="split"><div>' + table + '</div>' + (selected ? callDetail(selected) : '') + '</div>';
  }
  function callDetail(c) {
    var produced = (c.produced || []).map(function (p) { return '<p>' + badge('neutral', p.type, null) + ' ' + esc(p.label) + '</p>'; }).join('') || '<p class="caption bn-muted">This call did not create a booking, callback, or refund.</p>';
    var chat = (c.transcript || []).map(function (line) {
      if (line.who === 'system') return '<p class="sysrow caption">' + esc(line.text) + '</p>';
      var cls = line.who === 'agent' ? 'bubble bubble-agent' : 'bubble bubble-caller';
      var who = line.who === 'agent' ? 'Agent' : 'Caller said';
      return '<div class="' + cls + '"><div class="caption bn-muted">' + who + '</div><p>' + esc(line.text) + '</p></div>';
    }).join('');
    var rec = c.recording ? '<div class="rec' + (state.playing ? ' is-playing' : '') + '"><button type="button" class="bn-btn" data-act="play">' + (state.playing ? 'Pause' : 'Play') + '</button><div class="rec-bar" aria-hidden="true"><span></span></div><span class="caption bn-num">' + esc(c.duration) + '</span></div><p class="caption bn-muted">Recording plays inside the console. There is no link to copy.</p>' : '<p class="caption bn-muted">No recording for this call.</p>';
    return '<section class="panel"><header class="panel-hd"><div><h2 class="heading">' + esc(c.caller) + '</h2><p class="caption bn-num">' + esc(c.number) + '</p></div></header><div class="panel-bd">' +
      '<p class="caption">' + esc(c.verified) + (c.relative ? ' · ' + esc(c.relative) : '') + ' · ' + esc(c.language) + ' · ' + esc(c.duration) + ' · ' + esc(c.cost) + '</p>' +
      '<div><div class="label">AI summary</div><p>' + esc(c.summary) + '</p></div>' +
      '<div><div class="label">What the call produced</div>' + produced + '</div>' +
      '<div><div class="label">Recording</div>' + rec + '</div>' +
      '<div class="chat" aria-label="Transcript">' + chat + '</div>' +
      '<button type="button" class="bn-btn bn-btn-quiet" data-act="history" data-kind="call" data-id="' + c.id + '">History</button></div></section>';
  }

  function paymentsScreen() {
    var tabs = [['due', 'Due'], ['link', 'Links sent'], ['paid', 'Paid'], ['refunds', 'Refunds']];
    var tabHtml = '<div class="tabs" role="tablist">' + tabs.map(function (tab) {
      return '<button type="button" role="tab" data-act="pay-tab" data-value="' + tab[0] + '" aria-selected="' + (state.paymentTab === tab[0]) + '">' + e(tab[1]) + '</button>';
    }).join('') + '</div>';
    var body = '';
    if (state.paymentTab === 'refunds') body = refundsPanel();
    else {
      var rows = state.payments.filter(function (p) {
        if (state.paymentTab === 'due') return p.state === 'due';
        if (state.paymentTab === 'link') return p.state === 'link' || p.state === 'expired' || p.state === 'failed';
        if (state.paymentTab === 'paid') return p.state === 'paid';
        return true;
      });
      body = rows.length ? '<div class="table-wrap"><table class="data"><thead><tr><th>Patient</th><th>Doctor</th><th>Visit</th><th>Amount</th><th>Fee</th><th>Method</th><th>State</th><th>Reminders</th></tr></thead><tbody>' +
        rows.map(function (p) {
          var person = patient(p.patientId);
          var doc = doctor(p.doctorId);
          var tone = p.state === 'paid' ? 'ok' : p.state === 'expired' || p.state === 'failed' ? 'attention' : p.state === 'link' ? 'info' : 'attention';
          var word = { due: 'Due', link: 'Link sent', paid: 'Paid', expired: 'Expired', failed: 'Failed' }[p.state] || p.state;
          return '<tr><td>' + esc(person.name) + '<div class="caption bn-num">' + esc(person.pid) + '</div></td><td>' + esc(doc.name) + '</td><td class="bn-num">' + esc(p.when) + '</td><td class="bn-num">' + money(p.amount) + '</td><td>' + esc(p.feeType) + '</td><td>' + esc(p.method) + (p.expires ? '<div class="caption">' + esc(p.expires) + '</div>' : '') + '</td><td>' + badge(tone, word) + '</td><td class="bn-num">' + esc(p.reminders) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty"><p class="heading">Nothing in this tab</p><p class="bn-muted">Fees that need a person show up here.</p></div>';
    }
    return '<div class="page-head"><div><h1 class="heading-lg">' + e('Payments') + '</h1><p class="caption bn-muted">You cannot refund more than was paid. Refunds and fee waivers need an admin, and a second admin if you raised the request.</p></div></div>' + tabHtml + body;
  }
  function refundsPanel() {
    if (!state.refunds.length) return '<div class="empty"><p class="heading">No refund requests</p></div>';
    return state.refunds.map(function (r) {
      var p = patient(r.patientId);
      var admin = user().role === 'admin';
      var self = r.requesterId && r.requesterId === user().id;
      var why = !admin ? 'Only an admin can approve a refund.' : self ? 'Another admin must approve this.' : '';
      var done = r.status !== 'requested';
      return '<section class="panel"><header class="panel-hd"><div><h2 class="heading">' + esc(p.name) + ' · ' + money(r.amount) + '</h2><p class="caption bn-num">' + money(r.paid) + ' paid · ' + money(r.refunded) + ' refunded so far</p></div>' + badge(r.status === 'requested' ? 'attention' : r.status === 'rejected' ? 'neutral' : 'ok', r.status, null) + '</header><div class="panel-bd">' +
        '<p>Policy: ' + esc(r.policy) + '</p><p class="caption">Requested by ' + esc(r.requestedByName) + '. ' + esc(r.reason) + '</p>' +
        (r.callId ? '<button type="button" class="bn-btn bn-btn-quiet" data-act="open-call" data-id="' + r.callId + '">' + e('Open call') + '</button>' : '') +
        (r.approvedBy ? '<p class="caption">Approved by ' + esc(r.approvedBy) + ' at ' + esc(r.approvedAt) + '. ' + (r.method === 'UPI' ? 'Processed by gateway.' : 'Hand cash at the desk.') + '</p>' : '') +
        (r.status === 'rejected' ? '<p class="caption">Rejected. ' + esc(r.note) + '</p>' : '') +
        '<div class="row-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="refund" data-id="' + r.id + '" data-value="approve"' + (done || !admin || self ? ' disabled' : '') + '>' + e('Approve') + '</button>' +
        '<button type="button" class="bn-btn" data-act="refund" data-id="' + r.id + '" data-value="change"' + (done || !admin || self ? ' disabled' : '') + '>' + e('Change amount') + '</button>' +
        '<button type="button" class="bn-btn bn-btn-danger" data-act="refund" data-id="' + r.id + '" data-value="reject"' + (done || !admin || self ? ' disabled' : '') + '>' + e('Reject') + '</button></div>' +
        (why && !done ? '<p class="caption bn-muted">' + esc(why) + '</p>' : '') +
        '<button type="button" class="bn-btn bn-btn-quiet" data-act="history" data-kind="refund" data-id="' + r.id + '">History</button></div></section>';
    }).join('');
  }

  function messagesScreen() {
    var tabs = '<div class="tabs" role="tablist"><button type="button" data-act="msg-tab" data-value="tickets" aria-selected="' + (state.messageTab === 'tickets') + '">' + e('Tickets') + '</button><button type="button" data-act="msg-tab" data-value="outbox" aria-selected="' + (state.messageTab === 'outbox') + '">' + e('Outbox') + '</button></div>';
    var body = state.messageTab === 'outbox' ? outboxPanel() : ticketsPanel();
    return '<div class="page-head"><div><h1 class="heading-lg">' + e('Messages') + '</h1><p class="caption bn-muted">Tickets for the doctor, and every SMS or WhatsApp the desk can see. Nothing is sent to a real phone in this demo.</p></div></div>' + tabs + body;
  }
  function ticketsPanel() {
    if (!state.tickets.length) return '<div class="empty"><p class="heading">No messages for the doctor</p></div>';
    return '<div class="stack">' + state.tickets.map(function (tk) {
      return isRefill(tk) ? refillCard(tk) : messageCard(tk);
    }).join('') + '</div>';
  }
  // Messages for a named doctor are answered only by that doctor (permission matrix, S-06);
  // report questions and other desk tickets have no doctor and the desk answers them.
  function canAnswer(tk) {
    if (tk.doctorId) return ownDoctor(tk);
    var r = user().role;
    return r === 'receptionist' || r === 'admin';
  }
  function messageCard(tk) {
    var p = patient(tk.patientId);
    var d = tk.doctorId ? doctor(tk.doctorId) : null;
    var open = tk.status === 'open' || tk.status === 'seen';
    var st = !open ? ['ok', 'Decided'] : tk.status === 'seen' ? ['attention', 'Seen by the desk'] : ['attention', 'Open'];
    var html = '<section class="panel"><header class="panel-hd"><div><h2 class="heading">' + esc(tk.type) + ' · ' + esc(p.name) + '</h2><p class="caption bn-num">' + esc(p.pid) + ' · ' + esc(tk.at) + (tk.relative ? ' · ' + esc(tk.relative) : '') + ' · ' + (d ? 'for ' + esc(d.name) : 'for the desk') + '</p></div>' + badge(st[0], st[1], null) + '</header><div class="panel-bd">' +
      '<p><span class="label">Caller said: </span>“' + esc(tk.words) + '”</p>' +
      (tk.outcome ? '<p class="caption">' + esc(tk.outcome) + '</p>' : '');
    if (open && canAnswer(tk)) {
      html += '<div class="row-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="ticket" data-id="' + tk.id + '" data-value="approve">Reply</button>' +
        '<button type="button" class="bn-btn" data-act="ticket" data-id="' + tk.id + '" data-value="decline">Decline</button>' +
        '<button type="button" class="bn-btn" data-act="ticket" data-id="' + tk.id + '" data-value="visit">Ask patient to visit</button></div>';
    } else if (open && d && user().role !== 'doctor') {
      html += '<p class="bn-muted">Only ' + esc(d.name) + ' replies to this. The desk can mark it seen and remind the doctor.</p><div class="row-actions">' +
        (tk.status === 'open' ? '<button type="button" class="bn-btn" data-act="refill-seen" data-id="' + tk.id + '">Mark seen</button>' : '') +
        '<button type="button" class="bn-btn" data-act="refill-remind" data-id="' + tk.id + '">Remind ' + esc(d.name) + '</button></div>';
    }
    return html + '</div></section>';
  }
  function outboxPanel() {
    var filters = '<div class="filters">' + ['all', 'failed', 'sent', 'delivered'].map(function (f) {
      return '<button type="button" class="bn-btn" data-act="outbox-filter" data-value="' + f + '" aria-pressed="' + (state.outboxFilter === f) + '">' + esc(f === 'all' ? t('All') : f) + '</button>';
    }).join('') + '</div>';
    var rows = state.outbox.filter(function (m) { return state.outboxFilter === 'all' || m.status === state.outboxFilter; });
    var table = rows.length ? rows.map(function (m) {
      var p = patient(m.patientId);
      var tone = m.status === 'failed' ? 'attention' : m.status === 'delivered' ? 'ok' : 'neutral';
      return '<section class="panel"><header class="panel-hd"><div><h2 class="body-strong">' + esc(m.template) + '</h2><p class="caption bn-num">' + esc(m.at) + ' · ' + esc(p ? p.name : '') + ' · ' + esc(m.channel) + '</p></div><div class="row-actions">' + badge(tone, m.status) + (m.status === 'failed' ? '<button type="button" class="bn-btn" data-act="retry-msg" data-id="' + m.id + '">' + e('Retry') + '</button>' : '') + '</div></header><div class="panel-bd"><p>' + esc(m.text) + '</p></div></section>';
    }).join('') : '<div class="empty"><p class="heading">No messages in this view</p></div>';
    return filters + '<div class="stack">' + table + '</div>';
  }

  function patientsScreen() {
    var q = state.search;
    var list = searchPatients(q);
    var current = patient(state.patientId) || list[0];
    var items = list.length ? list.map(function (p) {
      return '<button type="button" class="search-hit" data-act="pick-patient" data-id="' + p.id + '" style="background:' + (current && current.id === p.id ? 'var(--accent-soft)' : 'transparent') + '"><span class="body-strong">' + esc(p.name) + '</span><span class="caption bn-muted bn-num">' + esc(p.pid) + (sharedWith(p).length ? ' · shared phone' : '') + '</span></button>';
    }).join('') : '<div class="empty"><p class="heading">No patient matches that</p><p class="bn-muted">Try the digits of the ID. HC/2026/0412 also matches 20260412.</p></div>';
    return '<div class="page-head"><div><h1 class="heading-lg">' + e('Patients') + '</h1><p class="caption bn-muted">No medical records. Search by ID, name, or phone.</p></div></div>' +
      '<div class="split"><div class="panel"><div class="panel-bd">' + items + '</div></div>' + (current && list.some(function (p) { return p.id === current.id; }) ? profile(current) : '') + '</div>';
  }
  function profile(p) {
    var visits = state.bookings.filter(function (b) { return b.patientId === p.id; });
    var calls = state.calls.filter(function (c) { return c.patientId === p.id; });
    var cbs = state.callbacks.filter(function (c) { return c.patientId === p.id; });
    return '<section class="panel"><header class="panel-hd"><div><h2 class="heading">' + esc(p.name) + '</h2><p class="id-hero bn-num">' + esc(p.pid) + '</p><p class="caption bn-muted">' + p.age + ' y · ' + esc(p.dob) + (p.holder ? ' · ' + esc(p.holder) : '') + '</p></div><button type="button" class="bn-btn" data-act="history" data-kind="patient" data-id="' + p.id + '">History</button></header><div class="panel-bd">' +
      '<div><div class="label">Phones</div>' + p.phones.map(function (ph) { return '<p class="bn-num">' + esc(ph.number) + ' · ' + esc(ph.relation) + '</p>'; }).join('') +
      (sharedWith(p).length ? '<p class="caption" style="color:var(--attention-ink)">' + icon('alert', 12) + ' Shared phone with ' + sharedWith(p).length + ' other patient' + (sharedWith(p).length > 1 ? 's' : '') + '. On a call, confirm the name and patient ID before saying anything about a visit.</p>' : '') + '</div>' +
      '<div><div class="label">Consents</div>' + p.consents.map(function (c) { return '<p>' + (c.on ? badge('ok', c.name, 'check') : badge('neutral', c.name + ' off', null)) + ' <span class="caption bn-num">' + esc(c.date) + '</span></p>'; }).join('') + '</div>' +
      '<div><div class="label">Visits</div>' + (p.past.map(function (v) { return '<p class="caption">' + esc(v.when) + ' · ' + esc(v.text) + '</p>'; }).join('')) +
      (visits.length ? visits.map(function (b) {
        var d = doctor(b.doctorId);
        return '<p>' + badge(STATUS[b.status][0], STATUS[b.status][1]) + ' ' + esc(b.dateLabel) + ' · ' + esc(d ? d.name : '') + ' · ' + esc(b.reason) + '</p>';
      }).join('') : '<p class="caption bn-muted">No visits on the console.</p>') + '</div>' +
      '<div><div class="label">Calls</div>' + (calls.length ? calls.map(function (c) { return '<p><button type="button" class="bn-btn bn-btn-quiet" data-act="open-call" data-id="' + c.id + '">' + esc(c.time) + ' · ' + esc(c.intent) + '</button></p>'; }).join('') : '<p class="caption bn-muted">No calls linked.</p>') + '</div>' +
      '<div><div class="label">Callbacks</div>' + (cbs.length ? cbs.map(function (c) { return '<p>' + prio(c.priority, !c.isNew && !c.overdue) + ' ' + esc(c.reason) + '</p>'; }).join('') : '<p class="caption bn-muted">No callbacks.</p>') + '</div>' +
      '<button type="button" class="bn-btn bn-btn-primary" data-act="book-patient" data-id="' + p.id + '">Book a visit</button></div></section>';
  }

  function settingsScreen() {
    if (user().role !== 'admin') {
      return '<div class="empty"><p class="heading">Settings are for clinic admins</p><p class="bn-muted">Reception can run the day. Fees, refunds rules, and staff changes need an admin. Switch user and use the demo PIN.</p><button type="button" class="bn-btn bn-btn-primary" data-act="switch-open">' + e('Switch user') + '</button></div>';
    }
    var sections = [['clinic', 'Clinic'], ['doctors', 'Doctors'], ['payments', 'Payments and refunds'], ['delays', 'Delays'], ['calls', 'Calls'], ['staff', 'Staff']];
    var nav = '<div class="subnav">' + sections.map(function (s) {
      return '<button type="button" data-act="settings-tab" data-value="' + s[0] + '" aria-current="' + (state.settingsSection === s[0]) + '">' + esc(s[1]) + '</button>';
    }).join('') + '</div>';
    return '<div class="page-head"><div><h1 class="heading-lg">' + e('Settings') + '</h1><p class="caption bn-muted">Each number shows its default. Changes stay on this desk only.</p></div><button type="button" class="bn-btn" data-act="export-day">Export day summary</button></div>' +
      '<div class="settings-grid">' + nav + '<div class="stack">' + settingsBody() + auditPanel() + '</div></div>';
  }
  function field(label, bind, help, type) {
    var val = bind.split('.').reduce(function (o, k) { return o[k]; }, state);
    var input = type === 'area'
      ? '<textarea id="s-' + bind.replace(/\W/g, '') + '" data-bind="' + bind + '" data-live="1">' + esc(val) + '</textarea>'
      : '<input id="s-' + bind.replace(/\W/g, '') + '" data-bind="' + bind + '" data-live="1" value="' + esc(val) + '">';
    return '<label class="field"><span class="label">' + esc(label) + '</span>' + input + '<span class="caption bn-muted">' + esc(help) + '</span></label>';
  }
  function settingsBody() {
    var s = state.settingsSection;
    if (s === 'clinic') {
      return '<section class="panel"><div class="panel-bd">' +
        field('Clinic name', 'clinic', 'The name the agent speaks. Patients never hear “Bolnai”.', 'text') +
        field('Address', 'address', 'Default: 12 Example Road, Chandigarh.', 'text') +
        field('Hours', 'settings.hours', 'Default: Mon–Fri 5:00–8:00 pm, Sat 10:00 am–1:00 pm.', 'area') +
        field('Hours in Hindi', 'settings.hoursHi', 'Shown when the console language is Hindi. Needs a native speaker’s review before a real clinic.', 'area') +
        field('Address in Hindi', 'settings.addressHi', 'Hindi info answer for the agent and the desk.', 'area') +
        field('Holidays', 'settings.holidays', 'Default: Sunday and 2 Oct.', 'text') +
        field('Fees', 'settings.feesEn', 'Info answer. General visits have no booking fee.', 'area') +
        field('Fees in Hindi', 'settings.feesHi', 'Hindi info answer.', 'area') +
        field('Parking', 'settings.parkingEn', 'Info answer.', 'area') +
        field('Parking in Hindi', 'settings.parkingHi', 'Hindi info answer.', 'area') +
        field('Payment', 'settings.payEn', 'UPI link or cash. Never ask for a PIN.', 'area') +
        field('Refunds', 'settings.refundEn', 'Clinic-caused: full. 24 h or more: full. Later: half.', 'area') +
        '</div></section>';
    }
    if (s === 'doctors') {
      return state.doctors.map(function (d, i) {
        return '<section class="panel"><header class="panel-hd"><h2 class="heading">' + esc(d.name) + '</h2><span class="caption">' + esc(d.tier) + '</span></header><div class="panel-bd">' +
          '<p class="caption bn-muted">' + esc(d.specialty) + (d.pool ? ' · pool ' + esc(d.pool) : ' · no pool') + ' · session ' + esc(d.session) + '</p>' +
          field('Window length (min)', 'doctors.' + i + '.windowMin', 'Default 30. Places are shared inside the window.', 'text') +
          field('Capacity', 'doctors.' + i + '.capacity', 'Default 4 places in each arrival window.', 'text') +
          field('Priority places', 'doctors.' + i + '.priorityPlaces', 'Specialists only. General doctors stay at 0.', 'text') +
          field('Appointment fee', 'doctors.' + i + '.appointmentFee', 'Default ₹0 for general, ₹200 for Dr Kaur. Empty means none.', 'text') +
          field('Priority fee', 'doctors.' + i + '.priorityFee', 'Default ₹500 for Dr Kaur. Not offered by general doctors.', 'text') +
          field('Planned consult (min)', 'doctors.' + i + '.consultMin', 'Default 12 for general, 15 for Dr Kaur. Used only for the finish estimate.', 'text') +
          '</div></section>';
      }).join('');
    }
    if (s === 'payments') {
      return '<section class="panel"><div class="panel-bd">' +
        '<p>Accepted methods: UPI link on WhatsApp, and cash at the desk.</p>' +
        field('Link validity (min)', 'settings.linkMinutes', 'Default 30 min. After that the link expires and the desk can take cash.', 'text') +
        field('Reminders', 'settings.reminders', 'Default 1 reminder before a link expires.', 'text') +
        '<label class="bn-switch ' + (state.settings.payToKeep ? 'is-on' : 'is-off') + '"><input class="bn-switch-input" type="checkbox" data-bind="settings.payToKeep" data-act="refresh" ' + (state.settings.payToKeep ? 'checked' : '') + '><span class="bn-switch-track"><span class="bn-switch-thumb"></span></span><span class="bn-switch-text"><span class="body-strong">Payment required to keep the booking</span><span class="caption">Default off. Unpaid UPI links stay booked and can be paid at the desk.</span></span></label>' +
        field('Full refund if cancelled before (hours)', 'settings.refundFullHours', 'Default 24. Cancel sooner than this and the share below applies.', 'text') +
        field('Later cancellation refund (%)', 'settings.refundLateShare', 'Default 50. Clinic-caused cancellations stay at 100%.', 'text') +
        '<p class="caption bn-muted">Refund approval required: on. The person who raised a refund cannot approve it.</p></div></section>';
    }
    if (s === 'delays') {
      return '<section class="panel"><div class="panel-bd">' +
        field('SMS threshold (min)', 'settings.delayThreshold', 'Default 20 min. Delay messages start at this lateness. The chip turns amber, never red.', 'text') +
        field('Max delay messages', 'settings.maxDelaySms', 'Default 2. After that, a delay-choice call asks the patient to keep the place or move.', 'text') +
        field('Call next watchdog (min)', 'settings.watchdog', 'Default 30 min. With no tap, the delay is marked schedule only.', 'text') +
        '</div></section>';
    }
    if (s === 'calls') {
      return '<section class="panel"><div class="panel-bd">' +
        field('Staff transfer number', 'settings.transfer', 'Default +91 98000 00000. Used only when staff on desk is on.', 'text') +
        field('Outbound from', 'settings.outboundFrom', 'Default 9:00 am. Reminders and delay calls stay inside these hours.', 'text') +
        field('Outbound to', 'settings.outboundTo', 'Default 9:00 pm.', 'text') +
        field('Retries', 'settings.retries', 'Default 2. After two no-answers the desk sends an SMS.', 'text') +
        '</div></section>';
    }
    return '<section class="panel"><div class="panel-bd"><div class="label">Staff</div>' + state.users.map(function (u) {
      return '<p><strong>' + esc(u.name) + '</strong> · ' + esc(roleName(u.role)) + '</p>';
    }).join('') + '<p class="caption bn-muted">Doctor and cabin phones stay signed in until an admin signs the device out. This button signs out this browser only.</p><button type="button" class="bn-btn bn-btn-danger" data-act="signout">Sign this device out</button></div></section>';
  }
  function auditPanel() {
    var lines = state.audit.slice(0, 8).map(function (a) {
      return '<li><span class="caption bn-num">' + esc(a.at) + '</span><span>' + esc(a.who) + ' · ' + esc(a.text) + '</span></li>';
    }).join('');
    return '<section class="panel"><header class="panel-hd"><h2 class="heading">Recent audit</h2></header><ul class="timeline">' + lines + '</ul></section>';
  }

  function summaryScreen() {
    var by = function (src) { return state.bookings.filter(function (b) { return b.source === src && b.dateKey === state.dateKey; }).length; };
    var noshow = state.bookings.filter(function (b) { return b.status === 'no_show'; }).length;
    var cards = [
      ['Agent handled', '31', 'Calls the agent answered today'],
      ['Transferred', '4', 'Calls sent to the desk phone'],
      ['Callbacks created', '3', 'Story total. The queue shows everyone still waiting.'],
      ['Emergencies flagged', state.emergencyAck ? '1 acknowledged' : '1 new', 'Red banner until someone acknowledges'],
      ['Booked by agent', String(by('agent')), 'Today’s board'],
      ['Booked at the desk', String(by('console')), 'Console bookings today'],
      ['Walk-ins', String(by('walk_in')), 'Added with + Walk-in'],
      ['No-shows', String(noshow), 'Marked when a session ends'],
      ['Delay', 'Sharma +' + doctor('sharma').delayMin + ' · Verma ' + (doctor('verma').delayMin || 'on time') + ' · Kaur +' + doctor('kaur').delayMin, 'Live where the cabin has tapped Call next'],
      ['Delay messages', String(state.outbox.filter(function (m) { return m.template === 'Delay update'; }).length), 'Sent from the outbox'],
      ['Fees collected', money(state.payments.filter(function (p) { return p.state === 'paid'; }).reduce(function (s, p) { return s + p.amount; }, 0)), 'UPI and cash marked paid'],
      ['Refunds waiting', String(waitingRefunds().length), 'Need an admin'],
      ['Open callbacks', String(openCallbacks().length), 'Still to call'],
      ['Failed messages', String(failedMsgs().length), 'Retry from the outbox']
    ];
    var openItems = openCallbacks().map(function (c) { return c.caller + ' · ' + c.priority; })
      .concat(waitingRefunds().map(function (r) { return (patient(r.patientId).name) + ' · refund ' + money(r.amount); }));
    return '<div class="page-head"><div><h1 class="heading-lg">' + e('Day summary') + '</h1><p class="caption bn-muted">' + esc(state.dateLabel) + ' · ' + esc(state.clinic) + '</p></div><a class="bn-btn" href="#today">Back to Today</a></div>' +
      '<div class="stats">' + cards.map(function (c) { return '<article class="stat"><span class="caption bn-muted">' + esc(c[0]) + '</span><span class="figure-lg bn-num">' + esc(c[1]) + '</span><span class="caption">' + esc(c[2]) + '</span></article>'; }).join('') + '</div>' +
      '<section class="panel"><header class="panel-hd"><h2 class="heading">Open items for tomorrow</h2></header><div class="panel-bd">' +
      (openItems.length ? openItems.map(function (line) { return '<p>' + esc(line) + '</p>'; }).join('') : '<p class="bn-muted">Nothing to carry.</p>') + '</div></section>';
  }

  function waitingRoom() {
    var d = state.doctors.filter(function (x) { return x.nowName; })[0] || doctor('sharma');
    var name = d.nowName || '—';
    var next = state.bookings.filter(function (b) { return b.doctorId === d.id && b.dateKey === state.dateKey && (b.status === 'arrived' || b.status === 'booked'); })
      .sort(function (a, b) { return (a.status === 'arrived' ? 0 : 1) - (b.status === 'arrived' ? 0 : 1) || (a.arrivedMin - b.arrivedMin); })
      .slice(0, 3);
    function label(b) {
      var p = patient(b.patientId);
      if (state.privacyNumbers) return p.pid;
      return p.name;
    }
    var calling = name;
    if (state.privacyNumbers && d.nowName) {
      var current = state.bookings.filter(function (b) { return b.status === 'in_consult' && b.doctorId === d.id; })[0];
      calling = current ? patient(current.patientId).pid : name;
    }
    return '<div class="wait"><div class="row-actions" style="justify-content:space-between"><a class="bn-btn" href="#today">' + e('Back to desk') + '</a><button type="button" class="bn-btn" data-act="privacy" aria-pressed="' + state.privacyNumbers + '">' + (state.privacyNumbers ? 'Show names' : 'Show numbers') + '</button></div>' +
      '<p class="label">Now calling</p><p class="wait-name">' + esc(calling) + '</p>' +
      '<p class="heading">' + esc(d.name) + ' · ' + esc(d.cabin) + '</p>' +
      '<p class="hi-heading" lang="hi">अब बुलाया जा रहा है · ' + esc(d.name) + ' · ' + esc(d.cabin) + '</p>' +
      '<p class="body">' + esc(d.name) + ' is running ' + (d.delayMin ? d.delayMin + ' min late' : 'on time') + (d.basis === 'schedule' ? ' · schedule only' : ' · live') + '.</p>' +
      '<div><p class="label">Next</p><div class="wait-next">' + (next.length ? next.map(function (b) { return '<span>' + esc(label(b)) + '</span>'; }).join('') : '<span class="bn-muted">No one waiting</span>') + '</div></div></div>';
  }

  function queueFor(doctorId) {
    return state.bookings.filter(function (b) { return b.doctorId === doctorId && b.dateKey === state.dateKey && b.status === 'arrived'; })
      .sort(function (a, b) { return (b.priority - a.priority) || (a.arrivedMin - b.arrivedMin); });
  }
  function doctorScreen() {
    var u = user();
    var id = (u.role === 'doctor' || u.role === 'assistant') ? u.doctorId : state.focusDoctor;
    var d = doctor(id) || doctor('sharma');
    var mode = u.role === 'assistant' ? 'cabin' : state.phoneMode;
    var q = queueFor(d.id);
    var next = q[0];
    var later = state.bookings.filter(function (b) { return b.doctorId === d.id && b.dateKey === state.dateKey && b.status === 'booked'; }).length;
    var nextMeta = '';
    if (next) {
      var np = patient(next.patientId);
      nextMeta = np.pid + (np.age != null ? ' · ' + np.age + ' y' : '') + ' · ' + next.reason + (next.priority ? ' · priority' : '') + ' · arrived ' + next.statusNote;
    }
    var empty = later ? 'No patients waiting. ' + later + ' booked later.' : t('No patients waiting');
    var disabled = !next || d.status === 'paused' || d.status === 'ended' || d.status === 'cancelled';
    var flash = state.flash ? '<div class="flash"><div class="label">Calling</div><div class="wait-name" style="font-size:40px">' + esc(state.flash) + '</div></div>' : '';
    var callBtn = '<div class="bn-callnext"><div class="bn-callnext-next">' + (next && !state.flash ? '<span class="label bn-muted">' + e('Next') + '</span><span class="heading-lg">' + esc(patient(next.patientId).name) + '</span><span class="caption bn-muted bn-num">' + esc(nextMeta) + '</span>' : '<span class="bn-muted">' + esc(state.flash ? '' : empty) + '</span>') + '</div>' +
      '<button type="button" class="bn-callnext-btn" data-act="call-next" data-id="' + d.id + '"' + (disabled ? ' disabled' : '') + '><span class="' + (state.lang === 'hi' ? 'hi-call-next' : 'call-next') + '">' + (state.lang === 'hi' ? 'अगले मरीज़ को बुलाएँ' : e('Call next')) + '</span></button>' +
      '<span class="caption bn-muted bn-num">' + (d.nowName ? 'With ' + esc(d.nowName) + ' since ' + esc(d.nowSince) : 'Cabin is free') + '</span></div>';
    var remaining = state.bookings.filter(function (b) { return b.doctorId === d.id && b.dateKey === state.dateKey && ['done', 'cancelled', 'no_show', 'rescheduled'].indexOf(b.status) < 0; }).length;
    var finish = fmtTime(20 * 60 + (d.delayMin || 0));
    var cabinList = mode === 'cabin' ? '<div class="panel"><div class="panel-bd">' + (q.length ? q.map(function (b, i) {
      var p = patient(b.patientId);
      return '<div class="queue-line"><span><strong>' + (i + 1) + '. ' + esc(p.name) + '</strong><div class="caption">' + esc(p.pid) + (b.priority ? ' · priority' : '') + '</div></span><span class="caption bn-num">' + esc(b.statusNote) + '</span></div>';
    }).join('') : '<p class="bn-muted">' + esc(empty) + '</p>') + '</div></div>' : '';
    var back = u.role === 'doctor' ? '' : '<a class="bn-btn" href="#today">' + e('Back to desk') + '</a>';
    var modeToggle = u.role === 'receptionist' || u.role === 'admin' ? '<div class="filters"><button type="button" class="bn-btn" data-act="phone-mode" data-value="doctor" aria-pressed="' + (mode === 'doctor') + '">Doctor</button><button type="button" class="bn-btn" data-act="phone-mode" data-value="cabin" aria-pressed="' + (mode === 'cabin') + '">Cabin assistant</button></div>' : '';
    var small = '<div class="row-actions">' +
      (d.status === 'started' ? '<button type="button" class="bn-btn" data-act="pause" data-id="' + d.id + '">' + e('Pause') + '</button>' : '') +
      (d.status === 'paused' ? '<button type="button" class="bn-btn bn-btn-primary" data-act="resume" data-id="' + d.id + '">' + e('Resume') + '</button>' : '') +
      (d.status === 'started' || d.status === 'paused' ? '<button type="button" class="bn-btn" data-act="end-session" data-id="' + d.id + '">' + e('End session') + '</button>' : '') +
      (undoLive() ? '<button type="button" class="bn-btn bn-btn-quiet" data-act="undo-call">Undo last call</button>' : '') +
      '<button type="button" class="bn-btn bn-btn-quiet" data-act="network">' + (state.poorNetwork ? 'Network: poor' : 'Network: good') + '</button></div>';
    var net = state.poorNetwork ? '<div class="banner"><p>Poor network. A tap is kept on this phone and will sync.</p></div>' : '';
    var paused = d.status === 'paused' ? '<div class="banner"><p>Session paused. Call next waits until you resume.</p></div>' : '';
    // Medicine requests for this doctor (flow 11). Full detail and decisions only on the doctor's own login.
    var reqs = mode === 'cabin' ? [] : state.tickets.filter(function (tk) { return isRefill(tk) && tk.doctorId === d.id; });
    var msgs = mode === 'cabin' ? [] : state.tickets.filter(function (tk) { return !isRefill(tk) && tk.doctorId === d.id; });
    var openReqs = reqs.filter(refillOpen).length;
    var openMsgs = msgs.filter(refillOpen).length;
    var reqHtml = (reqs.length || msgs.length) ? '<div class="stack" id="doc-requests" style="padding:0">' +
      (reqs.length ? '<h2 class="heading">Medicine requests <span class="caption bn-muted bn-num">' + openReqs + ' open</span></h2>' + reqs.map(refillCard).join('') : '') +
      (msgs.length ? '<h2 class="heading">Messages for you <span class="caption bn-muted bn-num">' + openMsgs + ' open</span></h2>' + msgs.map(messageCard).join('') : '') + '</div>' : '';
    var jump = openReqs + openMsgs ? '<button type="button" class="bn-btn" data-act="jump-requests">' + icon('msg') + (openReqs + openMsgs) + ' waiting for you: ' + [openReqs ? openReqs + ' medicine' : '', openMsgs ? openMsgs + ' message' + (openMsgs > 1 ? 's' : '') : ''].filter(Boolean).join(', ') + '</button>' : '';
    return '<div class="phone-wrap"><div class="phone"><div class="phone-top">' + back + '<div><div class="body-strong">' + esc(d.name) + '</div><div class="caption bn-muted">' + esc(d.cabin) + '</div></div><button type="button" class="bn-btn" data-act="switch-open">' + esc(user().name.split(' ')[0]) + '</button></div>' +
      modeToggle + chip(d) + jump + net + paused +
      '<p class="bn-num"><strong>' + remaining + '</strong> <span class="caption">remaining today · finish about ' + esc(finish) + '</span></p>' +
      cabinList + (state.flash ? flash : callBtn) + small + reqHtml + '</div></div>';
  }
  function undoLive() { return state.undo && (Date.now() - state.undo.at) < 30000; }

  function pinPad() {
    var dots = '';
    var n = state.needOtp ? state.otp.length : state.pin.length;
    for (var i = 0; i < (state.needOtp ? 6 : 4); i++) dots += '<i class="' + (i < n ? 'on' : '') + '"></i>';
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'ok'];
    return '<div class="pin-dots" aria-hidden="true">' + dots + '</div><div class="pad">' + keys.map(function (k) {
      if (k === 'clear') return '<button type="button" data-act="pin-clear">Clear</button>';
      if (k === 'ok') return '<button type="button" data-act="pin-ok">OK</button>';
      return '<button type="button" data-act="pin-digit" data-value="' + k + '">' + k + '</button>';
    }).join('') + '</div>' + (state.pinError ? '<p class="caption" style="color:var(--emergency)">' + esc(state.pinError) + '</p>' : '');
  }
  function signin() {
    var picking = state.pinFor ? state.users.filter(function (u) { return u.id === state.pinFor; })[0] : null;
    var list = '<div class="staff-pick">' + state.users.map(function (u) {
      return '<button type="button" class="bn-btn" data-act="pick-user" data-id="' + u.id + '"><span><span class="body-strong">' + esc(u.name) + '</span><span class="caption bn-muted"> ' + esc(roleName(u.role)) + ' · demo PIN ' + esc(u.pin) + (u.otp ? ' · code ' + esc(u.otp) : '') + '</span></span></button>';
    }).join('') + '</div>';
    return '<div class="signin"><div class="signin-card"><p class="caption bn-muted">Bolnai</p><h1 class="heading-lg">' + esc(state.clinic) + '</h1><p>Sign in with your own PIN. The desk never shares one login. Admins also enter the authenticator code.</p>' +
      (picking ? '<p class="body-strong">' + esc(picking.name) + '</p><p class="caption">' + (state.needOtp ? 'Authenticator code' : 'PIN') + '</p>' + pinPad() + '<button type="button" class="bn-btn bn-btn-quiet" data-act="pin-cancel">Choose someone else</button>' : list) +
      '</div></div>';
  }
  function lockScreen() {
    return '<div class="lock"><div class="lock-card"><p class="caption bn-muted">Bolnai</p><h1 class="heading-lg">' + esc(state.clinic) + '</h1><p class="figure-lg bn-num">' + esc(state.timeLabel) + '</p><p class="bn-muted">Desk locked. Alerts stay on screen.</p>' +
      '<p class="body-strong">' + esc(user().name) + '</p>' + pinPad() + '</div></div>';
  }
  function switchSheet() {
    if (!state.switchOpen || !state.signedIn || state.locked) return '';
    return '<div class="modal-back"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="sw-title"><h2 id="sw-title" class="heading">' + e('Switch user') + '</h2><p class="caption bn-muted">Demo PINs are printed here so the desk can change role. A real clinic would not show them.</p>' +
      state.users.map(function (u) {
        return '<button type="button" class="bn-btn" data-act="pick-user" data-id="' + u.id + '">' + esc(u.name) + ' · ' + esc(roleName(u.role)) + ' · ' + esc(u.pin) + '</button>';
      }).join('') +
      (state.pinFor ? '<div class="stack"><p class="body-strong">' + esc((state.users.filter(function (u) { return u.id === state.pinFor; })[0] || {}).name || '') + '</p>' + (state.needOtp ? '<p class="caption">Authenticator code for this demo: 190026</p>' : '') + pinPad() + '</div>' : '') +
      '<button type="button" class="bn-btn" data-act="switch-close">' + e('Close') + '</button></div></div>';
  }

  function drawer() {
    if (!state.drawer) return '';
    if (state.drawer.kind === 'booking') return '<div class="drawer-back"><div class="drawer" role="dialog" aria-modal="true">' + bookingDrawer() + '</div></div>';
    return '';
  }
  function bookingDrawer() {
    var b = state.drawer.bookingId ? booking(state.drawer.bookingId) : null;
    var mode = state.drawer.mode;
    var f = state.form;
    var title = mode === 'create' ? 'New booking' : mode === 'checkin' ? 'Check in' : 'Booking';
    var person = b ? patient(b.patientId) : (f.patientId ? patient(f.patientId) : null);
    var doc = doctor(f.doctorId || (b && b.doctorId) || 'sharma');
    var win = b ? state.windows.filter(function (w) { return w.id === b.windowId; })[0] : null;
    var body = '<div class="row-actions" style="justify-content:space-between"><h2 class="heading">' + esc(title) + '</h2><button type="button" class="bn-btn" data-act="close-drawer">' + e('Close') + '</button></div>';
    if (mode === 'create') {
      body += '<label class="field"><span class="label">Patient</span><select id="f-patient" data-bind="form.patientId" data-act="fill-patient"><option value="">New patient</option>' +
        state.patients.map(function (p) { return '<option value="' + p.id + '"' + (f.patientId === p.id ? ' selected' : '') + '>' + esc(p.name) + ' · ' + esc(p.pid) + '</option>'; }).join('') + '</select></label>';
      if (!f.patientId) {
        body += '<div class="grid-2"><label class="field"><span class="label">Name</span><input id="f-name" data-bind="form.name" data-live="1" value="' + esc(f.name || '') + '"></label><label class="field"><span class="label">Age</span><input id="f-age" data-bind="form.age" data-live="1" value="' + esc(f.age || '') + '"></label></div>';
        body += '<label class="field"><span class="label">Phone</span><input id="f-phone" data-bind="form.phone" data-live="1" value="' + esc(f.phone || '') + '"></label><p class="caption bn-muted">A new patient gets an ID as soon as you confirm.</p>';
      }
    } else if (person) {
      body += '<p class="body-strong">' + esc(person.name) + '</p><p class="id-hero bn-num">' + esc(person.pid) + '</p><p class="caption">Write this ID on the card.</p>';
    }
    body += '<label class="field"><span class="label">Reason category</span><select id="f-reason" data-bind="form.reason" data-act="refresh">' +
      ['general check-up', 'follow-up', 'vaccination', 'report collection'].map(function (r) { return '<option' + (f.reason === r ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select><span class="caption bn-muted">A category only. No symptoms on this screen.</span></label>';
    body += '<label class="field"><span class="label">Doctor</span><select id="f-doc" data-bind="form.doctorId" data-act="refresh"><option value="any"' + (f.doctorId === 'any' ? ' selected' : '') + '>Any doctor · general check-up</option>' +
      state.doctors.map(function (d) { return '<option value="' + d.id + '"' + (f.doctorId === d.id ? ' selected' : '') + '>' + esc(d.name) + ' · ' + esc(d.specialty) + '</option>'; }).join('') + '</select></label>';
    if (f.doctorId && f.doctorId !== 'any' && person) {
      var last = state.bookings.filter(function (x) { return x.patientId === person.id && x.doctorId === f.doctorId; })[0];
      if (last) body += '<p class="caption">Same doctor as last time? ' + esc(doctor(last.doctorId).name) + ' is selected.</p>';
    }
    if (mode === 'create') {
      var bDoc = f.doctorId === 'any' ? 'sharma' : f.doctorId;
      var bDate = f.dateKey || state.dateKey;
      if (f.windowLabel && bookableLabels(bDate, bDoc).indexOf(f.windowLabel) < 0) f.windowLabel = '';
      body += '<div class="grid-2"><label class="field"><span class="label">Day</span><select id="f-date" data-bind="form.dateKey" data-act="refresh">' +
        state.week.map(function (wk) {
          var shut = dayClosed(bDoc, wk.key);
          return '<option value="' + wk.key + '"' + (bDate === wk.key ? ' selected' : '') + (shut ? ' disabled' : '') + '>' + esc(dayLabel(wk.key) + (wk.key === state.dateKey ? ' (today)' : '') + (shut ? ' · ' + shut : '')) + '</option>';
        }).join('') + '</select></label>' +
        '<label class="field"><span class="label">Arrival window</span><select id="f-win" data-bind="form.windowLabel" data-act="refresh">' +
        bookableLabels(bDate, bDoc).map(function (lab) {
          var w = findWindow(bDoc, lab, bDate);
          var o = w ? occupancy(w) : { taken: 0, priorityTaken: 0 };
          var cap = (w ? w.capacity : (doc && doc.capacity) || 4) - (w ? w.priorityPlaces : (doc && doc.priorityPlaces) || 0);
          var chosen = (f.windowLabel || defaultLabel(bDoc, bDate)) === lab;
          return '<option value="' + esc(lab) + '"' + (chosen ? ' selected' : '') + '>' + esc(lab + ' · ' + (o.taken >= cap ? 'full' : o.taken + '/' + cap)) + '</option>';
        }).join('') + '</select></label></div>';
      var today = bDate === state.dateKey;
      body += '<div class="stack" style="padding:0;gap:4px"><span class="label">How did they reach the desk?</span>' +
        '<label class="check-line"><input type="radio" name="f-src" value="walk_in" data-bind="form.source" data-act="refresh" ' + (f.source === 'walk_in' && today ? 'checked' : '') + (today ? '' : ' disabled') + '><span>Walk-in at the desk' + (today ? '' : ' (today only)') + '</span></label>' +
        '<label class="check-line"><input type="radio" name="f-src" value="console" data-bind="form.source" data-act="refresh" ' + (f.source !== 'walk_in' || !today ? 'checked' : '') + '><span>Phone call to the desk</span></label></div>';
      body += '<label class="row-actions"><input type="checkbox" data-bind="form.squeeze" data-act="refresh" ' + (f.squeeze ? 'checked' : '') + '> <span>Squeeze in (over capacity)</span></label><p class="caption bn-muted">Only when the window is full. It is an explicit choice.</p>';
    }
    var priorityOn = !!(f.priority || (f.when === 'priority'));
    if (doc && doc.priorityFee) {
      body += '<label class="row-actions"><input type="checkbox" data-bind="form.priority" data-act="refresh" ' + (priorityOn ? 'checked' : '') + '> <span>Priority visit · ' + money(doc.priorityFee) + '</span></label>';
    }
    var total = 0;
    if (doc && doc.id) {
      total = (Number(doc.appointmentFee) || 0) + (priorityOn ? (Number(doc.priorityFee) || 0) : 0);
    }
    if (b && b.fee) total = b.fee.amount;
    if (total) {
      body += '<div class="queue"><div class="label">Fees</div><p class="bn-num">Appointment ' + money((doc && doc.appointmentFee) || (b && b.fee && b.fee.amount) || 0) + (priorityOn && doc && doc.priorityFee ? ' + priority ' + money(doc.priorityFee) : '') + ' = <strong>' + money(total) + '</strong></p>';
      if (!b || (b.fee && b.fee.state !== 'paid' && b.fee.state !== 'waived')) {
        body += '<label class="field"><span class="label">Payment</span><select id="f-method" data-bind="form.method" data-act="refresh"><option value="upi"' + (f.method === 'upi' ? ' selected' : '') + '>UPI link on WhatsApp</option><option value="cash"' + (f.method === 'cash' ? ' selected' : '') + '>Cash at desk</option></select></label>';
        var canWaive = user().role === 'admin';
        body += '<label class="row-actions"><input type="checkbox" data-bind="form.waive" data-act="refresh" ' + (f.waive ? 'checked' : '') + (canWaive ? '' : ' disabled') + '> <span>' + e('Waive fee') + '</span></label>';
        body += canWaive ? '' : '<p class="caption bn-muted">Only an admin can waive a fee.</p>';
        if (f.waive) body += '<label class="field"><span class="label">Reason for the waiver</span><input id="f-waive" data-bind="form.waiveReason" data-live="1" value="' + esc(f.waiveReason || '') + '"></label>';
      }
      body += '</div>';
    }
    body += '<label class="row-actions"><input type="checkbox" data-bind="form.relative" data-act="refresh" ' + (f.relative ? 'checked' : '') + '> <span>Requested by a relative</span></label>';
    if (f.error) body += '<p class="caption" style="color:var(--emergency)">' + esc(f.error) + '</p>';
    if (mode === 'create') body += '<button type="button" class="bn-btn bn-btn-primary" data-act="save-booking">' + e('Confirm booking') + '</button>';
    if (b && b.status === 'held') body += '<button type="button" class="bn-btn bn-btn-primary" data-act="confirm-held" data-id="' + b.id + '">' + e('Confirm booking') + '</button>';
    if (b && (b.status === 'booked' || b.status === 'arrived')) {
      body += '<label class="row-actions"><input type="checkbox" data-bind="form.fileComplete" data-act="refresh" ' + (f.fileComplete ? 'checked' : '') + '> <span>File is complete</span></label>';
      if (b.fee && b.fee.state !== 'paid' && b.fee.state !== 'waived') {
        body += '<div class="row-actions"><button type="button" class="bn-btn" data-act="collect-cash" data-id="' + b.id + '">' + e('Collect cash') + '</button><button type="button" class="bn-btn" data-act="show-qr" data-id="' + b.id + '">' + e('Show UPI QR') + '</button></div>';
        if (f.showQr) body += '<div class="qr" role="img" aria-label="UPI QR for this visit"></div><button type="button" class="bn-btn bn-btn-primary" data-act="mark-paid" data-id="' + b.id + '">' + e('Mark paid') + '</button>';
      }
      if (b.status === 'booked') body += '<button type="button" class="bn-btn bn-btn-primary" data-act="arrive" data-id="' + b.id + '">' + e('Arrived') + '</button>';
    }
    if (b) {
      body += '<div><div class="label">Timeline</div><ul class="timeline">' + (b.timeline || []).map(function (ev) {
        return '<li><span class="caption bn-num">' + esc(ev.at) + '</span><span>' + esc(ev.text) + '</span></li>';
      }).join('') + '</ul><button type="button" class="bn-btn bn-btn-quiet" data-act="history" data-kind="booking" data-id="' + b.id + '">History</button></div>';
    }
    return body;
  }

  function modal() {
    var m = state.modal;
    if (!m) return '';
    if (m.kind === 'confirm') {
      return '<div class="modal-back"><div class="modal" role="dialog" aria-modal="true"><h2 class="heading">' + esc(m.title) + '</h2><p>' + esc(m.body) + '</p><div class="row-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="' + esc(m.confirmAct) + '" data-id="' + esc(m.id || '') + '">' + esc(m.confirm) + '</button><button type="button" class="bn-btn" data-act="modal-close">' + e('Close') + '</button></div></div></div>';
    }
    if (m.kind === 'call') {
      return '<div class="modal-back"><div class="modal" role="dialog" aria-modal="true"><h2 class="heading">Call ' + esc(m.number) + '?</h2><p>' + esc(m.body) + '</p><div class="row-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="place-call" data-id="' + esc(m.id || '') + '">Call</button><button type="button" class="bn-btn" data-act="modal-close">' + e('Close') + '</button></div></div></div>';
    }
    if (m.kind === 'refund') {
      var rf = state.refunds.filter(function (r) { return r.id === m.id; })[0];
      var need = m.mode !== 'approve';
      return '<div class="modal-back"><div class="modal" role="dialog" aria-modal="true"><h2 class="heading">' + esc(m.mode === 'approve' ? 'Approve refund' : m.mode === 'reject' ? 'Reject refund' : 'Change amount') + '</h2>' +
        '<p class="bn-num">' + money(rf.paid) + ' paid · ' + money(rf.refunded) + ' refunded so far. You cannot refund more than was paid.</p>' +
        (m.mode === 'change' ? '<label class="field"><span class="label">Amount</span><input id="rf-amt" data-bind="form.amount" data-live="1" value="' + esc(state.form.amount || '') + '"></label>' : '') +
        (need ? '<label class="field"><span class="label">Note</span><textarea id="rf-note" data-bind="form.note" data-live="1">' + esc(state.form.note || '') + '</textarea></label>' : '<p>Approve ' + money(rf.amount) + ' for ' + esc(patient(rf.patientId).name) + '.</p>') +
        (state.form.error ? '<p class="caption" style="color:var(--emergency)">' + esc(state.form.error) + '</p>' : '') +
        '<div class="row-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="refund-confirm">' + e('Save') + '</button><button type="button" class="bn-btn" data-act="modal-close">' + e('Close') + '</button></div></div></div>';
    }
    if (m.kind === 'ticket') {
      return '<div class="modal-back"><div class="modal" role="dialog" aria-modal="true"><h2 class="heading">Note for the patient</h2><label class="field"><span class="label">Note</span><textarea id="tk-note" data-bind="form.note" data-live="1">' + esc(state.form.note || '') + '</textarea></label><div class="row-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="ticket-confirm">Save decision</button><button type="button" class="bn-btn" data-act="modal-close">' + e('Close') + '</button></div></div></div>';
    }
    if (m.kind === 'refill-approve') {
      var ra = ticketBy(m.id);
      var rp = patient(ra.patientId);
      var fa = state.form;
      var box = function (key, text) {
        return '<label class="check-line"><input type="checkbox" data-bind="form.' + key + '" data-act="refresh" ' + (fa[key] ? 'checked' : '') + '><span>' + esc(text) + '</span></label>';
      };
      var radio = function (val, text) {
        return '<label class="check-line"><input type="radio" name="rf-via" value="' + val + '" data-bind="form.via" data-act="refresh" ' + (fa.via === val ? 'checked' : '') + '><span>' + esc(text) + '</span></label>';
      };
      return '<div class="modal-back"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="ra-title"><h2 id="ra-title" class="heading">Approve medicine request</h2>' +
        '<p>' + esc(rp.name) + ' · ' + esc(ra.medicine) + '</p>' +
        '<div class="stack" style="padding:0"><div class="label">Confirm all three</div>' +
        box('c1', 'Same condition as the in-person visit') +
        box('c2', 'I have enough information to decide without seeing the patient') +
        box('c3', 'Not a Schedule X or NDPS medicine') + '</div>' +
        '<div class="stack" style="padding:0"><div class="label">How did you issue the prescription?</div>' +
        radio('desk', 'Signed prescription left at the desk') +
        radio('sent', 'I sent it to the patient’s registered number') + '</div>' +
        '<label class="field"><span class="label">Your PIN</span><input id="rf-pin" type="password" inputmode="numeric" autocomplete="off" maxlength="6" data-bind="form.pin" data-live="1" value="' + esc(fa.pin || '') + '"><span class="caption bn-muted">Approvals need your PIN every time, so a phone left signed in cannot approve.</span></label>' +
        (fa.error ? '<p class="caption" style="color:var(--emergency)">' + esc(fa.error) + '</p>' : '') +
        '<p class="caption bn-muted">The patient gets an SMS on the registered number that you have responded. It never names the medicine.</p>' +
        '<div class="row-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="refill-approve-confirm">' + e('Approve') + '</button><button type="button" class="bn-btn" data-act="modal-close">' + e('Close') + '</button></div></div></div>';
    }
    if (m.kind === 'refill-decline') {
      return '<div class="modal-back"><div class="modal" role="dialog" aria-modal="true"><h2 class="heading">Decline medicine request</h2>' +
        '<label class="field"><span class="label">Note for the desk</span><textarea id="rf-dnote" data-bind="form.note" data-live="1">' + esc(state.form.note || '') + '</textarea><span class="caption bn-muted">The desk calls the patient with this note. Keep medicine names out of it if you can.</span></label>' +
        (state.form.error ? '<p class="caption" style="color:var(--emergency)">' + esc(state.form.error) + '</p>' : '') +
        '<div class="row-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="refill-decline-confirm">Decline</button><button type="button" class="bn-btn" data-act="modal-close">' + e('Close') + '</button></div></div></div>';
    }
    if (m.kind === 'refill-call') {
      var rc = ticketBy(m.id);
      var rcp = patient(rc.patientId);
      return '<div class="modal-back"><div class="modal" role="dialog" aria-modal="true"><h2 class="heading">Call ' + esc(rcp.phones[0].number) + '?</h2><p>The registered number for ' + esc(rcp.name) + (rc.requester === 'guardian' ? ' (their parent answers)' : '') + '. This is your own teleconsult: decide after the call.</p><div class="row-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="refill-call-confirm">Call</button><button type="button" class="bn-btn" data-act="modal-close">' + e('Close') + '</button></div></div></div>';
    }
    if (m.kind === 'move') {
      var bb = booking(m.bookingId);
      var pp = patient(bb.patientId);
      return '<div class="modal-back"><div class="modal" role="dialog" aria-modal="true"><h2 class="heading">Move ' + esc(pp.name) + '?</h2><p>To ' + esc(doctor(m.doctorId).name) + (m.windowLabel ? ', ' + esc(m.windowLabel) : '') + '.</p><label class="row-actions"><input type="checkbox" data-bind="form.notify" data-act="refresh" ' + (state.form.notify ? 'checked' : '') + '> <span>Tell the patient by SMS</span></label><div class="row-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="move-confirm">Move booking</button><button type="button" class="bn-btn" data-act="modal-close">' + e('Close') + '</button></div></div></div>';
    }
    if (m.kind === 'history') {
      return '<div class="modal-back"><div class="modal" role="dialog" aria-modal="true"><h2 class="heading">History</h2><ul class="timeline">' + m.lines.map(function (line) { return '<li><span class="caption bn-num">' + esc(line.at) + '</span><span>' + esc(line.text) + '</span></li>'; }).join('') + '</ul><button type="button" class="bn-btn" data-act="modal-close">' + e('Close') + '</button></div></div>';
    }
    return '';
  }

  function shell(inner) {
    return '<div class="app">' + rail() + '<div class="main">' + topbar() + '<div class="page">' + banners() + inner + '</div></div></div>';
  }
  function screen() {
    var r = route();
    if (user().role === 'assistant' && r !== 'today' && r !== 'summary' && r !== 'waiting' && r !== 'doctor') {
      return '<div class="empty"><p class="heading">This desk only shows Dr Sharma’s queue.</p><a class="bn-btn bn-btn-primary" href="#today">Back to Today</a></div>';
    }
    if (r === 'bookings') return bookingsScreen();
    if (r === 'callbacks') return callbacksScreen();
    if (r === 'calls') return callsScreen();
    if (r === 'payments') return paymentsScreen();
    if (r === 'messages') return messagesScreen();
    if (r === 'patients') return patientsScreen();
    if (r === 'settings') return settingsScreen();
    if (r === 'summary') return summaryScreen();
    return todayScreen();
  }
  function view() {
    document.documentElement.lang = state.lang === 'hi' ? 'hi' : 'en';
    if (!state.signedIn) return '<div class="shell">' + emergencyBanner() + signin() + '</div>';
    var u = user();
    var inner;
    if (state.locked) inner = lockScreen();
    else if (u.role === 'doctor' || route() === 'doctor') inner = doctorScreen();
    else if (route() === 'waiting') inner = waitingRoom();
    else inner = shell(screen());
    return '<div class="shell">' + emergencyBanner() + inner + drawer() + modal() + switchSheet() + (state.toast ? '<div class="toast" role="status">' + esc(state.toast) + '</div>' : '') + '</div>';
  }

  // Replacing the page can blur a focused input, whose change handler renders again while the first
  // render is still writing innerHTML. Queue that second render instead of nesting it.
  var rendering = false;
  var renderAgain = null;
  function render(opts) {
    if (rendering) { renderAgain = opts || {}; return; }
    rendering = true;
    try { renderNow(opts); } finally { rendering = false; }
    if (renderAgain) { var again = renderAgain; renderAgain = null; render(again); }
  }
  function renderNow(opts) {
    var keep = opts && opts.keepFocus ? document.activeElement : null;
    var focusId = keep && keep.id;
    var pos = keep ? keep.selectionStart : null;
    state.doctors.forEach(function (d) { d.threshold = Number(state.settings.delayThreshold) || 20; });
    document.getElementById('app').innerHTML = view();
    var bar = document.querySelector('.emergency-wrap');
    document.documentElement.style.setProperty('--emergency-h', (bar ? bar.offsetHeight : 0) + 'px');
    if (focusId) {
      var node = document.getElementById(focusId);
      if (node) {
        node.focus();
        if (typeof pos === 'number' && node.setSelectionRange) {
          try { node.setSelectionRange(pos, pos); } catch (err) { /* number inputs */ }
        }
      }
    }
  }

  function blankForm(extra) {
    state.form = Object.assign({
      patientId: '', name: '', phone: '', age: '', reason: 'general check-up', doctorId: 'sharma',
      when: 'current', priority: false, relative: false, waive: false, waiveReason: '',
      method: 'cash', fileComplete: true, squeeze: false, showQr: false, notify: true, note: '', amount: '', error: '',
      dateKey: state.dateKey, windowLabel: '', source: 'console'
    }, extra || {});
  }
  function openBooking(id) {
    var b = booking(id);
    var p = patient(b.patientId);
    var mode = (b.status === 'booked' || b.status === 'arrived' || b.status === 'held') ? 'checkin' : 'edit';
    state.drawer = { kind: 'booking', mode: mode, bookingId: id };
    blankForm({
      patientId: b.patientId, name: p.name, phone: p.phones[0].number, age: String(p.age),
      reason: b.reason, doctorId: b.doctorId, priority: b.priority, relative: !!b.relativeName,
      method: b.fee && b.fee.method === 'UPI' ? 'upi' : 'cash'
    });
    render();
  }
  function markArrived(id) {
    var b = booking(id);
    if (!b || b.status !== 'booked') return;
    b.status = 'arrived';
    b.statusNote = state.timeLabel;
    b.arrivedMin = 18 * 60 + 10;
    b.timeline.push({ at: state.timeLabel, text: 'Marked arrived by ' + user().name });
    audit('Marked ' + patient(b.patientId).name + ' arrived', { patientId: b.patientId });
    render();
  }
  function sendIn(id) {
    var b = booking(id);
    if (!b) return;
    var d = doctor(b.doctorId);
    state.bookings.forEach(function (other) {
      if (other.doctorId === d.id && other.status === 'in_consult') {
        other.status = 'done';
        other.statusNote = state.timeLabel;
        other.timeline.push({ at: state.timeLabel, text: 'Done when the next patient was sent in' });
      }
    });
    b.status = 'in_consult';
    b.statusNote = 'since ' + state.timeLabel;
    d.nowName = patient(b.patientId).name;
    d.nowSince = state.timeLabel;
    d.basis = 'live';
    d.watchdogMin = 0;
    b.timeline.push({ at: state.timeLabel, text: 'Sent in by ' + user().name });
    audit('Sent ' + d.nowName + ' in to ' + d.name);
    render();
  }
  function callNext(id) {
    var d = doctor(id);
    if (!d || d.status === 'paused' || d.status === 'ended' || d.status === 'cancelled') return;
    if (state.poorNetwork) {
      state.toast = 'Tap queued. Will sync when the cabin is back online.';
      render();
      return;
    }
    var current = state.bookings.filter(function (b) { return b.doctorId === id && b.status === 'in_consult'; })[0];
    var next = queueFor(id)[0];
    if (!current && !next) return;
    var steps = [];
    if (current) steps.push({ id: current.id, status: current.status, statusNote: current.statusNote });
    if (next) steps.push({ id: next.id, status: next.status, statusNote: next.statusNote });
    state.undo = { at: Date.now(), steps: steps, doctorId: id, nowName: d.nowName, nowSince: d.nowSince, basis: d.basis, delayMin: d.delayMin };
    if (current) {
      current.status = 'done';
      current.statusNote = state.timeLabel;
      current.timeline.push({ at: state.timeLabel, text: 'Done on Call next' });
    }
    if (next) {
      next.status = 'in_consult';
      next.statusNote = 'since ' + state.timeLabel;
      d.nowName = patient(next.patientId).name;
      d.nowSince = state.timeLabel;
      state.flash = d.nowName;
      next.timeline.push({ at: state.timeLabel, text: 'Called in' });
    } else {
      d.nowName = '';
      d.nowSince = '';
      state.flash = '';
    }
    d.basis = 'live';
    d.watchdogMin = 0;
    if (d.delayMin >= 20) d.delayMin += 8;
    clearTimeout(state._flash);
    if (state.flash) state._flash = setTimeout(function () { state.flash = ''; render(); }, 2000);
    audit('Call next for ' + d.name + (state.flash ? ': ' + state.flash : ''));
    render();
  }
  function applyCancel(id) {
    var d = doctor(id);
    d.status = 'cancelled';
    d.nowName = '';
    state.bookings.forEach(function (b) {
      if (b.doctorId !== id || b.dateKey !== state.dateKey) return;
      if (['done', 'cancelled', 'no_show', 'rescheduled'].indexOf(b.status) >= 0) return;
      b.originDoctorId = id;
      if (b.anyDoctor) {
        var other = state.doctors.filter(function (x) { return x.pool && x.pool === d.pool && x.id !== id && x.status !== 'cancelled'; })[0];
        if (other) {
          b.doctorId = other.id;
          b.movedFrom = d.name;
          var win = state.windows.filter(function (w) { return w.doctorId === other.id && w.dateKey === state.dateKey; })[0];
          if (win) b.windowId = win.id;
          b.timeline.push({ at: state.timeLabel, text: 'Moved from ' + d.name + ' because the session was cancelled.' });
        }
      } else {
        b.status = 'cancelled';
        b.statusNote = 'Session cancelled';
        b.outreach = 'calling';
        b.timeline.push({ at: state.timeLabel, text: 'Session cancelled. Outreach call queued by ' + user().name + '.' });
      }
    });
    state.modal = null;
    audit('Cancelled ' + d.name + '’s session');
    render();
  }
  function endSession(id) {
    var d = doctor(id);
    state.bookings.forEach(function (b) {
      if (b.doctorId === id && b.dateKey === state.dateKey && b.status === 'booked') {
        b.status = 'no_show';
        b.statusNote = 'Marked at end of session';
        b.timeline.push({ at: state.timeLabel, text: 'No-show when ' + user().name + ' ended the session' });
      }
    });
    d.status = 'ended';
    d.nowName = '';
    state.modal = null;
    audit('Ended ' + d.name + '’s session. Booked patients who had not arrived are no-shows.');
    render();
  }
  function saveBooking() {
    var f = state.form;
    var docId = f.doctorId === 'any' ? 'sharma' : f.doctorId;
    var doc = doctor(docId);
    var dateKey = f.dateKey || state.dateKey;
    var shut = dayClosed(docId, dateKey);
    if (shut) { f.error = doc.name + ' has no session that day (' + shut + ').'; render({ keepFocus: true }); return; }
    var label = f.windowLabel || defaultLabel(docId, dateKey);
    if (bookableLabels(dateKey, docId).indexOf(label) < 0) { f.error = 'That window has already started or passed. Pick a later one.'; render({ keepFocus: true }); return; }
    var win = findWindow(docId, label, dateKey);
    if (!win) {
      win = { id: 'w-' + docId + '-' + dateKey + '-' + label.replace(/\W/g, ''), doctorId: docId, label: label, shifted: '', capacity: doc.capacity || 4, priorityPlaces: doc.priorityPlaces || 0, isNow: false, dateKey: dateKey };
      state.windows.push(win);
    }
    var source = f.source === 'walk_in' && dateKey === state.dateKey ? 'walk_in' : 'console';
    var priority = !!(f.priority || f.when === 'priority');
    if (priority && !(doc.priorityFee)) { f.error = 'Priority visits are only for specialists.'; render({ keepFocus: true }); return; }
    var occ = occupancy(win);
    var regCap = (win.capacity || 4) - (win.priorityPlaces || 0);
    if (priority && occ.priorityTaken >= (win.priorityPlaces || 0) && !f.squeeze) { f.error = 'The priority place is taken. Tick squeeze in to go over capacity.'; render({ keepFocus: true }); return; }
    if (!priority && occ.taken >= regCap && !f.squeeze) { f.error = 'This window is full. Tick squeeze in to go over capacity.'; render({ keepFocus: true }); return; }
    var pid = f.patientId;
    if (!pid) {
      if (!String(f.name || '').trim() || !String(f.phone || '').trim()) { f.error = 'A new patient needs a name and a phone.'; render({ keepFocus: true }); return; }
      var digits = String(Math.floor(1000000 + Math.random() * 9000000));
      var idStr = digits.slice(0, 3) + ' ' + digits.slice(3, 6) + ' ' + digits.slice(6);
      pid = 'p-' + digits;
      state.patients.unshift({ id: pid, name: f.name.trim(), pid: idStr, age: Number(f.age) || '', dob: '', phones: [{ number: f.phone.trim(), relation: 'self' }], holder: '', consents: [{ name: 'SMS', on: true, date: state.dateLabel }], past: [], lockout: false, history: [{ at: state.timeLabel, text: 'Record created by ' + user().name }] });
    }
    var total = (Number(doc.appointmentFee) || 0) + (priority ? (Number(doc.priorityFee) || 0) : 0);
    var fee = null;
    if (f.waive && user().role === 'admin' && String(f.waiveReason || '').trim()) fee = { state: 'waived', amount: total, method: 'waived' };
    else if (total) fee = { state: 'due', amount: total, method: f.method === 'upi' ? 'UPI link' : 'Cash at desk' };
    if (f.waive && user().role !== 'admin') { f.error = 'Only an admin can waive a fee.'; render({ keepFocus: true }); return; }
    if (f.waive && !String(f.waiveReason || '').trim()) { f.error = 'A fee waiver needs a reason.'; render({ keepFocus: true }); return; }
    var id = 'b-' + Date.now();
    var how = source === 'walk_in' ? 'Walk-in added by ' + user().name : 'Booked at the desk by ' + user().name + ' on a phone call';
    state.bookings.push({
      id: id, patientId: pid, doctorId: docId, dateKey: dateKey, dateLabel: dayLabel(dateKey), windowId: win.id,
      status: 'booked', statusNote: f.squeeze ? 'Squeezed in' : '', source: source, callId: '', reason: f.reason,
      priority: priority, anyDoctor: f.doctorId === 'any', relativeName: f.relative ? 'Relative' : '', fee: fee,
      arrivedMin: 0, delaySms: '0/2', delayChoice: '', outreach: '',
      timeline: [{ at: state.timeLabel, text: how + ' · ' + dayLabel(dateKey) + ', ' + label + (f.squeeze ? ' · over capacity' : '') + (fee && fee.state === 'waived' ? '. Fee waived: ' + f.waiveReason : '') }]
    });
    state.activity.unshift({ id: id, text: user().name + (source === 'walk_in' ? ' added a walk-in for ' : ' booked ') + patient(pid).name + ' with ' + doc.name + ', ' + dayLabel(dateKey) + ' ' + label + '.', ago: 'just now' });
    state.drawer = null;
    audit((source === 'walk_in' ? 'Walk-in booked for ' : 'Booked ') + patient(pid).name + ' · ' + dayLabel(dateKey) + ', ' + label, { patientId: pid });
    render();
  }
  function tryPin() {
    var u = state.users.filter(function (x) { return x.id === (state.pinFor || (state.locked ? state.userId : '')); })[0];
    if (!u) return;
    if (!state.needOtp) {
      if (u.pin !== state.pin) { state.pin = ''; state.pinError = 'That PIN does not match.'; render(); return; }
      if (u.role === 'admin') { state.needOtp = true; state.pinError = ''; state.otp = ''; render(); return; }
      finishSignIn(u);
      return;
    }
    if (u.otp !== state.otp) { state.otp = ''; state.pinError = 'That authenticator code does not match.'; render(); return; }
    finishSignIn(u);
  }
  function finishSignIn(u) {
    state.userId = u.id;
    state.signedIn = true;
    state.locked = false;
    state.switchOpen = false;
    state.pin = '';
    state.otp = '';
    state.needOtp = false;
    state.pinFor = '';
    state.pinError = '';
    audit('Signed in');
    if (u.role === 'doctor') go('doctor');
    else render();
  }
  function doAct(act, el) {
    var id = el.dataset.id || '';
    var value = el.dataset.value || '';
    if (act === 'desk') { audit(state.staffOnDesk ? 'Staff on desk is on. Calls transfer to the desk phone.' : 'Staff on desk is off. Callers are offered a callback.'); render(); return; }
    if (act === 'refresh') { render({ keepFocus: true }); return; }
    if (act === 'lang') { state.lang = value; render(); return; }
    if (act === 'lock') { state.locked = true; state.pin = ''; state.pinFor = state.userId; state.needOtp = false; state.pinError = ''; render(); return; }
    if (act === 'signout') { state.signedIn = false; state.locked = false; state.switchOpen = false; state.pin = ''; state.pinFor = ''; state.needOtp = false; state.drawer = null; state.modal = null; render(); return; }
    if (act === 'switch-open') { state.switchOpen = true; state.pin = ''; state.pinFor = ''; state.needOtp = false; state.pinError = ''; render(); return; }
    if (act === 'switch-close' || act === 'pin-cancel') { state.switchOpen = false; state.pinFor = ''; state.pin = ''; state.needOtp = false; state.pinError = ''; render(); return; }
    if (act === 'pick-user') { state.pinFor = id; state.pin = ''; state.otp = ''; state.needOtp = false; state.pinError = ''; render(); return; }
    if (act === 'pin-digit') {
      if (state.needOtp) { if (state.otp.length < 6) state.otp += value; if (state.otp.length >= 6) { tryPin(); return; } }
      else { if (state.pin.length < 6) state.pin += value; if (state.pin.length === 4 && !state.locked) { /* wait for 4–6 */ } }
      render(); return;
    }
    if (act === 'pin-clear') { state.pin = ''; state.otp = ''; state.pinError = ''; render(); return; }
    if (act === 'pin-ok') { if (state.locked && !state.pinFor) state.pinFor = state.userId; tryPin(); return; }
    if (act === 'dismiss') { state.dismissed[id] = true; render(); return; }
    if (act === 'ack') {
      state.emergencyAck = true;
      var fresh = cbBy('cb-new');
      if (fresh) fresh.isNew = false;
      state.alerts.unshift({ id: 'al-new', kind: 'medical', at: '6:08 pm', number: '+91 98777 77777', by: user().name, ackAt: state.timeLabel, snippet: 'Papa ko seene mein dard ho raha hai, saans phool rahi hai', callId: 'call-emerg' });
      audit('Acknowledged a medical emergency');
      render(); return;
    }
    if (act === 'call-emergency') {
      state.modal = { kind: 'call', number: '+91 98777 77777', body: 'Call +91 98777 77777? The agent already told them to ring 112 / 108.', id: 'cb-new' };
      render(); return;
    }
    if (act === 'place-call') {
      var cbc = cbBy(id);
      if (cbc) { cbc.status = 'calling'; state.callbackId = cbc.id; }
      state.modal = null;
      audit('Calling ' + (cbc ? cbc.number : 'the patient'));
      go('callbacks'); return;
    }
    if (act === 'open-call') { state.callId = id; state.modal = null; go('calls'); return; }
    if (act === 'open-booking') { openBooking(id); return; }
    if (act === 'arrive') { markArrived(id); return; }
    if (act === 'send-in') { sendIn(id); return; }
    if (act === 'walk-in') { state.drawer = { kind: 'booking', mode: 'create', bookingId: '' }; blankForm({ source: 'walk_in' }); render(); return; }
    if (act === 'close-drawer') { state.drawer = null; render(); return; }
    if (act === 'fill-patient') {
      var pp = patient(state.form.patientId);
      if (pp) { state.form.name = pp.name; state.form.phone = pp.phones[0].number; state.form.age = String(pp.age); }
      render({ keepFocus: true }); return;
    }
    if (act === 'save-booking') { saveBooking(); return; }
    if (act === 'confirm-held') {
      var held = booking(id);
      held.status = 'booked';
      held.statusNote = 'Fee due ' + money(held.fee.amount);
      held.timeline.push({ at: state.timeLabel, text: 'Hold confirmed by ' + user().name });
      state.activity.unshift({ id: 'hold-done', text: 'Agent booking confirmed for ' + patient(held.patientId).name + '.', ago: 'just now' });
      audit('Confirmed the held booking for ' + patient(held.patientId).name);
      render(); return;
    }
    if (act === 'collect-cash' || act === 'mark-paid') {
      var pb = booking(id);
      if (pb && pb.fee) { pb.fee.state = 'paid'; pb.fee.method = act === 'collect-cash' ? 'Cash' : 'UPI'; pb.timeline.push({ at: state.timeLabel, text: 'Paid ' + money(pb.fee.amount) + ' (' + pb.fee.method + ') · ' + user().name }); }
      audit('Marked fee paid');
      render(); return;
    }
    if (act === 'show-qr') { state.form.showQr = true; render(); return; }
    if (act === 'pause') { doctor(id).status = 'paused'; audit('Paused ' + doctor(id).name); render(); return; }
    if (act === 'resume') { doctor(id).status = 'started'; audit('Resumed ' + doctor(id).name); render(); return; }
    if (act === 'start-session') { doctor(id).status = 'started'; doctor(id).basis = 'schedule'; audit('Started ' + doctor(id).name + '’s session'); render(); return; }
    if (act === 'end-session') {
      state.modal = { kind: 'confirm', title: 'End ' + doctor(id).name + '’s session?', body: 'Patients still booked, who have not arrived, will be marked no-show.', confirm: 'End session', confirmAct: 'end-confirm', id: id };
      render(); return;
    }
    if (act === 'end-confirm') { endSession(id); return; }
    if (act === 'cancel-session') {
      state.modal = { kind: 'confirm', title: 'Cancel ' + doctor(id).name + '’s session?', body: 'Any-doctor patients move to another general doctor. Named bookings get an outreach call.', confirm: 'Cancel session', confirmAct: 'cancel-confirm', id: id };
      render(); return;
    }
    if (act === 'cancel-confirm') { applyCancel(id); return; }
    if (act === 'call-next') { callNext(id); return; }
    if (act === 'undo-call') {
      if (!undoLive()) return;
      state.undo.steps.forEach(function (step) {
        var b = booking(step.id);
        b.status = step.status; b.statusNote = step.statusNote;
      });
      var ud = doctor(state.undo.doctorId);
      ud.nowName = state.undo.nowName; ud.nowSince = state.undo.nowSince; ud.basis = state.undo.basis; ud.delayMin = state.undo.delayMin;
      state.undo = null; state.flash = '';
      audit('Undid the last Call next');
      render(); return;
    }
    if (act === 'pick-callback') { state.callbackId = id; render(); return; }
    if (act === 'cb-filter') { state.callbackFilter = value; render(); return; }
    if (act === 'cb-call') {
      var cb = cbBy(id);
      state.callbackId = id;
      if (cb.differs) {
        state.modal = { kind: 'call', id: id, number: cb.callbackNumber, body: 'Call ' + cb.callbackNumber + '? The patient called from ' + cb.number + '.' };
        render(); return;
      }
      state.modal = { kind: 'call', id: id, number: cb.number, body: 'Call ' + (cb.caller || 'this number') + ' at ' + cb.number + '.' };
      render(); return;
    }
    if (act === 'cb-outcome') {
      var item = cbBy(id);
      var word = { reached: 'Reached', no_answer: 'No answer', wrong: 'Wrong number' }[value];
      item.attempts.push({ at: state.timeLabel, outcome: word + (state.cbNote ? ' · ' + state.cbNote : '') });
      if (value === 'no_answer') {
        var misses = item.attempts.filter(function (a) { return a.outcome.indexOf('No answer') === 0; }).length;
        if (misses >= 2) item.smsSent = true;
        item.status = 'open';
      } else item.status = 'done';
      state.cbNote = '';
      audit(word + ' · ' + (item.caller || item.number));
      render(); return;
    }
    if (act === 'cb-book') {
      var src = cbBy(id);
      state.drawer = { kind: 'booking', mode: 'create', bookingId: '' };
      blankForm({ patientId: src.patientId || '', name: src.caller || '', phone: src.number || '' });
      render(); return;
    }
    if (act === 'clear-lockout') {
      cbBy(id).lockout = false;
      audit('Cleared a verification lockout after an in-person check');
      render(); return;
    }
    if (act === 'pick-call') { state.callId = id; state.playing = false; render(); return; }
    if (act === 'call-outcome') { state.callOutcome = value; render(); return; }
    if (act === 'call-intent') { state.callIntent = value; render(); return; }
    if (act === 'play') { state.playing = !state.playing; render(); return; }
    if (act === 'pay-tab') { state.paymentTab = value; render(); return; }
    if (act === 'refund') {
      var rf = state.refunds.filter(function (r) { return r.id === id; })[0];
      state.modal = { kind: 'refund', mode: value, id: id };
      blankForm({ amount: String(rf.amount), note: '', error: '' });
      render(); return;
    }
    if (act === 'refund-confirm') {
      var rff = state.refunds.filter(function (r) { return r.id === state.modal.id; })[0];
      var mode = state.modal.mode;
      if ((mode === 'reject' || mode === 'change') && !String(state.form.note || '').trim()) { state.form.error = 'A note is required.'; render({ keepFocus: true }); return; }
      if (mode === 'change') {
        var amt = Number(state.form.amount);
        var max = rff.paid - rff.refunded;
        if (!amt || amt < 0 || amt > max) { state.form.error = 'You cannot refund more than was paid (' + money(max) + ').'; render({ keepFocus: true }); return; }
        rff.amount = amt;
        rff.note = state.form.note;
      }
      if (mode === 'reject') { rff.status = 'rejected'; rff.note = state.form.note; }
      if (mode === 'approve' || mode === 'change') {
        rff.status = 'approved';
        rff.refunded = rff.amount;
        rff.approvedBy = user().name;
        rff.approvedAt = state.timeLabel;
        var bk = booking(rff.bookingId);
        if (bk) bk.timeline.push({ at: state.timeLabel, text: 'Refund ' + money(rff.amount) + ' approved by ' + user().name + (rff.note ? '. ' + rff.note : '') });
      }
      state.modal = null;
      audit('Refund ' + mode + ' for ' + patient(rff.patientId).name);
      render(); return;
    }
    if (act === 'msg-tab') { state.messageTab = value; if (value === 'outbox') state.dismissed.failed = true; render(); return; }
    if (act === 'outbox-filter') { state.outboxFilter = value; render(); return; }
    if (act === 'retry-msg') {
      var msg = state.outbox.filter(function (m) { return m.id === id; })[0];
      msg.status = 'sent';
      audit('Queued ' + msg.template + ' again');
      render(); return;
    }
    if (act === 'ticket') {
      var tk = state.tickets.filter(function (tkt) { return tkt.id === id; })[0];
      if (!tk || isRefill(tk) || !canAnswer(tk)) return;   // refills use the refill-* actions; doctor messages only by that doctor
      if (value === 'visit' && user().role === 'doctor') {
        tk.status = 'decided';
        tk.outcome = user().name + ' asked the patient to visit, ' + state.timeLabel + '. The desk helps them book.';
        queueSms(tk.patientId, 'Visit requested', user().name + ' would like to see you. Call the clinic to book a visit. If you feel unwell, call 112.');
        audit('Asked ' + patient(tk.patientId).name + ' to visit', { patientId: tk.patientId });
        render(); return;
      }
      if (value === 'visit') {
        tk.status = 'decided';
        tk.outcome = 'Asked the patient to visit. ' + user().name + ' at ' + state.timeLabel + '.';
        state.drawer = { kind: 'booking', mode: 'create', bookingId: '' };
        blankForm({ patientId: tk.patientId });
        var person = patient(tk.patientId);
        state.form.name = person.name; state.form.phone = person.phones[0].number; state.form.age = String(person.age);
        audit('Asked ' + person.name + ' to visit');
        render(); return;
      }
      state.modal = { kind: 'ticket', id: id, mode: value };
      blankForm({ note: '' });
      render(); return;
    }
    if (act === 'ticket-confirm') {
      var ticket = state.tickets.filter(function (tkt) { return tkt.id === state.modal.id; })[0];
      if (!ticket || isRefill(ticket) || !canAnswer(ticket)) { state.modal = null; render(); return; }
      if (!String(state.form.note || '').trim()) return;
      ticket.status = 'decided';
      ticket.outcome = (state.modal.mode === 'decline' ? 'Declined' : 'Reply saved') + ' by ' + user().name + '. “' + state.form.note + '” SMS queued.';
      state.modal = null;
      audit(ticket.outcome);
      render(); return;
    }
    // ---- refills (flow 11): the desk can only mark seen and remind; the patient's own doctor decides
    if (act === 'refill-seen' || act === 'refill-remind') {
      var rs = ticketBy(id);
      if (!rs || !refillOpen(rs) || user().role === 'doctor') return;
      var what = isRefill(rs) ? 'a medicine request' : 'a message';
      if (act === 'refill-seen') { rs.status = 'seen'; audit('Marked ' + what + ' for ' + patient(rs.patientId).name + ' as seen', { patientId: rs.patientId }); }
      else if (rs.doctorId) audit('Reminded ' + doctor(rs.doctorId).name + ' about ' + what + ' for ' + patient(rs.patientId).name);
      render(); return;
    }
    if (act === 'refill-approve' || act === 'refill-decline' || act === 'refill-visit' || act === 'refill-call') {
      var rt = ticketBy(id);
      if (!rt || !ownDoctor(rt) || !refillOpen(rt)) return;
      if (act === 'refill-approve' && !refillCheck(rt).ok) return;
      if (act === 'refill-visit') {
        state.modal = { kind: 'confirm', title: 'Ask ' + patient(rt.patientId).name + ' to visit?', body: 'They get an SMS that you need to see them before renewing the medicine. The desk helps them book.', confirm: 'Ask to visit', confirmAct: 'refill-visit-confirm', id: rt.id };
      } else {
        state.modal = { kind: act, id: rt.id };
      }
      blankForm({ c1: false, c2: false, c3: false, via: '', pin: '', note: '' });
      render(); return;
    }
    if (act === 'refill-approve-confirm') {
      var ap = ticketBy(state.modal && state.modal.id);
      var fa = state.form;
      if (!ap || !ownDoctor(ap) || !refillOpen(ap)) { state.modal = null; render(); return; }
      var chk = refillCheck(ap);
      if (!chk.ok) fa.error = 'No in-person visit with you in the last 6 months. Ask the patient to visit.';
      else if (!(fa.c1 && fa.c2 && fa.c3)) fa.error = 'Confirm all three checks, or choose another action.';
      else if (!fa.via) fa.error = 'Say how you issued the prescription.';
      else if (String(fa.pin) !== user().pin) { fa.error = 'That PIN does not match.'; fa.pin = ''; }
      else fa.error = '';
      if (fa.error) { render(); return; }
      var ad = doctor(ap.doctorId);
      ap.status = 'approved';
      ap.outcome = 'Approved by ' + user().name + ' at ' + state.timeLabel + ' · last in-person visit ' + dayLabel(chk.last) + ' · ' + (fa.via === 'desk' ? 'prescription left at the desk' : 'doctor sent the prescription to the patient') + '.';
      queueSms(ap.patientId, fa.via === 'desk' ? 'Refill: collect at desk' : 'Refill: doctor replied',
        fa.via === 'desk'
          ? ad.name + ' has responded to your medicine request. Please collect your prescription at the clinic desk with your patient card.'
          : ad.name + ' has responded to your medicine request and sent the reply to this number. Call the clinic with any questions.');
      state.modal = null;
      audit('Approved a medicine request for ' + patient(ap.patientId).name, { patientId: ap.patientId });
      render(); return;
    }
    if (act === 'refill-decline-confirm') {
      var dt = ticketBy(state.modal && state.modal.id);
      if (!dt || !ownDoctor(dt) || !refillOpen(dt)) { state.modal = null; render(); return; }
      var note = String(state.form.note || '').trim();
      if (!note) { state.form.error = 'Add a note so the desk can tell the patient.'; render(); return; }
      var dp = patient(dt.patientId);
      dt.status = 'declined';
      dt.outcome = 'Declined by ' + user().name + ' at ' + state.timeLabel + '. Desk to call the patient. Note: “' + note + '”';
      state.callbacks.push({ id: 'cb-rf-' + Date.now(), priority: 'P3', isNew: false, overdue: false, dueSoon: false, dueText: 'next session', dueMin: 2200, caller: dp.name, patientId: dp.id, number: dp.phones[0].number, language: 'EN', verified: true, reason: user().name + ' declined a medicine request. Call the patient with the doctor’s note.', callId: '', status: 'open', attempts: [], smsSent: false, differs: false, callbackNumber: '', preferred: 'Next session', wanted: 'Doctor’s note: ' + note, snippet: '', lockout: false });
      state.modal = null;
      audit('Declined a medicine request for ' + dp.name, { patientId: dp.id });
      render(); return;
    }
    if (act === 'refill-visit-confirm') {
      var vt = ticketBy(id);
      if (!vt || !ownDoctor(vt) || !refillOpen(vt)) { state.modal = null; render(); return; }
      vt.status = 'visit_requested';
      vt.outcome = user().name + ' asked the patient to visit, ' + state.timeLabel + '.';
      queueSms(vt.patientId, 'Refill: visit needed', doctor(vt.doctorId).name + ' needs to see you before renewing your medicine. Call the clinic to book a visit. If you feel unwell, call 112.');
      state.modal = null;
      audit('Asked ' + patient(vt.patientId).name + ' to visit about a medicine request', { patientId: vt.patientId });
      render(); return;
    }
    if (act === 'refill-call-confirm') {
      var ct = ticketBy(state.modal && state.modal.id);
      state.modal = null;
      if (ct && ownDoctor(ct)) audit('Called ' + patient(ct.patientId).name + ' about a medicine request', { patientId: ct.patientId });
      render(); return;
    }
    if (act === 'jump-requests') { var jr = document.getElementById('doc-requests'); if (jr) jr.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (act === 'emerg-open') { state.callbackId = 'cb-new'; go('callbacks'); return; }
    if (act === 'pick-patient') {
      state.patientId = id;
      state.search = '';
      var viewed = patient(id);
      if (viewed) viewed.history.unshift({ at: state.timeLabel, text: 'Viewed by ' + user().name });
      go('patients'); return;
    }
    if (act === 'book-patient') {
      var who = patient(id);
      state.drawer = { kind: 'booking', mode: 'create', bookingId: '' };
      blankForm({ patientId: id, name: who.name, phone: who.phones[0].number, age: String(who.age) });
      render(); return;
    }
    if (act === 'settings-tab') { state.settingsSection = value; render(); return; }
    if (act === 'export-day') {
      if (user().role !== 'admin') return;
      var csv = 'Item,Value\nCalls handled,31\nOpen callbacks,' + openCallbacks().length + '\nRefunds waiting,' + waitingRefunds().length + '\n';
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'day-summary-19-oct.csv';
      a.click();
      audit('Exported the day summary');
      render(); return;
    }
    if (act === 'history') {
      var lines = [];
      if (value === 'patient' || el.dataset.kind === 'patient') lines = (patient(id).history || []).slice();
      if (el.dataset.kind === 'booking') lines = (booking(id).timeline || []).concat([{ at: state.timeLabel, text: 'Opened by ' + user().name }]);
      if (el.dataset.kind === 'refund') {
        var rr = state.refunds.filter(function (r) { return r.id === id; })[0];
        lines = [{ at: 'Earlier', text: 'Requested by ' + rr.requestedByName }, { at: state.timeLabel, text: 'Viewed by ' + user().name }];
      }
      if (el.dataset.kind === 'call') lines = [{ at: state.timeLabel, text: 'Opened by ' + user().name }, { at: 'Call time', text: 'Recording stays inside the console' }];
      state.modal = { kind: 'history', lines: lines.length ? lines : [{ at: state.timeLabel, text: 'No earlier events' }] };
      render(); return;
    }
    if (act === 'modal-close') { state.modal = null; render(); return; }
    if (act === 'cal-view') { state.bookingsView = value; state.cell = null; render(); return; }
    if (act === 'cell') {
      state.cell = { doctorId: el.dataset.doctor, windowLabel: el.dataset.window || '', dateKey: el.dataset.date };
      render(); return;
    }
    if (act === 'clear-cell') { state.cell = null; render(); return; }
    if (act === 'retry-sync') { state.syncOk = true; audit('Retried the calendar mirror. It is up to date.'); render(); return; }
    if (act === 'doctor-open') { state.focusDoctor = id; state.phoneMode = 'doctor'; go('doctor'); return; }
    if (act === 'phone-mode') { state.phoneMode = value; render(); return; }
    if (act === 'network') { state.poorNetwork = !state.poorNetwork; render(); return; }
    if (act === 'privacy') { state.privacyNumbers = !state.privacyNumbers; render(); return; }
    if (act === 'offer-reschedule') {
      audit('Offered a reschedule to patients waiting on ' + doctor(id).name);
      state.dismissed['late' + id] = true;
      render(); return;
    }
    if (act === 'move-confirm') {
      var mv = state.modal;
      var mb = booking(mv.bookingId);
      var dest = doctor(mv.doctorId);
      var w = state.windows.filter(function (win) { return win.doctorId === mv.doctorId && win.label === mv.windowLabel && win.dateKey === mv.dateKey; })[0];
      if (!w) {
        w = { id: 'w-new-' + Date.now(), doctorId: mv.doctorId, label: mv.windowLabel || '5:00–5:30 pm', shifted: '', capacity: dest.capacity || 4, priorityPlaces: dest.priorityPlaces || 0, isNow: false, dateKey: mv.dateKey };
        state.windows.push(w);
      }
      mb.doctorId = mv.doctorId;
      mb.windowId = w.id;
      mb.dateKey = mv.dateKey;
      mb.timeline.push({ at: state.timeLabel, text: 'Moved by ' + user().name + (state.form.notify ? '. Patient will be told by SMS.' : '. Patient was not told.') });
      state.modal = null;
      audit('Moved ' + patient(mb.patientId).name + ' to ' + dest.name);
      render(); return;
    }
  }

  function onClick(e) {
    var actEl = e.target.closest('[data-act]');
    if (!actEl) return;
    if (actEl.matches('a[href^="#"]')) return;
    if (actEl.matches('input, select, textarea')) return;
    doAct(actEl.dataset.act, actEl);
  }
  function onChange(e) {
    var el = e.target;
    if (el.dataset && el.dataset.bind) setPath(el.dataset.bind, el.type === 'checkbox' ? el.checked : el.value);
    if (el.dataset && el.dataset.act) doAct(el.dataset.act, el);
    else if (el.dataset && el.dataset.bind) render({ keepFocus: true });
  }
  function onInput(e) {
    var el = e.target;
    if (!el.dataset || !el.dataset.bind) return;
    setPath(el.dataset.bind, el.value);
    if (el.dataset.live === '1') render({ keepFocus: true });
  }
  function typing(el) { return el && el.matches && el.matches('input, textarea, select'); }
  function onKey(e) {
    if (e.key === 'Escape') { state.drawer = null; state.modal = null; state.switchOpen = false; render(); return; }
    if (e.key === '/' && !typing(e.target)) { e.preventDefault(); var q = document.getElementById('q'); if (q) q.focus(); }
    if ((e.key === 'w' || e.key === 'W') && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(e.target) && state.signedIn && !state.locked && !state.switchOpen) {
      e.preventDefault(); doAct('walk-in', { dataset: {} });
    }
    if (e.key === 'Enter' && e.target && e.target.dataset && e.target.dataset.act && !e.target.matches('button, a, input, select, textarea')) doAct(e.target.dataset.act, e.target);
  }
  function onDragStart(e) {
    var el = e.target.closest('[data-drag]');
    if (!el) return;
    state.dragId = el.dataset.drag;
    e.dataTransfer.setData('text/plain', state.dragId);
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDrop(e) {
    var cell = e.target.closest('[data-drop]');
    if (!cell || !state.dragId) return;
    e.preventDefault();
    var id = state.dragId;
    state.dragId = '';
    state.modal = { kind: 'move', bookingId: id, doctorId: cell.dataset.doctorDrop, windowLabel: cell.dataset.windowDrop, dateKey: cell.dataset.dateDrop };
    state.form.notify = true;
    render();
  }

  document.body.addEventListener('click', onClick);
  document.body.addEventListener('change', onChange);
  document.body.addEventListener('input', onInput);
  document.body.addEventListener('keydown', onKey);
  document.body.addEventListener('dragstart', onDragStart);
  document.body.addEventListener('dragover', function (e) { if (e.target.closest('[data-drop]')) e.preventDefault(); });
  document.body.addEventListener('drop', onDrop);
  window.addEventListener('hashchange', function () { render(); });
  var idle;
  function bumpIdle() {
    clearTimeout(idle);
    idle = setTimeout(function () {
      if (state.signedIn && !state.locked && user() && user().role === 'receptionist') {
        state.locked = true; state.pin = ''; state.pinFor = state.userId; render();
      }
    }, 180000);
  }
  document.addEventListener('pointerdown', bumpIdle);
  bumpIdle();
  if (!location.hash) location.hash = 'today';
  else render();
})();
