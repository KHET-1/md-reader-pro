#!/usr/bin/env node
/**
 * Swarm orchestrator: run batches (lint, test, build, deploy prep) with shared context.
 * Diamond hands: complete each batch or timeout; append results to swarm-context.json and docs/swarm-log.md.
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTEXT_PATH = join(ROOT, 'swarm-context.json');
const BATCHES_PATH = join(ROOT, 'scripts', 'swarm-batches.json');
const LOG_PATH = join(ROOT, 'docs', 'swarm-log.md');

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    return null;
  }
}

function saveJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

function appendLog(line) {
  try {
    mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, line + '\n', 'utf8');
  } catch (_) {}
}

const isWin = process.platform === 'win32';
// On Windows, spawn with cwd containing brackets (e.g. [[[ Nexus ]]]) can yield EINVAL; use shell so the path is handled by cmd.
function runNpm(scriptName, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const env = { ...process.env };
    env.NODE_OPTIONS = [env.NODE_OPTIONS, '--no-deprecation'].filter(Boolean).join(' ');
    env.FORCE_COLOR = '';
    env.NO_COLOR = '';
    const child = isWin
      ? spawn(`npm run ${scriptName}`, [], {
          cwd: ROOT,
          shell: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          env
        })
      : spawn('npm', ['run', scriptName], {
          cwd: ROOT,
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          env
        });
    let out = '';
    let err = '';
    child.stdout?.on('data', (d) => { out += d.toString(); });
    child.stderr?.on('data', (d) => { err += d.toString(); });
    const t = setTimeout(() => {
      const done = () => resolve({ ok: false, stdout: out, stderr: err, timedOut: true });
      if (isWin && child.pid) {
        const killProc = spawn('taskkill', ['/T', '/F', '/PID', String(child.pid)], {
          stdio: 'ignore',
          windowsHide: true
        });
        killProc.on('close', done);
        killProc.on('error', () => {
          try { child.kill('SIGKILL'); } catch (_) {}
          done();
        });
      } else {
        try { child.kill('SIGTERM'); } catch (_) {}
        done();
      }
    }, timeoutMs);
    child.on('close', (code) => {
      clearTimeout(t);
      resolve({ ok: code === 0, code, stdout: out, stderr: err });
    });
  });
}

async function runBatch(batch, npmScripts) {
  const results = [];
  const steps = batch.steps || [];
  const runParallel = batch.parallel === true;

  if (runParallel) {
    const promises = steps.map(async (step) => {
      const name = npmScripts[step.script] || step.script || step.id;
      const r = await runNpm(name);
      return { step: step.id, ...r };
    });
    const out = await Promise.all(promises);
    results.push(...out);
  } else {
    for (const step of steps) {
      const name = npmScripts[step.script] || step.script || step.id;
      const r = await runNpm(name);
      results.push({ step: step.id, ...r });
      if (step.critical && !r.ok) break;
    }
  }

  return results;
}

async function main() {
  const batchesConfig = loadJson(BATCHES_PATH);
  if (!batchesConfig?.batches?.length) {
    console.error('No batches in scripts/swarm-batches.json');
    process.exit(1);
  }

  let ctx = loadJson(CONTEXT_PATH) || { version: 1, batches: [], handoffs: [], lastUpdated: '' };
  ctx.lastUpdated = new Date().toISOString();

  for (const batch of batchesConfig.batches) {
    const batchStart = new Date().toISOString();
    appendLog(`[${batchStart}] Batch start: ${batch.id} (${batch.name})`);
    console.log(`\n▶ Batch: ${batch.id} (${batch.name})`);

    const results = await runBatch(batch, batchesConfig.npmScripts || {});
    const failed = results.filter((r) => !r.ok);
    const summary = {
      batchId: batch.id,
      name: batch.name,
      started: batchStart,
      finished: new Date().toISOString(),
      steps: results.map((r) => ({ step: r.step, ok: r.ok, timedOut: r.timedOut || false })),
      ok: failed.length === 0
    };

    ctx.batches = ctx.batches || [];
    ctx.batches.push(summary);
    saveJson(CONTEXT_PATH, ctx);

    const logLine = `[${summary.finished}] Batch ${batch.id} ${summary.ok ? 'OK' : 'FAIL'} steps=${results.map((r) => r.step + (r.ok ? '✓' : '✗')).join(', ')}`;
    appendLog(logLine);
    console.log(logLine);

    if (failed.length && batchesConfig.stopOnCritical === true) {
      const criticalFailed = results.some((r) => !r.ok && batch.steps.find((s) => s.id === r.step)?.critical);
      if (criticalFailed) {
        appendLog(`[${new Date().toISOString()}] Stopping: critical step failed in ${batch.id}`);
        process.exit(1);
      }
    }
  }

  appendLog(`[${new Date().toISOString()}] Swarm run complete`);
  console.log('\n✅ Swarm run complete. Context:', CONTEXT_PATH);
}

main().catch((e) => {
  console.error(e);
  appendLog(`[${new Date().toISOString()}] Error: ${e.message}`);
  process.exit(1);
});
