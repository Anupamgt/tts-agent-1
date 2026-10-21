'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8001;
const HOST = '0.0.0.0';
const ROOT = path.join(__dirname, 'public');

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
