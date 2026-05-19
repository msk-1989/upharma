const { spawn } = require('child_process');
const http = require('http');
const net = require('net');

const PORT = 3000;
let backendPort = 3001;
let server;

function startBackend() {
  const child = spawn('npx', ['next', 'start', '-H', '0.0.0.0', '-p', String(backendPort)], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(backendPort) }
  });
  
  child.stdout.on('data', d => process.stderr.write(d));
  child.stderr.on('data', d => process.stderr.write(d));
  
  child.on('exit', () => {
    console.log('[proxy] Backend died, restarting...');
    backendPort = backendPort === 3001 ? 3002 : 3001;
    setTimeout(startBackend, 1000);
  });
  
  return child;
}

function startProxy() {
  server = http.createServer((req, res) => {
    const proxy = http.request({
      hostname: '127.0.0.1',
      port: backendPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxy.on('error', () => {
      res.writeHead(502);
      res.end('Backend starting...');
    });
    
    req.pipe(proxy);
  });
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[proxy] Listening on ${PORT}, proxying to ${backendPort}`);
  });
}

startBackend();
startProxy();
