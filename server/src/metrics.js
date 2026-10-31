const PHASES = ['created', 'ringing', 'ai_active', 'handoff_queued', 'with_staff'];
const BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

function esc(v) {
  return String(v).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

function label(pairs) {
  return `{${Object.entries(pairs).map(([k, v]) => `${k}="${esc(v)}"`).join(',')}}`;
}

export function createMetrics() {
  const toolCalls = new Map();
  const toolHist = new Map();
  const handoff = new Map();
  const violations = new Map();
  const traceFails = new Map();
  const verifications = new Map();

  function bump(map, key) {
    map.set(key, (map.get(key) || 0) + 1);
  }

  return {
    incTool(tool, ok) {
      bump(toolCalls, `${tool}\0${ok ? 'true' : 'false'}`);
    },
    observeTool(tool, seconds) {
      let h = toolHist.get(tool);
      if (!h) {
        h = { buckets: BUCKETS.map(() => 0), sum: 0, count: 0 };
        toolHist.set(tool, h);
      }
      for (let i = 0; i < BUCKETS.length; i++) if (seconds <= BUCKETS[i]) h.buckets[i] += 1;
      h.sum += seconds;
      h.count += 1;
    },
    observeHandoff(result, seconds) {
      let h = handoff.get(result);
      if (!h) {
        h = { buckets: BUCKETS.map(() => 0), sum: 0, count: 0 };
        handoff.set(result, h);
      }
      for (let i = 0; i < BUCKETS.length; i++) if (seconds <= BUCKETS[i]) h.buckets[i] += 1;
      h.sum += seconds;
      h.count += 1;
    },
    incViolation(tool) {
      bump(violations, tool);
    },
    incTraceFailure(topic) {
      bump(traceFails, topic);
    },
    incVerification(method, result) {
      bump(verifications, `${method}\0${result}`);
    },
    async render(db) {
      const lines = [];
      const gauge = Object.fromEntries(PHASES.map((p) => [p, 0]));
      try {
        const rows = (await db.query(
          `SELECT phase, count(*)::int AS n FROM calls WHERE phase <> 'ended' GROUP BY phase`,
        )).rows;
        for (const row of rows) if (row.phase in gauge) gauge[row.phase] = Number(row.n);
      } catch {
        // Metrics still answer when the count query fails.
      }
      lines.push('# HELP clinic_active_calls Calls that have not ended, by phase');
      lines.push('# TYPE clinic_active_calls gauge');
      for (const phase of PHASES) lines.push(`clinic_active_calls${label({ phase })} ${gauge[phase]}`);

      lines.push('# HELP clinic_tool_calls_total Tool gateway calls');
      lines.push('# TYPE clinic_tool_calls_total counter');
      lines.push(`clinic_tool_calls_total${label({ tool: 'none', ok: 'true' })} 0`);
      for (const [key, n] of toolCalls) {
        const [tool, ok] = key.split('\0');
        lines.push(`clinic_tool_calls_total${label({ tool, ok })} ${n}`);
      }

      lines.push('# HELP clinic_tool_duration_seconds Tool gateway duration');
      lines.push('# TYPE clinic_tool_duration_seconds histogram');
      const renderHist = (name, keyName, key, h) => {
        BUCKETS.forEach((b, i) => {
          lines.push(`${name}_bucket${label({ [keyName]: key, le: String(b) })} ${h.buckets[i]}`);
        });
        lines.push(`${name}_bucket${label({ [keyName]: key, le: '+Inf' })} ${h.count}`);
        lines.push(`${name}_sum${label({ [keyName]: key })} ${h.sum}`);
        lines.push(`${name}_count${label({ [keyName]: key })} ${h.count}`);
      };
      if (toolHist.size === 0) renderHist('clinic_tool_duration_seconds', 'tool', 'none', { buckets: BUCKETS.map(() => 0), sum: 0, count: 0 });
      for (const [tool, h] of toolHist) renderHist('clinic_tool_duration_seconds', 'tool', tool, h);

      lines.push('# HELP clinic_handoff_wait_seconds Time until a handoff resolves');
      lines.push('# TYPE clinic_handoff_wait_seconds histogram');
      for (const result of ['accepted', 'timeout', 'closed']) {
        renderHist('clinic_handoff_wait_seconds', 'result', result, handoff.get(result) || { buckets: BUCKETS.map(() => 0), sum: 0, count: 0 });
      }

      lines.push('# HELP clinic_data_access_violations_total Cross-patient reads refused');
      lines.push('# TYPE clinic_data_access_violations_total counter');
      lines.push(`clinic_data_access_violations_total${label({ tool: 'none' })} 0`);
      for (const [tool, n] of violations) lines.push(`clinic_data_access_violations_total${label({ tool })} ${n}`);

      lines.push('# HELP clinic_trace_publish_failures_total Kafka publishes that failed');
      lines.push('# TYPE clinic_trace_publish_failures_total counter');
      const topics = new Set(['clinic.trace.events', ...traceFails.keys()]);
      for (const topic of topics) lines.push(`clinic_trace_publish_failures_total${label({ topic })} ${traceFails.get(topic) || 0}`);

      lines.push('# HELP clinic_verification_attempts_total Verification attempts');
      lines.push('# TYPE clinic_verification_attempts_total counter');
      lines.push(`clinic_verification_attempts_total${label({ method: 'none', result: 'none' })} 0`);
      for (const [key, n] of verifications) {
        const [method, result] = key.split('\0');
        lines.push(`clinic_verification_attempts_total${label({ method, result })} ${n}`);
      }
      return `${lines.join('\n')}\n`;
    },
  };
}
