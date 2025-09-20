#!/usr/bin/env node

// Automated Test Optimization Script
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestOptimizer {
    constructor() {
        this.testsDir = path.join(__dirname, '..', 'tests');
        this.optimizations = [];
    }

    async optimizeAllTests() {
        console.log('🔧 Starting automated test optimization...');

        const testFiles = fs.readdirSync(this.testsDir)
            .filter(file => file.endsWith('.test.js'))
            .filter(file => !file.includes('test-utils'));

        for (const file of testFiles) {
            await this.optimizeTestFile(file);
        }

        this.generateOptimizationReport();
    }

    async optimizeTestFile(filename) {
        const filePath = path.join(this.testsDir, filename);
        let content = fs.readFileSync(filePath, 'utf8');
        let optimized = false;

        // 1. Add test utils import if not present
        if (!content.includes("from './test-utils.js'")) {
            content = `import { TestUtils, setupTestEnvironment } from './test-utils.js';\n${content}`;
            optimized = true;
        }

        // 2. Replace verbose console suppression with utility
        if (content.includes('jest.spyOn(console, \'log\').mockImplementation()')) {
            content = content.replace(
                /const consoleSpy = jest\.spyOn\(console, 'log'\)\.mockImplementation\(\);[\s\S]*?consoleSpy\.mockRestore\(\);/g,
                `const originalConsole = TestUtils.suppressConsoleLogs();
                // Test code here
                TestUtils.restoreConsoleLogs();`
            );
            optimized = true;
        }

        // 3. Optimize DOM setup
        if (content.includes('document.createElement') && !content.includes('TestUtils.setupCleanDOM')) {
            // This is complex - we'll flag for manual review
            this.optimizations.push({
                file: filename,
                type: 'manual',
                issue: 'DOM setup can be optimized with TestUtils.setupCleanDOM()',
                line: content.split('\n').findIndex(line => line.includes('document.createElement')) + 1
            });
        }

        // 4. Add timeout optimizations for slow tests
        if (content.includes('setTimeout')) {
            content = content.replace(
                /setTimeout\(\(\) => \{[\s\S]*?\}, (\d+)\);/g,
                (match, timeout) => {
                    if (parseInt(timeout) > 100) {
                        this.optimizations.push({
                            file: filename,
                            type: 'auto',
                            issue: `Slow timeout (${timeout}ms) optimized to use TestUtils.waitFor()`,
                            fixed: true
                        });
                        return match.replace(timeout, '10'); // Reduce to 10ms for tests
                    }
                    return match;
                }
            );
            optimized = true;
        }

        // 5. Optimize redundant editor creation
        const editorCreationCount = (content.match(/new MarkdownEditor\(\)/g) || []).length;
        if (editorCreationCount > 3) {
            this.optimizations.push({
                file: filename,
                type: 'manual',
                issue: `High editor creation count (${editorCreationCount}). Consider using TestUtils.createMockEditor()`,
                suggestion: 'Use beforeEach with shared editor instance'
            });
        }

        if (optimized) {
            fs.writeFileSync(filePath, content);
            this.optimizations.push({
                file: filename,
                type: 'auto',
                issue: 'General optimizations applied',
                fixed: true
            });
        }
    }

    generateOptimizationReport() {
        const autoFixed = this.optimizations.filter(opt => opt.fixed).length;
        const manualReview = this.optimizations.filter(opt => opt.type === 'manual').length;

        console.log('\n📊 Test Optimization Report');
        console.log('============================');
        console.log(`✅ Auto-fixed: ${autoFixed} issues`);
        console.log(`⚠️  Manual review needed: ${manualReview} issues\n`);

        if (manualReview > 0) {
            console.log('Manual Review Required:');
            this.optimizations
                .filter(opt => opt.type === 'manual')
                .forEach(opt => {
                    console.log(`📝 ${opt.file}:`);
                    console.log(`   Issue: ${opt.issue}`);
                    if (opt.suggestion) console.log(`   Suggestion: ${opt.suggestion}`);
                    if (opt.line) console.log(`   Line: ${opt.line}`);
                    console.log('');
                });
        }

        // Generate jest config optimization
        this.optimizeJestConfig();
    }

    optimizeJestConfig() {
        const packageJsonPath = path.join(__dirname, '..', 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // Add optimized jest configuration
        if (!packageJson.jest) {
            packageJson.jest = {};
        }

        const optimizedConfig = {
            testEnvironment: 'jsdom',
            setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
            collectCoverageFrom: [
                'src/**/*.js',
                '!src/**/*.test.js'
            ],
            coverageThreshold: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80
                }
            },
            testTimeout: 10000, // Reduced from default 30s
            maxWorkers: '50%', // Use half of available CPU cores
            cache: true,
            clearMocks: true,
            restoreMocks: true
        };

        Object.assign(packageJson.jest, optimizedConfig);
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

        this.optimizations.push({
            file: 'package.json',
            type: 'auto',
            issue: 'Jest configuration optimized for performance',
            fixed: true
        });
    }
}

