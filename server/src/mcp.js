import http from 'node:http';
import { CATALOG } from './tools/catalog.js';
import { safeEqualString } from './pins.js';

function send(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('bad json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

export function createMcpServer({ name, db, config }) {
  return http.createServer((req, res) => {
    const run = async () => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (req.method === 'GET' && url.pathname === '/healthz') {
        await db.query('SELECT 1 AS ok');
        return send(res, 200, { ok: true, service: name });
      }
      const match = url.pathname.match(/^\/tools\/([a-z0-9_]+)$/);
      if (req.method !== 'POST' || !match) return send(res, 404, { ok: false, error_code: 'unknown_tool' });
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
      if (!safeEqualString(token, config.internalToken)) return send(res, 401, { ok: false, error: 'unauthorized' });
      const spec = CATALOG[match[1]];
      if (!spec || spec.mcp !== name || !spec.run) return send(res, 404, { ok: false, error_code: 'unknown_tool' });
      const body = await readBody(req);
      if (body && typeof body === 'object') delete body.patient_id;
      const out = await spec.run(db, body, { config });
      return send(res, out.status, out.body);
    };
    run().catch((err) => {
      console.error(name, err.message);
      if (!res.headersSent) send(res, err.status || 500, { ok: false, error: 'error' });
    });
  });
}
