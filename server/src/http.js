import http from 'node:http';
import { WebSocketServer } from 'ws';
import { classifyRequest } from './access.js';
import { authenticateDesk, loginStaff, sessionCookie } from './auth.js';
import { audit } from './db.js';
import { authorized, bearer, handleTool } from './gateway.js';
import { applyWebhook, appendSegment, createCall, listCalls, presentCall, replayTraces, setPhase } from './calls.js';
import { publishLive } from './redisbus.js';
import { emitTrace } from './trace.js';

function send(res, status, body, extra = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    ...extra,
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on('data', (chunk) => {
      n += chunk.length;
      if (n > 1_000_000) {
        reject(Object.assign(new Error('too big'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!n) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('bad json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function attachWs(server, deps) {
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }
    const zone = classifyRequest({ headers: req.headers, socket: req.socket, method: 'GET', urlPath: '/ws' }, deps.config);
    if (zone !== 'local') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, async (ws) => {
      const token = url.searchParams.get('token');
      let callId = token ? await deps.redis.get(`caller:${token}`) : null;
      let desk = false;
      if (!callId) {
        const auth = await authenticateDesk(req, deps.db, deps.config);
        if (!auth) {
          ws.close(4001, 'unauthenticated');
          return;
        }
        desk = true;
        callId = url.searchParams.get('call_id');
      }
      const seen = new Set();
      const channels = [];
      if (callId) channels.push(`live:call:${callId}`);
      if (desk) channels.push('live:desk');
      const offs = channels.map((channel) => deps.redis.subscribe(channel, (message) => {
        let parsed;
        try { parsed = JSON.parse(message); } catch { return; }
        const id = parsed.data?.event_id;
        if (id && seen.has(id)) return;
        if (id) seen.add(id);
        if (ws.readyState === ws.OPEN) ws.send(message);
      }));
      ws.on('close', () => offs.forEach((off) => off()));
    });
  });
  server.on('close', () => wss.close());
}

async function deskAuth(deps, req, res) {
  const auth = await authenticateDesk(req, deps.db, deps.config);
  if (!auth) {
    send(res, 401, { error: 'unauthenticated' });
    return null;
  }
  return auth;
}

export function createApi(deps) {
  const server = http.createServer((req, res) => {
    route(deps, req, res).catch((err) => {
      const status = err.status || 500;
      console.error(err.message || err);
      if (!res.headersSent) send(res, status, { error: status === 400 ? 'bad_json' : 'error' });
    });
  });
  attachWs(server, deps);
  return server;
}

async function route(deps, req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const path = url.pathname;
  const zone = classifyRequest({
    headers: req.headers,
    socket: req.socket,
    method: req.method,
    urlPath: path,
  }, deps.config);
  if (zone === 'deny') return send(res, 403, { error: 'forbidden_host' });

  if (req.method === 'GET' && path === '/healthz') {
    try {
      await deps.db.query('SELECT 1 AS ok');
      return send(res, 200, { ok: true });
    } catch {
      return send(res, 503, { ok: false });
    }
  }
  if (req.method === 'GET' && path === '/metrics') {
    if (zone !== 'local') return send(res, 403, { error: 'forbidden_host' });
    const text = await deps.metrics.render(deps.db);
    res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' });
    res.end(text);
    return;
  }
  if (zone === 'public' && !(path.startsWith('/v1/') || path === '/healthz')) {
    return send(res, 403, { error: 'forbidden_host' });
  }

  if (req.method === 'POST' && path.startsWith('/v1/tools/')) {
    if (!authorized(req, deps.config.toolToken)) return send(res, 401, { ok: false, error: 'unauthorized' });
    const name = path.slice('/v1/tools/'.length);
    const body = await readBody(req);
    const out = await handleTool(deps, name, body);
    return send(res, out.status, out.body);
  }
  if (req.method === 'POST' && path === '/v1/bolna/webhook') {
    if (!authorized(req, deps.config.webhookToken)) return send(res, 401, { ok: false, error: 'unauthorized' });
    const body = await readBody(req);
    const out = await applyWebhook(deps, body);
    return send(res, out.status, out.body);
  }
  if (req.method === 'POST' && path === '/v1/bolna/pre-handoff') {
    return send(res, 404, { error: 'not_built' });
  }
  if (req.method === 'POST' && path === '/v1/payments/webhook') {
    if (!deps.config.adapters.has('payments')) return send(res, 404, { error: 'not_mounted' });
    return send(res, 501, { error: 'not_built' });
  }

  if (zone !== 'local') return send(res, 403, { error: 'forbidden_host' });

  if (req.method === 'POST' && path === '/api/desk/login') {
    const body = await readBody(req);
    const session = await loginStaff(deps.db, deps.config, body);
    if (!session) return send(res, 401, { error: 'unauthenticated' });
    await audit(deps.db, {
      clinic_id: deps.config.clinicId,
      actor_type: 'staff',
      actor_id: session.staff_id,
      action: 'staff.login',
      entity: 'staff_users',
      entity_id: session.staff_id,
      details: { role: session.role },
    });
    return send(res, 200, {
      ok: true,
      staff_id: session.staff_id,
      role: session.role,
      doctor_id: session.doctor_id,
      name: session.name,
    }, { 'set-cookie': sessionCookie(session.staff_id, deps.config.internalToken) });
  }

  if (req.method === 'GET' && path === '/api/personas') {
    const rows = (await deps.db.query(`SELECT key, display_name, phone, note FROM caller_personas ORDER BY key`)).rows;
    return send(res, 200, { personas: rows });
  }
  if (req.method === 'POST' && path === '/api/calls') {
    const body = await readBody(req);
    const out = await createCall(deps, body.persona_key);
    return send(res, out.status, out.body);
  }
  const phaseMatch = path.match(/^\/api\/calls\/([^/]+)\/phase$/);
  if (req.method === 'POST' && phaseMatch) {
    const body = await readBody(req);
    const out = await setPhase(deps, phaseMatch[1], body.phase, bearer(req));
    return send(res, out.status, out.body);
  }
  if (req.method === 'GET' && path === '/api/calls') {
    const auth = await deskAuth(deps, req, res);
    if (!auth) return;
    const rows = await listCalls(deps.db, deps.config.clinicId, url.searchParams.get('phase'));
    return send(res, 200, { calls: rows });
  }
  const callMatch = path.match(/^\/api\/calls\/([^/]+)$/);
  if (req.method === 'GET' && callMatch) {
    const auth = await deskAuth(deps, req, res);
    if (!auth) return;
    const row = (await deps.db.query(`SELECT * FROM calls WHERE id = $1`, [callMatch[1]])).rows[0];
    if (!row) return send(res, 404, { error: 'not_found', authenticated: true, role: auth.role });
    const handoff = (await deps.db.query(`SELECT status FROM handoff_sessions WHERE call_id = $1`, [row.id])).rows[0];
    return send(res, 200, presentCall(row, handoff?.status));
  }
  const traceMatch = path.match(/^\/api\/calls\/([^/]+)\/traces$/);
  if (req.method === 'GET' && traceMatch) {
    const auth = await deskAuth(deps, req, res);
    if (!auth) return;
    const after = Number(url.searchParams.get('after_seq') || -1);
    const rows = (await deps.db.query(
      `SELECT seq, event_id, event_type, severity, ts, payload, prev_hash, record_hash
         FROM decision_traces WHERE call_id = $1 AND seq > $2 ORDER BY seq`,
      [traceMatch[1], after],
    )).rows;
    return send(res, 200, { traces: rows });
  }
  const transcriptMatch = path.match(/^\/api\/calls\/([^/]+)\/transcript$/);
  if (req.method === 'GET' && transcriptMatch) {
    const caller = bearer(req);
    const owned = caller ? await deps.redis.get(`caller:${caller}`) : null;
    const auth = owned && String(owned) === transcriptMatch[1] ? { role: 'caller' } : await authenticateDesk(req, deps.db, deps.config);
    if (!auth) return send(res, 401, { error: 'unauthenticated' });
    const after = Number(url.searchParams.get('after_seq') || -1);
    const rows = (await deps.db.query(
      `SELECT seq, speaker, leg, source, text_body, started_at
         FROM transcript_segments WHERE call_id = $1 AND seq > $2 ORDER BY seq`,
      [transcriptMatch[1], after],
    )).rows;
    return send(res, 200, { segments: rows });
  }
  if (req.method === 'POST' && path === '/api/admin/traces/replay') {
    const auth = await deskAuth(deps, req, res);
    if (!auth) return;
    const body = await readBody(req);
    const out = await replayTraces(deps, body.call_id);
    return send(res, out.status, out.body);
  }
  if (req.method === 'POST' && path === '/api/simulate/utterance') {
    if (!deps.config.simulatorEnabled) return send(res, 404, { error: 'not_found' });
    const body = await readBody(req);
    const call = (await deps.db.query(`SELECT * FROM calls WHERE id = $1`, [body.call_id])).rows[0];
    if (!call) return send(res, 404, { error: 'unknown_call' });
    if (call.phase === 'created' || call.phase === 'ringing') {
      await deps.db.query(`UPDATE calls SET phase = 'ai_active' WHERE id = $1`, [call.id]);
      await publishLive(deps.redis, `live:call:${call.id}`, 'call.phase', { call_id: String(call.id), phase: 'ai_active' });
    }
    if (body.text) {
      await appendSegment(deps.db, call.id, 'caller', body.text);
      const fresh = (await deps.db.query(`SELECT * FROM calls WHERE id = $1`, [call.id])).rows[0];
      await emitTrace(deps.db, deps.config, deps.metrics, deps.redis, {
        call: fresh, event_type: 'turn_user', severity: 'info', payload: { text: body.text },
      });
    }
    let tool = null;
    if (body.tool) {
      const out = await handleTool(deps, body.tool, { call_id: String(call.id), ...(body.args || {}) });
      tool = out.body;
      if (out.body?.say) {
        await appendSegment(deps.db, call.id, 'agent', out.body.say);
        const fresh = (await deps.db.query(`SELECT * FROM calls WHERE id = $1`, [call.id])).rows[0];
        await emitTrace(deps.db, deps.config, deps.metrics, deps.redis, {
          call: fresh, event_type: 'turn_agent', severity: 'info', payload: { text: out.body.say },
        });
      }
    }
    return send(res, 200, { ok: true, say: tool?.say || '', tool });
  }
  if (req.method === 'GET' && path === '/api/desk') {
    const auth = await deskAuth(deps, req, res);
    if (!auth) return;
    const row = (await deps.db.query(
      `SELECT staff_on_desk FROM clinic_settings WHERE clinic_id = $1`,
      [deps.config.clinicId],
    )).rows[0];
    return send(res, 200, { staff_on_desk: Boolean(row?.staff_on_desk) });
  }
  if (req.method === 'PATCH' && path === '/api/desk') {
    const auth = await deskAuth(deps, req, res);
    if (!auth) return;
    if (auth.role !== 'receptionist' && auth.role !== 'admin') return send(res, 403, { error: 'forbidden', role: auth.role });
    const body = await readBody(req);
    await deps.db.query(
      `UPDATE clinic_settings SET staff_on_desk = $2 WHERE clinic_id = $1`,
      [deps.config.clinicId, Boolean(body.staff_on_desk)],
    );
    await deps.redis.set('desk:open', body.staff_on_desk ? '1' : '0');
    await audit(deps.db, {
      clinic_id: deps.config.clinicId,
      actor_type: 'staff',
      actor_id: auth.staff_id,
      action: 'desk.switch',
      entity: 'clinic_settings',
      entity_id: deps.config.clinicId,
      details: { staff_on_desk: Boolean(body.staff_on_desk) },
    });
    return send(res, 200, { staff_on_desk: Boolean(body.staff_on_desk) });
  }

  if (path.startsWith('/api/')) {
    const auth = await authenticateDesk(req, deps.db, deps.config);
    if (!auth) return send(res, 401, { error: 'unauthenticated' });
    return send(res, 404, { error: 'not_found', authenticated: true, role: auth.role });
  }
  return send(res, 404, { error: 'not_found' });
}
