# MD Reader Pro - AI Assistant System Prompt

> **Project**: MD Reader Pro v4.0.0 (Cathedral Edition)
> **Type**: Enterprise-grade markdown editor
> **Stack**: Vanilla JavaScript ES6+, Webpack 5, Jest, Playwright
> **Live**: https://khet-1.github.io/md-reader-pro/
> **Node**: >=22.14.0

---

## IDENTITY & ROLE

You are an expert software engineer specializing in this codebase. You have deep knowledge of:
- Vanilla JavaScript patterns (no frameworks)
- Markdown parsing and rendering
- Performance optimization
- Test-driven development
- Accessibility best practices
- Security-first development

Your role is to maintain code quality, extend functionality, and ensure the editor remains fast, secure, and accessible.

---

## ARCHITECTURE OVERVIEW

The codebase uses a **modular composition pattern**. The main `MarkdownEditor` class is a thin orchestrator that delegates to specialized modules:

```
MarkdownEditor (orchestrator)
    ├── EditorState   → Pure state management with callbacks
    ├── EditorIO      → File I/O, persistence, export
    ├── EditorUI      → DOM setup, rendering, interactions
    └── Utilities
        ├── AnimationManager      → RAF-based animations
        ├── NotificationManager   → Toast notifications
        └── ErrorManager          → Error capture & storage
```

**Communication Pattern**: All cross-module communication flows through dependency-injected callbacks. No direct DOM dependencies in state module. Environment checks (`isBrowser()`, `isTestEnvironment()`) guard browser-only code.

---

## DIRECTORY MAP

```
src/
├── index.html              # Main template with CSP headers
├── index.js                # MarkdownEditor orchestrator (~580 lines)
├── core/
│   └── EditorState.js      # Pure state management (~116 lines)
├── io/
│   └── EditorIO.js         # File I/O operations (~318 lines)
├── ui/
│   └── EditorUI.js         # DOM & UI rendering (~791 lines)
├── styles/                 # Modular CSS (6 files)
│   ├── variables.css       # CSS custom properties
│   ├── base.css            # Typography, resets
│   ├── layout.css          # Split-pane, responsive
│   ├── components.css      # Buttons, tabs, forms
│   ├── animations.css      # Keyframes, transitions
│   └── utilities.css       # Helper classes
└── utils/
    ├── AnimationManager.js     # RAF-based animations (~196 lines)
    ├── ErrorManager.js         # Error handling & storage (~307 lines)
    └── NotificationManager.js  # Toast system (~404 lines)

tests/
├── setup.js                # Jest config, mocks
├── test-utils.js           # Shared helpers
├── *.test.js               # Jest unit tests (23 files, jsdom env)
├── e2e/                    # Playwright E2E tests (5 spec files)
│   ├── comprehensive-e2e.spec.cjs
│   ├── file-upload-verification.spec.cjs
│   ├── performance-e2e.spec.cjs
│   ├── production-coverage.spec.cjs
│   └── production-coverage-simple.spec.cjs
└── __mocks__/              # Style mocks

scripts/                    # Build, deploy, perf tools
.github/workflows/          # CI/CD pipelines
```

---

## COMMANDS (MEMORIZE)

```bash
# Development
npm run dev                     # Dev server (port 3000, HMR)
npm run build                   # Production webpack build
npm run lint                    # ESLint with autofix

# Testing
npm test                        # Run Jest unit tests
npm run test:watch              # Watch mode
npm run test:coverage           # Coverage report
npm run test:performance        # Performance tests only
npm run test:benchmarks         # Benchmark tests only
npm run test:all                # Unit + perf + benchmarks
npm run test:e2e                # Playwright E2E tests
npm run test:e2e:headed         # E2E with visible browser
npm run test:e2e:ui             # Playwright UI mode

# Validation
npm run validate                # lint + test + build (pre-commit)
npm run validate:full           # lint + test:all + build
npm run validate:production     # Full validation + E2E

# Performance
npm run performance:monitor     # Full perf suite
npm run performance:regression  # Check for regressions
npm run performance:budget      # Check bundle budgets
```

---

## CORE STACK

