(function () {
  'use strict';

  var state = Object.assign(JSON.parse(JSON.stringify(window.SEED)), {
    signedIn: false,
    locked: false,
    userId: '',
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
    settingsSection: 'profile',
    settingsQuery: '',
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
    dragId: '',
    pendingEmergency: null,
    clockOrigin: Date.now(),
    clockMin: 0,
    deskOpenedAt: 0,
    demoFired: {},
    live: false,
    emergencyCompact: false,
    accountOpen: false
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
    'Hindi': 'हिंदी',
    'Call': 'कॉल',
    'Account': 'खाता',
    'Needs an admin.': 'एडमिन की ज़रूरत है।',
    'Planned': 'योजना में',
    'Started': 'शुरू',
    'evening session': 'शाम का सेशन',
    'Now with doctor': 'डॉक्टर के पास',
    'Nobody in the cabin': 'केबिन खाली है',
    'Waiting room order': 'प्रतीक्षा क्रम',
    'Priority visits first, then arrival order.': 'पहले प्रायोरिटी, फिर आगमन का क्रम।',
    'No one waiting.': 'कोई इंतज़ार नहीं।',
    'No patients match': 'कोई मरीज़ नहीं मिला',
    'Filter by name or number': 'नाम या नंबर से छांटें',
    'Select a callback.': 'एक कॉलबैक चुनें।',
    'No attempts yet.': 'अभी कोई कोशिश नहीं।',
    'Note': 'नोट',
    'Alerts': 'अलर्ट',
    'Acknowledged': 'देख लिया',
    'Back to Today': 'आज पर वापस',
    'P1 within 15 min · P2 within 2 hours · P3 next session.': 'P1 15 मिनट में · P2 2 घंटे में · P3 अगले सेशन।',
    'New callbacks from the agent show up here.': 'एजेंट के नए कॉलबैक यहाँ आएँगे।',
    'No arrival windows left today. Pick another day.': 'आज कोई विंडो नहीं बची। कोई और दिन चुनें।',
    'Unlock as reception': 'रिसेप्शन के रूप में खोलें',
    'Unlock to attend': 'देखने के लिए अनलॉक करें',
    'Enter your PIN': 'अपना पिन डालें',
    'Possible medical emergency': 'संभव चिकित्सीय इमरजेंसी'
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
     issued, and the doctor's PIN. Deskie never creates a prescription. */
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
  function doctorDelay(docId) {
    var d = doctor(docId);
    return d && d.status === 'started' ? (Number(d.delayMin) || 0) : 0;
  }
  function windowShown(docId, label, key) {
    var delay = key === state.dateKey ? doctorDelay(docId) : 0;
    var shifted = delay > 0 ? shiftRange(label, delay) : '';
    return shifted ? (label + ' → ' + shifted) : label;
  }
  function bookableLabels(key, docId) {
    var now = liveNowMin();
    var delay = key === state.dateKey ? doctorDelay(docId) : 0;
    // Today: hide windows whose shifted end has passed. A late current window stays because its end moved.
    return state.dayWindows.filter(function (lab) {
      return key !== state.dateKey || (windowEnd(lab) + delay) > now;
    });
  }
  function findWindow(docId, label, key) {
    return state.windows.filter(function (w) { return w.doctorId === docId && w.label === label && w.dateKey === key; })[0];
  }
  function defaultLabel(docId, key) {
    var labs = bookableLabels(key, docId);
    if (key === state.dateKey) {
      var now = liveNowMin();
      var delay = doctorDelay(docId);
      var current = labs.filter(function (lab) {
        var start = windowStart(lab) + delay;
        var end = windowEnd(lab) + delay;
        return now >= start && now < end;
      })[0];
      if (current) return current;
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
        '<p class="caption bn-muted">Approve only after you have issued the prescription yourself, signed and with your registration number. Never for Schedule X or NDPS medicines. Deskie does not create prescriptions.</p>';
    }
    return '<section class="panel">' + head + '<div class="panel-bd">' + body + '</div></section>';
  }
  function route() {
    var h = (location.hash || '#today').replace(/^#/, '').split('?')[0];
    var top = (h || 'today').split('/')[0];
    return top || 'today';
  }
  function hashSection() {
    var h = (location.hash || '').replace(/^#/, '').split('?')[0];
    var parts = h.split('/');
    return parts[1] || '';
  }
  function deskOpen() {
    return state.signedIn && !state.locked && !state.switchOpen;
  }
  function deskClosed() {
    return !state.signedIn || state.locked;
  }
  function go(r) {
    if (!state.signedIn || state.locked) return;
    if (location.hash === '#' + r) render();
    else location.hash = r;
  }
  function setPath(path, value) {
    if (!path || path === 'user.name' || path === 'user.role') return;
    var parts = path.split('.');
    var obj = state;
    for (var i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
  }
  function getPath(path) {
    if (path === 'user.name') return user() ? user().name : '';
    if (path === 'user.role') return user() ? user().role : '';
    if (!path) return '';
    return String(path).split('.').reduce(function (o, k) {
      return o == null ? undefined : o[k];
    }, state);
  }
  function prefOn(key) {
    return !state.settings || state.settings[key] !== false;
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
  function elapsedSec() {
    return Math.max(0, Math.floor((Date.now() - state.clockOrigin) / 1000));
  }
  function seedMinutes() {
    return parseTime((window.SEED && window.SEED.timeLabel) || '6:10 pm');
  }
  function liveNowMin() {
    if (state.live) return parseTime(state.timeLabel) || seedMinutes();
    return seedMinutes() + Math.floor(elapsedSec() / 60);
  }
  function liveClockText(withSeconds) {
    if (state.live) return state.timeLabel;
    var s = elapsedSec();
    var mins = seedMinutes() + Math.floor(s / 60);
    var base = fmtTime(mins);
    if (!withSeconds) return base;
    var sec = s % 60;
    return base.replace(/ (am|pm)$/i, ':' + (sec < 10 ? '0' : '') + sec + ' $1');
  }
  function agoText(atMin) {
    var d = liveNowMin() - Number(atMin || 0);
    if (d <= 0) return 'just now';
    if (d === 1) return '1 min ago';
    return d + ' min ago';
  }
  function activityAge(a) {
    return a.atMin != null ? agoText(a.atMin) : (a.ago || '');
  }
  function pushActivity(text) {
    state.activity.unshift({
      id: 'a-' + Date.now(),
      text: text,
      atMin: liveNowMin(),
      ago: 'just now',
      fresh: true
    });
  }
  function holdSeconds() {
    return Math.max(0, 90 - elapsedSec());
  }
  function holdNote() {
    var left = holdSeconds();
    return left ? 'caller on the line · ' + left + 's left' : 'hold expired · still on the line';
  }
  function windowStartEnd(w, delay) {
    var label = delay > 0 ? (shiftRange(w.label, delay) || w.label) : w.label;
    var parts = String(label).split(/[–-]/);
    if (parts.length < 2) return null;
    var ap = (parts[1].match(/am|pm/i) || ['pm'])[0];
    var start = /am|pm/i.test(parts[0]) ? parseTime(parts[0]) : parseTime(parts[0] + ' ' + ap);
    var end = parseTime(parts[1]);
    return { start: start, end: end };
  }
  function refreshWindowsNow() {
    var now = liveNowMin();
    state.windows.forEach(function (w) {
      if (w.dateKey !== state.dateKey) { w.isNow = false; return; }
      var d = doctor(w.doctorId);
      var delay = d && d.status === 'started' ? d.delayMin : 0;
      var range = windowStartEnd(w, delay);
      w.isNow = !!(range && now >= range.start && now < range.end);
    });
  }
  function refreshOpenDue() {
    var now = liveNowMin();
    state.callbacks.forEach(function (c) {
      if (c.status !== 'open' && c.status !== 'calling') return;
      if (String(c.dueText || '').indexOf('acknowledged') === 0) return;
      if (c.dueMin >= 2000) return;
      var diff = c.dueMin - now;
      c.overdue = diff <= 0;
      c.dueSoon = diff > 0 && diff <= 15;
      if (c.overdue) c.dueText = 'overdue ' + (-diff) + ' min';
      else if (c.dueSoon) c.dueText = 'due in ' + diff + ' min';
      else c.dueText = 'due by ' + fmtTime(c.dueMin);
    });
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
    return '<span class="bn-chip bn-chip-' + tone + (running && basis === 'live' ? ' is-ticking' : '') + '" title="' + esc(title) + '"><span class="bn-chip-dot" aria-hidden="true"></span><span class="body-strong">' + esc(d.name) + '</span><span class="bn-chip-sep" aria-hidden="true">·</span><span class="label bn-num">' + esc(delayText) + '</span>' + basisHtml + '</span>';
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
    var cabin = user() && user().role === 'assistant';
    if (!cabin && b.status === 'booked') action = '<div class="bn-card-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="arrive" data-id="' + b.id + '">' + e('Mark arrived') + '</button></div>';
    if (!cabin && b.status === 'arrived') action = '<div class="bn-card-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="send-in" data-id="' + b.id + '">' + e('Send in') + '</button></div>';
    var note = b.delayChoice === 'keep' ? 'Delay call: chose to keep place' : b.delayChoice === 'unconfirmed' ? 'Delay call: unconfirmed' : '';
    return '<article class="bn-card bn-card-' + st + (b.priority ? ' is-priority' : '') + '" data-act="open-booking" data-id="' + b.id + '">' +
      '<div class="bn-card-main"><div class="bn-card-who"><button type="button" class="body-strong bn-card-name bn-card-open" data-act="open-booking" data-id="' + b.id + '">' + esc(p ? p.name : 'Patient') + '</button>' +
      (meta ? '<span class="caption bn-muted bn-num">' + esc(meta) + '</span>' : '') + '</div>' +
      '<div class="bn-card-state">' + badge(STATUS[st][0], STATUS[st][1]) +
      (b.status === 'held' ? '<span class="caption bn-muted bn-num" data-live-hold>' + esc(holdNote()) + '</span>' : (b.statusNote ? '<span class="caption bn-muted bn-num">' + esc(b.statusNote) + '</span>' : '')) + '</div></div>' +
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
  function receptionUser() {
    return state.users.filter(function (u) { return u.role === 'receptionist'; })[0];
  }
  function emergencyFacts() {
    return '<div class="bn-emergency-icon" aria-hidden="true">' + icon('alert', 28) + '</div>' +
      '<div class="bn-emergency-body"><div class="bn-emergency-title"><span class="bn-prio-marks heading" aria-hidden="true">!!!</span>' +
      '<span class="heading">Possible medical emergency on a call</span><span class="label bn-num">6:08 pm</span></div>' +
      '<p class="body"><span class="label">Caller said: </span>“Papa ko seene mein dard ho raha hai, saans phool rahi hai”</p>' +
      '<p class="caption bn-num">+91 98777 77777 · Agent said 112 / 108 · transfer did not connect · P1 callback created</p></div>';
  }
  function emergencyMarkup() {
    return '<div class="bn-emergency is-new" role="alert">' + emergencyFacts() +
      '<div class="bn-emergency-actions">' +
      '<button type="button" class="bn-btn bn-btn-onred" data-act="open-call" data-id="call-emerg">' + e('Open call') + '</button>' +
      '<button type="button" class="bn-btn bn-btn-onred" data-act="call-emergency">' + icon('phone') + '<span class="body-strong">' + e('Call back now') + '</span></button>' +
      '<button type="button" class="bn-btn bn-btn-onred-solid" data-act="ack"><span class="body-strong">' + e('Acknowledge') + '</span></button>' +
      '</div></div>';
  }
  function pinPadOpen() {
    if (state.locked) return true;
    if (!state.signedIn && state.pinFor) return true;
    if (state.switchOpen && state.pinFor) return true;
    return false;
  }
  function emergencyHighlight() {
    if (state.emergencyAck) return '';
    var deskUser = user();
    var canUnlock = !state.signedIn || (deskUser && deskUser.role === 'receptionist');
    var cta = canUnlock && !pinPadOpen()
      ? '<button type="button" class="bn-btn bn-btn-onred-solid bn-btn-lg" data-act="attend-emergency">' + e(state.locked ? 'Unlock to attend' : 'Unlock as reception') + '</button>'
      : '';
    return '<div class="emergency-prelogin"><div class="bn-emergency is-new" role="alert">' + emergencyFacts() +
      '<div class="bn-emergency-actions">' + cta + '</div></div>' +
      '<p class="caption emergency-prelogin-hint">A reception PIN is required before anyone can open this call.</p></div>';
  }
  function armEmergencyCompact() {
    if (state.emergencyAck || state.emergencyCompact || state._emTimer) return;
    state._emTimer = setTimeout(function () {
      state._emTimer = null;
      state.emergencyCompact = true;
      if (deskOpen() && user() && user().role === 'receptionist' && !state.emergencyAck) render();
    }, 2000);
  }
  function emergencyBanner() {
    // Fixed banner is for an unlocked receptionist only. Login and lock still
    // highlight the same alert in-flow so it cannot cover the PIN pad or open
    // the desk. Doctors, cabin assistants, and admins never get this box.
    var u = user();
    if (!deskOpen() || state.emergencyAck) return '';
    if (!u || u.role !== 'receptionist') return '';
    armEmergencyCompact();
    return '<div class="emergency-wrap' + (state.emergencyCompact ? ' is-compact' : '') + '">' + emergencyMarkup() + '</div>';
  }
  function p1Chip() {
    if (!deskOpen() || state.emergencyAck) return '';
    var u = user();
    if (!u || u.role === 'receptionist') return '';
    var call = u.role === 'admin'
      ? '<button type="button" class="bn-btn" data-act="call-emergency">' + e('Call back now') + '</button>'
      : '';
    return '<div class="p1-chip" role="status"><span class="p1-chip-text">' + icon('alert', 14) + '<span><strong>' + e('Possible medical emergency') + '</strong> · 6:08 pm</span></span><button type="button" class="bn-btn bn-btn-primary" data-act="ack">' + e('Acknowledge') + '</button>' + call + '</div>';
  }

  function banners() {
    var html = '';
    var u = user();
    var cabin = u && u.role === 'assistant';
    var verma = doctor('verma');
    if (!cabin && verma && verma.status === 'started' && verma.basis === 'schedule' && verma.watchdogMin >= 30 && !state.dismissed.watch) {
      html += '<div class="banner"><p><strong>No update from Dr Verma’s cabin for ' + verma.watchdogMin + ' min.</strong> The delay is schedule only until someone taps Call next.</p><button type="button" class="bn-btn" data-act="dismiss" data-id="watch">' + e('Close') + '</button></div>';
    }
    state.doctors.forEach(function (d) {
      if (cabin && d.id !== u.doctorId) return;
      if (d.status === 'started' && d.delayMin >= 60 && !state.dismissed['late' + d.id]) {
        html += '<div class="banner"><p><strong>' + esc(d.name) + ' is ' + d.delayMin + ' min late.</strong> Offer reschedule to affected patients?</p><button type="button" class="bn-btn bn-btn-primary" data-act="offer-reschedule" data-id="' + d.id + '">Offer reschedule</button><button type="button" class="bn-btn" data-act="dismiss" data-id="late' + d.id + '">' + e('Close') + '</button></div>';
      }
    });
    if (!cabin && failedMsgs().length && !state.dismissed.failed) {
      html += '<div class="banner"><p><strong>' + failedMsgs().length + ' messages failed.</strong> Patients may not have the link or the delay update.</p><a class="bn-btn" href="#messages">' + e('Messages') + '</a><button type="button" class="bn-btn" data-act="dismiss" data-id="failed">' + e('Close') + '</button></div>';
    }
    if (!cabin && !state.staffOnDesk && !state.dismissed.desk) {
      html += '<div class="banner"><p>Staff on desk is off. Callers who ask for a person get a callback instead of a transfer.</p><button type="button" class="bn-btn" data-act="dismiss" data-id="desk">' + e('Close') + '</button></div>';
    }
    if (state.live && state.offline) {
      html += '<div class="banner" role="status"><p><strong>Connection lost.</strong> This screen shows the last update' + (state.lastSyncLabel ? ' from ' + esc(state.lastSyncLabel) : '') + '. Changes may not save until it comes back.</p><button type="button" class="bn-btn" data-act="retry-pull">' + e('Retry') + '</button></div>';
    }
    if (state.poorNetwork && !state.dismissed.offline) {
      html += '<div class="banner"><p>Offline: changes will sync.</p><button type="button" class="bn-btn" data-act="dismiss" data-id="offline">' + e('Close') + '</button></div>';
    }
    return html;
  }

  function accountControls() {
    var u = user();
    return '<div class="lang-toggle" role="group" aria-label="Language"><button type="button" class="bn-btn' + (state.lang === 'en' ? ' bn-btn-primary' : '') + '" data-act="lang" data-value="en">English</button><button type="button" class="bn-btn' + (state.lang === 'hi' ? ' bn-btn-primary' : '') + '" data-act="lang" data-value="hi" lang="hi">हिंदी</button></div>' +
      '<a class="bn-btn" href="#settings">' + e('Settings') + '</a>' +
      '<button type="button" class="user-btn" data-act="switch-open"><span class="body-strong">' + esc(u.name) + '</span><span class="caption bn-muted">' + esc(roleName(u.role)) + ' · ' + e('Switch user') + '</span></button>' +
      '<button type="button" class="bn-btn" data-act="lock">' + icon('lock') + e('Lock desk') + '</button>' +
      '<button type="button" class="bn-btn bn-btn-quiet" data-act="signout">' + e('Sign out') + '</button>';
  }
  function brandLogo() {
    return '<img class="brand-logo" src="brand/deskie-logo.svg" alt="Deskie" width="660" height="200">';
  }
  function rail() {
    var u = user();
    var items = NAV.filter(function (n) {
      if (u.role === 'assistant') return n[0] === 'today' || n[0] === 'settings';
      return true;
    });
    var links = items.map(function (n, idx) {
      var count = '';
      if (n[0] === 'callbacks') count = '<span class="nav-count bn-num">' + openCallbacks().length + '</span>';
      if (n[0] === 'payments') count = '<span class="nav-count bn-num">' + waitingRefunds().length + '</span>';
      if (n[0] === 'messages') count = '<span class="nav-count bn-num">' + failedMsgs().length + '</span>';
      var cur = route() === n[0] ? ' aria-current="page"' : '';
      return '<a href="#' + n[0] + '"' + cur + (idx >= 4 && items.length > 5 ? ' class="nav-extra"' : '') + '>' + icon(n[2]) + '<span>' + e(n[1]) + '</span>' + count + '</a>';
    }).join('');
    state._moreLinks = items.length > 5 ? links.split('</a>').slice(0, -1).map(function (x) { return x + '</a>'; }).filter(function (x) { return x.indexOf('nav-extra') >= 0 && x.indexOf('href="#settings"') < 0; }).join('').replace(/ class="nav-extra"/g, '') : '';
    return '<aside class="rail"><div class="brand">' + brandLogo() + '<div class="caption bn-muted">' + esc(roleName(u.role)) + '</div></div>' +
      '<nav class="nav" aria-label="Console">' + links + '</nav>' +
      '<div class="rail-foot">' + accountControls() + '</div>' +
      '<button type="button" class="rail-more" data-act="account-menu" aria-expanded="' + (state.accountOpen ? 'true' : 'false') + '">' + icon('user') + '<span>' + e(state._moreLinks ? 'More' : 'Account') + '</span></button></aside>';
  }
  function roleName(r) {
    return { receptionist: 'Reception', assistant: 'Cabin assistant', doctor: 'Doctor', admin: 'Admin' }[r] || r;
  }
  function topbar() {
    var u = user();
    var cabin = u && u.role === 'assistant';
    var p1 = openCallbacks().filter(function (c) { return c.priority === 'P1'; }).length;
    var p2 = openCallbacks().filter(function (c) { return c.priority === 'P2'; }).length;
    var held = state.bookings.filter(function (b) { return b.status === 'held'; }).length;
    var hits = state.search.trim() ? searchPatients(state.search).slice(0, 6) : [];
    var pop = hits.length ? '<div class="search-pop" role="listbox">' + hits.map(function (p) {
      return '<button type="button" class="search-hit" data-act="pick-patient" data-id="' + p.id + '"><span class="body-strong">' + esc(p.name) + '</span><span class="caption bn-muted bn-num">' + esc(p.pid) + ' · ' + esc(p.phones[0].number) + (sharedWith(p).length ? ' · shared phone' : '') + '</span></button>';
    }).join('') + '</div>' : '';
    var chips = state.doctors.filter(function (d) { return !cabin || d.id === u.doctorId; }).map(chip).join('');
    var staff = cabin ? '' : '<label class="bn-switch ' + (state.staffOnDesk ? 'is-on' : 'is-off') + '"><input class="bn-switch-input" type="checkbox" role="switch" data-bind="staffOnDesk" data-act="desk" ' + (state.staffOnDesk ? 'checked' : '') + ' aria-checked="' + (state.staffOnDesk ? 'true' : 'false') + '"><span class="bn-switch-track" aria-hidden="true"><span class="bn-switch-thumb"></span></span><span class="bn-switch-text"><span class="body-strong">' + e('Staff on desk') + '</span><span class="caption">' + e(state.staffOnDesk ? 'Calls transfer to the desk phone' : 'Callers are offered a callback') + '</span></span></label>';
    var agent = cabin ? '' : '<span class="caption' + (held ? ' agent-live' : ' bn-muted') + '" data-live-agent>' + (held ? 'Agent: ' + held + ' call in progress' : 'Agent: idle') + '</span>';
    var counters = cabin ? '' : '<div class="counters"><a class="counter" href="#callbacks"><strong>' + p1 + ' P1 · ' + p2 + ' P2</strong> <span class="caption">' + e('Callbacks') + '</span></a>' +
      '<a class="counter" href="#payments"><strong>' + waitingRefunds().length + '</strong> <span class="caption">' + e('Refunds') + '</span></a>' +
      '<a class="counter" href="#messages"><strong>' + failedMsgs().length + '</strong> <span class="caption">Failed</span></a></div>';
    return '<header class="topbar"><div class="clinic-lockup"><div class="heading">' + esc(state.clinic) + '</div><div class="product-line"><img class="brand-mark" src="brand/deskie-mark.svg" alt="" width="200" height="200"><span class="caption bn-muted">Deskie</span></div></div>' +
      '<div class="when"><span class="body-strong bn-num">' + esc(state.dateLabel) + '</span><span class="caption bn-muted bn-num" data-live-clock>' + esc(liveClockText(false)) + '</span></div>' +
      '<span class="live-pill' + (state.live && state.offline ? ' is-offline' : '') + '" title="' + (state.live ? (state.offline ? 'Connection lost' : 'Connected to the clinic API') : 'Demo clock is running') + '"><i aria-hidden="true"></i>' + (state.live ? (state.offline ? 'Offline' : 'Live API') : 'Live') + '</span>' +
      staff +
      '<div class="chip-row" aria-label="Doctors in session">' + chips + '</div>' +
      agent +
      '<div class="search"><input id="q" data-bind="search" data-live="1" placeholder="' + e('Search name, ID or phone') + '" aria-label="' + e('Search name, ID or phone') + '" value="' + esc(state.search) + '" title="Press / to search">' + pop + '</div>' +
      emergencyChip() + p1Chip() + counters + '</header>';
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
      var cabin = user().role === 'assistant';
      if (!cabin && d.status === 'planned') headActions += '<button type="button" class="bn-btn bn-btn-primary" data-act="start-session" data-id="' + d.id + '">' + e('Start session') + '</button>';
      if (d.status === 'started') {
        if (!cabin) headActions += '<button type="button" class="bn-btn" data-act="pause" data-id="' + d.id + '">' + icon('pause') + e('Pause') + '</button>';
        headActions += '<button type="button" class="bn-btn bn-btn-primary" data-act="call-next" data-id="' + d.id + '">' + e(cabin ? 'Next' : 'Call next') + '</button>';
      }
      if (!cabin && d.status === 'paused') headActions += '<button type="button" class="bn-btn bn-btn-primary" data-act="resume" data-id="' + d.id + '">' + e('Resume') + '</button>';
      if (!cabin && (d.status === 'started' || d.status === 'paused')) {
        headActions += '<button type="button" class="bn-btn" data-act="end-session" data-id="' + d.id + '">' + e('End session') + '</button>';
        headActions += '<button type="button" class="bn-btn bn-btn-danger" data-act="cancel-session" data-id="' + d.id + '">' + e('Mark session cancelled') + '</button>';
      }
      if (!cabin) headActions += '<button type="button" class="bn-btn bn-btn-quiet" data-act="doctor-open" data-id="' + d.id + '">' + e('Doctor phone') + '</button>';
      var sinceMin = d.nowName && d.nowSince ? Math.max(0, liveNowMin() - parseTime(d.nowSince)) : 0;
      var now = d.nowName ? '<p class="caption bn-num">' + e('Now with doctor') + ': <strong>' + esc(d.nowName) + '</strong> · since ' + esc(d.nowSince) + (sinceMin ? ' · ' + sinceMin + ' min' : '') + '</p>' : '<p class="caption bn-muted">' + e('Nobody in the cabin') + '</p>';
      var warn = d.status === 'started' && d.basis === 'schedule' && d.watchdogMin >= 30 ? '<p class="caption" style="color:var(--attention-ink)">No update from the cabin for ' + d.watchdogMin + ' min</p>' : '';
      var queueHtml = '<div class="queue"><div class="label">' + e('Waiting room order') + '</div><p class="caption bn-muted">' + e('Priority visits first, then arrival order.') + '</p>' +
        (order.length ? '<ol>' + order.map(function (b, i) {
          var p = patient(b.patientId);
          return '<li class="bn-num"><strong>' + esc(p.name) + '</strong> · token ' + (i + 1) + (b.priority ? ' · priority' : '') + ' · arrived ' + esc(b.statusNote) + '</li>';
        }).join('') + '</ol>' : '<p class="caption bn-muted">' + e('No one waiting.') + '</p>') + '</div>';
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
        (q && !blocks ? '<div class="empty"><p class="heading">' + e('No patients match') + '</p></div>' : blocks) +
        absent + queueHtml + '</section>';
    }).join('');
    var activity = '<div class="activity" aria-label="Agent activity">' + state.activity.map(function (a) {
      return '<div class="activity-item' + (a.fresh ? ' is-fresh' : '') + '"><p>' + esc(a.text) + '</p><p class="caption bn-muted" data-live-ago="' + esc(a.id) + '">' + esc(activityAge(a)) + '</p></div>';
    }).join('') + '</div>';
    var pageActions = user().role === 'assistant' ? '' :
      '<div class="page-actions"><a class="bn-btn" href="#summary">' + e('Day summary') + '</a><a class="bn-btn" href="#waiting">' + e('Waiting room') + '</a><button type="button" class="bn-btn bn-btn-primary" data-act="walk-in">+ ' + e('Walk-in') + '</button></div>';
    return '<div class="page-head"><div><h1 class="heading-lg">' + e('Today') + '</h1><p class="caption bn-muted">' + e('Live queue') + ' · ' + esc(state.dateLabel) + ' · ' + e('evening session') + '</p></div>' +
      pageActions + '</div>' +
      activity + '<div class="cols">' + cols + '</div>';
  }
  function capWord(status) {
    return { planned: 'Planned', started: 'Started', paused: 'Paused', ended: 'Ended', cancelled: 'Cancelled' }[status] || status;
  }

  function bookingsScreen() {
    var sync = state.live ? '' : (state.syncOk
      ? '<div class="banner banner-sync"><p>Calendar mirror is up to date.</p></div>'
      : '<div class="banner banner-sync"><p><strong>4 bookings not synced, retrying.</strong> The Google Calendar mirror is behind the console.</p><button type="button" class="bn-btn bn-btn-primary" data-act="retry-sync">' + e('Retry') + '</button></div>');
    var limit = state.live || state.dismissed.limit ? '' : '<div class="banner banner-quiet"><p>+91 97999 88821 is at the daily booking limit (3). The agent did not add another booking. <button type="button" class="bn-btn bn-btn-quiet" data-act="open-call" data-id="call-unknown">' + e('Open call') + '</button></p><button type="button" class="bn-btn" data-act="dismiss" data-id="limit">' + e('Close') + '</button></div>';
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
    }).join('') + '<input id="cbq" data-bind="cbQuery" data-live="1" placeholder="' + e('Filter by name or number') + '" aria-label="' + e('Filter by name or number') + '" value="' + esc(state.cbQuery) + '" style="height:40px;border:1px solid var(--line-strong);border-radius:6px;padding:0 12px;background:var(--surface)"></div>';
    var rows = list.length ? list.map(cbRow).join('') : '<div class="empty"><p class="heading">' + e('No callbacks. Nice.') + '</p><p class="bn-muted">' + e('New callbacks from the agent show up here.') + '</p></div>';
    var acked = state.alerts.length ? '<section class="panel"><header class="panel-hd"><h2 class="heading">' + e('Alerts') + '</h2></header><div class="panel-bd">' + state.alerts.map(function (a) {
      return '<p><span class="bn-badge bn-badge-emergency label">' + e('Acknowledged') + '</span> <span class="bn-num">' + esc(a.at) + '</span> · ' + esc(a.kind) + ' · ' + esc(a.number) + '<br><span class="caption bn-muted">By ' + esc(a.by) + (a.ackAt ? ' at ' + esc(a.ackAt) : '') + '. Caller said: “' + esc(a.snippet) + '”</span></p>';
    }).join('') + '</div></section>' : '';
    var selected = cbBy(state.callbackId);
    var detail = selected ? cbDetail(selected) : '<section class="panel"><div class="empty"><p class="bn-muted">' + e('Select a callback.') + '</p></div></section>';
    return '<div class="page-head"><div><h1 class="heading-lg">' + e('Callbacks') + '</h1><p class="caption bn-muted">' + e('P1 within 15 min · P2 within 2 hours · P3 next session.') + '</p></div></div>' +
      filters + '<div class="split"><div class="list-clip">' + rows + '</div><div class="stack">' + detail + acked + '</div></div>';
  }
  function cbRow(c) {
    var dueTone = c.overdue ? 'emergency' : c.dueSoon ? 'attention' : 'neutral';
    var quiet = c.priority === 'P1' && !c.overdue && !c.isNew;
    var who = c.caller || 'Unknown caller';
    var meta = [c.number, c.language, c.verified ? 'verified' : 'not verified'].join(' · ');
    var sel = c.id === state.callbackId ? ' is-selected' : '';
    return '<div class="bn-cbrow' + (c.overdue ? ' is-overdue' : '') + sel + '" data-act="pick-callback" data-id="' + c.id + '">' +
      prio(c.priority, quiet) +
      '<div class="bn-cbrow-who"><button type="button" class="body-strong bn-card-open" data-act="pick-callback" data-id="' + c.id + '">' + esc(who) + '</button><span class="caption bn-muted bn-num">' + esc(meta) + '</span></div>' +
      '<p class="body bn-cbrow-reason">' + esc(c.reason) + (c.callId ? ' <button type="button" class="bn-btn bn-btn-quiet" data-act="open-call" data-id="' + c.callId + '">' + e('Via agent') + '</button>' : '') + '</p>' +
      '<div class="bn-cbrow-due">' + badge(dueTone, c.dueText, c.overdue ? 'alert' : 'clock') +
      (c.differs ? badge('attention', 'Different number', 'phone') : '') +
      (c.smsSent ? badge('ok', 'SMS sent', 'check') : '') +
      (c.lockout ? badge('attention', 'Verification paused', 'lock') : '') + '</div>' +
      '<button type="button" class="bn-btn ' + (c.overdue ? 'bn-btn-primary' : '') + '" data-act="cb-call" data-id="' + c.id + '">' + icon('phone') + (c.status === 'calling' ? e('Calling…') : e('Call')) + '</button></div>';
  }
  function cbDetail(c) {
    var attempts = c.attempts.length ? '<ul class="timeline">' + c.attempts.map(function (a) { return '<li><span class="caption bn-num">' + esc(a.at) + '</span><span>' + esc(a.outcome) + '</span></li>'; }).join('') + '</ul>' : '<p class="caption bn-muted">' + e('No attempts yet.') + '</p>';
    return '<section class="panel"><header class="panel-hd"><h2 class="heading">' + esc(c.caller || 'Unknown caller') + '</h2>' + prio(c.priority, c.priority === 'P1' && !c.overdue && !c.isNew) + '</header><div class="panel-bd">' +
      '<p class="bn-num">' + esc(c.number) + (c.differs ? ' · callback number ' + esc(c.callbackNumber) : '') + '</p>' +
      (c.snippet ? '<p><span class="label">Caller said: </span>“' + esc(c.snippet) + '”</p>' : '') +
      '<p class="caption bn-muted">Wanted: ' + esc(c.wanted) + '</p>' +
      '<p class="caption bn-muted">Preferred: ' + esc(c.preferred) + ' · ' + esc(c.language) + ' · ' + (c.verified ? 'verified' : 'not verified') + '</p>' +
      (c.lockout ? '<p>' + badge('attention', 'Phone verification paused: 5 failed attempts today', 'lock') + '</p><button type="button" class="bn-btn" data-act="clear-lockout" data-id="' + c.id + '">Clear after in-person check</button>' : '') +
      (c.smsSent ? '<p>' + badge('ok', 'SMS sent', 'check') + ' <span class="caption">Two no-answer attempts.</span></p>' : '') +
      '<div><div class="label">Attempts</div>' + attempts + '</div>' +
      '<label class="field"><span class="label">' + e('Note') + '</span><textarea id="cbnote" data-bind="cbNote">' + esc(state.cbNote) + '</textarea></label>' +
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
    var callsCaption = state.live
      ? (state.calls.length + ' calls from the clinic line. Open one to read the transcript and play the recording.')
      : '31 handled by the agent · 4 transferred · 3 callbacks created · 1 emergency flagged. Latest calls are listed below.';
    return '<div class="page-head"><div><h1 class="heading-lg">' + e('Calls') + '</h1><p class="caption bn-muted bn-num">' + esc(callsCaption) + '</p></div></div>' +
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
    var rec = c.recordingPath
      ? '<audio controls preload="none" src="' + esc(c.recordingPath) + '"></audio><p class="caption bn-muted">Recording plays inside the console.</p>'
      : (c.recording ? '<div class="rec' + (state.playing ? ' is-playing' : '') + '"><button type="button" class="bn-btn" data-act="play">' + (state.playing ? 'Pause' : 'Play') + '</button><div class="rec-bar" aria-hidden="true"><span></span></div><span class="caption bn-num">' + esc(c.duration) + '</span></div><p class="caption bn-muted">Recording plays inside the console. There is no link to copy.</p>' : '<p class="caption bn-muted">No recording for this call.</p>');
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
      var done = r.status !== 'requested';
      return '<section class="panel"><header class="panel-hd"><div><h2 class="heading">' + esc(p.name) + ' · ' + money(r.amount) + '</h2><p class="caption bn-num">' + money(r.paid) + ' paid · ' + money(r.refunded) + ' refunded so far</p></div>' + badge(r.status === 'requested' ? 'attention' : r.status === 'rejected' ? 'neutral' : 'ok', r.status, null) + '</header><div class="panel-bd">' +
        '<p>Policy: ' + esc(r.policy) + '</p><p class="caption">Requested by ' + esc(r.requestedByName) + '. ' + esc(r.reason) + '</p>' +
        (r.callId ? '<button type="button" class="bn-btn bn-btn-quiet" data-act="open-call" data-id="' + r.callId + '">' + e('Open call') + '</button>' : '') +
        (r.approvedBy ? '<p class="caption">Approved by ' + esc(r.approvedBy) + ' at ' + esc(r.approvedAt) + '. ' + (r.method === 'UPI' ? 'Processed by gateway.' : 'Hand cash at the desk.') + '</p>' : '') +
        (r.status === 'rejected' ? '<p class="caption">Rejected. ' + esc(r.note) + '</p>' : '') +
        (done ? '' : admin
          ? '<div class="row-actions"><button type="button" class="bn-btn bn-btn-primary" data-act="refund" data-id="' + r.id + '" data-value="approve"' + (self ? ' disabled' : '') + '>' + e('Approve') + '</button>' +
            '<button type="button" class="bn-btn" data-act="refund" data-id="' + r.id + '" data-value="change"' + (self ? ' disabled' : '') + '>' + e('Change amount') + '</button>' +
            '<button type="button" class="bn-btn bn-btn-danger" data-act="refund" data-id="' + r.id + '" data-value="reject"' + (self ? ' disabled' : '') + '>' + e('Reject') + '</button></div>' +
            (self ? '<p class="caption bn-muted">Another admin must approve this.</p>' : '')
          : '<p class="body-strong">' + e('Needs an admin.') + '</p>') +
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

  function ensureSettingsCatalog() {
    if (window.settingsNavFor && window.settingsRowsFor && window.settingAccess) return;
    function roles(rec, ast, doc, adm) {
      return { receptionist: rec, assistant: ast, doctor: doc, admin: adm };
    }
    function row(id, section, label, help, bind, type, def, roleMap, options) {
      var item = { id: id, section: section, label: label, help: help, bind: bind, type: type, def: def, roles: roleMap };
      if (options) item.options = options;
      return item;
    }
    var ALL_W = roles('w', 'w', 'w', 'w');
    var ALL_R = roles('r', 'r', 'r', 'r');
    var CLINIC_INFO = roles('r', '', 'r', 'w');
    var ADMIN_REC = roles('r', '', '', 'w');
    var ADMIN_ONLY = roles('', '', '', 'w');
    window.SETTINGS_NAV = window.SETTINGS_NAV || [
      { group: 'you', label: 'Your preferences', id: 'profile' },
      { group: 'you', id: 'language', label: 'Language' },
      { group: 'you', id: 'notifications', label: 'Notifications' },
      { group: 'you', id: 'desk', label: 'Desk and lock' },
      { group: 'clinic', label: 'Clinic', id: 'clinic' },
      { group: 'clinic', id: 'hours', label: 'Hours and info' },
      { group: 'clinic', id: 'doctors', label: 'Doctors' },
      { group: 'clinic', id: 'payments', label: 'Payments and refunds' },
      { group: 'clinic', id: 'staff', label: 'Staff and devices' },
      { group: 'clinic', id: 'audit', label: 'Audit' }
    ];
    window.SETTINGS_ROWS = window.SETTINGS_ROWS || [
      row('profile-name', 'profile', 'Name', 'The name on this signed-in session.', 'user.name', 'status', '', ALL_R),
      row('profile-role', 'profile', 'Role', 'Reception, cabin, doctor, or admin.', 'user.role', 'status', '', ALL_R),
      row('language', 'language', 'Language', 'English or Hindi for this desk.', 'lang', 'select', 'en', ALL_W, [{ value: 'en', label: 'English' }, { value: 'hi', label: 'Hindi' }]),
      row('notify-callback', 'notifications', 'New callback', 'Toast when a new callback lands.', 'settings.notifyCallback', 'switch', true, ALL_W),
      row('notify-failed', 'notifications', 'Failed message', 'Toast when a send fails.', 'settings.notifyFailed', 'switch', true, ALL_W),
      row('notify-delay', 'notifications', 'Live delay', 'Toast when a cabin delay updates.', 'settings.notifyDelay', 'switch', true, ALL_W),
      row('auto-lock', 'desk', 'Auto-lock (minutes)', 'Default 3.', 'settings.autoLockMin', 'number', 3, roles('w', '', 'r', 'w')),
      row('privacy-numbers', 'desk', 'Waiting-room privacy numbers', 'Show numbers instead of names.', 'privacyNumbers', 'switch', false, roles('w', 'w', 'r', 'w')),
      row('staff-on-desk', 'desk', 'Staff on desk', 'Live switch stays on Today.', 'staffOnDesk', 'status', true, roles('r', '', '', 'r')),
      row('refund-en', 'hours', 'Refunds', 'Clinic-caused: full. 24 h or more: full. Later: half.', 'settings.refundEn', 'area', '', CLINIC_INFO),
      row('refund-full-hours', 'payments', 'Full refund if cancelled before (hours)', 'Default 24.', 'settings.refundFullHours', 'number', 24, ADMIN_REC),
      row('export-day', 'staff', 'Export day summary', 'Download today’s counts.', 'export-day', 'action', 'export-day', ADMIN_ONLY),
      row('signout', 'staff', 'Sign this device out', 'This browser only.', 'signout', 'action', 'signout', ALL_W),
      row('remote-signout', 'staff', 'Remote sign-out', 'Sign out cabin and doctor phones.', 'remote-signout', 'action', 'remote-signout', ADMIN_ONLY),
      row('audit-log', 'audit', 'Recent settings changes', 'Who changed a setting.', 'audit', 'status', '', roles('r', '', '', 'r'))
    ];
    window.settingAccess = window.settingAccess || function (role, item) {
      if (!item || !item.roles) return '';
      var access = item.roles[role];
      return access === 'w' || access === 'r' ? access : '';
    };
    window.settingsRowsFor = window.settingsRowsFor || function (role, section, query) {
      var q = String(query || '').toLowerCase().replace(/^\s+|\s+$/g, '');
      return window.SETTINGS_ROWS.filter(function (item) {
        if (section && item.section !== section) return false;
        if (!window.settingAccess(role, item)) return false;
        if (!q) return true;
        return String(item.label || '').toLowerCase().indexOf(q) !== -1 || String(item.help || '').toLowerCase().indexOf(q) !== -1;
      });
    };
    window.settingsNavFor = window.settingsNavFor || function (role, query) {
      return window.SETTINGS_NAV.filter(function (nav) {
        if (role === 'assistant' && nav.group === 'clinic') return false;
        return window.settingsRowsFor(role, nav.id, query).length > 0;
      });
    };
  }
  function settingAccessFor(role, row) {
    ensureSettingsCatalog();
    return window.settingAccess(role, row);
  }
  function doctorBindPrefix(u) {
    if (!u || u.role !== 'doctor' || !u.doctorId) return '';
    var i = -1;
    state.doctors.forEach(function (d, idx) { if (d.id === u.doctorId) i = idx; });
    return i < 0 ? '' : 'doctors.' + i + '.';
  }
  function catalogRowByBind(bind) {
    ensureSettingsCatalog();
    var rows = window.SETTINGS_ROWS || [];
    for (var i = 0; i < rows.length; i++) if (rows[i].bind === bind) return rows[i];
    return null;
  }
  function canWriteSetting(bind) {
    var u = user();
    if (!u) return false;
    var row = catalogRowByBind(bind);
    if (!row) return true;
    if (u.role === 'doctor' && row.section === 'doctors') {
      var prefix = doctorBindPrefix(u);
      if (!prefix || String(bind).indexOf(prefix) !== 0) return false;
      if (/fee/i.test(bind)) return false;
    }
    return settingAccessFor(u.role, row) === 'w';
  }
  function scopedDoctorRows(role, rows) {
    if (role !== 'doctor') return rows;
    var u = user();
    var prefix = doctorBindPrefix(u);
    var slug = u && u.doctorId ? 'doc-' + u.doctorId + '-' : '';
    return rows.filter(function (row) {
      if (row.section !== 'doctors') return true;
      if (prefix && row.bind && String(row.bind).indexOf(prefix) === 0) return true;
      if (slug && row.id && String(row.id).indexOf(slug) === 0) return true;
      return false;
    });
  }
  function extraStaffRows(role, query) {
    if (role !== 'admin' && role !== 'receptionist') return [];
    var q = String(query || '').toLowerCase();
    return state.users.map(function (u) {
      var help = roleName(u.role);
      if (q && String(u.name).toLowerCase().indexOf(q) < 0 && help.toLowerCase().indexOf(q) < 0 && 'staff'.indexOf(q) < 0) return null;
      return { id: 'staff-user-' + u.id, section: 'staff', label: u.name, help: help, bind: '', type: 'status', def: help, roles: { receptionist: 'r', admin: 'r' } };
    }).filter(Boolean);
  }
  function isAuditPlaceholder(row) {
    return row && (row.id === 'audit-log' || row.bind === 'audit');
  }
  function collectSettingsRows(role, section, query) {
    ensureSettingsCatalog();
    var q = String(query || '').replace(/^\s+|\s+$/g, '');
    var rows = q ? window.settingsRowsFor(role, '', q) : window.settingsRowsFor(role, section, '');
    if ((q || section === 'staff')) rows = extraStaffRows(role, q).concat(rows);
    return scopedDoctorRows(role, rows).filter(function (row) { return !isAuditPlaceholder(row); });
  }
  function collectSettingsNav(role, query) {
    ensureSettingsCatalog();
    var nav = window.settingsNavFor(role, query);
    if (role === 'doctor') {
      nav = nav.filter(function (item) {
        if (item.id !== 'doctors') return true;
        return collectSettingsRows(role, 'doctors', query).length > 0;
      });
    }
    return nav;
  }
  function defaultSettingsSection(role) {
    return role === 'admin' ? 'clinic' : 'profile';
  }
  function settingsSectionId(role) {
    return hashSection() || defaultSettingsSection(role);
  }
  function settingSnapValue(value) {
    return String(value == null ? '' : value);
  }
  var settingSnap = {};
  function rememberSetting(bind, value) {
    if (bind && settingSnap[bind] == null) settingSnap[bind] = settingSnapValue(value);
  }
  function maybeAuditSettings(el) {
    if (!el || !el.dataset || el.dataset.settingsRow !== '1' || !el.dataset.bind) return;
    var bind = el.dataset.bind;
    if (!canWriteSetting(bind)) return;
    var value = el.type === 'checkbox' ? el.checked : el.value;
    var next = settingSnapValue(value);
    if (settingSnap[bind] == null) {
      settingSnap[bind] = next;
      return;
    }
    if (settingSnap[bind] === next) return;
    settingSnap[bind] = next;
    var who = user();
    audit((who ? who.name : 'Staff') + ' changed ' + (el.dataset.settingsLabel || bind));
    if (bind === 'settings.autoLockMin') bumpIdle();
  }
  function settingRawValue(row) {
    if (row.type === 'action') return '';
    var raw = row.bind ? getPath(row.bind) : row.def;
    if (raw === undefined) raw = row.def;
    return raw;
  }
  function settingReadValue(row, raw) {
    if (row.bind === 'user.role') return roleName(raw);
    if (row.bind === 'staffOnDesk') return raw ? 'On — calls transfer to the desk phone' : 'Off — callers are offered a callback';
    if (row.type === 'switch' || typeof raw === 'boolean') return raw ? 'On' : 'Off';
    if (row.type === 'select' && row.options) {
      var opt = row.options.filter(function (o) { return String(o.value) === String(raw); })[0];
      return opt ? opt.label : (raw == null || raw === '' ? '—' : String(raw));
    }
    if (raw == null || raw === '') return '—';
    return String(raw);
  }
  function settingsControl(row, raw) {
    var bind = row.bind || '';
    var id = 's-' + String(row.id || bind).replace(/\W/g, '');
    var labelAttr = ' data-settings-row="1" data-settings-label="' + esc(row.label) + '"';
    if (row.type === 'switch') {
      return '<label class="bn-switch ' + (raw ? 'is-on' : 'is-off') + '"><input class="bn-switch-input" type="checkbox" role="switch" id="' + id + '" data-bind="' + esc(bind) + '" data-act="refresh"' + labelAttr + (raw ? ' checked' : '') + ' aria-checked="' + (raw ? 'true' : 'false') + '"><span class="bn-switch-track"><span class="bn-switch-thumb"></span></span></label>';
    }
    if (row.type === 'select') {
      var opts = (row.options || []).map(function (o) {
        return '<option value="' + esc(o.value) + '"' + (String(o.value) === String(raw) ? ' selected' : '') + '>' + esc(o.label) + '</option>';
      }).join('');
      return '<select id="' + id + '" data-bind="' + esc(bind) + '" data-act="refresh"' + labelAttr + '>' + opts + '</select>';
    }
    if (row.type === 'area') {
      return '<textarea id="' + id + '" data-bind="' + esc(bind) + '" data-live="1"' + labelAttr + '>' + esc(raw == null ? '' : raw) + '</textarea>';
    }
    var inputType = row.type === 'number' ? 'number' : 'text';
    return '<input id="' + id + '" type="' + inputType + '" data-bind="' + esc(bind) + '" data-live="1"' + labelAttr + ' value="' + esc(raw == null ? '' : raw) + '">';
  }
  function settingsAction(row) {
    var act = row.bind || row.id;
    var danger = act === 'signout' || act === 'remote-signout';
    return '<button type="button" class="bn-btn' + (danger ? ' bn-btn-danger' : '') + '" data-act="' + esc(act) + '">' + esc(row.label) + '</button>';
  }
  function settingsRowHtml(row, role) {
    var access = settingAccessFor(role, row) || (row.type === 'status' ? 'r' : '');
    if (!access && row.type !== 'status') return '';
    var raw = settingRawValue(row);
    if (access === 'w' && row.bind && row.type !== 'action' && row.type !== 'status') rememberSetting(row.bind, raw);
    var help = row.help || '';
    if (row.def != null && row.def !== '' && String(help).indexOf('Default') === -1 && row.type !== 'status' && row.type !== 'action') {
      help = (help ? help + ' · ' : '') + 'Default ' + row.def;
    }
    var copy = '<div class="settings-row-copy"><span class="body-strong">' + esc(row.label) + '</span>' +
      (help ? '<span class="caption bn-muted">' + esc(help) + '</span>' : '') + '</div>';
    var control;
    if (row.type === 'action') control = settingsAction(row);
    else if (access === 'w' && row.type !== 'status') control = settingsControl(row, raw);
    else control = '<span class="body">' + esc(settingReadValue(row, raw)) + '</span>';
    var readonly = access !== 'w' || row.type === 'status';
    return '<div class="settings-row' + (readonly ? ' is-readonly' : '') + '">' + copy + '<div class="settings-row-control">' + control + '</div></div>';
  }
  function showAuditPanel(role, section, query) {
    var access = settingAccessFor(role, { roles: { receptionist: 'r', assistant: '', doctor: '', admin: 'r' } });
    if (!access) return false;
    var q = String(query || '').toLowerCase();
    if (q) return q.indexOf('audit') !== -1;
    return section === 'audit';
  }
  function settingsScreen() {
    var u = user();
    var role = u ? u.role : '';
    var query = state.settingsQuery || '';
    var section = settingsSectionId(role);
    var navItems = collectSettingsNav(role, query);
    if (!String(query).replace(/^\s+|\s+$/g, '') && navItems.length && !navItems.some(function (n) { return n.id === section; })) {
      section = navItems[0].id;
    }
    state.settingsSection = section;
    var rows = collectSettingsRows(role, section, query);
    var lastGroup = '';
    var railHtml = '<input class="settings-search" id="settings-q" data-bind="settingsQuery" data-live="1" placeholder="Find a setting" aria-label="Find a setting" value="' + esc(query) + '">';
    navItems.forEach(function (item) {
      if (item.group && item.group !== lastGroup) {
        railHtml += '<p class="settings-group">' + esc(item.group === 'clinic' ? 'Clinic' : item.group === 'you' ? 'Your preferences' : item.group) + '</p>';
        lastGroup = item.group;
      }
      railHtml += '<button type="button" class="settings-nav" data-act="settings-tab" data-value="' + esc(item.id) + '"' + (section === item.id ? ' aria-current="true"' : '') + '>' + esc(item.label) + '</button>';
    });
    var title = String(query).replace(/^\s+|\s+$/g, '') ? 'Search results' : ((navItems.filter(function (n) { return n.id === section; })[0] || {}).label || 'Settings');
    var list = rows.map(function (row) { return settingsRowHtml(row, role); }).join('');
    var hasReadonly = rows.some(function (row) { return settingAccessFor(role, row) === 'r' || row.type === 'status'; });
    var paneInner = '';
    if (!list && !showAuditPanel(role, section, query)) {
      paneInner = '<div class="settings-empty"><p class="heading">No settings match</p><p class="caption bn-muted">Try another word, or clear the search.</p></div>';
    } else {
      paneInner = (list ? '<div class="settings-list">' + list + '</div>' : '') +
        (hasReadonly ? '<p class="settings-readonly-hint">Ask an admin to change this</p>' : '') +
        (showAuditPanel(role, section, query) ? auditPanel() : '');
    }
    var extra = section === 'profile' && !String(query).replace(/^\s+|\s+$/g, '')
      ? '<button type="button" class="bn-btn" data-act="switch-open">' + e('Switch user') + '</button>'
      : '';
    return '<div class="page-head"><div><h1 class="heading-lg">' + e('Settings') + '</h1><p class="caption bn-muted">Personal preferences for everyone. Clinic policy is admin-write.</p></div></div>' +
      '<div class="settings-shell"><aside class="settings-rail">' + railHtml + '</aside><div class="settings-pane"><header class="settings-pane-hd"><h2 class="heading">' + esc(title) + '</h2>' + extra + '</header>' + paneInner + '</div></div>';
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
      '<button type="button" class="bn-callnext-btn" data-act="call-next" data-id="' + d.id + '"' + (disabled ? ' disabled' : '') + '><span class="' + (u.role !== 'assistant' && state.lang === 'hi' ? 'hi-call-next' : 'call-next') + '">' + (u.role === 'assistant' ? e('Next') : (state.lang === 'hi' ? 'अगले मरीज़ को बुलाएँ' : e('Call next'))) + '</span></button>' +
      '<span class="caption bn-muted bn-num">' + (d.nowName ? 'With ' + esc(d.nowName) + ' since ' + esc(d.nowSince) : 'Cabin is free') + '</span></div>';
    var remaining = state.bookings.filter(function (b) { return b.doctorId === d.id && b.dateKey === state.dateKey && ['done', 'cancelled', 'no_show', 'rescheduled'].indexOf(b.status) < 0; }).length;
    var finish = fmtTime(20 * 60 + (d.delayMin || 0));
    var cabinList = mode === 'cabin' ? '<div class="panel"><div class="panel-bd">' + (q.length ? q.map(function (b, i) {
      var p = patient(b.patientId);
      return '<div class="queue-line"><span><strong>' + (i + 1) + '. ' + esc(p.name) + '</strong><div class="caption">' + esc(p.pid) + (b.priority ? ' · priority' : '') + '</div></span><span class="caption bn-num">' + esc(b.statusNote) + '</span></div>';
    }).join('') : '<p class="bn-muted">' + esc(empty) + '</p>') + '</div></div>' : '';
    var back = (u.role === 'doctor' || u.role === 'assistant') ? '' : '<a class="bn-btn" href="#today">' + e('Back to desk') + '</a>';
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
    var phoneLinks = (u.role === 'assistant' ? '<a class="bn-btn" href="#today">' + e('Today') + '</a>' : '') +
      '<a class="bn-btn" href="#settings">' + e('Settings') + '</a>';
    return '<div class="phone-wrap"><div class="phone"><div class="phone-top">' + back + '<div><div class="body-strong">' + esc(d.name) + '</div><div class="caption bn-muted">' + esc(d.cabin) + '</div></div>' + phoneLinks + '<button type="button" class="bn-btn" data-act="switch-open">' + esc(u.name) + '</button></div>' +
      p1Chip() + modeToggle + chip(d) + jump + net + paused +
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
      if (k === 'clear') return '<button type="button" class="pad-clear" data-act="pin-clear">Clear</button>';
      if (k === 'ok') return '<button type="button" class="pad-ok" data-act="pin-ok">Unlock</button>';
      return '<button type="button" data-act="pin-digit" data-value="' + k + '">' + k + '</button>';
    }).join('') + '</div>' + (state.pinError ? '<p class="caption pin-error">' + esc(state.pinError) + '</p>' : '');
  }
  function staffRow(u) {
    var initial = (u.name || '?').charAt(0);
    return '<button type="button" class="bn-btn staff-row' + (state.pinFor === u.id ? ' is-selected' : '') + '" data-act="pick-user" data-id="' + u.id + '">' +
      '<span class="staff-initial" aria-hidden="true">' + esc(initial) + '</span>' +
      '<span class="staff-meta"><span class="body-strong">' + esc(u.name) + '</span><span class="caption bn-muted">' + esc(roleName(u.role)) + '</span></span></button>';
  }
  function signin() {
    var picking = state.pinFor ? state.users.filter(function (u) { return u.id === state.pinFor; })[0] : null;
    var list = '<div class="staff-pick">' + state.users.map(staffRow).join('') + '</div>';
    var pinBlock = picking
      ? '<div class="signin-who"><p class="body-strong">' + esc(picking.name) + '</p><p class="caption bn-muted">' + esc(roleName(picking.role)) + '</p></div>' +
        '<p class="label">' + (state.needOtp ? 'Authenticator code' : 'Enter your PIN') + '</p>' +
        pinPad() +
        '<p class="caption bn-muted demo-hint">Demo ' + (state.needOtp ? 'code ' + esc(picking.otp || '') : 'PIN ' + esc(picking.pin)) + '</p>' +
        '<button type="button" class="bn-btn bn-btn-quiet" data-act="pin-cancel">Choose someone else</button>'
      : list;
    return '<div class="signin">' + emergencyHighlight() + '<div class="signin-card">' + brandLogo() + '<h1 class="heading-lg">' + esc(state.clinic) + '</h1><p class="figure-lg bn-num" data-live-clock="sec">' + esc(liveClockText(true)) + '</p><p class="bn-muted">Sign in with your own PIN. The desk never shares one login.</p>' + pinBlock + '</div></div>';
  }
  function lockScreen() {
    var who = user();
    return '<div class="lock">' + emergencyHighlight() + '<div class="lock-card">' + brandLogo() + '<h1 class="heading-lg">' + esc(state.clinic) + '</h1><p class="figure-lg bn-num" data-live-clock="sec">' + esc(liveClockText(true)) + '</p><p class="bn-muted">Desk locked.</p>' +
      (who ? '<div class="signin-who"><p class="body-strong">' + esc(who.name) + '</p><p class="caption bn-muted">' + esc(roleName(who.role)) + '</p></div>' : '') +
      '<p class="label">Enter your PIN</p>' + pinPad() +
      (who ? '<p class="caption bn-muted demo-hint">Demo PIN ' + esc(who.pin) + '</p>' : '') +
      '</div></div>';
  }
  function switchSheet() {
    if (!state.switchOpen || !state.signedIn || state.locked) return '';
    var picking = state.pinFor ? state.users.filter(function (u) { return u.id === state.pinFor; })[0] : null;
    return '<div class="modal-back"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="sw-title"><h2 id="sw-title" class="heading">' + e('Switch user') + '</h2><p class="caption bn-muted">Each person uses their own PIN.</p>' +
      '<div class="staff-pick">' + state.users.map(staffRow).join('') + '</div>' +
      (picking ? '<div class="stack"><div class="signin-who"><p class="body-strong">' + esc(picking.name) + '</p><p class="caption bn-muted">' + esc(roleName(picking.role)) + '</p></div>' +
        '<p class="label">' + (state.needOtp ? 'Authenticator code' : 'Enter your PIN') + '</p>' +
        pinPad() +
        '<p class="caption bn-muted demo-hint">Demo ' + (state.needOtp ? 'code ' + esc(picking.otp || '') : 'PIN ' + esc(picking.pin)) + '</p></div>' : '') +
      '<button type="button" class="bn-btn" data-act="switch-close">' + e('Close') + '</button>' +
      (state.signedIn && !state.locked ? '<div class="row-actions"><button type="button" class="bn-btn" data-act="lock">' + e('Lock desk') + '</button><button type="button" class="bn-btn bn-btn-quiet" data-act="signout">' + e('Sign out') + '</button></div>' : '') +
      '</div></div>';
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
        (bookableLabels(bDate, bDoc).length ? bookableLabels(bDate, bDoc).map(function (lab) {
          var w = findWindow(bDoc, lab, bDate);
          var o = w ? occupancy(w) : { taken: 0, priorityTaken: 0 };
          var cap = (w ? w.capacity : (doc && doc.capacity) || 4) - (w ? w.priorityPlaces : (doc && doc.priorityPlaces) || 0);
          var chosen = (f.windowLabel || defaultLabel(bDoc, bDate)) === lab;
          return '<option value="' + esc(lab) + '"' + (chosen ? ' selected' : '') + '>' + esc(windowShown(bDoc, lab, bDate) + ' · ' + (o.taken >= cap ? 'full' : o.taken + '/' + cap)) + '</option>';
        }).join('') : '<option value="">' + e('No arrival windows left today. Pick another day.') + '</option>') + '</select></label></div>';
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
      if (b.status === 'booked' && user().role !== 'assistant') body += '<button type="button" class="bn-btn bn-btn-primary" data-act="arrive" data-id="' + b.id + '">' + e('Arrived') + '</button>';
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
    if (user().role === 'assistant' && r !== 'today' && r !== 'summary' && r !== 'waiting' && r !== 'doctor' && r !== 'settings') {
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
    if (!state.signedIn) return '<div class="shell">' + signin() + '</div>';
    if (state.locked) return '<div class="shell">' + lockScreen() + '</div>';
    var u = user();
    var inner;
    if (route() === 'waiting') inner = waitingRoom();
    else if (route() === 'settings') inner = shell(screen());
    else if (u.role === 'doctor' || route() === 'doctor') inner = doctorScreen();
    else inner = shell(screen());
    return '<div class="shell">' + emergencyBanner() + inner + drawer() + modal() + switchSheet() + (state.accountOpen && deskOpen() ? '<div class="account-pop">' + (state._moreLinks ? '<nav class="nav nav-more" aria-label="More">' + state._moreLinks + '</nav>' : '') + accountControls() + '</div>' : '') + (state.toast ? '<div class="toast" role="status">' + esc(state.toast) + '</div>' : '') + '</div>';
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
  function dialogsNow() { return Array.prototype.slice.call(document.querySelectorAll('[role="dialog"]')); }
  function focusKey(el) {
    if (!el || !el.dataset || !el.dataset.act) return null;
    return { act: el.dataset.act, id: el.dataset.id || '', value: el.dataset.value || '' };
  }
  function findByKey(k) {
    var base = '[data-act="' + k.act + '"][data-id="' + k.id + '"]' + (k.value ? '[data-value="' + k.value + '"]' : '');
    return document.querySelector('button' + base) || document.querySelector(base);
  }
  function renderNow(opts) {
    state._stale = false;
    var keep = opts && opts.keepFocus ? document.activeElement : null;
    var focusId = keep && keep.id;
    var focusBtn = keep && !focusId ? focusKey(keep) : null;
    var pos = keep ? keep.selectionStart : null;
    state.doctors.forEach(function (d) { d.threshold = Number(state.settings.delayThreshold) || 20; });
    var before = dialogsNow().length;
    if (!before) state._opener = focusKey(document.activeElement);
    document.getElementById('app').innerHTML = view();
    var dlgs = dialogsNow();
    dlgs.forEach(function (d, i) {
      var heading = d.querySelector('h1, h2, h3');
      if (heading && !d.hasAttribute('aria-labelledby')) {
        if (!heading.id) heading.id = 'dlg-title-' + i;
        d.setAttribute('aria-labelledby', heading.id);
      }
    });
    if (dlgs.length > before) {
      var top = dlgs[dlgs.length - 1];
      top.setAttribute('tabindex', '-1');
      top.focus();
    } else if (!dlgs.length && before && state._opener) {
      var back = findByKey(state._opener);
      if (back) back.focus();
      state._opener = null;
    }
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
    } else if (focusBtn) {
      var again = findByKey(focusBtn);
      if (again) again.focus();
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
  function markPaid(id, method) {
    var pb = booking(id);
    state.modal = null;
    if (!pb || !pb.fee || pb.fee.state === 'paid') { render(); return; }
    if (state.live) {
      var pid = pb.fee.paymentId;
      if (!pid) {
        var pay = state.payments.filter(function (p) { return String(p.bookingId) === String(id); })[0];
        pid = pay && pay.id;
      }
      if (!pid) { toast('No payment record for this visit yet. Nothing was changed.'); render(); return; }
      if (state._paying) { render(); return; }
      state._paying = true;
      render();
      liveSend('POST', '/api/payments/' + pid + '/mark-paid').then(function (res) {
        state._paying = false;
        if (!res.ok) { toast((res.data && res.data.detail) || 'Could not record the payment. Try again.'); render(); return; }
        pb.fee.state = 'paid';
        toast('Marked paid ' + money(pb.fee.amount));
        render();
        if (state.reload) state.reload();
      }).catch(function () { state._paying = false; toast('No connection. The payment was not recorded.'); render(); });
      return;
    }
    pb.fee.state = 'paid'; pb.fee.method = method;
    pb.timeline.push({ at: state.timeLabel, text: 'Paid ' + money(pb.fee.amount) + ' (' + method + ') · ' + user().name });
    audit('Marked fee paid');
    render();
  }
  function markArrived(id) {
    if (state.live) {
      liveSend('POST', '/api/bookings/' + id + '/arrive').then(function (res) {
        if (!res.ok) toast((res.data && res.data.detail) || 'Could not mark arrived');
        if (state.reload) state.reload();
      });
      return;
    }
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
    if (state.live) {
      liveSend('POST', '/api/doctors/' + id + '/call-next').then(function (res) {
        if (!res.ok) toast((res.data && res.data.detail) || 'Could not call the next patient');
        if (state.reload) state.reload();
      });
      return;
    }
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
    if (state.live && state.form.source === 'walk_in') {
      var walk = state.form;
      liveSend('POST', '/api/walk-ins', {
        full_name: walk.name, phone: walk.phone, doctor_id: walk.doctorId,
        priority: !!walk.priority, reason: walk.reason || 'general check-up'
      }).then(function (res) {
        if (!res.ok) { state.form.error = (res.data && res.data.detail) || 'Could not add the walk-in'; render({ keepFocus: true }); return; }
        state.drawer = null;
        toast('Walk-in added');
        if (state.reload) state.reload();
      });
      return;
    }
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
    pushActivity(user().name + (source === 'walk_in' ? ' added a walk-in for ' : ' booked ') + patient(pid).name + ' with ' + doc.name + ', ' + dayLabel(dateKey) + ' ' + windowShown(docId, label, dateKey) + '.');
    state.drawer = null;
    audit((source === 'walk_in' ? 'Walk-in booked for ' : 'Booked ') + patient(pid).name + ' · ' + dayLabel(dateKey) + ', ' + windowShown(docId, label, dateKey), { patientId: pid });
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
  function acknowledgeEmergency() {
    state.emergencyAck = true;
    state.pendingEmergency = null;
    var fresh = cbBy('cb-new');
    if (fresh) fresh.isNew = false;
    state.alerts.unshift({ id: 'al-new', kind: 'medical', at: '6:08 pm', number: '+91 98777 77777', by: user().name, ackAt: state.timeLabel, snippet: 'Papa ko seene mein dard ho raha hai, saans phool rahi hai', callId: 'call-emerg' });
    audit('Acknowledged a medical emergency');
  }
  function runPendingEmergency() {
    var pending = state.pendingEmergency;
    state.pendingEmergency = null;
    if (!pending) { go('today'); return; }
    if (pending.act === 'open-call') {
      state.callId = pending.id || 'call-emerg';
      state.modal = null;
      go('calls');
      return;
    }
    if (pending.act === 'call-emergency') {
      state.modal = { kind: 'call', number: '+91 98777 77777', body: 'Call +91 98777 77777? The agent already told them to ring 112 / 108.', id: 'cb-new' };
      go('today');
      return;
    }
    if (pending.act === 'ack') {
      acknowledgeEmergency();
      go('today');
      return;
    }
    go('today');
  }
  function finishSignIn(u) {
    var pending = state.pendingEmergency;
    state.userId = u.id;
    state.signedIn = true;
    state.locked = false;
    state.switchOpen = false;
    state.pin = '';
    state.otp = '';
    state.needOtp = false;
    state.pinFor = '';
    state.pinError = '';
    state.accountOpen = false;
    if (!state.deskOpenedAt) state.deskOpenedAt = Date.now();
    audit('Signed in');
    if (u.role === 'receptionist') {
      state.emergencyCompact = false;
      clearTimeout(state._emTimer);
      state._emTimer = null;
    }
    if (u.role !== 'receptionist') {
      state.pendingEmergency = null;
      if (u.role === 'doctor' || u.role === 'assistant') go('doctor');
      else if (u.role === 'admin') go('settings');
      else go('today');
      return;
    }
    if (pending) runPendingEmergency();
    else go('today');
  }
  function doAct(act, el) {
    var id = el.dataset.id || '';
    var value = el.dataset.value || '';
    if (deskClosed()) {
      if (act === 'attend-emergency') {
        var rec = receptionUser();
        if (!state.emergencyAck) state.pendingEmergency = { act: 'open-call', id: 'call-emerg' };
        if (!state.signedIn && rec) {
          state.pinFor = rec.id;
          state.pin = '';
          state.otp = '';
          state.needOtp = false;
          state.pinError = '';
        }
        render();
        return;
      }
      if (act === 'open-call' || act === 'call-emergency' || act === 'ack') {
        if (!state.emergencyAck) state.pendingEmergency = { act: act, id: id };
        render();
        return;
      }
      if (act !== 'pick-user' && act !== 'pin-digit' && act !== 'pin-clear' && act !== 'pin-ok' && act !== 'pin-cancel' && act !== 'switch-close') return;
    }
    if (act !== 'account-menu') state.accountOpen = false;
    if (user() && user().role === 'assistant' && ['walk-in', 'arrive', 'send-in', 'cancel-session', 'cancel-confirm', 'desk', 'start-session'].indexOf(act) >= 0) return;
    if (act === 'account-menu') { state.accountOpen = !state.accountOpen; render(); return; }
    if (act === 'desk') {
      if (state.live) {
        liveSend('PATCH', '/api/desk', { staff_on_desk: !!state.staffOnDesk }).then(function () { if (state.reload) state.reload(); });
      }
      audit(state.staffOnDesk ? 'Staff on desk is on. Calls transfer to the desk phone.' : 'Staff on desk is off. Callers are offered a callback.');
      render(); return;
    }
    if (act === 'refresh') { render({ keepFocus: true }); return; }
    if (act === 'lang') { state.lang = value; render(); return; }
    if (act === 'lock') { state.locked = true; state.pin = ''; state.pinFor = state.userId; state.needOtp = false; state.pinError = ''; render(); return; }
    if (act === 'signout') { state.signedIn = false; state.locked = false; state.switchOpen = false; state.userId = ''; state.pendingEmergency = null; state.pin = ''; state.pinFor = ''; state.needOtp = false; state.drawer = null; state.modal = null; state.deskOpenedAt = 0; state.demoFired = {}; state.accountOpen = false; state.emergencyCompact = false; clearTimeout(state._emTimer); state._emTimer = null; render(); return; }
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
      acknowledgeEmergency();
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
      pushActivity('Agent booking confirmed for ' + patient(held.patientId).name + '.');
      audit('Confirmed the held booking for ' + patient(held.patientId).name);
      render(); return;
    }
    if (act === 'collect-cash' || act === 'mark-paid') {
      var pb = booking(id);
      if (!pb || !pb.fee) return;
      var cashAct = act === 'collect-cash';
      state.modal = { kind: 'confirm', title: (cashAct ? 'Collect ' : 'Mark paid ') + money(pb.fee.amount) + (cashAct ? ' in cash' : ' by UPI') + '?', body: 'For ' + patient(pb.patientId).name + '. This records the fee as paid. It cannot be undone from the console.', confirm: cashAct ? 'Collect cash' : 'Mark paid', confirmAct: cashAct ? 'pay-confirm-cash' : 'pay-confirm-upi', id: id };
      render(); return;
    }
    if (act === 'pay-confirm-cash' || act === 'pay-confirm-upi') { markPaid(id, act === 'pay-confirm-cash' ? 'Cash' : 'UPI'); return; }
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
      state.modal = { kind: 'confirm', title: 'Clear the phone verification lockout?', body: 'Only do this after you have checked the patient in person. Callers on this number will be able to try identity checks again. This is recorded under your name.', confirm: 'Clear lockout', confirmAct: 'lockout-confirm', id: id };
      render(); return;
    }
    if (act === 'lockout-confirm') {
      state.modal = null;
      if (cbBy(id)) cbBy(id).lockout = false;
      audit('Cleared a verification lockout after an in-person check, by ' + user().name);
      render(); return;
    }
    if (act === 'pick-call') { state.callId = id; state.playing = false; render(); return; }
    if (act === 'call-outcome') { state.callOutcome = value; render(); return; }
    if (act === 'call-intent') { state.callIntent = value; render(); return; }
    if (act === 'play') { state.playing = !state.playing; render(); return; }
    if (act === 'pay-tab') { state.paymentTab = value; render(); return; }
    if (act === 'refund') {
      if (!user() || user().role !== 'admin') return;
      var rf = state.refunds.filter(function (r) { return r.id === id; })[0];
      state.modal = { kind: 'refund', mode: value, id: id };
      blankForm({ amount: String(rf.amount), note: '', error: '' });
      render(); return;
    }
    if (act === 'refund-confirm') {
      if (!user() || user().role !== 'admin') return;
      var rff = state.refunds.filter(function (r) { return r.id === state.modal.id; })[0];
      var mode = state.modal.mode;
      if ((mode === 'reject' || mode === 'change') && !String(state.form.note || '').trim()) { state.form.error = 'A note is required.'; render({ keepFocus: true }); return; }
      if (state.live) {
        liveSend('POST', '/api/refunds/' + rff.id + '/decide', {
          pin: user().pin, decision: mode === 'reject' ? 'reject' : 'approve',
          note: state.form.note || '', amount_inr: mode === 'change' ? Number(state.form.amount) : undefined
        }).then(function (res) {
          if (!res.ok) { state.form.error = (res.data && res.data.detail) || 'The refund was refused'; render({ keepFocus: true }); return; }
          state.modal = null;
          if (state.reload) state.reload();
        });
        return;
      }
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
      if (state.live) {
        liveSend('POST', '/api/tickets/' + ap.id + '/refill-decision', {
          pin: fa.pin, decision: 'approve', checks_confirmed: true,
          issued_via: fa.via === 'desk' ? 'collect_at_desk' : 'doctor_sent_to_patient',
          note: fa.note || ''
        }).then(function (res) {
          if (!res.ok) { state.form.error = (res.data && res.data.detail) || 'The doctor could not decide'; render(); return; }
          state.modal = null;
          if (state.reload) state.reload();
        });
        return;
      }
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
    if (act === 'settings-tab') { state.settingsSection = value; go('settings/' + value); return; }
    if (act === 'remote-signout') {
      if (!user() || user().role !== 'admin') return;
      audit('Signed out cabin and doctor phones remotely');
      render();
      return;
    }
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
    if (act === 'retry-pull') { toast('Checking the connection…'); if (state.reload) state.reload(); return; }
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
    if (el.dataset && el.dataset.bind) {
      if (el.dataset.settingsRow === '1' && !canWriteSetting(el.dataset.bind)) return;
      setPath(el.dataset.bind, el.type === 'checkbox' ? el.checked : el.value);
      if (el.dataset.settingsRow === '1') maybeAuditSettings(el);
    }
    if (el.dataset && el.dataset.act) doAct(el.dataset.act, el);
    else if (el.dataset && el.dataset.bind) render({ keepFocus: true });
  }
  function onInput(e) {
    var el = e.target;
    if (!el.dataset || !el.dataset.bind) return;
    if (el.dataset.settingsRow === '1' && !canWriteSetting(el.dataset.bind)) return;
    setPath(el.dataset.bind, el.value);
    if (el.dataset.live === '1') render({ keepFocus: true });
  }
  function onFocusOut(e) {
    var el = e.target;
    if (!el.dataset || el.dataset.settingsRow !== '1' || !el.dataset.bind) return;
    if (!canWriteSetting(el.dataset.bind)) return;
    setPath(el.dataset.bind, el.type === 'checkbox' ? el.checked : el.value);
    maybeAuditSettings(el);
  }
  function typing(el) { return el && el.matches && el.matches('input, textarea, select'); }
  function trapTab(e) {
    var all = dialogsNow();
    var dlg = all[all.length - 1];
    if (!dlg || e.key !== 'Tab') return false;
    var sel = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    var wrap = document.querySelector('.emergency-wrap');
    var items = Array.prototype.slice.call(dlg.querySelectorAll(sel)).concat(wrap ? Array.prototype.slice.call(wrap.querySelectorAll(sel)) : []);
    if (!items.length) return false;
    var i = items.indexOf(document.activeElement);
    var next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i < 0 || i === items.length - 1 ? 0 : i + 1);
    e.preventDefault();
    items[next].focus();
    return true;
  }
  function onKey(e) {
    if (trapTab(e)) return;
    if (pinPadOpen() && !typing(e.target)) {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        doAct('pin-digit', { dataset: { value: e.key, id: '' } });
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (state.needOtp) state.otp = state.otp.slice(0, -1);
        else state.pin = state.pin.slice(0, -1);
        state.pinError = '';
        render();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        doAct('pin-ok', { dataset: { id: '', value: '' } });
        return;
      }
    }
    if (e.key === 'Escape') { state.drawer = null; state.modal = null; state.switchOpen = false; state.accountOpen = false; render(); return; }
    if (e.key === '/' && !typing(e.target)) { e.preventDefault(); var q = document.getElementById('q'); if (q) q.focus(); }
    if ((e.key === 'w' || e.key === 'W') && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(e.target) && state.signedIn && !state.locked && !state.switchOpen && user() && user().role !== 'assistant') {
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
  document.body.addEventListener('focusout', onFocusOut);
  var pointerDown = false;
  function catchUp() {
    if (state._stale && !pointerDown && !uiBusy()) render({ keepFocus: true });
  }
  document.body.addEventListener('pointerdown', function () { pointerDown = true; });
  document.addEventListener('pointerup', function () { pointerDown = false; setTimeout(catchUp, 80); });
  document.addEventListener('pointercancel', function () { pointerDown = false; });
  document.body.addEventListener('focusout', function (e) {
    if (e.relatedTarget) return;
    setTimeout(catchUp, 80);
  });
  document.addEventListener('keydown', onKey);
  document.body.addEventListener('dragstart', onDragStart);
  document.body.addEventListener('dragover', function (e) { if (e.target.closest('[data-drop]')) e.preventDefault(); });
  document.body.addEventListener('drop', onDrop);
  window.addEventListener('hashchange', function () { state.accountOpen = false; render(); });
  var idle;
  function bumpIdle() {
    clearTimeout(idle);
    var mins = Number(state.settings && state.settings.autoLockMin);
    if (!mins || mins < 1) mins = 3;
    idle = setTimeout(function () {
      if (state.signedIn && !state.locked && user() && user().role === 'receptionist') {
        state.locked = true; state.pin = ''; state.pinFor = state.userId; render();
      }
    }, mins * 60000);
  }
  document.addEventListener('pointerdown', bumpIdle);
  bumpIdle();
  if (!location.hash) location.hash = 'today';
  else render();

  function uiBusy() {
    if (state.drawer || state.modal || state.switchOpen) return true;
    var el = document.activeElement;
    return !!(el && el.matches && el.matches('input, textarea, select'));
  }
  function tickCabin() {
    var now = liveNowMin();
    if (state.clockMin === now) return false;
    var first = !state.clockMin;
    state.clockMin = now;
    state.timeLabel = fmtTime(now);
    if (!state.live && !first) {
      state.doctors.forEach(function (d) {
        if (d.status === 'started' && d.basis === 'schedule') d.watchdogMin = (d.watchdogMin || 0) + 1;
      });
      state.activity.forEach(function (a) {
        if (a.atMin != null) {
          a.ago = agoText(a.atMin);
          if (a.ago !== 'just now') a.fresh = false;
        }
      });
      refreshOpenDue();
      refreshWindowsNow();
    }
    return !first;
  }
  function runDemoBeats() {
    if (state.live) return false;
    if (state.live || !deskOpen() || !state.deskOpenedAt) return false;
    var s = Math.floor((Date.now() - state.deskOpenedAt) / 1000);
    var changed = false;
    function once(id, at, fn) {
      if (state.demoFired[id] || s < at) return;
      state.demoFired[id] = true;
      fn();
      changed = true;
    }
    once('hold-tick', 8, function () {
      pushActivity('Agent is still on the line with Anaya Singh’s parent.');
      toast('Agent still on a call');
    });
    once('new-cb', 18, function () {
      if (state.callbacks.some(function (c) { return c.id === 'cb-live'; })) return;
      if (!state.calls.some(function (c) { return c.id === 'call-live'; })) {
        state.calls.unshift({
          id: 'call-live',
          time: state.timeLabel,
          mins: liveNowMin(),
          direction: 'in',
          patientId: '',
          caller: 'Unknown caller',
          number: '+91 98001 22334',
          language: 'HI',
          intent: 'booking',
          outcome: 'callback',
          duration: '1 min 10 sec',
          cost: '₹1.10',
          tags: [],
          outbound: false,
          verified: 'Not verified',
          relative: '',
          summary: 'Caller asked if any general place was left today. The agent could not confirm a window and created a P2 callback.',
          recording: false,
          produced: [{ type: 'Callback', label: 'P2 · due in 14 min' }],
          transcript: [
            { who: 'caller', text: 'Koi last slot hai kya aaj?' },
            { who: 'agent', text: 'Today’s last general windows are shifting. I will ask the desk to call you back.' },
            { who: 'system', text: 'P2 callback created' }
          ]
        });
      }
      state.callbacks.unshift({
        id: 'cb-live',
        priority: 'P2',
        isNew: true,
        overdue: false,
        dueSoon: true,
        dueText: 'due in 14 min',
        dueMin: liveNowMin() + 14,
        caller: 'Unknown caller',
        patientId: '',
        number: '+91 98001 22334',
        language: 'HI',
        verified: false,
        reason: 'Asked for today’s last general place. Agent could not confirm a window.',
        callId: 'call-live',
        status: 'open',
        attempts: [],
        smsSent: false,
        differs: false,
        callbackNumber: '',
        preferred: 'This evening',
        wanted: 'Any general doctor today.',
        snippet: 'Koi last slot hai kya aaj?',
        lockout: false
      });
      pushActivity('Agent created a P2 callback for a new caller.');
      if (prefOn('notifyCallback')) toast('New P2 callback from the agent');
    });
    once('delay', 32, function () {
      var d = doctor('sharma');
      if (d && d.status === 'started' && d.basis === 'live') {
        d.delayMin += 1;
        pushActivity('Dr Sharma’s live delay is now +' + d.delayMin + ' min.');
        if (prefOn('notifyDelay')) toast('Live delay updated');
      }
    });
    once('sms', 48, function () {
      state.outbox.unshift({
        id: 'mx-live',
        at: state.timeLabel,
        patientId: 'fatima',
        channel: 'SMS',
        template: 'Delay update',
        status: 'failed',
        text: 'Dr Sharma is running late. Your new arrival window will follow. - Demo Family Clinic'
      });
      pushActivity('Delay SMS to Fatima Shaikh failed. Retry from Messages.');
      if (prefOn('notifyFailed')) toast('A delay SMS failed');
    });
    return changed;
  }
  function paintLive() {
    document.querySelectorAll('[data-live-clock]').forEach(function (el) {
      el.textContent = liveClockText(el.getAttribute('data-live-clock') === 'sec');
    });
    document.querySelectorAll('[data-live-hold]').forEach(function (el) { el.textContent = holdNote(); });
    var held = state.bookings.filter(function (b) { return b.status === 'held'; }).length;
    document.querySelectorAll('[data-live-agent]').forEach(function (el) {
      el.textContent = held ? 'Agent: ' + held + ' call in progress' : 'Agent: idle';
      el.classList.toggle('agent-live', !!held);
      el.classList.toggle('bn-muted', !held);
    });
    state.activity.forEach(function (a) {
      var node = document.querySelector('[data-live-ago="' + a.id + '"]');
      if (node) node.textContent = activityAge(a);
    });
  }
  function pulse() {
    state.timeLabel = fmtTime(liveNowMin());
    var minuteChanged = tickCabin();
    var demoChanged = runDemoBeats();
    paintLive();
    if ((minuteChanged || demoChanged) && !uiBusy()) render({ keepFocus: true });
  }
  setInterval(pulse, 1000);
  paintLive();

  function liveSend(method, url, body) {
    return fetch(url, {
      method: method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) { return { ok: r.ok, status: r.status, data: data }; });
    });
  }
  function applyLive(snap) {
    ['doctors', 'patients', 'windows', 'bookings', 'callbacks', 'calls', 'payments', 'refunds', 'tickets', 'outbox', 'users', 'alerts'].forEach(function (key) {
      if (snap[key]) state[key] = snap[key];
    });
    state.clinic = snap.clinic || state.clinic;
    state.address = snap.address || state.address;
    state.dateLabel = snap.dateLabel || state.dateLabel;
    state.dateKey = snap.dateKey || state.dateKey;
    state.timeLabel = snap.timeLabel || state.timeLabel;
    state.staffOnDesk = !!snap.staffOnDesk;
    if (snap.week && snap.week.length) state.week = snap.week;
    state.live = true;
    state.syncOk = true;
    state.offline = false;
    state._pullFails = 0;
    state.lastSyncLabel = state.timeLabel;
    if (!state._liveUser && snap.users && snap.users.length) {
      state.userId = snap.users[0].id;
      state._liveUser = true;
    }
    // Never re-render under someone who is typing or has a dialog open; catch up when they leave.
    if (uiBusy()) { state._stale = true; return; }
    state._stale = false;
    render({ keepFocus: true });
  }
  if (!/[?&]sample=1(?:&|$)/.test(location.search)) {
    function pull() {
      var login = state._desk ? Promise.resolve() : fetch('/api/desk/login', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '2468' })
      }).then(function () { state._desk = true; });
      login.then(function () {
        return fetch('/api/console/bootstrap', { credentials: 'same-origin' });
      }).then(function (r) {
        if (r.status === 401) {
          state._desk = false;
          return fetch('/api/desk/login', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: '2468' })
          }).then(function () {
            state._desk = true;
            return fetch('/api/console/bootstrap', { credentials: 'same-origin' });
          });
        }
        return r;
      }).then(function (r) { return r.json(); }).then(applyLive).catch(function () {
        state.syncOk = false;
        state._pullFails = (state._pullFails || 0) + 1;
        if (state._pullFails >= 2 && !state.offline) {
          state.offline = true;
          if (!uiBusy()) render({ keepFocus: true }); else state._stale = true;
        }
      });
    }
    state.reload = pull;
    pull();
    setInterval(pull, 8000);
  }
})();
