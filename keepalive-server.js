const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

const ERROR_PAGE = fs.readFileSync('/home/z/my-project/.next/standalone/public/502.html', 'utf8');
let nextReady = false;
let nextProc = null;

function startNext() {
  if (nextProc) return;
  console.log('[keepalive] Starting Next.js server...');
  nextProc = spawn('node', ['server.js', '-p', '3001'], {
    cwd: '/home/z/my-project/.next/standalone',
    stdio: 'ignore',
    env: { ...process.env, PORT: '3001' }
  });
  nextProc.on('exit', () => { nextProc = null; setTimeout(startNext, 2000); });
  
  // Check if Next.js is ready
  const check = setInterval(() => {
    http.get('http://localhost:3001/', (res) => {
      if (res.statusCode === 200) {
        nextReady = true;
        clearInterval(check);
        console.log('[keepalive] Next.js is ready on :3001');
      }
    }).on('error', () => {});
  }, 500);
  setTimeout(() => clearInterval(check), 15000);
}

// Main server on port 3000 - proxies to Next.js or shows error page
const server = http.createServer((req, res) => {
  if (nextReady) {
    // Proxy to Next.js on 3001
    const proxy = http.request('http://localhost:3001' + req.url, {
      method: req.method,
      headers: req.headers
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxy.on('error', () => {
      nextReady = false;
      res.writeHead(502, { 'Content-Type': 'text/html' });
      res.end(ERROR_PAGE);
    });
    req.pipe(proxy);
  } else {
    res.writeHead(502, { 'Content-Type': 'text/html' });
    res.end(ERROR_PAGE);
  }
});

server.listen(3000, () => {
  console.log('[keepalive] Proxy server listening on :3000');
  startNext();
});

// Health check - restart Next.js if it dies
setInterval(() => {
  if (!nextReady && !nextProc) startNext();
}, 5000);
