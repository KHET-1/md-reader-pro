// Performance Testing Utilities
export class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.thresholds = {
            renderTime: 200, // ms
            memoryUsage: 10 * 1024 * 1024, // 10MB
            domNodes: 1000,
            fileLoadTime: 100 // ms
        };
    }

    startMeasurement(testName) {
        const measurement = {
            name: testName,
            startTime: performance.now(),
            startMemory: this.getMemoryUsage(),
            startDOMNodes: this.getDOMNodeCount()
        };

        this.metrics.set(testName, measurement);
        return measurement;
    }

    endMeasurement(testName) {
        const measurement = this.metrics.get(testName);
        if (!measurement) {
            throw new Error(`No measurement found for test: ${testName}`);
        }

        measurement.endTime = performance.now();
        measurement.endMemory = this.getMemoryUsage();
        measurement.endDOMNodes = this.getDOMNodeCount();

        // Calculate deltas
        measurement.duration = measurement.endTime - measurement.startTime;
        measurement.memoryDelta = measurement.endMemory - measurement.startMemory;
        measurement.domNodesDelta = measurement.endDOMNodes - measurement.startDOMNodes;

        return measurement;
    }

    getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    getDOMNodeCount() {
        return document.querySelectorAll('*').length;
    }

    validatePerformance(testName) {
        const measurement = this.metrics.get(testName);
        if (!measurement) {
            throw new Error(`No measurement found for test: ${testName}`);
        }

        const violations = [];

        if (measurement.duration > this.thresholds.renderTime) {
            violations.push(`Slow rendering: ${measurement.duration.toFixed(2)}ms (threshold: ${this.thresholds.renderTime}ms)`);
        }

        if (measurement.memoryDelta > this.thresholds.memoryUsage) {
            violations.push(`High memory usage: ${(measurement.memoryDelta / 1024 / 1024).toFixed(2)}MB (threshold: ${(this.thresholds.memoryUsage / 1024 / 1024).toFixed(2)}MB)`);
        }

        if (measurement.domNodesDelta > this.thresholds.domNodes) {
            violations.push(`Excessive DOM nodes: +${measurement.domNodesDelta} (threshold: ${this.thresholds.domNodes})`);
        }

        if (violations.length > 0) {
            console.warn(`⚠️ Performance violations in ${testName}:`, violations);
        }

        return violations.length === 0;
    }

    generateReport() {
        const report = {
            totalTests: this.metrics.size,
            averageDuration: 0,
            averageMemoryDelta: 0,
            slowTests: [],
            memoryHeavyTests: [],
            summary: {}
        };

        let totalDuration = 0;
        let totalMemoryDelta = 0;

        for (const [testName, measurement] of this.metrics) {
            totalDuration += measurement.duration;
            totalMemoryDelta += measurement.memoryDelta;

            if (measurement.duration > this.thresholds.renderTime) {
                report.slowTests.push({
                    name: testName,
                    duration: measurement.duration
                });
            }

            if (measurement.memoryDelta > this.thresholds.memoryUsage) {
                report.memoryHeavyTests.push({
                    name: testName,
                    memoryDelta: measurement.memoryDelta
                });
            }
        }

        report.averageDuration = totalDuration / this.metrics.size;
        report.averageMemoryDelta = totalMemoryDelta / this.metrics.size;

        report.summary = {
            totalDuration: totalDuration.toFixed(2) + 'ms',
            averageDuration: report.averageDuration.toFixed(2) + 'ms',
            averageMemoryDelta: (report.averageMemoryDelta / 1024 / 1024).toFixed(2) + 'MB',
            slowTestsCount: report.slowTests.length,
            memoryHeavyTestsCount: report.memoryHeavyTests.length
        };

        return report;
    }

    logReport() {
        const report = this.generateReport();

        console.log('\n📊 PERFORMANCE REPORT');
        console.log('====================');
        console.log(`Total Tests: ${report.totalTests}`);
        console.log(`Average Duration: ${report.summary.averageDuration}`);
        console.log(`Average Memory Delta: ${report.summary.averageMemoryDelta}`);
        console.log(`Slow Tests: ${report.summary.slowTestsCount}`);
        console.log(`Memory Heavy Tests: ${report.summary.memoryHeavyTestsCount}`);

        if (report.slowTests.length > 0) {
            console.log('\n🐌 Slow Tests:');
            report.slowTests.forEach(test => {
                console.log(`  - ${test.name}: ${test.duration.toFixed(2)}ms`);
            });
        }

        if (report.memoryHeavyTests.length > 0) {
            console.log('\n🧠 Memory Heavy Tests:');
            report.memoryHeavyTests.forEach(test => {
                console.log(`  - ${test.name}: +${(test.memoryDelta / 1024 / 1024).toFixed(2)}MB`);
            });
        }

        console.log('====================\n');
    }
}

