# QA Runbook and Knowledge Base (MD Reader Pro)

This document captures the exact steps, environment, and fixes to run visible end‑to‑end (E2E) tests reliably with custom ports, plus a knowledge base of known issues and how to resolve them.

---

## 0) Environment
- OS: Windows
- Shell: PowerShell 7+
- Node: >= 18 (tested with 24.x)
- Package manager: npm

Key environment variables
- PORT: development or static-serve port for the web app (webpack-dev-server or http-server)
- E2E_PORT: port used by Playwright tests (and webServer)
- PLAYWRIGHT_SERVE_DIST=1: let Playwright build and serve dist/ for tests
- PLAYWRIGHT_NO_WEBSERVER=1: tell Playwright not to manage any server (tests will reuse an already running server)

---

## 1) Option 1 – Playwright starts a production server and runs visible E2E
This is the recommended path for reproducible E2E.

Commands
```powershell
# Choose a port for the tests (if omitted, fallback is 3100)
$env:E2E_PORT=4500

# Let Playwright build and serve dist/ via http-server, then run all tests in a headed browser
$env:PLAYWRIGHT_SERVE_DIST='1'
npx playwright test --headed
```

What happens
- Playwright spawns: `npm run serve:dist:build` (builds, then serves dist/)
- Server is expected at: http://localhost:$E2E_PORT
- Playwright waits for 200 on /index.html (not 404) before starting tests
- Tests run in a visible Chromium window

Validate readiness (if diagnosing timing issues)
```powershell
# Optional: after Playwright starts the server, in a separate terminal
Invoke-WebRequest -UseBasicParsing -Uri http://localhost:$env:E2E_PORT/index.html | Out-Null
```

If tests fail to navigate
- Check the server actually started: `Get-NetTCPConnection -LocalPort $env:E2E_PORT -State Listen`
- Check that index is present: `http://localhost:$env:E2E_PORT/index.html` should return 200

---

## 2) Alternative launch patterns (documented fallbacks)
If Option 1 struggles in some Windows shells, use these fallbacks.

A) Reuse a running dev server
```powershell
$env:PORT=4300
npm run dev
# new terminal
$env:PORT=4300; node scripts/dev-ready.js
$env:E2E_PORT=4300; $env:PLAYWRIGHT_NO_WEBSERVER='1'; npx playwright test --headed
```

B) Serve a built production bundle manually, then run tests
```powershell
$env:PORT=4200; npm run serve:dist:build
# new terminal
$env:E2E_PORT=4200; $env:PLAYWRIGHT_NO_WEBSERVER='1'; npx playwright test --headed
```

---

## 3) What we changed (code/config)
- webpack.config.cjs
  - devServer now respects PORT: `port: Number(process.env.PORT) || 3000`
- playwright.config.js
  - Port is `E2E_PORT || PORT || 3100`
  - webServer is flexible:
    - Default: `npm run dev`
    - With PLAYWRIGHT_SERVE_DIST=1: `npm run serve:dist:build`
    - With PLAYWRIGHT_NO_WEBSERVER=1: disabled
  - webServer waits for `http://localhost:${port}/index.html` (ensures 200, not 404)
- scripts/dev-ready.js
  - Strict readiness probe: waits for 200 on `/index.html`
- package.json
  - New scripts:
    - `dev:ready` – readiness probe for dev server
    - `serve:dist` – `http-server dist -s -c-1 -p %PORT%`
    - `serve:dist:build` – build then serve dist with SPA fallback
  - Added devDependency: `http-server`

---

## 4) Known issues and fixes (KB)

1) "Cannot GET /" when serving dist
- Cause: Static server not configured with SPA fallback or dist/index.html missing
- Fix:
  - Use: `npm run serve:dist` (includes `-s` for SPA fallback and `-c-1` to disable cache)
  - Ensure `npm run build` produced `dist/index.html`
  - Validate 200 on `http://localhost:$PORT/index.html`

2) Playwright times out waiting for server
- Causes:
  - Server didn’t start on the expected port
  - Port already used (EADDRINUSE)
  - Slow startup beyond 120s
