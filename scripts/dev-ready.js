import http from 'http';

// Prefer E2E_PORT so Playwright and manual readiness share a single port, then PORT, then 3000
const port = Number(process.env.E2E_PORT || process.env.PORT || 3000);
const deadline = Date.now() + (Number(process.env.READINESS_TIMEOUT_MS) || 120_000);

function ping() {
  return new Promise((resolve) => {
    const req = http.get({ host: 'localhost', port, path: '/index.html', timeout: 3000 }, res => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

(async () => {
  process.stdout.write(`Waiting for http://localhost:${port} ...`);
  while (Date.now() < deadline) {
    if (await ping()) {
      console.log(`\nREADY on port ${port}`);
      process.exit(0);
    }
    await new Promise(r => setTimeout(r, 500));
    process.stdout.write('.');
  }
  console.error(`\nTimed out waiting for http://localhost:${port}`);
  process.exit(1);
})();
