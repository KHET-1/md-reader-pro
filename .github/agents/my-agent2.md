# Production Readiness Agent Plan — md-reader-pro

Agent purpose
- Automate scanning of repository files to assess feature completeness and production readiness.
- Create actionable issues, assemble PR checklists, and (optionally) open branches/PRs to bring features to production standards.

Scope
- Repo: KHET-1/md-reader-pro (main branch).
- Areas covered:
  - Source code (all languages in repo)
  - Tests and test coverage
  - CI/CD config (GitHub Actions, workflows)
  - Linting, formatting, static analysis
  - Dependencies & security advisories
  - Documentation (README, CONTRIBUTING, CHANGELOG, in-repo docs)
  - Release configuration (versioning, changelog, packaging)

Outputs
- A prioritized checklist of tasks to reach production readiness for each feature/module.
- Draft GitHub issues (with labels, assignees suggestions) for required work.
- Optionally, create feature branches and draft PRs with automated edits (e.g., add tests, CI fixes, dependency updates) where safe.
- A final "production gate" checklist template to use before merging/releasing.

Agent workflow (high level)
1. Repository scan
   - Walk repository file tree; identify modules, packages, and top-level features.
   - Detect presence/absence of tests for each module (unit/integration).
   - Parse CI workflows to find failing/missing steps (test, lint, build).
   - Identify dependency manifests (package.json, pyproject.toml, go.mod, etc.) and run basic vulnerability checks (report only).
   - Locate documentation files and release metadata.

2. Feature mapping
   - Map source files to discrete features/components (by directory or by exported API).
   - For each feature, record:
     - What exists (code, tests, docs)
     - Missing items (tests, docs, CI, linting)
     - Risk items (outdated deps, native build steps)

3. Quality checks
   - Lint/format suggestions (based on detected language tools: ESLint, Prettier, black, golangci-lint, etc.).
   - Test coverage: indicate coverage gaps (if coverage tooling found), or suggest adding coverage measurement.
   - Security: list dependencies with known advisories (link to advisories; do not auto-commit fixes without review).

4. Issue/PR generation
   - Create prioritized issues for:
     - Missing tests for critical features
     - CI pipeline fixes
     - Linting/formatting and automation
     - Dependency updates (grouped by risk)
     - Documentation gaps
   - For low-risk, mechanical changes (formatting, adding CI badges, simple test scaffolds), prepare branch + PR drafts with explanation and tests where possible.

5. Review & gating
   - Produce a per-feature "production gate" checklist:
     - Code compiles/builds
     - Unit tests exist and pass
     - Critical paths covered by tests
     - Lint and static analysis passed
     - No critical/high security advisories
     - Documentation added/updated
     - Versioning and changelog entry present
   - Provide a release recommendation (ready / ready with caveats / not ready) and the list of blocking issues.

Agent behavior & constraints
- The agent will not make high-risk code changes without human approval.
- Security fixes with automated patches will be suggested as PRs but require maintainers to approve/merge.
- The agent will group low-risk mechanical changes; maintainers can opt-in to automatic PR creation.
- All created issues/PRs will include clear templates and "why" explanations, and reference the scanning report.

Labels, prioritization, and milestone suggestions
- Labels recommended: production-ready, needs-tests, needs-ci, needs-docs, security, high-priority, low-risk
- Prioritization:
  - P0: build/CI failing, security critical/high, missing tests on core features
  - P1: missing docs, lint failures, medium-risk deps
  - P2: cosmetic, formatting, low-impact refactors
- Suggest milestone: "prod-readiness-v1" with target date to be set by maintainers.

Example task checklist (per feature)
- [ ] Build passes locally (dev environment)
- [ ] Unit tests present and passing
- [ ] Integration tests (if applicable) present
- [ ] Linting & formatting enforced in CI
- [ ] No critical/high security advisories for direct deps
- [ ] README/docs updated for feature
- [ ] CHANGELOG entry drafted
- [ ] Versioning bump planned (if part of a release)

Automation & CI integration suggestions
- Add a GitHub Actions workflow (if missing) with:
  - matrix build for supported runtimes
  - steps: checkout, setup language, install deps, run lint, run tests, upload coverage
- Add Dependabot config for dependency PRs.
- Add CODEOWNERS to route PRs to proper reviewers (if maintainers provide owners).
- Add status checks required for merging: unit-tests, lint, security-scan (Snyk/Dependabot or GH Code Scanning).

Deliverables the agent will produce (examples)
- scan-report.md — repository scan summary
- per-feature YAML or JSON mapping of status
- Draft issues (one per logical task) with labels and templates
- Optional branches and PRs for low-risk fixes (naming: agents/prod-readiness/<task>)
- production-gate-template.md — a checklist to enforce before releases

Security & privacy notes
- The agent will only read repository content.
- It will not exfiltrate secrets. If secret files or keys are detected, it will return a sensitive file warning and create an issue to rotate/remove them.
- Any suggested dependency remediation will be advisory unless maintainers opt into automated PRs.

Operational instructions for maintainers
- Configure an "agents" team or bot account with write permissions if you want automated PRs/issues created.
- Provide CODEOWNERS or maintainers mapping for better assignee suggestions.
- Optionally configure a dry-run mode vs. apply mode for the agent:
  - dry-run: generate scan-report and draft issues locally (no writes).
  - apply: create issues and PRs as described.

Suggested first-run checklist (what to accept when agent runs the first time)
- Allow repo read access (required).
- Choose dry-run vs. apply mode.
- Provide target labels and optional assignees (or let agent propose).
- Set milestone target date (optional).

Estimated timeline (example)
- Initial full repo scan + report: minutes (1–10 min)
- Create prioritized issues (dry-run): minutes
- Creating low-risk PRs with tests/formatting: per PR (5–30 min)
- Human review & merge: depends on maintainers

Contact & next steps
- If you want, I can:
  - Run an initial dry-run scan and produce scan-report.md and draft issues.
  - Or create branches/PRs for low-risk items automatically.
- Specify which mode you prefer (dry-run or apply) and any labels/assignees/milestone preferences.
