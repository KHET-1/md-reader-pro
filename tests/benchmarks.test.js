// MD Reader Pro - Benchmark Tests
const { describe, test, expect, beforeAll, beforeEach, afterEach, afterAll } = require('@jest/globals');
const { TestUtils } = require('./test-utils.js');
const { BenchmarkRunner, MemoryProfiler } = require('./performance-utils.js');
const MarkdownEditor = require('../src/index.js').default;
const fs = require('fs');
const path = require('path');

// Define __dirname for CommonJS
const __dirname = path.dirname(__filename);

// Global declarations for linting
/* global KeyboardEvent, File */

describe('Benchmark Tests', () => {
    let editor;
    let benchmarkRunner;
    let memoryProfiler;
    let markdownContent;

    beforeAll(() => {
        benchmarkRunner = new BenchmarkRunner();
        memoryProfiler = new MemoryProfiler();
        const filePath = path.join(__dirname, 'performance-test-document.md');
        markdownContent = fs.readFileSync(filePath, 'utf8');
    });

    beforeEach(() => {
        TestUtils.suppressConsoleLogs();
        TestUtils.setupCleanDOM();
        editor = new MarkdownEditor();
        editor.init();

        memoryProfiler.takeSnapshot('test-start');
    });

    afterEach(() => {
        memoryProfiler.takeSnapshot('test-end');
        TestUtils.cleanupDOM();
        TestUtils.restoreConsoleLogs();
    });

    afterAll(() => {
        // Generate and log comprehensive reports
        benchmarkRunner.logBenchmarkReport();
        memoryProfiler.logMemoryReport();

        // Save benchmark results to file for CI/CD
        const benchmarkReport = benchmarkRunner.generateBenchmarkReport();
        const memoryReport = memoryProfiler.generateMemoryReport();

        console.log('\n📊 Complete Performance Summary:');
        console.log('================================');
        console.log(`Benchmarks Run: ${benchmarkReport.totalBenchmarks}`);
        console.log(`Memory Snapshots: ${memoryReport.totalSnapshots}`);
        console.log(`Memory Leaks Detected: ${memoryReport.memoryLeaks.length}`);
        console.log('================================\n');
    });

    describe('Rendering Benchmarks', () => {
        test('benchmark markdown rendering', async () => {
            benchmarkRunner.addBenchmark('markdown-render', () => {
                editor.editor.value = markdownContent;
                editor.updatePreview();
            }, 20);

            const result = await benchmarkRunner.runBenchmark('markdown-render');

            expect(result.average).toBeLessThan(200); // Should average under 200ms
            expect(result.p95).toBeLessThan(400); // 95th percentile under 400ms
        });
    });

    describe('Interactive Benchmarks', () => {
        test('benchmark typing simulation', async () => {
            const testText = 'This is a comprehensive typing test with **bold**, *italic*, and `code` elements.';

            benchmarkRunner.addBenchmark('typing-simulation', () => {
                // Simulate adding one character
                const currentLength = editor.editor.value.length;
                if (currentLength < testText.length) {
                    editor.editor.value = testText.substring(0, currentLength + 1);
                    editor.updatePreview();
                } else {
                    // Reset for next iteration
                    editor.editor.value = '';
                }
            }, 100);

            const result = await benchmarkRunner.runBenchmark('typing-simulation');

            // Typing should be very responsive
            expect(result.average).toBeLessThan(5); // Under 5ms per character
            expect(result.p99).toBeLessThan(15); // 99th percentile under 15ms
        });

        test('benchmark keyboard shortcuts', async () => {
            editor.editor.value = 'Initial content';

            benchmarkRunner.addBenchmark('keyboard-shortcuts', () => {
                const tabEvent = new KeyboardEvent('keydown', {
                    key: 'Tab',
                    bubbles: true,
                    cancelable: true
                });

                editor.handleKeyboardShortcuts(tabEvent);
            }, 100);

            const result = await benchmarkRunner.runBenchmark('keyboard-shortcuts');

            // Keyboard shortcuts should be instant
            expect(result.average).toBeLessThan(2); // Under 2ms
            expect(result.p95).toBeLessThan(5); // 95th percentile under 5ms
        });
    });

    describe('File Operations Benchmarks', () => {
        test('benchmark file loading', async () => {
            benchmarkRunner.addBenchmark('file-loading', async () => {
                const file = new File([markdownContent], 'test.md', { type: 'text/markdown' });

                // Mock FileReader for consistent timing
                const restoreFileReader = TestUtils.mockFileReader(markdownContent);

                editor.loadFile(file);
                await TestUtils.waitFor(1);

                restoreFileReader();
            }, 20);

            const result = await benchmarkRunner.runBenchmark('file-loading');

            // File loading should be quick - adjusted for test environment stability
            expect(result.average).toBeLessThan(30); // Under 30ms (adjusted from 25ms)
            expect(result.p95).toBeLessThan(50); // 95th percentile under 50ms
        });

        test('benchmark save operations', async () => {
            editor.editor.value = markdownContent;

            // Mock URL.createObjectURL and related APIs
            const originalCreateObjectURL = URL.createObjectURL;
            const originalRevokeObjectURL = URL.revokeObjectURL;

            URL.createObjectURL = jest.fn(() => 'blob:mock-url');
            URL.revokeObjectURL = jest.fn();

            benchmarkRunner.addBenchmark('save-operation', () => {
                editor.saveMarkdown();
            }, 50);

            const result = await benchmarkRunner.runBenchmark('save-operation');

            // Save operations should be very fast
            expect(result.average).toBeLessThan(6); // Under 6ms (adjusted for CI variability)
            expect(result.p95).toBeLessThan(20); // 95th percentile under 20ms (adjusted for system variability)

            // Restore mocks
            URL.createObjectURL = originalCreateObjectURL;
            URL.revokeObjectURL = originalRevokeObjectURL;
        });
    });

    describe('Memory Usage Benchmarks', () => {
        test('benchmark memory usage during operations', () => {
            const memoryBefore = performance.memory ? performance.memory.usedJSHeapSize : 0;

            // Perform memory-intensive operations
            for (let i = 0; i < 100; i++) {
                editor.editor.value = markdownContent;
                editor.updatePreview();
            }

            const memoryAfter = performance.memory ? performance.memory.usedJSHeapSize : 0;

            const memoryDelta = memoryAfter - memoryBefore;

            // Memory usage should be reasonable
            expect(memoryDelta).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
        });

        test('benchmark memory stability over time', () => {
            const iterations = 50;

            for (let i = 0; i < iterations; i++) {
                memoryProfiler.takeSnapshot(`iteration-${i}`);

                // Perform standard operations
                const markdown = '# Simple Markdown\n\nJust a simple test.';
                editor.editor.value = markdown;
                editor.updatePreview();

                // Clear content
                editor.editor.value = '';
                editor.updatePreview();
            }

            memoryProfiler.takeSnapshot('final');

            // Check for memory leaks
            const leaks = memoryProfiler.detectMemoryLeaks(2 * 1024 * 1024); // 2MB threshold

            expect(leaks.length).toBe(0); // No significant memory leaks
        });
    });

    describe('Stress Tests', () => {
        test('benchmark under high load', async () => {
            benchmarkRunner.addBenchmark('high-load-test', () => {
                // Simulate multiple rapid operations
                editor.editor.value = markdownContent;
                editor.updatePreview();

                // Simulate user interactions
                const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
                editor.handleKeyboardShortcuts(tabEvent);

                // Simulate help bar interaction
                if (window.copyToEditor) {
                    window.copyToEditor('# Quick copy test');
                }
            }, 5);

            const result = await benchmarkRunner.runBenchmark('high-load-test');

            // Even under high load, operations should complete within reasonable time
            expect(result.average).toBeLessThan(500); // Under 500ms average
            expect(result.p95).toBeLessThan(800); // 95th percentile under 800ms
        });

        test('benchmark concurrent operations', async () => {
            // Simulate multiple operations happening simultaneously
            benchmarkRunner.addBenchmark('concurrent-operations', async () => {
                const operations = [
                    () => {
                        editor.editor.value = 'Operation 1 content';
                        editor.updatePreview();
                    },
                    () => {
                        const event = new KeyboardEvent('keydown', { key: 'Tab' });
                        editor.handleKeyboardShortcuts(event);
                    },
                    () => {
                        if (window.copyToEditor) {
                            window.copyToEditor('Concurrent copy');
                        }
                    }
                ];

                // Execute operations in quick succession
                operations.forEach(op => op());
            }, 20);

            const result = await benchmarkRunner.runBenchmark('concurrent-operations');

            // Concurrent operations should remain responsive
            expect(result.average).toBeLessThan(50); // Under 50ms
            expect(result.p95).toBeLessThan(100); // 95th percentile under 100ms
        });
    });
});
