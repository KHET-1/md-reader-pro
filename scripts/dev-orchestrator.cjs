/* Orchestrated dev start: spawns webpack-dev-server, waits for readiness, retries on EADDRINUSE.
   Usage (PowerShell):
     $env:PORT=3100; node scripts/dev-orchestrator.cjs
     $env:PORT=3100; $env:DEV_OPEN=1; node scripts/dev-orchestrator.cjs
     node scripts/dev-orchestrator.cjs --exit-on-ready   # start, wait, then exit cleanly
*/

const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const MAX_RETRIES = Number(process.env.PORT_RETRY_LIMIT || 5);
const READINESS_TIMEOUT_MS = Number(process.env.READINESS_TIMEOUT_MS || 120_000);
const EXIT_ON_READY = process.argv.includes('--exit-on-ready');

// Prefer explicit PORT, then E2E_PORT, then 3000 for dev runs
function getInitialPort() {
  const envPort = Number(process.env.PORT || process.env.E2E_PORT || 3000);
  return Number.isFinite(envPort) && envPort > 0 ? envPort : 3000;
}

function now() {
  return new Date().toISOString();
}

function ensureLogsDir() {
  const logsDir = path.resolve(__dirname, '..', 'logs');
  try { if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir); } catch (_) {}
  return logsDir;
}

function makeLogStream(prefix) {
  const dir = ensureLogsDir();
  const filename = `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
  const full = path.join(dir, filename);
  const stream = fs.createWriteStream(full, { flags: 'a' });
  return { stream, path: full };
}

function ping(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: 'localhost', port, path: '/index.html', timeout: 3000, headers: { 'Accept': 'text/html' } }, res => {
      // Consider ready only when index.html is servable (200..399)
      resolve(res.statusCode && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function waitForReady(port, deadline, statusLog) {
  process.stdout.write(`Waiting for http://localhost:${port} to serve index.html ...`);
  while (Date.now() < deadline) {
    const ok = await ping(port);
    if (ok) {
      console.log(`\nREADY on port ${port}`);
      if (statusLog) statusLog(`READY on port ${port}`);
      return true;
    }
    await new Promise(r => setTimeout(r, 500));
    process.stdout.write('.');
  }
  console.error(`\nTimed out waiting for http://localhost:${port}`);
  if (statusLog) statusLog(`TIMEOUT waiting on ${port}`);
  return false;
}

function openBrowser(url) {
  // Windows-friendly open using cmd
  const isWin = process.platform === 'win32';
  if (isWin) {
    spawn('cmd.exe', ['/c', 'start', '', url], { stdio: 'ignore', detached: true });
  } else {
    spawn('xdg-open', [url], { stdio: 'ignore', detached: true });
  }
}

async function main() {
  let port = getInitialPort();
  let tries = 0;
  const { stream: serverLog, path: serverLogPath } = makeLogStream('dev-server');
  const status = (msg) => { try { serverLog.write(`[${now()}] ${msg}\n`); } catch (_) {} };

  console.log(`[orchestrator] Logging server output to: ${serverLogPath}`);
  status('ORCHESTRATOR_START');

  let child = null;

  async function startServer() {
    status(`SPAWN port=${port}`);
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'npm.cmd' : 'npm';
    const args = ['run', 'dev:server'];
    child = spawn(cmd, args, {
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    child.stdout.on('data', (buf) => {
      const s = buf.toString();
      process.stdout.write(s);
      try { serverLog.write(s); } catch (_) {}
      if (s.includes('EADDRINUSE') || s.includes('address already in use')) {
        status(`EADDRINUSE on ${port}`);
      }
    });
    child.stderr.on('data', (buf) => {
      const s = buf.toString();
      process.stderr.write(s);
      try { serverLog.write(s); } catch (_) {}
      if (s.includes('EADDRINUSE') || s.includes('address already in use')) {
        status(`EADDRINUSE on ${port}`);
      }
    });

    child.on('exit', (code, signal) => {
      status(`SERVER_EXIT code=${code} signal=${signal}`);
    });
  }

  function stopServer() {
    if (child && !child.killed) {
      try { child.kill('SIGTERM'); } catch (_) {}
    }
  }

  // Attempt start with retries on EADDRINUSE
  while (tries <= MAX_RETRIES) {
    await startServer();

    const deadline = Date.now() + READINESS_TIMEOUT_MS;
    const ok = await waitForReady(port, deadline, status);

    if (!ok) {
      // Did we see EADDRINUSE in logs? If so, bump port and retry.
      const logContent = fs.readFileSync(serverLogPath, 'utf8');
      const hadAddrInUse = logContent.includes('EADDRINUSE') || logContent.includes('address already in use');
      stopServer();
      if (hadAddrInUse) {
        tries += 1;
        port += 1;
        status(`RETRY on port ${port}`);
        await new Promise(r => setTimeout(r, 500));
        continue;
      } else {
        status('GIVE_UP_TIMEOUT');
        process.exitCode = 1;
        stopServer();
        return;
      }
    }

    // Ready
    if (process.env.DEV_OPEN === '1') {
      const url = `http://localhost:${port}`;
      status(`OPEN_BROWSER ${url}`);
      openBrowser(url);
    }

    // Emit current port artifact for other tools
    try {
      const artifact = path.resolve(__dirname, '..', 'logs', 'current-port.json');
      fs.writeFileSync(artifact, JSON.stringify({ port, url: `http://localhost:${port}`, ts: now() }, null, 2));
      status(`WRITE_ARTIFACT ${artifact}`);
    } catch (_) {}

    if (EXIT_ON_READY) {
      stopServer();
      status('EXIT_ON_READY');
      console.log('[orchestrator] Exit on ready requested; shutting down dev server.');
      return;
    }

    // Keep running
    process.on('SIGINT', () => { stopServer(); process.exit(0); });
    process.on('SIGTERM', () => { stopServer(); process.exit(0); });
    return; // leave server running
  }

  console.error(`[orchestrator] Exhausted retries (${MAX_RETRIES}).`);
  status('EXHAUSTED_RETRIES');
  process.exit(1);
}

main().catch(err => {
  console.error('[orchestrator] Fatal error:', err);
  process.exit(1);
});
