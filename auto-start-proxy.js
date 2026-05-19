const http = require('http');
const { execSync, spawn } = require('child_process');

const PORT = 3000;
const BACKEND = 'http://127.0.0.1:3001';
let nextProcess = null;
let starting = false;

function startNext() {
  if (nextProcess || starting) return;
  starting = true;
  console.log('[Proxy] Starting Next.js on port 3001...');
  nextProcess = spawn('npx', ['next', 'start', '-p', '3001'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, DATABASE_URL: 'file:/home/z/my-project/prisma/dev.db', PORT: '3001' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  nextProcess.on('exit', () => { nextProcess = null; starting = false; console.log('[Proxy] Next.js exited'); });
  nextProcess.stdout.on('data', d => console.log('[Next]', d.toString().trim()));
  nextProcess.stderr.on('data', d => console.log('[Next]', d.toString().trim()));
  setTimeout(() => { starting = false; }, 5000);
}

const proxy = http.createServer((req, res) => {
  startNext();
  if (!nextProcess) {
    res.writeHead(502, { 'Content-Type': 'text/html' });
    res.end('<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f0fdf4"><div style="text-align:center"><div style="font-size:48px;animation:pulse 1s infinite">💊</div><h2 style="color:#065f46;margin-top:16px">Starting uPharma...</h2><p style="color:#6b7280">Please wait a moment, refreshing...</p><script>setTimeout(()=>location.reload(),2000)</script></div></body></html>');
    return;
  }
  const url = new URL(req.url, BACKEND);
  const lib = url.protocol === 'https:' ? require('https') : require('http');
  const options = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method: req.method, headers: { ...req.headers, host: url.host } };
  const proxyReq = lib.request(options, proxyRes => { res.writeHead(proxyRes.statusCode, proxyRes.headers); proxyRes.pipe(res); });
  proxyReq.on('error', () => { res.writeHead(502); res.end('Backend starting...'); });
  req.pipe(proxyReq);
});

proxy.listen(PORT, '0.0.0.0', () => console.log(`[Proxy] Listening on port ${PORT}`));
