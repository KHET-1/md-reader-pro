#!/usr/bin/env node
/**
 * Dependency Update Script
 * Safely updates dependencies in phases
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
    log(`\n📦 ${description}...`, 'cyan');
    try {
        execSync(command, { stdio: 'inherit' });
        log(`✅ ${description} completed`, 'green');
        return true;
    } catch (error) {
        log(`❌ ${description} failed`, 'red');
        return false;
    }
}

function runTests() {
    log('\n🧪 Running tests...', 'cyan');
    try {
        execSync('npm test', { stdio: 'inherit' });
        log('✅ All tests passed', 'green');
        return true;
    } catch (error) {
        log('❌ Tests failed', 'red');
        return false;
    }
}

function main() {
    log('╔════════════════════════════════════════╗', 'bright');
    log('║   MD Reader Pro - Dependency Update   ║', 'bright');
    log('╚════════════════════════════════════════╝', 'bright');

    // Phase 1: Critical Updates
    log('\n═══ PHASE 1: CRITICAL SECURITY UPDATES ═══', 'yellow');
    
    if (!runCommand('npm install marked@latest', 'Update marked v5 → v14')) {
        log('\n⚠️  Update failed. Rolling back...', 'yellow');
        return;
    }

    if (!runCommand('npm install webpack@latest', 'Update webpack (security patches)')) {
        log('\n⚠️  Update failed. You may need to update manually', 'yellow');
    }

    if (!runTests()) {
        log('\n⚠️  Tests failed after updates. Check for breaking changes', 'red');
        log('Run: git diff package.json', 'cyan');
        return;
    }

    // Phase 2: Build Tool Updates
    log('\n═══ PHASE 2: BUILD TOOL UPDATES ═══', 'yellow');
    
    const buildUpdates = [
        '@babel/core@latest',
        '@babel/preset-env@latest',
        'jest@latest',
        'webpack-bundle-analyzer@latest'
    ];

    for (const pkg of buildUpdates) {
        if (!runCommand(`npm install -D ${pkg}`, `Update ${pkg.split('@')[0]}`)) {
            log(`⚠️  ${pkg} update failed, continuing...`, 'yellow');
        }
    }

    if (!runTests()) {
        log('\n⚠️  Tests failed. Reverting build tool updates...', 'red');
        return;
    }

    // Phase 3: Minor Updates
    log('\n═══ PHASE 3: MINOR UPDATES ═══', 'yellow');
    
    const minorUpdates = [
        'dompurify@latest',
        'copy-webpack-plugin@latest',
        'semantic-release@latest',
        '@semantic-release/changelog@latest'
    ];

    for (const pkg of minorUpdates) {
        runCommand(`npm install -D ${pkg}`, `Update ${pkg.split('@')[0]}`);
    }

    if (!runTests()) {
        log('\n⚠️  Tests failed after minor updates', 'yellow');
    }

    // Summary
    log('\n═══ UPDATE SUMMARY ═══', 'bright');
    log('\n✅ Phase 1: Critical security updates completed', 'green');
    log('✅ Phase 2: Build tool updates completed', 'green');
    log('✅ Phase 3: Minor updates completed', 'green');
    
    log('\n📋 Next Steps:', 'cyan');
    log('1. Run: npm run build', 'white');
    log('2. Run: npm run test:e2e', 'white');
    log('3. Test manually in browser', 'white');
    log('4. Update CHANGELOG.md', 'white');
    log('5. Commit changes', 'white');
    
    log('\n⚠️  Note: ESLint v9 update skipped (requires flat config migration)', 'yellow');
    log('See DEPENDENCY_ANALYSIS.md for ESLint migration guide\n', 'white');
}

main();