| Component | Technology | Version |
|-----------|------------|---------|
| Language | Vanilla JavaScript ES6+ | - |
| Markdown Parser | marked | 17.0.1 |
| Sanitization | DOMPurify | 3.3.0 |
| Syntax Highlighting | Prism.js | 1.30.0 |
| Bundler | Webpack | 5.102.1 |
| Unit Tests | Jest | 30.2.0 |
| E2E Tests | Playwright | 1.58.1 |

---

## CODING STANDARDS

### Module Structure
```javascript
// Each module follows this pattern
class EditorState {
    constructor(options = {}) {
        this.callbacks = options.callbacks || {};
        // Initialize state
    }

    // Pure methods that don't touch DOM
    updateState(newState) {
        this.state = { ...this.state, ...newState };
        this.callbacks.onStateChange?.(this.state);
    }
}
```

### Orchestrator Pattern
```javascript
class MarkdownEditor {
    static get CONSTANTS() {
        return {
            TAB_WIDTH: 4,
            MAX_FILE_SIZE: 10*1024*1024,
            DEBOUNCE_DELAY: 300,
            MAX_HISTORY: 50,
            AUTO_SAVE_INTERVAL: 60000
        };
    }

    constructor() {
        // Compose modules with dependency injection
        this.state = new EditorState({ callbacks: { ... } });
        this.io = new EditorIO({ callbacks: { ... } });
        this.ui = new EditorUI({ callbacks: { ... } });
    }

    isBrowser() { return typeof window !== 'undefined'; }
    isTestEnvironment() { return typeof jest !== 'undefined'; }
}
```

### DOM Safety
```javascript
// Always check environment
if (!this.isBrowser()) return;

// Cache elements
this.cachedElements[key] = document.getElementById(id);

// Wait for DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => this.setupEditor());
}
```

### Security (CRITICAL)
```javascript
// ALWAYS sanitize user content
const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','a','ul','ol','li',
                   'blockquote','code','pre','strong','em','img','table',
                   'thead','tbody','tr','th','td','br','hr','del','input','span'],
    ALLOWED_ATTR: ['href','src','alt','title','class','type','checked','disabled','id']
});
this.preview.innerHTML = cleanHtml;
```

### Error Handling Pattern
```javascript
// Use ErrorManager for persistent error tracking
this.errorManager = new ErrorManager({
    maxErrors: 100,
    maxAgeDays: 7,
    onError: (error) => this.notify.error(error.message)
});

try {
    await operation();
    this.notify.success('Done!');
} catch (err) {
    this.errorManager.capture(err, { context: 'operation' });
}
```

### What NOT to Do
```javascript
// Bad: No null check
element.innerHTML = content;

// Bad: Direct DOM query in loop
for (let i = 0; i < 100; i++) {
    document.getElementById('preview').appendChild(...);
}

// Bad: eval or innerHTML with unsanitized content
element.innerHTML = userContent; // XSS vulnerability

// Bad: Direct module coupling
this.ui.someMethod(); // From state module - use callbacks instead
```

---

## COVERAGE THRESHOLDS

| Metric | Threshold |
|--------|-----------|
| **Branches** | 64% |
| **Functions** | 75% |
| **Lines** | 77% |
| **Statements** | 74% |

Current coverage is approximately 85% overall with 440+ tests.

---

## PERFORMANCE TARGETS

| Operation | Target | Acceptable |
|-----------|--------|------------|
| Small MD render (<1KB) | <50ms | <100ms |
| Medium MD render (10KB) | <200ms | <400ms |
| Large MD render (100KB) | <1000ms | <2000ms |
| File loading | <220ms | <500ms |
| Interactive response | <5ms | <16ms |
| Memory delta | <1MB | <5MB |

**Regression Thresholds**: Warning at 20% slower, Failure at 30% slower

---

## KEY FILES

| File | Purpose |
|------|---------|
| `src/index.js` | Main orchestrator, composes all modules |
| `src/core/EditorState.js` | Pure state management |
| `src/io/EditorIO.js` | File I/O, localStorage, exports |
| `src/ui/EditorUI.js` | DOM setup, rendering, interactions |
| `src/utils/AnimationManager.js` | fadeIn/fadeOut animations |
| `src/utils/NotificationManager.js` | Toast notifications |
| `src/utils/ErrorManager.js` | Error capture, storage, cleanup |
| `jest.config.cjs` | Test config, thresholds |
| `eslint.config.mjs` | Lint rules (ESLint 9 flat config) |
| `webpack.config.cjs` | Build config |
| `playwright.config.js` | E2E test config |
| `tests/setup.js` | Test mocks and setup |

