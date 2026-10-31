function hostnameOf(value) {
  if (!value) return '';
  try {
    const withScheme = value.includes('://') ? value : `http://${value}`;
    return new URL(withScheme).hostname.toLowerCase();
  } catch {
    return String(value).split(':')[0].toLowerCase();
  }
}

function normalizeIp(addr) {
  if (!addr) return '';
  const s = String(addr);
  if (s.startsWith('::ffff:')) return s.slice(7);
  return s;
}

function isLoopback(addr) {
  return addr === '127.0.0.1' || addr === '::1';
}

function isPrivate(addr) {
  if (isLoopback(addr)) return true;
  if (addr.startsWith('10.') || addr.startsWith('192.168.')) return true;
  const m = /^172\.(\d+)\./.exec(addr);
  return Boolean(m && Number(m[1]) >= 16 && Number(m[1]) <= 31);
}

export function isPublicPath(method, path, config) {
  if (method === 'GET' && path === '/healthz') return true;
  if (method === 'POST' && path.startsWith('/v1/tools/')) return true;
  if (method === 'POST' && (path === '/v1/bolna/webhook' || path === '/v1/bolna/pre-handoff')) return true;
  if (method === 'POST' && path === '/v1/payments/webhook' && config.adapters.has('payments')) return true;
  return false;
}

// Loopback (and, in compose, the private docker network) can call desk routes.
// A public tunnel host is limited to the tool and webhook paths.
export function classifyRequest(req, config) {
  const host = hostnameOf(req.headers?.host);
  const pub = hostnameOf(config.publicBaseUrl);
  const tunnel = pub && pub !== '127.0.0.1' && pub !== 'localhost' && host === pub;
  const path = req.urlPath || '/';
  const method = req.method || 'GET';
  if (tunnel) return isPublicPath(method, path, config) ? 'public' : 'deny';
  const peer = normalizeIp(req.socket?.remoteAddress);
  if (isLoopback(peer)) return 'local';
  if (config.trustPrivatePeers && isPrivate(peer)) return 'local';
  return 'deny';
}
