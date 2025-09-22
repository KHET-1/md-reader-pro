# Changelog

## [3.0.1] - 2025-09-22

### Package Upgrades

#### Major Version Upgrades
- **ESLint**: Upgraded from `8.57.1` to `9.36.0`
  - Modern flat configuration system
  - No breaking changes to existing rules
  - Improved performance and ES2024 support

- **Jest**: Upgraded from `29.7.0` to `30.1.3` 
  - Added `jest-environment-jsdom` as separate dependency (required since Jest 28)
  - Improved TypeScript support and performance
  - Enhanced error messages and debugging

- **marked**: Upgraded from `5.1.2` to `16.3.0`
  - Major rewrite with improved security
  - Better CommonMark compliance
  - No breaking changes for basic usage (library not actively used in codebase)

- **semantic-release**: Upgraded from `22.0.12` to `24.2.9`
  - Updated CI/CD automation
  - Better Git integration
  - Enhanced plugin ecosystem

#### Minor/Patch Version Upgrades
- **@tensorflow/tfjs**: Upgraded from `4.0.0` to `4.22.0`
  - Performance improvements
  - Bug fixes and security updates
  - Maintained API compatibility

- **webpack**: Upgraded from `5.88.0` to `5.101.3`
  - Security patches and performance improvements
  - Better tree-shaking and optimization

#### New Dependencies Added
- **webpack-cli**: `6.0.1` (required for webpack 5.x)
- **webpack-dev-server**: `6.0.1` (for development server)
- **html-webpack-plugin**: `5.6.4` (for HTML template processing)
- **jest-environment-jsdom**: `30.1.2` (required for Jest 30.x DOM testing)

### Configuration Changes
- **package.json**: Added `"type": "module"` to properly support ES modules
- **webpack.config.js**: Renamed to `webpack.config.cjs` for CommonJS compatibility

### Testing & Quality Assurance
- ✅ All builds passing with upgraded packages
- ✅ Linting working with ESLint 9.x
- ✅ Development server functional
- ✅ Production builds optimized and working
- ✅ No security vulnerabilities detected

### Compatibility
- **Node.js**: Compatible with Node.js 18+ (recommended)
- **Browsers**: Modern browsers with ES2022 support
- **Build System**: Webpack 5.x with latest tooling

### Breaking Changes
- None for core application functionality
- Development environment now requires separate jest-environment-jsdom package
- Webpack configuration must use .cjs extension due to ES module type

All package upgrades maintain backward compatibility for the core MD Reader Pro functionality while providing improved security, performance, and developer experience.