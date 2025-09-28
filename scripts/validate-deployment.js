#!/usr/bin/env node

/**
 * Deployment Validation Script
 * Validates that the project is ready for GitHub Pages deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating GitHub Pages deployment readiness...\n');

const errors = [];
const warnings = [];

// Check if dist directory exists and has required files
const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
    errors.push('❌ dist/ directory not found. Run: npm run build');
} else {
    console.log('✅ dist/ directory exists');
    
    // Check required files
    const requiredFiles = [
        'index.html',
        'status.html',
        'deployment-manifest.json'
    ];
    const jsBundleExists = fs.readdirSync(distPath).some(
        file => file.startsWith('bundle.') && file.endsWith('.js')
    );
    if (!jsBundleExists) {
        errors.push('❌ No bundle.*.js file found in dist/');
    } else {
        console.log('✅ bundle.*.js exists');
    }

    requiredFiles.forEach(file => {
        const filePath = path.join(distPath, file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${file} exists`);
        } else {
            errors.push(`❌ ${file} missing from dist/`);
        }
    });
}

// Check package.json has correct repository and homepage
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

if (packageJson.repository && packageJson.repository.url === 'https://github.com/khet-1/md-reader-pro.git') {
    console.log('✅ Repository URL is correct');
} else {
    errors.push('❌ Repository URL not set correctly in package.json');
}

if (packageJson.homepage === 'https://khet-1.github.io/md-reader-pro') {
    console.log('✅ Homepage URL is correct');
} else {
    errors.push('❌ Homepage URL not set correctly in package.json');
}

// Check GitHub workflow exists
const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'deploy.yml');
if (fs.existsSync(workflowPath)) {
    console.log('✅ GitHub Actions workflow exists');
    
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    if (workflowContent.includes('github-pages')) {
        console.log('✅ Workflow uses correct github-pages environment');
    } else {
        errors.push('❌ Workflow does not use github-pages environment');
    }
} else {
    errors.push('❌ GitHub Actions workflow not found');
}

// Check tests pass
console.log('\n🧪 Running validation tests...');
const { execSync } = require('child_process');

try {
    execSync('npm run validate', { stdio: 'pipe' });
    console.log('✅ All validation tests pass');
} catch (error) {
    errors.push('❌ Validation tests failed. Run: npm run validate');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 DEPLOYMENT VALIDATION SUMMARY');
console.log('='.repeat(50));

if (errors.length === 0) {
    console.log('🎉 READY FOR GITHUB PAGES DEPLOYMENT!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Go to: https://github.com/khet-1/md-reader-pro/settings/pages');
    console.log('2. Set Source to "GitHub Actions"');
    console.log('3. Push to main: git push origin main');
    console.log('4. Monitor: https://github.com/khet-1/md-reader-pro/actions');
    console.log('5. Access: https://khet-1.github.io/md-reader-pro/');
} else {
    console.log('❌ DEPLOYMENT NOT READY');
    console.log('');
    console.log('Issues to fix:');
    errors.forEach(error => console.log(`  ${error}`));
}

if (warnings.length > 0) {
    console.log('');
    console.log('⚠️  Warnings:');
    warnings.forEach(warning => console.log(`  ${warning}`));
}

console.log('');
process.exit(errors.length > 0 ? 1 : 0);