export class BenchmarkRunner {
    constructor() {
        this.benchmarks = new Map();
        this.results = [];
    }

    addBenchmark(name, fn, iterations = 100) {
        this.benchmarks.set(name, { fn, iterations });
    }

    async runBenchmark(name) {
        const benchmark = this.benchmarks.get(name);
        if (!benchmark) {
            throw new Error(`Benchmark not found: ${name}`);
        }

        const { fn, iterations } = benchmark;
        const durations = [];

        // Warm-up run
        await fn();

        // Benchmark runs
        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            await fn();
            const endTime = performance.now();
            durations.push(endTime - startTime);
        }

        const result = {
            name,
            iterations,
            durations,
            min: Math.min(...durations),
            max: Math.max(...durations),
            average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
            median: this.calculateMedian(durations),
            p95: this.calculatePercentile(durations, 95),
            p99: this.calculatePercentile(durations, 99)
        };

        this.results.push(result);
        return result;
    }

    async runAllBenchmarks() {
        const results = [];
        for (const name of this.benchmarks.keys()) {
            const result = await this.runBenchmark(name);
            results.push(result);
        }
        return results;
    }

    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    calculatePercentile(values, percentile) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index];
    }

    generateBenchmarkReport() {
        return {
            timestamp: new Date().toISOString(),
            totalBenchmarks: this.results.length,
            results: this.results.map(result => ({
                name: result.name,
                iterations: result.iterations,
                average: parseFloat(result.average.toFixed(3)),
                median: parseFloat(result.median.toFixed(3)),
                min: parseFloat(result.min.toFixed(3)),
                max: parseFloat(result.max.toFixed(3)),
                p95: parseFloat(result.p95.toFixed(3)),
                p99: parseFloat(result.p99.toFixed(3))
            }))
        };
    }

    logBenchmarkReport() {
        console.log('\n🏁 BENCHMARK RESULTS');
        console.log('====================');

        this.results.forEach(result => {
            console.log(`\n📈 ${result.name} (${result.iterations} iterations):`);
            console.log(`  Average: ${result.average.toFixed(3)}ms`);
            console.log(`  Median:  ${result.median.toFixed(3)}ms`);
            console.log(`  Min:     ${result.min.toFixed(3)}ms`);
            console.log(`  Max:     ${result.max.toFixed(3)}ms`);
            console.log(`  P95:     ${result.p95.toFixed(3)}ms`);
            console.log(`  P99:     ${result.p99.toFixed(3)}ms`);
        });

        console.log('\n====================');
    }
}

export class MemoryProfiler {
    constructor() {
        this.snapshots = [];
    }

    takeSnapshot(label) {
        if (!performance.memory) {
            console.warn('Memory profiling not available in this environment');
            return null;
        }

        const snapshot = {
            label,
            timestamp: Date.now(),
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };

        this.snapshots.push(snapshot);
        return snapshot;
    }

