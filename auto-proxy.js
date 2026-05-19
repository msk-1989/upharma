const http = require('http');
const { spawn, execSync } = require('child_process');

const LOADING_HTML = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta http-equiv="refresh" content="3">
<title>Upharma - Loading...</title>
<style>
body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;
font-family:system-ui,sans-serif;background:linear-gradient(135deg,#ecfdf5,#f0fdfa,#fff)}
.box{text-align:center;padding:3rem;border-radius:1rem;background:#fff;
box-shadow:0 8px 32px rgba(0,0,0,.08);max-width:420px}
.spin{width:56px;height:56px;border:5px solid #d1fae5;border-top-color:#059669;
border-radius:50%;animation:s .8s linear infinite;margin:0 auto 1.5rem}
@keyframes s{to{transform:rotate(360deg)}}
h2{color:#065f46;margin:0 0 .5rem;font-size:1.3rem}
p{color:#6b7280;font-size:.9rem;line-height:1.5}
</style></head><body><div class="box"><div class="spin"></div>
<h2>Starting Upharma...</h2>
<p>Server is starting up.<br>This page will auto-refresh in 3 seconds.</p>
</div></body></html>`;

const TARGET_PORT = 3001;
let backend = null;
let ready = false;

function startBackend() {
  if (backend) { try { backend.kill(); } catch(e){} }
  ready = false;
  console.log('[proxy] Starting Next.js on port ' + TARGET_PORT);
  backend = spawn('node', ['server.js', '-p', String(TARGET_PORT)], {
    cwd: '/home/z/my-project/.next/standalone',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(TARGET_PORT), NODE_OPTIONS: '--max-old-space-size=512' }
  });
  backend.on('exit', () => { backend = null; ready = false; console.log('[proxy] Next.js died, restarting...'); setTimeout(startBackend, 500); });
  backend.on('error', () => { backend = null; ready = false; setTimeout(startBackend, 1000); });
  
  const check = setInterval(() => {
    http.get('http://localhost:' + TARGET_PORT + '/', r => {
      if (r.statusCode >= 200 && r.statusCode < 500) { ready = true; clearInterval(check); console.log('[proxy] Next.js ready!'); }
    }).on('error', () => {});
  }, 200);
  setTimeout(() => clearInterval(check), 15000);
}

const server = http.createServer((req, res) => {
  if (ready) {
    const proxy = http.request('http://localhost:' + TARGET_PORT + req.url, {
      method: req.method, headers: req.headers
    }, pr => { res.writeHead(pr.statusCode, pr.headers); pr.pipe(res); });
    proxy.on('error', () => { ready = false; res.writeHead(502, {'Content-Type':'text/html'}); res.end(LOADING_HTML); });
    req.pipe(proxy);
  } else {
    res.writeHead(502, {'Content-Type':'text/html'});
    res.end(LOADING_HTML);
  }
});

server.listen(3000, '0.0.0.0', () => { console.log('[proxy] Listening on :3000'); startBackend(); });

// Keep-alive: check backend health every 5s
setInterval(() => {
  if (!backend || !ready) startBackend();
}, 5000);
