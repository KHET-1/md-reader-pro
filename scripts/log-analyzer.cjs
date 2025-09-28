/* Log analyzer: summarizes server logs to help course-correct common issues.
   Usage:
     npm run logs:analyze
     node scripts/log-analyzer.cjs --file logs/dev-server-2025-....log
*/

const fs = require('fs');
const path = require('path');

function latestServerLog() {
  const dir = path.resolve(__dirname, '..', 'logs');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.startsWith('dev-server-') && f.endsWith('.log'));
  if (files.length === 0) return null;
  files.sort();
  return path.join(dir, files[files.length - 1]);
}

function analyze(content) {
  const lines = content.split(/\r?\n/);
  let addrInUse = 0;
  let cannotGet = 0;
  let cspNone = 0;
  let compiledOk = 0;
  let runningAt = 0;
  let readyEvents = 0;

  for (const l of lines) {
    if (/EADDRINUSE|address already in use/i.test(l)) addrInUse++;
    if (/Cannot GET \/(index\.html)?$/i.test(l)) cannotGet++;
    if (/Content-Security-Policy: default-src 'none'/i.test(l)) cspNone++;
    if (/compiled successfully/i.test(l)) compiledOk++;
    if (/Project is running at:/i.test(l) || /Loopback:/i.test(l)) runningAt++;
    if (/READY on port/i.test(l)) readyEvents++;
  }

  return { addrInUse, cannotGet, cspNone, compiledOk, runningAt, readyEvents };
}

function recommend(stats) {
  const rec = [];
  if (stats.addrInUse > 0) {
    rec.push('- Port conflicts detected (EADDRINUSE). Use the orchestrator (dev:orchestrate) to auto-bump ports or set a free PORT/E2E_PORT.');
  }
  if (stats.cannotGet > 0) {
    rec.push('- Repeated "Cannot GET /". Verify historyApiFallback=true (already set), and ensure you request text/html (browser will). For scripts that probe, set Accept: text/html or hit /index.html.');
  }
  if (stats.runningAt === 0) {
    rec.push('- Dev server did not advertise its listening address. Check webpack-dev-server startup or logs for fatal errors.');
  }
  if (stats.compiledOk === 0) {
    rec.push('- No successful compile events seen. Fix build errors to allow serving index.');
  }
  if (stats.readyEvents === 0) {
    rec.push('- Orchestrator never reached READY. Use dev-ready.js or start with dev:orchestrate to block until ready.');
  }
  if (rec.length === 0) rec.push('- No issues detected.');
  return rec;
}

function main() {
  const argFileIdx = process.argv.indexOf('--file');
  const file = argFileIdx > -1 ? process.argv[argFileIdx + 1] : latestServerLog();
  if (!file) {
    console.log('No server logs found in ./logs. Run dev:orchestrate to generate logs.');
    process.exit(0);
  }
  const content = fs.readFileSync(file, 'utf8');
  const stats = analyze(content);
  console.log('Analyzed log:', file);
  console.log('Summary:', stats);
  console.log('Recommendations:');
  for (const r of recommend(stats)) console.log(r);
}

main();