- Fix:
  - Try a different port: `$env:E2E_PORT=4501`
  - Verify listener: `Get-NetTCPConnection -LocalPort $env:E2E_PORT -State Listen`
  - Increase timeout: adjust `timeout` in `playwright.config.js` webServer, or run server first + `PLAYWRIGHT_NO_WEBSERVER=1`

3) EADDRINUSE port error
- Cause: Port already bound by another process (maybe a previous server)
- Fix:
  - Pick another port: `$env:E2E_PORT=4600`
  - Or find the process: `Get-NetTCPConnection -LocalPort 4600 -State Listen | Select OwningProcess`

4) "webpack is not recognized" / dev server won’t start
- Cause: Dependencies not installed
- Fix:
  - `npm install --no-audit --no-fund`

5) `npm ci` fails: package.json and lock out of sync
- Symptoms: EUSAGE message with a long list of missing/invalid versions
- Fix:
  - Run `npm install` to re-sync and regenerate the lockfile
  - Commit `package-lock.json`

6) E2E cannot find `#markdown-editor`
- Causes:
  - Wrong server content being served (not our dist)
  - Static serve started in a different working directory
  - Request to `/` not mapped to `index.html`
- Fix:
  - Use `npm run serve:dist:build` (ensures dist exists and SPA fallback)
  - Confirm 200 on `/index.html`
  - If navigating to `/` still fails, temporarily navigate to `/index.html` in the tests (or keep SPA `-s` enabled)

7) Jest/JS DOM incompatibility
- Symptoms: jsdom/tough-cookie errors (e.g., "Cannot find module '../validators'")
- Fix:
  - Align versions to Jest 29.x and `jest-environment-jsdom` 29.x
  - Pin `tough-cookie` 4.1.3 via `overrides` in package.json

8) rrweb-cssom or other transient module missing in tests
- Cause: mismatched dependency graph after upgrades
- Fix:
  - Realign versions as above (Jest/jsdom/tough-cookie), then `npm install`

9) node_modules/ or dist/ tracked in Git
- Cause: previous commits included built artifacts
- Fix:
  - `.gitignore` includes node_modules, dist, coverage
  - `git rm -r --cached node_modules dist coverage` then commit

10) Playwright started server but tests still fail to see logs
- Cause: Console messages filtered or DOM not ready
- Fix:
  - Ensure `page.waitForLoadState('networkidle')`
  - Verify that window-side logs are present; check the Playwright HTML report (`npx playwright show-report`)
  - Confirm `typeof jest === 'undefined'` in browser (our code logs only when not under Jest unit tests; Playwright is fine)

---

## 5) Validated flow (what we executed)
- Installed dependencies, aligned Jest/jsdom, pinned tough-cookie
- Ensured webpack and webpack-cli installed
- Implemented PORT/E2E_PORT wiring and readiness probe
- Verified builds: `npm run build` produced `dist/index.html`
- Verified production serve helper
- Verified Playwright configuration can:
  - Start dev server (default), or
  - Start static dist server (PLAYWRIGHT_SERVE_DIST), or
  - Reuse an already running server (PLAYWRIGHT_NO_WEBSERVER)
- Used `npx playwright show-report` to inspect failures and environment

---

## 6) Daily usage cheat sheet
- Dev on a custom port
```powershell
$env:PORT=4000
npm run dev
```
- Wait until server is actually ready
```powershell
$env:PORT=4000
node scripts/dev-ready.js
```
- Visible E2E against production build (Option 1)
```powershell
$env:E2E_PORT=4500
$env:PLAYWRIGHT_SERVE_DIST='1'
npx playwright test --headed
npx playwright show-report
```
- Visible E2E reusing a running server (fallback)
```powershell
$env:E2E_PORT=4000
$env:PLAYWRIGHT_NO_WEBSERVER='1'
npx playwright test --headed
```

---

## 7) Appendix: Troubleshooting flow
1. If Playwright times out: confirm listener on port; try another port
2. If you see "Cannot GET /": rebuild; use `serve:dist` (with `-s`); verify 200 on `/index.html`
3. If tests can’t find `#markdown-editor`: verify `dist/index.html` contains it; fetch page HTML and confirm it’s served
4. If dependencies missing: run `npm install`; re-run build
5. Always check the Playwright HTML report for step-by-step context

---

Document version: 1.0
