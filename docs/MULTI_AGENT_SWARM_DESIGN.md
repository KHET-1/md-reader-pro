# Multi-Agent Swarming: Parallel Tools, Knowledge Share, Batches, Diamond Hands

**Design for parallel agent execution with shared tool use, cross-agent knowledge sharing, batched work, and persistent execution.**

---

## 1. Parallel Swarming

- **Multiple agents run at once** on disjoint or overlapping tasks (e.g. explore, shell, generalPurpose, Organizer1).
- **Orchestrator** (or you) fans out work; agents do not wait on each other unless a step explicitly depends on another.
- **Concurrency cap** (e.g. max 4 agents at a time) to avoid overload; queue the rest.
- **Per-agent scope**: each agent gets a clear mission + optional shared context (files, summaries, constraints).

**Invocation pattern (conceptual):**
```text
Launch N agents in parallel with different subagent_type + prompt;
each has access to tools; no shared memory yet—see Knowledge Share.
```

---

## 2. Tool Rampage (Maximal Tool Use)

- **Rampage** = agents are encouraged to use tools aggressively and in sequence when needed (search, read, grep, run, edit), not to answer from memory alone.
- **Tool budget / timeout** so a single agent doesn’t spin forever: max tool calls per agent or per phase, plus a global timeout.
- **Prioritized tool order**: read/search first, then edit/run when the agent has enough context.
- **Structured tool results** (e.g. summaries, file paths, exit codes) so other agents or the orchestrator can reuse them (feeds into Knowledge Share).

---

## 3. Knowledge Sharing Between the Group

- **Shared context store**: a single “swarm context” (in-memory or a small file/session store) that agents can read from and append to.
- **Append-only log**: each agent, after a phase or task, writes a short **handoff**: what they did, what they found, file paths, errors, next suggested steps.
- **Broadcast summaries**: orchestrator or a dedicated “scribe” agent periodically summarizes and pushes to the shared context so other agents see a digest instead of raw logs.
- **No direct agent-to-agent calls** required: sharing is via the central context. Agents run in parallel; they don’t block each other.
- **Format**: e.g. `{ "agent_id", "phase", "findings", "artifacts", "suggested_next" }` so that batch logic or a meta-agent can reason over it.

---

## 4. Batched Execution (Diamond Hands)

- **Batches** = groups of tasks (e.g. “batch 1: lint + tests”, “batch 2: build + deploy”, “batch 3: docs”).
- **Within a batch**: run as many steps in parallel as the concurrency cap allows; wait for the batch to complete (or timeout) before moving to the next batch.
- **Diamond hands**: once a batch is started, do not cancel mid-batch unless a hard failure (e.g. build broken). Persist until the batch is done or the timeout hits; then run the next batch.
- **Retries**: optional retry for failed steps (e.g. flaky tests) with a max retry count so the swarm doesn’t loop forever but still persists (diamond hands) for a defined horizon.
- **Outputs per batch**: success/fail, logs, and a short summary written into the shared knowledge store for the next batch or for human review.

---

## 5. End-to-End Flow (Sketch)

1. **Orchestrator** defines batches and, for each batch, a set of agent missions (e.g. “explore codebase”, “run tests”, “fix lint”).
2. **Launch** up to N agents in parallel for that batch; each agent has tools and can read/write the shared context (append-only + summaries).
3. **Tool rampage**: agents use tools freely within their budget; results are summarized and pushed to the shared context.
4. **Batch completion**: when all agents in the batch finish or timeout, collect outputs, write a batch summary, then proceed to the next batch (diamond hands: no early abort of the batch unless critical failure).
5. **Next batch** can use the shared knowledge (e.g. “tests failed in file X”) so later agents or batches are aware of prior results.

---

## 6. Practical Checklist for This Repo

- [x] **Orchestrator script**: `npm run swarm` runs `scripts/swarm-orchestrator.js`; batches defined in `scripts/swarm-batches.json`.
- [x] **Shared context**: `swarm-context.json` at repo root (handoffs + batch results) and `docs/swarm-log.md` (append-only log). Agents: append handoffs via `node scripts/swarm-handoff.js <agent_id> <phase> --findings "..." --artifacts "path/a" "path/b" --next "..."` or pipe JSON to stdin.
- [x] **Batch definitions**: `scripts/swarm-batches.json` — batch 1 = lint + test (parallel), batch 2 = build + e2e, batch 3 = deploy prep.
- [x] **Tool budget and timeout**: orchestrator uses 120s per npm step; batch timeout 300000ms in config.
- [x] **Diamond hands**: orchestrator runs each batch to completion or timeout; optional `stopOnCritical: true` to exit on first critical failure.
- [x] **E2E smoke**: `npm run test:e2e:smoke` runs `tests/e2e/smoke-e2e.spec.cjs` (4 tests) for fast feedback. Full suite: `npm run test:e2e`.
- [x] **Healing**: Jest uses `testRegex` only (no `testMatch`) for paths with brackets; orchestrator uses `shell: true` on Windows for spawn; app exposes `#find-btn`, `#export-btn`, `#word-count` / `#reading-time` / `#line-count` for E2E.

---

## 7. Diamond Hands Summary

- **Parallel**: many agents at once.
- **Tools**: used aggressively (rampage), with limits.
- **Knowledge share**: central, append-only context + summaries.
- **Batches**: grouped steps; within a batch, parallel; between batches, sequential with clear handoffs.
- **Diamond hands**: no early bail on a batch; persist until batch end or timeout, then move on or retry by policy.

This gives you multi-agent swarming in parallel with tools, shared knowledge, and batched, persistent execution.
