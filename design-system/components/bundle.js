/* @ds-bundle: {"format":4,"namespace":"Bolnai","components":[{"name":"Button"},{"name":"CallNextButton"},{"name":"DeskSwitch"},{"name":"StatusBadge"},{"name":"PriorityMark"},{"name":"DoctorChip"},{"name":"WindowBlock"},{"name":"PatientCard"},{"name":"EmergencyBanner"},{"name":"CallbackRow"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) out.push(arguments[i]);
    return out.join(' ');
  }
  function omit(obj, keys) {
    var out = {};
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k) < 0) out[k] = obj[k];
    return out;
  }
  // Type style for the text's language: Hindi text uses the hi-* styles (Devanagari face, taller lines).
  var HI = { 'heading': 'hi-heading', 'body': 'hi-body', 'body-strong': 'hi-body-strong', 'label': 'hi-label', 'caption': 'hi-caption' };
  function ts(style, lang) { return lang === 'hi' && HI[style] ? HI[style] : style; }

  var GLYPHS = {
    check: [['path', { d: 'M3 8.5 6.5 12 13 4.5' }]],
    clock: [['circle', { cx: 8, cy: 8, r: 6 }], ['path', { d: 'M8 4.8V8l2.4 1.6' }]],
    alert: [['path', { d: 'M8 2.2 14.2 13.3H1.8Z' }], ['path', { d: 'M8 6.4v3.3' }], ['path', { d: 'M8 11.6v.2' }]],
    up: [['path', { d: 'M8 13V3.5M4 7.5 8 3.5l4 4' }]],
    phone: [['path', { d: 'M5.2 2.5h1.9l.9 2.9-1.4 1a7.2 7.2 0 0 0 3 3l1-1.4 2.9.9v1.9a1.4 1.4 0 0 1-1.5 1.4A10.8 10.8 0 0 1 3.7 4a1.4 1.4 0 0 1 1.5-1.5Z' }]],
    dot: [['circle', { cx: 8, cy: 8, r: 3, fill: 'currentColor', stroke: 'none' }]],
    pause: [['path', { d: 'M6 4v8M10 4v8' }]],
    arrow: [['path', { d: 'M3 8h10M9 4l4 4-4 4' }]]
  };
  function Glyph(props) {
    var parts = GLYPHS[props.name];
    if (!parts) return null;
    var size = props.size || 16;
    return h('svg', { className: cx('bn-glyph', props.className), viewBox: '0 0 16 16', width: size, height: size, 'aria-hidden': 'true', focusable: 'false' },
      parts.map(function (p, i) { return h(p[0], Object.assign({ key: i }, p[1])); }));
  }

  // ---------------------------------------------------------------- Button
  function Button(props) {
    var variant = props.variant || 'secondary';
    var size = props.size || 'md';
    var rest = omit(props, ['variant', 'size', 'icon', 'className', 'children', 'lang']);
    return h('button', Object.assign({ type: 'button' }, rest, {
      className: cx('bn-btn', 'bn-btn-' + variant, size === 'lg' && 'bn-btn-lg', props.className),
      lang: props.lang
    }),
      props.icon ? h(Glyph, { name: props.icon }) : null,
      h('span', { className: ts('body-strong', props.lang) }, props.children));
  }

  // ---------------------------------------------------------------- CallNextButton
  function CallNextButton(props) {
    var lang = props.lang;
    var hasNext = !!props.nextName;
    return h('div', { className: 'bn-callnext', lang: lang },
      h('div', { className: 'bn-callnext-next' },
        hasNext
          ? h(React.Fragment, null,
              h('span', { className: cx(ts('label', lang), 'bn-muted') }, props.nextLabel || 'Next'),
              h('span', { className: lang === 'hi' ? 'hi-heading' : 'heading-lg' }, props.nextName),
              props.nextMeta ? h('span', { className: cx(ts('caption', lang), 'bn-muted', 'bn-num') }, props.nextMeta) : null)
          : h('span', { className: cx(ts('body', lang), 'bn-muted') }, props.emptyText || 'No patients waiting')),
      h('button', {
        type: 'button', className: 'bn-callnext-btn', onClick: props.onClick, disabled: props.disabled || !hasNext
      }, h('span', { className: lang === 'hi' ? 'hi-call-next' : 'call-next' }, props.label || 'Call next')),
      props.footer ? h('span', { className: cx(ts('caption', lang), 'bn-muted', 'bn-num') }, props.footer) : null);
  }

  // ---------------------------------------------------------------- DeskSwitch
  function DeskSwitch(props) {
    var on = !!props.on;
    var lang = props.lang;
    return h('label', { className: cx('bn-switch', on ? 'is-on' : 'is-off'), lang: lang },
      h('input', {
        type: 'checkbox', role: 'switch', className: 'bn-switch-input', checked: on, 'aria-checked': on,
        onChange: function (e) { if (props.onChange) props.onChange(e.target.checked); }
      }),
      h('span', { className: 'bn-switch-track', 'aria-hidden': 'true' }, h('span', { className: 'bn-switch-thumb' })),
      h('span', { className: 'bn-switch-text' },
        h('span', { className: ts('body-strong', lang) }, props.label || 'Staff on desk'),
        h('span', { className: cx(ts('caption', lang), on ? 'bn-muted' : null) },
          on ? (props.onText || 'Calls transfer to the desk phone') : (props.offText || 'Callers are offered a callback'))));
  }

  // ---------------------------------------------------------------- StatusBadge
  var TONE_ICON = { ok: 'check', attention: 'alert', emergency: 'alert', priority: 'up', info: 'dot', held: 'clock', neutral: null };
  function StatusBadge(props) {
    var tone = props.tone || 'neutral';
    var icon = props.icon === undefined ? TONE_ICON[tone] : props.icon;
    return h('span', { className: cx('bn-badge', 'bn-badge-' + tone, ts('label', props.lang), props.className), lang: props.lang },
      icon ? h(Glyph, { name: icon, size: 14 }) : null,
      h('span', { className: 'bn-num' }, props.children));
  }

  // ---------------------------------------------------------------- PriorityMark
  var PRIO = {
    P1: { marks: '!!!', word: 'high' },
    P2: { marks: '!!', word: 'medium' },
    P3: { marks: '!', word: 'low' }
  };
  // quiet: a P1 that is acknowledged and not overdue drops the solid red fill (emergency text on emergency-soft).
  function PriorityMark(props) {
    var level = PRIO[props.level] ? props.level : 'P3';
    return h('span', { className: cx('bn-prio', 'bn-prio-' + level, props.quiet && 'is-quiet', 'label'), role: 'img', 'aria-label': level + ', ' + PRIO[level].word + ' priority' },
      h('span', { className: 'bn-prio-marks', 'aria-hidden': 'true' }, PRIO[level].marks),
      h('span', { 'aria-hidden': 'true' }, level));
  }

  // ---------------------------------------------------------------- DoctorChip
  function DoctorChip(props) {
    var basis = props.basis === 'schedule' ? 'schedule' : 'live';
    var status = props.status === 'running' ? 'started' : (props.status || 'started');
    var delay = props.delayMin || 0;
    var threshold = props.threshold || 20;
    var running = status === 'started';
    var tone =
      status === 'cancelled' ? 'cancelled' :
      status === 'paused' ? 'paused' :
      running && basis === 'schedule' ? 'schedule' :
      running && delay >= threshold ? 'late' : 'ontime';
    var delayText =
      status === 'cancelled' ? 'session cancelled' :
      status === 'paused' ? 'paused' :
      status === 'planned' ? 'starts ' + (props.startsAt || '') :
      status === 'ended' ? 'ended' :
      delay > 0 ? '+' + delay + ' min' : 'on time';
    return h('span', { className: cx('bn-chip', 'bn-chip-' + tone), title: props.title },
      h('span', { className: 'bn-chip-dot', 'aria-hidden': 'true' }),
      h('span', { className: 'body-strong' }, props.name),
      h('span', { className: 'bn-chip-sep', 'aria-hidden': 'true' }, '·'),
      h('span', { className: 'label bn-num' }, delayText),
      running ? h('span', { className: 'bn-chip-basis caption' },
        basis === 'live' ? 'live' : h(React.Fragment, null, h(Glyph, { name: 'clock', size: 12 }), 'schedule only')) : null);
  }

  // ---------------------------------------------------------------- WindowBlock
  function Places(props) {
    var cap = props.capacity, pp = props.priorityPlaces, dots = [];
    for (var i = 0; i < cap - pp; i++) dots.push(h('span', { key: 'r' + i, className: cx('bn-place', i < props.taken ? 'is-taken' : 'is-free') }));
    for (var j = 0; j < pp; j++) dots.push(h('span', { key: 'p' + j, className: cx('bn-place', 'bn-place-priority', j < props.priorityTaken ? 'is-taken' : 'is-free') }));
    var label = props.taken + ' of ' + (cap - pp) + ' regular places taken' + (pp ? ', ' + props.priorityTaken + ' of ' + pp + ' priority' : '');
    return h('span', { className: 'bn-places', role: 'img', 'aria-label': label }, dots);
  }
  function WindowBlock(props) {
    var cap = props.capacity || 4;
    var pp = props.priorityPlaces || 0;
    var taken = Math.min(props.taken || 0, cap - pp);
    var pt = Math.min(props.priorityTaken || 0, pp);
    return h('section', { className: cx('bn-window', props.isNow && 'is-now'), 'aria-label': 'Arrival window ' + (props.shifted || props.label) },
      h('header', { className: 'bn-window-head' },
        h('div', { className: 'bn-window-time' },
          props.shifted
            ? h(React.Fragment, null,
                h('span', { className: 'caption bn-muted bn-strike bn-num' }, props.label),
                h(Glyph, { name: 'arrow', size: 14 }),
                h('span', { className: 'body-strong bn-num' }, props.shifted))
            : h('span', { className: 'body-strong bn-num' }, props.label),
          props.note ? h('span', { className: 'caption bn-muted' }, props.note) : null),
        h('div', { className: 'bn-window-places' },
          h(Places, { capacity: cap, priorityPlaces: pp, taken: taken, priorityTaken: pt }),
          h('span', { className: 'label bn-muted bn-num' }, (taken + pt) + '/' + cap))),
      props.children ? h('div', { className: 'bn-window-body' }, props.children) : null);
  }

  // ---------------------------------------------------------------- PatientCard
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
  var SOURCE = { agent: 'Via agent', walk_in: 'Walk-in', console: 'Desk' };
  function rupees(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
  function PatientCard(props) {
    var lang = props.lang;
    var st = STATUS[props.status] ? props.status : 'booked';
    var badges = [];
    if (props.priority) badges.push(h(StatusBadge, { key: 'p', tone: 'priority', lang: lang }, props.priorityLabel || 'Priority'));
    if (props.anyDoctor) badges.push(h(StatusBadge, { key: 'a', tone: 'neutral', lang: lang }, props.anyDoctorLabel || 'Any doctor'));
    if (props.source && SOURCE[props.source]) badges.push(h(StatusBadge, { key: 's', tone: 'neutral', lang: lang }, props.sourceLabel || SOURCE[props.source]));
    if (props.relative) badges.push(h(StatusBadge, { key: 'r', tone: 'neutral', lang: lang }, props.relativeLabel || 'Booked by relative'));
    if (props.fee) {
      var paid = props.fee.state === 'paid';
      badges.push(h(StatusBadge, { key: 'f', tone: paid ? 'ok' : 'attention', icon: paid ? 'check' : null, lang: lang },
        (props.fee.label || (paid ? 'Paid ' : 'Fee due ')) + rupees(props.fee.amount)));
    }
    var meta = [props.patientId, props.age ? props.age + ' y' : null].filter(Boolean).join(' · ');
    return h('article', { className: cx('bn-card', 'bn-card-' + st, props.priority && 'is-priority'), lang: lang },
      h('div', { className: 'bn-card-main' },
        h('div', { className: 'bn-card-who' },
          h('span', { className: cx(ts('body-strong', lang), 'bn-card-name') }, props.name),
          meta ? h('span', { className: 'caption bn-muted bn-num' }, meta) : null),
        h('div', { className: 'bn-card-state' },
          h(StatusBadge, { tone: STATUS[st][0], lang: lang }, props.statusLabel || STATUS[st][1]),
          props.statusNote ? h('span', { className: cx(ts('caption', lang), 'bn-muted', 'bn-num') }, props.statusNote) : null)),
      badges.length ? h('div', { className: 'bn-card-badges' }, badges) : null,
      props.note ? h('span', { className: cx(ts('caption', lang), 'bn-muted', 'bn-num') }, props.note) : null,
      props.action ? h('div', { className: 'bn-card-actions' },
        h(Button, { variant: props.action.variant || 'primary', onClick: props.action.onClick, lang: lang }, props.action.label)) : null);
  }

  // ---------------------------------------------------------------- EmergencyBanner
  function EmergencyBanner(props) {
    var title = props.title || (props.kind === 'self_harm' ? 'Self-harm risk on a call' : 'Possible medical emergency on a call');
    var meta = [props.number, props.agentNote].filter(Boolean).join(' · ');
    return h('div', { className: cx('bn-emergency', props.isNew && 'is-new'), role: 'alert' },
      h('div', { className: 'bn-emergency-icon', 'aria-hidden': 'true' }, h(Glyph, { name: 'alert', size: 28 })),
      h('div', { className: 'bn-emergency-body' },
        h('div', { className: 'bn-emergency-title' },
          h('span', { className: 'bn-prio-marks heading', 'aria-hidden': 'true' }, '!!!'),
          h('span', { className: 'heading' }, title),
          props.time ? h('span', { className: 'label bn-num' }, props.time) : null),
        props.snippet ? h('p', { className: 'body' },
          h('span', { className: 'label' }, 'Caller said: '), '“' + props.snippet + '”') : null,
        meta ? h('p', { className: 'caption bn-num' }, meta) : null),
      h('div', { className: 'bn-emergency-actions' },
        h('button', { type: 'button', className: 'bn-btn bn-btn-onred', onClick: props.onCallBack },
          h(Glyph, { name: 'phone' }), h('span', { className: 'body-strong' }, props.callLabel || 'Call back')),
        h('button', { type: 'button', className: 'bn-btn bn-btn-onred-solid', onClick: props.onAcknowledge },
          h('span', { className: 'body-strong' }, props.ackLabel || 'Acknowledge'))));
  }

  // ---------------------------------------------------------------- CallbackRow
  function CallbackRow(props) {
    var dueTone = props.overdue ? 'emergency' : props.dueSoon ? 'attention' : 'neutral';
    var meta = [props.number, props.language, props.verified ? 'verified' : 'not verified'].filter(Boolean).join(' · ');
    // P1 keeps the solid red only while new or overdue.
    return h('div', { className: cx('bn-cbrow', props.overdue && 'is-overdue') },
      h(PriorityMark, { level: props.priority, quiet: props.priority === 'P1' && !props.overdue && !props.isNew }),
      h('div', { className: 'bn-cbrow-who' },
        h('span', { className: 'body-strong' }, props.caller || 'Unknown caller'),
        h('span', { className: 'caption bn-muted bn-num' }, meta)),
      h('p', { className: cx(ts('body', props.lang), 'bn-cbrow-reason'), lang: props.lang }, props.reason),
      h('div', { className: 'bn-cbrow-due' },
        h(StatusBadge, { tone: dueTone, icon: props.overdue ? 'alert' : 'clock' }, props.dueText),
        props.differsFromCaller ? h(StatusBadge, { tone: 'attention', icon: 'phone' }, 'Different number') : null),
      h(Button, { variant: props.overdue ? 'primary' : 'secondary', icon: 'phone', onClick: props.onCall }, props.callLabel || 'Call'));
  }

  var api = {
    Button: Button, CallNextButton: CallNextButton, DeskSwitch: DeskSwitch, StatusBadge: StatusBadge,
    PriorityMark: PriorityMark, DoctorChip: DoctorChip, WindowBlock: WindowBlock, PatientCard: PatientCard,
    EmergencyBanner: EmergencyBanner, CallbackRow: CallbackRow, Glyph: Glyph
  };
  window.Bolnai = Object.assign(window.Bolnai || {}, api);
})();
