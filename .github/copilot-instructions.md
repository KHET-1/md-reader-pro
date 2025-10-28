# GitHub Copilot Instructions for MD Reader Pro

## Repository Overview

MD Reader Pro is an enterprise-grade markdown editor built with modern web technologies. It features real-time markdown parsing, professional UI, comprehensive performance monitoring, and enterprise-level testing infrastructure.

**Current Version:** 3.4.0  
**Test Coverage:** 94.7%  
**Total Tests:** 229 passing tests across 15 test suites

## Technology Stack

### Core Technologies
- **JavaScript:** ES6+ with modules (`type: "module"` in package.json)
- **Build System:** Webpack 5 with Babel transpilation
- **Markdown Parsing:** marked.js v16.3.0
- **Syntax Highlighting:** Prism.js
- **Security:** DOMPurify for XSS prevention
- **Testing:** Jest 30 with jsdom environment
- **E2E Testing:** Playwright
- **Linting:** ESLint 9 with flat config

### Development Tools
- **Dev Server:** webpack-dev-server with HMR
- **Package Manager:** npm
- **Version Control:** Git with GitHub Actions CI/CD

## Code Structure

### Source Files
- `src/index.js` - Main MarkdownEditor class and application entry point
- `src/utils/AnimationManager.js` - Animation utilities
- `src/styles/` - CSS files (variables, base, layout, components, animations, utilities)
- `src/index.html` - Main HTML template

### Test Files
- `tests/` - Jest unit tests (15 test suites, 229 tests)
- `tests/e2e/` - Playwright E2E tests
- `tests/__mocks__/` - Test mocks
- `tests/setup.js` - Test environment setup
- `tests/performance-utils.js` - Performance testing utilities

## Code Style and Conventions

### JavaScript Conventions
1. **Use ES6+ features:** Classes, arrow functions, destructuring, async/await
2. **Module system:** ES6 modules with import/export
3. **Naming:**
   - Classes: PascalCase (e.g., `MarkdownEditor`, `AnimationManager`)
   - Functions/methods: camelCase (e.g., `setupEditor`, `renderMarkdown`)
   - Constants: UPPER_SNAKE_CASE (e.g., `TAB_WIDTH`, `MAX_FILE_SIZE`)
4. **Code organization:**
   - Use static `CONSTANTS` getters for configuration
   - Group related methods together
   - Add JSDoc comments for complex functions
5. **Console usage:** Use `console.error()` for errors (allowed by ESLint), avoid general `console.log()` in production code

### CSS Conventions
1. **File organization:** Separate concerns across multiple CSS files
   - `variables.css` - CSS custom properties
   - `base.css` - Base styles and resets
   - `layout.css` - Layout and structure
   - `components.css` - Component-specific styles
   - `animations.css` - Animation definitions
   - `utilities.css` - Utility classes
2. **Use CSS custom properties** for theming and consistency
3. **BEM-like naming** for component classes

### ESLint Rules
- `prefer-const` - Required
- `no-console` - Warning (allow `console.warn` and `console.error`)
- ES2022 features enabled
- Browser and Jest environments configured

## Testing Requirements

### Test Coverage Thresholds
Maintain or improve these coverage thresholds (defined in `jest.config.cjs`):
- **Branches:** ≥64%
- **Functions:** ≥76%
- **Lines:** ≥78%
- **Statements:** ≥74%

### Testing Best Practices
1. **Test Location:** Place tests in `tests/` directory with `.test.js` suffix
2. **Test Environment:** Jest with jsdom (browser environment simulation)
3. **Test Structure:**
   - Use descriptive test names
   - Test both happy paths and edge cases
   - Mock DOM elements and external dependencies
   - Clean up after tests (use `afterEach` for cleanup)
4. **Performance Tests:**
   - Use utilities in `tests/performance-utils.js`
   - Run with `npm run test:performance`
   - Keep performance within established baselines
5. **E2E Tests:**
   - Playwright tests in `tests/e2e/`
   - Run with `npm run test:e2e`
6. **Test Execution:**
   - Run serially (maxWorkers: 1) for consistent performance measurements
   - 15-second timeout for tests
   - Clear and restore mocks between tests

### Writing New Tests
```javascript
// Example test structure
describe('Feature Name', () => {
    beforeEach(() => {
        // Setup DOM and mocks
        document.body.innerHTML = '...';
    });
    
    afterEach(() => {
        // Cleanup
        jest.clearAllMocks();
    });
    
    test('should handle expected behavior', () => {
        // Arrange, Act, Assert
    });
    
    test('should handle edge cases', () => {
        // Test error conditions, null inputs, etc.
    });
});
```

## Build and Development Workflow

### Development Commands
```bash
npm install              # Install dependencies
npm run dev             # Start dev server with HMR (port 3000)
npm run lint            # Run ESLint with auto-fix
npm test                # Run all unit tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
npm run build           # Production build
```

### Build Process
1. **Development:** Webpack dev server on port 3000 with HMR
2. **Production:** Optimized bundle with content hashing
3. **Source Maps:** 
   - Development: `eval-source-map`
   - Production: `source-map`
4. **CSS Handling:**
   - Development: style-loader (injected)
   - Production: MiniCssExtractPlugin (extracted)

### Quality Gates
Before committing:
1. Run `npm run lint` - Must pass with no errors
2. Run `npm test` - All tests must pass
3. Run `npm run build` - Build must succeed
4. Verify coverage thresholds are maintained