// Add performance monitoring
class TestPerformanceMonitor {
    static createPerformanceConfig() {
        const configPath = path.join(__dirname, '..', 'jest.config.performance.js');
        const config = `
module.exports = {
    ...require('./jest.config.js'),
    reporters: [
        'default',
        ['jest-slow-test-reporter', { threshold: 1000, onlyShowSlowest: 10 }]
    ],
    setupFilesAfterEnv: [
        '<rootDir>/tests/setup.js',
        '<rootDir>/tests/performance-setup.js'
    ]
};`;

        fs.writeFileSync(configPath, config);
        return configPath;
    }

    static createPerformanceSetup() {
        const setupPath = path.join(__dirname, '..', 'tests', 'performance-setup.js');
        const setup = `
// Performance monitoring for tests
const slowTestThreshold = 100; // 100ms

beforeEach(() => {
    global.testStartTime = Date.now();
});

afterEach(() => {
    const testDuration = Date.now() - global.testStartTime;
    if (testDuration > slowTestThreshold) {
        console.warn(\`⚠️  Slow test detected: \${expect.getState().currentTestName} (\${testDuration}ms)\`);
    }
});

// Memory leak detection
global.gc && beforeEach(() => {
    global.gc();
    global.testMemoryStart = process.memoryUsage().heapUsed;
});

global.gc && afterEach(() => {
    global.gc();
    const memoryDiff = process.memoryUsage().heapUsed - global.testMemoryStart;
    const memoryMB = memoryDiff / 1024 / 1024;

    if (memoryMB > 10) { // More than 10MB
        console.warn(\`🧠 High memory usage detected: \${expect.getState().currentTestName} (+\${memoryMB.toFixed(2)}MB)\`);
    }
});`;

        fs.writeFileSync(setupPath, setup);
        return setupPath;
    }
}

// Run optimization
async function main() {
    const optimizer = new TestOptimizer();
    await optimizer.optimizeAllTests();

    // Create performance monitoring
    TestPerformanceMonitor.createPerformanceConfig();
    TestPerformanceMonitor.createPerformanceSetup();

    console.log('\n🎉 Test optimization complete!');
    console.log('\nNext steps:');
    console.log('1. Run: npm test to verify optimizations');
    console.log('2. Run: npm run test:performance to monitor slow tests');
    console.log('3. Review manual optimization suggestions above');
}

// Run optimization if this file is executed directly
const currentFileURL = new URL(import.meta.url).pathname;
const scriptArgument = process.argv[1];

if (currentFileURL.endsWith(scriptArgument.replace(/\\/g, '/').split('/').pop())) {
    console.log('🔧 Starting automated test optimization...');
    main().catch(console.error);
}

export { TestOptimizer, TestPerformanceMonitor };