    getMemoryDelta(startLabel, endLabel) {
        const startSnapshot = this.snapshots.find(s => s.label === startLabel);
        const endSnapshot = this.snapshots.find(s => s.label === endLabel);

        if (!startSnapshot || !endSnapshot) {
            throw new Error('Snapshot labels not found');
        }

        return {
            deltaUsed: endSnapshot.usedJSHeapSize - startSnapshot.usedJSHeapSize,
            deltaTotal: endSnapshot.totalJSHeapSize - startSnapshot.totalJSHeapSize,
            startSnapshot,
            endSnapshot
        };
    }

    detectMemoryLeaks(threshold = 1024 * 1024) { // 1MB default threshold
        const leaks = [];

        for (let i = 1; i < this.snapshots.length; i++) {
            const prev = this.snapshots[i - 1];
            const curr = this.snapshots[i];
            const delta = curr.usedJSHeapSize - prev.usedJSHeapSize;

            if (delta > threshold) {
                leaks.push({
                    from: prev.label,
                    to: curr.label,
                    memoryIncrease: delta,
                    memoryIncreaseMB: (delta / 1024 / 1024).toFixed(2)
                });
            }
        }

        return leaks;
    }

    generateMemoryReport() {
        const report = {
            totalSnapshots: this.snapshots.length,
            memoryLeaks: this.detectMemoryLeaks(),
            snapshots: this.snapshots.map(snapshot => ({
                label: snapshot.label,
                usedMB: (snapshot.usedJSHeapSize / 1024 / 1024).toFixed(2),
                totalMB: (snapshot.totalJSHeapSize / 1024 / 1024).toFixed(2),
                limitMB: (snapshot.jsHeapSizeLimit / 1024 / 1024).toFixed(2)
            }))
        };

        return report;
    }

    logMemoryReport() {
        const report = this.generateMemoryReport();

        console.log('\n🧠 MEMORY PROFILE REPORT');
        console.log('========================');

        report.snapshots.forEach(snapshot => {
            console.log(`${snapshot.label}: ${snapshot.usedMB}MB used / ${snapshot.totalMB}MB total`);
        });

        if (report.memoryLeaks.length > 0) {
            console.log('\n⚠️ Potential Memory Leaks:');
            report.memoryLeaks.forEach(leak => {
                console.log(`  ${leak.from} → ${leak.to}: +${leak.memoryIncreaseMB}MB`);
            });
        } else {
            console.log('\n✅ No significant memory leaks detected');
        }

        console.log('========================\n');
    }
}

// Performance test helpers
export const performanceHelpers = {
    // Generate test data of various sizes
    generateMarkdown: {
        small: () => '# Small Test\n\nThis is a **small** test document.',
        medium: () => {
            const sections = Array.from({length: 20}, (_, i) => `
## Section ${i + 1}
Content for section ${i + 1} with **bold** and *italic* text.

- List item 1
- List item 2
- List item 3

\`\`\`javascript
function example${i}() {
    return "example ${i}";
}
\`\`\`
            `);
            return `# Medium Test Document\n${sections.join('\n')}`;
        },
        large: () => {
            const sections = Array.from({length: 100}, (_, i) => `
## Section ${i + 1}
This is section ${i + 1} with comprehensive content including tables and code blocks.

### Subsection ${i + 1}.1
${Array.from({length: 5}, (_, j) => `Paragraph ${j + 1} of section ${i + 1}.`).join(' ')}

### Subsection ${i + 1}.2
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1 | Data ${i}-1 | Value ${i}-1 |
| Row 2 | Data ${i}-2 | Value ${i}-2 |

\`\`\`javascript
function section${i}Function() {
    const data = 'section ${i} data';
    console.log(data);
    return data.toUpperCase();
}
\`\`\`
            `);
            return `# Large Test Document\n${sections.join('\n')}`;
        }
    },

    // Wait for async operations to complete
    waitForRender: async (ms = 10) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Force garbage collection if available
    forceGC: () => {
        if (global.gc) {
            global.gc();
        }
    },

    // Measure execution time
    measureTime: async (fn) => {
        const start = performance.now();
        await fn();
        const end = performance.now();
        return end - start;
    }
};