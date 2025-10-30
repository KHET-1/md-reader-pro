# Contributing to MD Reader Pro

Thank you for your interest in contributing to MD Reader Pro! This document provides guidelines for contributing to the project.

## Code of Conduct

This project follows a code of conduct that promotes a welcoming and inclusive environment for all contributors. Please be respectful and constructive in all interactions.

## How to Contribute

### 1. Check Existing Work

Before starting, review what's already planned:
- **[IDEAS.md](./IDEAS.md)** - Browse ideas and add your own
- **[BACKLOG.md](./BACKLOG.md)** - See prioritized features ready for development
- **[GitHub Issues](https://github.com/KHET-1/md-reader-pro/issues)** - Check existing bugs and features

### 2. Propose New Ideas

For new features or improvements:
1. Check if the idea already exists in IDEAS.md or issues
2. For quick ideas: Add directly to IDEAS.md via PR
3. For detailed proposals: Open a feature request issue using our template
4. Discuss with maintainers before starting major work

### 3. Fork and Clone
```bash
git clone https://github.com/YOUR-USERNAME/md-reader-pro.git
cd md-reader-pro
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 6. Development Setup
```bash
# Start development server
npm run dev

# Run tests in watch mode
npm run test:watch
```

### 7. Make Your Changes
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed
- Move completed items from BACKLOG.md to Done section

### 8. Quality Gates
Before submitting, ensure all quality gates pass:

```bash
# Run linting
npm run lint

# Run all tests
npm test

# Run coverage tests
npm run test:coverage

# Run performance tests
npm run test:performance

# Build the project
npm run build
```

### 9. Submit a Pull Request
- Provide a clear description of your changes
- Reference any related issues
- Ensure CI passes

## Development Guidelines

### Code Style
- Use ES6+ features
- Follow the existing naming conventions
- Write clean, readable code
- Add JSDoc comments for complex functions

### Testing Requirements
- Maintain test coverage above 80%
- Add tests for new features
- Include edge cases and error scenarios
- Run performance benchmarks for UI changes

### Documentation
- Update README.md for user-facing changes
- Update ARCHITECTURE.md for structural changes
- Add inline comments for complex logic

## Testing

### Running Tests
```bash
# Unit tests
npm test

# Coverage report
npm run test:coverage

# Performance tests
npm run test:performance

# E2E tests
npm run test:e2e
```

### Writing Tests
- Place tests in the `tests/` directory
- Use descriptive test names
- Test both happy path and edge cases
- Mock external dependencies

## Performance Guidelines

- Keep bundle size minimal
- Optimize for fast rendering
- Monitor performance regressions
- Use performance budgets

## Security

- Never commit secrets or API keys
- Validate all user inputs
- Follow XSS prevention practices
- Keep dependencies updated

## Questions?

Feel free to open an issue for questions or discussions about the project.

## Thank You!

Your contributions help make MD Reader Pro better for everyone. Thank you for contributing!
