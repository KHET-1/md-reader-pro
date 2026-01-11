# CLAUDE.md - MD Reader Pro Context

## Project Identity
- **Name:** md-reader-pro
- **Version:** 4.0.0 (Cathedral Edition)
- **Type:** Enterprise markdown editor with live preview
- **Stack:** ES6+ modules, Webpack 5, marked.js, DOMPurify, Prism.js
- **Node:** >=22.14.0

## Directory Map
```
src/
  index.js          # Main MarkdownEditor class (entry point)
  utils/            # AnimationManager.js, NotificationManager.js
  styles/           # CSS: variables, base, layout, components, animations, utilities
tests/
  *.test.js         # Jest unit tests (jsdom env)
  e2e/              # Playwright E2E tests
  setup.js          # Test environment config
  __mocks__/        # Style mocks
scripts/
  *.js, *.cjs       # Build, deploy, performance scripts
docs/               # Guides and phase reports
```

## Commands (memorize these)
```bash
npm test                    # Run Jest unit tests
npm run lint                # ESLint with autofix
npm run build               # Production webpack build
npm run dev                 # Dev server (port 3000, HMR)
npm run test:coverage       # Coverage report
npm run test:e2e            # Playwright E2E tests
npm run validate            # lint + test + build (pre-commit)
```

## Coverage Thresholds
- Branches: 64% | Functions: 76% | Lines: 78% | Statements: 74%

## Code Patterns

### Class Structure
```javascript
class MarkdownEditor {
    static get CONSTANTS() { return { TAB_WIDTH: 4, MAX_FILE_SIZE: 10*1024*1024 }; }
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
const cleanHtml = DOMPurify.sanitize(rawHtml, this.sanitizeConfig);
this.preview.innerHTML = cleanHtml;
```

### Error Pattern
```javascript
try {
    await operation();
    this.notify.success('Done!');
} catch (err) {
    console.error('Op failed:', err);
    this.notify.error('Failed: ' + err.message);
}
```

## Key Files to Know
| File | Purpose |
|------|---------|
| `src/index.js` | Main editor class, all features |
| `src/utils/AnimationManager.js` | fadeIn/fadeOut animations |
| `src/utils/NotificationManager.js` | Toast notifications |
| `jest.config.cjs` | Test config, thresholds |
| `eslint.config.mjs` | Lint rules (flat config) |
| `webpack.config.cjs` | Build config |

## Memory Aids (Session Persistence)

### State After Sessions
- Tests are comprehensive (200+ tests across 15+ suites)
- Uses ES6 modules (`type: "module"` in package.json)
- marked.js v17+ (sanitize/mangle options deprecated)
- ESLint 9 flat config format
- Single MarkdownEditor class handles everything

### Common Gotchas
1. `maxWorkers: 1` in jest - tests run serially for perf consistency
2. CSS imports in JS - handled by webpack loaders
3. FileReader needs cleanup (onload = null) to prevent leaks
4. Help bar has click-outside-to-close logic
5. Auto-save uses localStorage with 30s debounce

### Test Environment
- jsdom simulates browser
- Mocks in `tests/__mocks__/`
- Setup in `tests/setup.js`
- E2E excluded from Jest runs

## Efficiency Rules

### Batch Operations
- Run `npm run validate` for lint+test+build in one command
- Use `npm run test:all` for unit+perf+benchmark tests together
- Parallel file reads when exploring codebase

### Use Haiku for Simple Tasks
- Renaming variables
- Adding comments
- Simple string replacements
- Reading config files
- Checking file existence

### Parallel Agent Deployment
- Deploy agents for independent file analysis
- One agent per test file when debugging
- Separate agents for src/ and tests/ exploration

### When to Use Opus
- Complex refactoring across multiple files
- Architecture decisions
- Security audits
- Test strategy design

## Token Saving Strategies

### Do NOT Read These Files
- `node_modules/` (never)
- `package-lock.json` (huge, use package.json)
- `dist/` (build output)
- `coverage/` (generated reports)
- `*.html` files in root (design mockups)

### Read First, Edit Second
- Always `Read` target file before `Edit`
- Use `Glob` to find files, then read specific ones
- Use `Grep` with `files_with_matches` mode first

### Compact Responses
- Skip file contents in responses when not needed
- Reference line numbers instead of quoting code
- Use diff-style descriptions for changes

### Caching Mental Model
```
Main class: MarkdownEditor (src/index.js)
  - init() -> setupEditor() -> setupEventListeners()
  - Cathedral features: auto-save, undo/redo, stats, themes
  - Uses AnimationManager and NotificationManager
```

## Anti-Patterns (AVOID)
- Creating new files when editing existing ones works
- Running `npm install` unless deps changed
- Reading entire test files to debug one test
- Modifying working tests to pass new code
- Using deprecated marked options (sanitize, mangle)
- Console.log in production code (use console.error)

## Quick Validation Flow
```bash
# Before any PR or commit
npm run validate  # Runs lint, test, build
# If coverage fails, add tests to increase coverage
npm run test:coverage  # Check current coverage
```

## Feature Locations (Quick Reference)
| Feature | Location |
|---------|----------|
| Markdown parsing | `updatePreview()` |
| File upload | `loadFile()`, `readFile()` |
| Drag & drop | `setupDragAndDrop()` |
| Keyboard shortcuts | `handleKeyboardShortcuts()` |
| Auto-save | `setupAutoSave()`, localStorage |
| Undo/Redo | `setupUndoRedo()`, history array |
| Stats | `updateStats()` |
| Theme toggle | `toggleTheme()` |
| Export HTML | `exportAsHTML()` |
| Notifications | NotificationManager class |
| Animations | AnimationManager class |

---
*Last updated: v4.0.0 | Optimized for Claude Code context loading*
