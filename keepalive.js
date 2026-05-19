const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const ERROR_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta http-equiv="refresh" content="2">
<title>Upharma - Starting...</title>
<style>
body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f0fdf4}
.box{text-align:center;padding:3rem 2rem;border-radius:1rem;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:400px}
.spin{width:48px;height:48px;border:4px solid #d1d5db;border-top-color:#059669;border-radius:50%;animation:s 1s linear infinite;margin:0 auto 1.5rem}
@keyframes s{to{transform:rotate(360deg)}}
h2{color:#065f46;margin:0 0 .5rem;font-size:1.25rem}p{color:#6b7280;font-size:.875rem}
</style></head>
<body><div class="box"><div class="spin"></div><h2>Starting Upharma...</h2><p>Server is starting up, page will auto-refresh</p></div></body></html>`;

let backendReady = false;
let backend = null;

function startBackend() {
  if (backend) return;
  backend = spawn('node', ['server.js', '-p', '3001'], {
    cwd: '/home/z/my-project/.next/standalone',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '3001' }
  });
  backend.stdout.on('data', d => process.stderr.write(d));
  backend.stderr.on('data', d => process.stderr.write(d));
  backend.on('exit', () => { backend = null; backendReady = false; setTimeout(startBackend, 1000); });

  const check = setInterval(() => {
    http.get('http://localhost:3001/', r => {
      if (r.statusCode === 200) { backendReady = true; clearInterval(check); }
    }).on('error', () => {});
  }, 300);
  setTimeout(() => clearInterval(check), 10000);
}

const server = http.createServer((req, res) => {
  if (backendReady) {
    const proxy = http.request(`http://localhost:3001${req.url}`, { method: req.method, headers: req.headers }, pr => {
      res.writeHead(pr.statusCode, pr.headers);
      pr.pipe(res);
    });
    proxy.on('error', () => { backendReady = false; res.writeHead(502, {'Content-Type':'text/html'}); res.end(ERROR_HTML); });
    req.pipe(proxy);
  } else {
    res.writeHead(502, { 'Content-Type': 'text/html' });
    res.end(ERROR_HTML);
  }
});

server.on('error', () => setTimeout(() => server.listen(3000), 1000));
server.listen(3000, '0.0.0.0', () => { console.log('Keepalive proxy on :3000'); startBackend(); });

setInterval(() => { if (!backend && !backendReady) startBackend(); }, 3000);