## Performance Monitoring

### Performance Standards
- Monitor rendering performance, memory usage, and interaction latency
- Use performance baselines in `performance-baseline.json`
- Run performance tests: `npm run test:performance`
- Check for regressions: `npm run performance:regression`

### Performance Budget
- Bundle size: Monitor with `npm run build:analyze`
- Rendering performance: Target < 100ms for typical documents
- Memory: Watch for leaks (threshold: 1MB)

## Security Guidelines

### Security Practices
1. **XSS Prevention:** Always use DOMPurify to sanitize user-generated content
2. **Input Validation:** Validate file uploads (size limits, extensions)
3. **Dependencies:** Keep dependencies updated (Dependabot enabled)
4. **No Secrets:** Never commit API keys, tokens, or credentials
5. **Sanitization:** Use marked with secure configuration

### Secure Coding Patterns
```javascript
// Always sanitize HTML before rendering
const sanitizedHtml = DOMPurify.sanitize(markedOutput);
preview.innerHTML = sanitizedHtml;

// Validate file inputs
if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large');
}
```

## Common Patterns

### DOM Manipulation Pattern
```javascript
// Check for browser environment
if (typeof window === 'undefined') return;

// Wait for DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => this.setupEditor());
} else {
    this.setupEditor();
}

// Safe element access with error handling
const element = document.getElementById('element-id');
if (!element) {
    if (typeof jest === 'undefined') {
        console.error('Element not found');
    }
    return;
}
```

### Animation Pattern
```javascript
// Use AnimationManager for consistent animations
this.anim = new AnimationManager();
this.anim.fadeIn(element, duration);
this.anim.fadeOut(element, duration);
```

### Error Handling Pattern
```javascript
// Graceful error handling with user feedback
try {
    await processFile(file);
    showFeedback('Success!', 'success');
} catch (error) {
    console.error('Operation failed:', error);
    showFeedback('Error: ' + error.message, 'error');
}
```

## Anti-Patterns to Avoid

❌ **Don't:**
- Remove or modify working tests to make new features pass
- Add console.log() statements in production code
- Skip error handling for async operations
- Bypass input validation or sanitization
- Hardcode values that should be in CONSTANTS
- Create memory leaks with event listeners (always clean up)
- Use deprecated marked.js options (sanitize, mangle removed in v5+)
- Mix CommonJS and ES modules syntax
- Ignore coverage threshold failures

✅ **Do:**
- Add tests for new features
- Use constants for magic numbers
- Clean up event listeners in cleanup methods
- Sanitize all user-generated HTML
- Follow the existing code structure
- Maintain or improve test coverage
- Use meaningful variable and function names
- Document complex logic with comments

## File Upload Implementation

### File Handling Pattern
```javascript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.markdown'];

// Validate file
if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 10MB limit');
}

const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error('Unsupported file type');
}

// Read file safely
const reader = new FileReader();
reader.onload = (e) => {
    const content = e.target.result;
    // Process content
};
reader.readAsText(file);
```

## CI/CD Integration

### GitHub Actions Workflows
- `.github/workflows/ci-cd.yml` - Main CI/CD pipeline
- `.github/workflows/eslint.yml` - Linting checks
- `.github/workflows/performance.yml` - Performance monitoring
- `.github/workflows/codeql.yml` - Security scanning
- `.github/workflows/deploy.yml` - Deployment automation

### Pull Request Requirements
1. All tests must pass
2. Linting must pass
3. Coverage thresholds must be maintained
4. Build must succeed
5. No security vulnerabilities introduced

## Documentation

### Documentation Files
- `README.md` - Project overview and quick start
- `ARCHITECTURE.md` - System architecture
- `CONTRIBUTING.md` - Contribution guidelines
- `SECURITY.md` - Security policy
- `CHANGELOG.md` - Version history
- `FEATURES.md` - Feature documentation
- `PERFORMANCE.md` - Performance guidelines

### Documentation Updates
Update relevant documentation when:
- Adding new features
- Changing architecture
- Modifying build process
- Updating dependencies
- Changing contribution process

## Getting Started for Contributors

1. **Clone and Install:**
   ```bash
   git clone https://github.com/khet-1/md-reader-pro.git
   cd md-reader-pro
   npm install
   ```

2. **Development:**
   ```bash
   npm run dev          # Start dev server
   npm run test:watch   # Watch tests while developing
   ```

3. **Before Committing:**
   ```bash
   npm run lint         # Fix code style
   npm test             # Verify tests pass
   npm run build        # Verify build succeeds
   ```

4. **Submit PR:**
   - Provide clear description
   - Reference related issues
   - Ensure CI passes

## Additional Resources

- **Repository:** https://github.com/khet-1/md-reader-pro
- **Live Demo:** https://khet-1.github.io/md-reader-pro
- **marked.js Docs:** https://marked.js.org/
- **Prism.js Docs:** https://prismjs.com/
- **Jest Docs:** https://jestjs.io/
- **Playwright Docs:** https://playwright.dev/

---

**Remember:** This is a high-quality, well-tested codebase. When making changes:
1. Understand existing patterns before introducing new ones
2. Maintain or improve test coverage
3. Follow the established code style
4. Think about performance implications
5. Consider security at every step
6. Update documentation when needed
