# E2E Test Suites

Playwright E2E tests for MD Reader Pro. All specs use the config in `playwright.config.js` (port from `E2E_PORT` or `PORT`, default **3100**).

## Suites

| Spec | Description | Tests |
|------|-------------|-------|
| **comprehensive-e2e.spec.cjs** | Full product coverage | 25 |
| **performance-e2e.spec.cjs** | Load, animation, memory, network, mobile | 9 |
| **production-coverage.spec.cjs** | Production code paths (DOM, console, file load) | 5 |
| **production-coverage-simple.spec.cjs** | Core production validation (minimal set) | 3 |
| **file-upload-verification.spec.cjs** | File upload without freeze / duplicate toasts | 2 |

**Total: 44 tests** (chromium).

### comprehensive-e2e.spec.cjs

- **Phase 1: Essential 2025** – Accessibility (skip link, ARIA), loading/toast, mobile, file validation, keyboard.
- **Phase 2: Animations** – Hover, transitions, touch, performance monitoring.
- **Phase 3: Editor & productivity** – Editor UI/stats, live analysis, find/replace, auto-complete, export, shortcuts, tab navigation.
- **Cross-Phase** – Full workflow, settings/color picker, command palette.
- **Performance** – Page load, animation, memory.
- **Error handling** – Empty content, large content, rapid interactions.

### performance-e2e.spec.cjs

Page load, animation/frame rate, memory/GC, large document, concurrent ops, mobile, network/caching, error recovery.

### production-coverage*.spec.cjs

Validates production-only behavior: global console commands, DOM error handling, file load logging, stability after DOM manipulation.

### file-upload-verification.spec.cjs

Ensures file upload does not freeze the UI and shows a single success notification (no duplicate toasts).

---

## How to run

From the **project root**:

```bash
# All E2E, headless (Playwright starts dev server on port 3100 by default)
npm run test:e2e

# Visible browser for local testing (watch tests run)
npm run test:e2e:headed
# or
npm run test:e2e:watch

# Specific suite
npx playwright test tests/e2e/comprehensive-e2e.spec.cjs
npx playwright test tests/e2e/performance-e2e.spec.cjs
npx playwright test tests/e2e/production-coverage-simple.spec.cjs
npx playwright test tests/e2e/file-upload-verification.spec.cjs

# With UI
npm run test:e2e:ui

# Against existing server (no auto-start)
PLAYWRIGHT_NO_WEBSERVER=1 npm run test:e2e
# Then set PORT=3100 (or E2E_PORT) when starting the app.
```

**Environment**

- `E2E_PORT` or `PORT` – port for the app (default `3100`).
- `PLAYWRIGHT_SERVE_DIST=1` – serve `dist/` with http-server instead of `npm run dev`. Use after `npm run build` for reliable smoke/Export (avoids dev-server cache).
- `PLAYWRIGHT_NO_WEBSERVER=1` – do not start a server; use an already-running app.

All specs use `page.goto('/')` so they follow the config `baseURL` and port.

---

## Troubleshooting

### "Executable doesn't exist" / chromium_headless_shell

Playwright needs browser binaries. Try in order:

1. **Install (or reinstall) browsers:**
   ```bash
   npx playwright install
   ```
   If it still fails, clear the cache and reinstall:
   ```bash
   rmdir /s /q "%LOCALAPPDATA%\ms-playwright" 2>nul
   npx playwright install
   ```

2. **Use system Chrome on Windows** (if the headless shell binary is missing):
   ```bash
   set PLAYWRIGHT_USE_CHROME=1
   npm run test:e2e
   ```
   This uses your installed Chrome instead of Playwright’s Chromium headless shell.

### Port in use

If port 3100 is already in use, set another port and run E2E:

```bash
E2E_PORT=3110 npm run test:e2e
```
