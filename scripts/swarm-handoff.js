#!/usr/bin/env node
/**
 * Append a handoff to swarm-context.json. Usage:
 *   node scripts/swarm-handoff.js <agent_id> <phase> --findings "one" "two" --artifacts "path/a" --next "do X"
 * Or pipe JSON to stdin: echo '{"agent_id":"explore","phase":"1","findings":["a"]}' | node scripts/swarm-handoff.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTEXT_PATH = join(ROOT, 'swarm-context.json');

function load() {
  try {
    return JSON.parse(readFileSync(CONTEXT_PATH, 'utf8'));
  } catch {
    return { version: 1, handoffs: [], batches: [], lastUpdated: '' };
  }
}

function save(ctx) {
  ctx.lastUpdated = new Date().toISOString();
  writeFileSync(CONTEXT_PATH, JSON.stringify(ctx, null, 2), 'utf8');
}

async function main() {
  const ctx = load();
  ctx.handoffs = ctx.handoffs || [];

  let handoff;
  if (process.stdin.isTTY || process.argv[2] !== undefined) {
    const agentId = process.argv[2] || 'unknown';
    const phase = process.argv[3] || 'run';
    const findings = [];
    const artifacts = [];
    const next = [];
    for (let i = 4; i < process.argv.length; i++) {
      if (process.argv[i] === '--findings') {
        while (process.argv[++i] && !process.argv[i].startsWith('--')) findings.push(process.argv[i]);
        i--;
      } else if (process.argv[i] === '--artifacts') {
        while (process.argv[++i] && !process.argv[i].startsWith('--')) artifacts.push(process.argv[i]);
        i--;
      } else if (process.argv[i] === '--next') {
        while (process.argv[++i] && !process.argv[i].startsWith('--')) next.push(process.argv[i]);
        i--;
      }
    }
    handoff = { agent_id: agentId, phase, findings, artifacts, suggested_next: next, timestamp: new Date().toISOString() };
  } else {
    const raw = await readFile(process.stdin.fd, 'utf8');
    try {
      handoff = { ...JSON.parse(raw), timestamp: new Date().toISOString() };
    } catch (parseErr) {
      console.error('Invalid piped JSON:', parseErr.message);
      console.error(parseErr);
      process.exit(1);
    }
  }

  ctx.handoffs.push(handoff);
  save(ctx);
  console.log('Handoff appended:', handoff.agent_id, handoff.phase);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
