import { canonicalJson, sha256Hex } from './canonical.js';
import { mcpUrl } from './config.js';
import { safeEqualString } from './pins.js';
import { redact } from './redact.js';
import { syncCallRedis } from './redisbus.js';
import { CATALOG } from './tools/catalog.js';
import { emitTrace } from './trace.js';

const chains = new Map();

function serialize(key, fn) {
  const prev = chains.get(key) || Promise.resolve();
  const run = prev.then(fn, fn);
  chains.set(key, run.then(() => {}, () => {}));
  return run;
}

export function bearer(req) {
  const header = req.headers?.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export function authorized(req, token) {
  return safeEqualString(bearer(req), token);
}

export function unwrapArgs(body) {
  const source = body && typeof body === 'object' && body.param && typeof body.param === 'object' && !Array.isArray(body.param)
    ? { ...body.param }
    : { ...(body || {}) };
  const sentPatientId = Object.prototype.hasOwnProperty.call(source, 'patient_id') ? source.patient_id : undefined;
  delete source.patient_id;
  for (const key of Object.keys(source)) {
    if (source[key] === '') delete source[key];
  }
  if (typeof source.caller_is_patient === 'string') {
    if (source.caller_is_patient === 'true') source.caller_is_patient = true;
    if (source.caller_is_patient === 'false') source.caller_is_patient = false;
  }
  if (typeof source.fee_consent === 'string') {
    const s = source.fee_consent.toLowerCase();
    if (['true', 'yes', 'y'].includes(s)) source.fee_consent = true;
    if (['false', 'no', 'n'].includes(s)) source.fee_consent = false;
  }
  if (source.priority === 'true') source.priority = true;
  if (source.priority === 'false') source.priority = false;
  return { args: source, sentPatientId };
}

function publicBody(body) {
  if (!body || typeof body !== 'object' || !body.data || typeof body.data !== 'object') return body;
  const data = { ...body.data };
  delete data.patient_id;
  return { ...body, data };
}

async function callRemote(url, name, args, token) {
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/tools/${name}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.json();
    return { status: res.status, body, events: [] };
  } catch (err) {
    console.error('mcp', err.message);
    return {
      status: 200,
      body: { ok: false, error_code: 'unavailable', say: 'I could not reach the clinic system. I can take a callback.', next: 'handoff' },
      events: [],
    };
  }
}

async function finish(deps, call, name, args, status, body, events, started, extra) {
  const clean = publicBody(body);
  const ms = Math.max(0, Math.round(performance.now() - started));
  const ok = Boolean(clean?.ok);
  deps.metrics.incTool(name, ok);
  deps.metrics.observeTool(name, ms / 1000);
  for (const event of events) {
    if (event.event_type === 'verification') {
      deps.metrics.incVerification(event.payload?.method || 'none', event.payload?.result || 'none');
    }
    await emitTrace(deps.db, deps.config, deps.metrics, deps.redis, { call, ...event });
  }
  await emitTrace(deps.db, deps.config, deps.metrics, deps.redis, {
    call,
    event_type: 'tool_call',
    severity: 'info',
    payload: {
      tool: name,
      args: redact(args),
      result_summary: String(clean?.say || clean?.error_code || '').slice(0, 240),
      success: ok,
      latency_ms: ms,
      rationale: extra.replay ? 'stored response' : 'gateway',
      replay: Boolean(extra.replay),
    },
  });
  const argsHash = extra.argsHash || sha256Hex(canonicalJson(args));
  try {
    await deps.db.query(
      `INSERT INTO tool_invocations
         (call_id, tool_name, args_hash, request_json, response_json, ok, http_status, latency_ms)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8)`,
      [call.id, name, argsHash, JSON.stringify(redact(args)), JSON.stringify(clean ?? {}), ok, status, ms],
    );
  } catch (err) {
    console.error('tool log', err.message);
  }
  try {
    const fresh = (await deps.db.query(`SELECT * FROM calls WHERE id = $1`, [call.id])).rows[0];
    await syncCallRedis(deps.redis, fresh);
  } catch (err) {
    console.error('call redis', err.message);
  }
  return { status, body: clean };
}

export async function handleTool(deps, name, rawBody) {
  const { args, sentPatientId } = unwrapArgs(rawBody);
  const key = args.call_id == null ? `tool:${name}` : String(args.call_id);
  return serialize(key, async () => {
    const started = performance.now();
    let call = null;
    if (args.call_id != null && args.call_id !== '') {
      const rows = (await deps.db.query(`SELECT * FROM calls WHERE id = $1`, [args.call_id])).rows;
      call = rows[0] || null;
    }
    const spec = CATALOG[name];
    if (!spec) {
      if (call) {
        await emitTrace(deps.db, deps.config, deps.metrics, deps.redis, {
          call,
          event_type: 'tool_call',
          severity: 'warning',
          payload: { tool: name, success: false, result_summary: 'unknown tool', rationale: 'unknown' },
        });
      }
      deps.metrics.incTool(name, false);
      return { status: 404, body: { ok: false, error_code: 'unknown_tool' } };
    }
    if (!call) {
      return { status: 404, body: { ok: false, error_code: 'unknown_call', say: 'I cannot find that call.', next: 'stop' } };
    }
    if (sentPatientId != null && sentPatientId !== '') {
      const mismatch = Boolean(call.verified) && String(sentPatientId) !== String(call.patient_id);
      if (mismatch) deps.metrics.incViolation(name);
      await emitTrace(deps.db, deps.config, deps.metrics, deps.redis, {
        call,
        event_type: 'data_access',
        severity: mismatch ? 'violation' : 'warning',
        payload: {
          tool: name,
          patient_id_accessed: String(sentPatientId),
          matches_verified_patient: !mismatch && Boolean(call.verified),
        },
      });
    }
    if (call.phase === 'ended') {
      return finish(deps, call, name, args, 200, {
        ok: false, error_code: 'call_closed', say: 'This call has ended.', next: 'stop',
      }, [], started, {});
    }
    const argsHash = sha256Hex(canonicalJson(args));
    const prev = (await deps.db.query(
      `SELECT response_json FROM tool_invocations
        WHERE call_id = $1 AND tool_name = $2 AND args_hash = $3
          AND response_json IS NOT NULL
          AND created_at > now() - interval '15 seconds'
        ORDER BY created_at DESC
        LIMIT 1`,
      [call.id, name, argsHash],
    )).rows;
    if (prev.length && prev[0].response_json) {
      const stored = typeof prev[0].response_json === 'string' ? JSON.parse(prev[0].response_json) : prev[0].response_json;
      return finish(deps, call, name, args, 200, stored, [], started, { replay: true, argsHash });
    }
    let out;
    if (!spec.run) {
      out = { status: 200, body: { ok: false, error_code: 'not_built', say: 'That action is not built yet.', next: 'continue' }, events: [] };
    } else {
      const remote = mcpUrl(deps.config, spec.mcp);
      out = remote ? await callRemote(remote, name, args, deps.config.internalToken) : await spec.run(deps.db, args, { config: deps.config });
    }
    return finish(deps, call, name, args, out.status || 200, out.body, out.events || [], started, { argsHash });
  });
}