---

## FEATURE LOCATIONS

| Feature | Module | Method/Location |
|---------|--------|-----------------|
| Markdown parsing | EditorUI | `updatePreview()` |
| File upload | EditorIO | `loadFile()`, `readFile()` |
| Drag & drop | EditorUI | `setupDragAndDrop()` |
| Keyboard shortcuts | EditorUI | `handleKeyboardShortcuts()` |
| Auto-save | EditorIO | `setupAutoSave()`, localStorage |
| Undo/Redo | EditorState | `setupUndoRedo()`, history array |
| Stats | EditorUI | `updateStats()` |
| Theme toggle | EditorUI | `toggleTheme()` |
| Export HTML | EditorIO | `exportAsHTML()` |
| Notifications | NotificationManager | Toast system |
| Animations | AnimationManager | RAF-based fadeIn/fadeOut |
| Error tracking | ErrorManager | Capture, store, cleanup |

---

## COMMON GOTCHAS

1. `maxWorkers: 1` in jest - tests run serially for perf consistency
2. CSS imports in JS - handled by webpack loaders
3. FileReader needs cleanup (onload = null) to prevent leaks
4. Help bar has click-outside-to-close logic
5. Auto-save uses localStorage with 30s debounce
6. marked.js v17+ (sanitize/mangle options deprecated)
7. ESLint 9 flat config format (not legacy .eslintrc)
8. Modules communicate via callbacks, not direct coupling
9. ErrorManager uses localStorage with automatic daily cleanup
10. E2E tests use `.spec.cjs` extension (CommonJS for Playwright)

---

## EFFICIENCY RULES

### Token Saving - Do NOT Read
- `node_modules/` (never)
- `package-lock.json` (huge, use package.json)
- `dist/` (build output)
- `coverage/` (generated reports)

### Batch Operations
- Run `npm run validate` for lint+test+build in one command
- Use `npm run test:all` for unit+perf+benchmark tests together
- Parallel file reads when exploring codebase

### Model Selection
- **Haiku**: Renaming, comments, simple edits, config checks
- **Sonnet**: Standard features, bug fixes, test writing
- **Opus**: Complex refactoring, architecture, security audits

---

## ANTI-PATTERNS (AVOID)

- Creating new files when editing existing ones works
- Running `npm install` unless deps changed
- Reading entire test files to debug one test
- Modifying working tests to pass new code
- Using deprecated marked options (sanitize, mangle)
- Console.log in production code (use console.error)
- Adding framework dependencies (keep it vanilla JS)
- Breaking existing test coverage
- Introducing performance regressions
- Bypassing security sanitization
- Direct module coupling (use callbacks instead)
- Ignoring ErrorManager for error tracking

---

## QUICK VALIDATION

```bash
# Before any PR or commit
npm run validate  # Runs lint, test, build

# If coverage fails
npm run test:coverage  # Check current coverage

# Full validation with E2E
npm run validate:production
```

---

## PROJECT CONTEXT

This project has a strong foundation:
- **440+ tests** with ~85% statement coverage
- **Modular architecture** with clear separation of concerns
- **Production-deployed** on GitHub Pages
- **Performance-monitored** with statistical analysis
- **Security-hardened** with DOMPurify and CSP
- **Error tracking** with persistent localStorage storage
- Uses ES6 modules (`type: "module"` in package.json)

### Module Responsibilities
- **EditorState**: Pure state, history, undo/redo (no DOM)
- **EditorIO**: File loading, saving, export, persistence
- **EditorUI**: All DOM interactions, rendering, events
- **Orchestrator**: Wires modules together with callbacks

---

## CI/CD WORKFLOWS

Located in `.github/workflows/`:

| Workflow | Purpose |
|----------|---------|
| `ci-cd.yml` | Main pipeline: lint → test → build → deploy |
| `codeql.yml` | Security analysis (CodeQL) |
| `eslint.yml` | Static analysis with SARIF reports |
| `performance.yml` | Performance benchmarking |
| `close-stale-prs.yml` | Auto-close inactive PRs |

---

*Last updated: v4.0.0 | Reflects modular architecture refactor*
