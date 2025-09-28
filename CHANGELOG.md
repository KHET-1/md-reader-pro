# Changelog

All notable changes to this project will be documented in this file.

## [3.2.0] - 2025-01-28

### Bug Fixes
- Fixed duplicate `on:` section in GitHub Actions workflow causing deployment failures
- Resolved Jest test configuration issues with ES modules and CommonJS compatibility
- Fixed Event and FileReader mocking in test environment for proper test execution
- Corrected Playwright test separation from Jest test suite
- Fixed keyboard event handling in test environment

### Improvements
- Enhanced test suite reliability with 100% passing tests (154/154)
- Improved GitHub Actions workflow structure and error handling
- Better separation of concerns between Jest unit tests and Playwright E2E tests
- Enhanced test mocking for DOM APIs and browser compatibility

### Technical Debt
- Cleaned up test configuration and removed duplicate declarations
- Standardized test imports and module handling
- Improved test environment setup and mocking

## [3.1.0] - 2025-09-26

Breaking changes
- Removed legacy back-compat aliases for DOM elements and handlers.
  - Use editorEl, previewEl, fileInputEl, uploadAreaEl and onX-style handlers (e.g., onEditorKeyDown, onFileSelected).
  - Wrapper methods for old names have been removed.

Security and CSP
- Removed inline onclick attributes; replaced with delegated event listeners for strict CSP readiness.
- Markdown HTML is sanitized using DOMPurify during render to mitigate XSS.

Improvements
- Theming via CSS variables with a theme selector.
- Subtle emblem overlay on the preview pane for visual polish.

Maintenance
- Removed unused TensorFlow.js dependencies.
- Added and refined contributor guidance (CONTRIBUTING.md) and naming conventions.
- Expanded automated tests for: renderMarkdown, theme switching, help bar copy delegation, and drag/drop scoping.

Known issues
- Lint environment may not define requestIdleCallback in some contexts. A small guard/polyfill will be added in a follow-up patch.

---

Previous versions
- See repository history for changes prior to 3.1.0.
