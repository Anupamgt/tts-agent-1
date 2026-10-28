'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8001;
const HOST = '0.0.0.0';
const ROOT = path.join(__dirname, 'public');
const API = process.env.BOLNAI_API || 'http://127.0.0.1:8000';

function proxy(req, res) {
  const target = new URL(req.url, API);
  const headers = Object.assign({}, req.headers);
  headers.host = target.host;
  const upstream = http.request({
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port,
    path: target.pathname + target.search,
    method: req.method,
    headers: headers
  }, (up) => {
    res.writeHead(up.statusCode || 502, up.headers);
    up.pipe(res);
  });
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('The clinic API is not running.');
  });
  req.pipe(upstream);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function safeFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const rel = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const file = path.normalize(path.join(ROOT, rel));
  const fromRoot = path.relative(ROOT, file);
  if (fromRoot.startsWith('..') || path.isAbsolute(fromRoot)) return null;
  return file;
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';
  if (url.startsWith('/api') || url.startsWith('/v1') || url.startsWith('/healthz') || url.startsWith('/metrics')) {
    proxy(req, res);
    return;
  }
  const file = safeFile(req.url || '/');
  if (!file) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }
  fs.stat(file, (err, stat) => {
    let target = file;
    if (err || !stat.isFile()) {
      if (!path.extname(file)) target = path.join(ROOT, 'index.html');
      else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
    }
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(target).pipe(res);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port ' + PORT + ' is already in use.');
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('Bolnai console at http://localhost:' + PORT);
});
