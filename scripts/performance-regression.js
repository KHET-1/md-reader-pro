#!/usr/bin/env node

// Performance Regression Detection Script
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceRegression {
    constructor() {
        this.baselineFile = path.join(__dirname, '..', 'performance-baseline.json');
        this.thresholds = {
            renderTimeIncrease: 0.2, // 20% increase
            memoryIncrease: 0.3, // 30% increase
            benchmarkSlowdown: 0.25 // 25% slowdown
        };
    }

    loadBaseline() {
        try {
            const data = fs.readFileSync(this.baselineFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('📊 No baseline found. Creating initial baseline...');
                return null;
            }
            console.error('❌ Error loading baseline:', error.message);
            return null;
        }
    }

    saveBaseline(results) {
        try {
            fs.writeFileSync(this.baselineFile, JSON.stringify(results, null, 2));
            console.log('✅ Baseline saved successfully');
        } catch (error) {
            console.error('❌ Error saving baseline:', error.message);
        }
    }

    async runPerformanceTests() {
        console.log('🏃 Running performance tests...');

        // This would integrate with the actual test runner
        // For now, we'll simulate the process
        const { execSync } = await import('child_process');

        try {
            // Run performance tests and capture output
            const benchmarkOutput = execSync('npm run test:benchmarks', {
                encoding: 'utf8',
                stdio: 'pipe'
            });

            const performanceOutput = execSync('npm run test:performance', {
                encoding: 'utf8',
                stdio: 'pipe'
            });

            return this.parseTestResults(benchmarkOutput, performanceOutput);
        } catch (error) {
            console.error('❌ Error running performance tests:', error.message);
            return null;
        }
    }

    parseTestResults(benchmarkOutput, performanceOutput) {
        // Parse the test outputs to extract performance metrics
        // This is a simplified version - would need more sophisticated parsing

        const results = {
            timestamp: new Date().toISOString(),
            benchmarks: {},
            performance: {},
            summary: {}
        };

        // Extract benchmark results
        const benchmarkLines = benchmarkOutput.split('\n');
        let currentBenchmark = null;

        benchmarkLines.forEach(line => {
            // Look for benchmark results patterns
            if (line.includes('📈') && line.includes('iterations')) {
                const match = line.match(/📈 (.+?) \((\d+) iterations\):/);
                if (match) {
                    currentBenchmark = match[1];
                    results.benchmarks[currentBenchmark] = {};
                }
            } else if (currentBenchmark && line.includes('Average:')) {
                const match = line.match(/Average:\s*([\d.]+)ms/);
                if (match) {
                    results.benchmarks[currentBenchmark].average = parseFloat(match[1]);
                }
            } else if (currentBenchmark && line.includes('P95:')) {
                const match = line.match(/P95:\s*([\d.]+)ms/);
                if (match) {
                    results.benchmarks[currentBenchmark].p95 = parseFloat(match[1]);
                }
            }
        });

        // Extract performance test results
        const performanceLines = performanceOutput.split('\n');

        performanceLines.forEach(line => {
            if (line.includes('Slow test detected')) {
                const match = line.match(/Slow test detected: (.+?) \(([\d.]+)ms\)/);
                if (match) {
                    if (!results.performance.slowTests) {
                        results.performance.slowTests = [];
                    }
                    results.performance.slowTests.push({
                        test: match[1],
                        duration: parseFloat(match[2])
                    });
                }
            } else if (line.includes('High memory usage')) {
                const match = line.match(/High memory usage: (.+?) \(\+([\d.]+)MB\)/);
                if (match) {
                    if (!results.performance.memoryIssues) {
                        results.performance.memoryIssues = [];
                    }
                    results.performance.memoryIssues.push({
                        test: match[1],
                        memoryIncrease: parseFloat(match[2])
                    });
                }
            }
        });

        // Generate summary
        results.summary = {
            totalBenchmarks: Object.keys(results.benchmarks).length,
            slowTestsCount: results.performance.slowTests?.length || 0,
            memoryIssuesCount: results.performance.memoryIssues?.length || 0,
            averageBenchmarkTime: this.calculateAverageBenchmarkTime(results.benchmarks)
        };

        return results;
    }

    calculateAverageBenchmarkTime(benchmarks) {
        const times = Object.values(benchmarks)
            .filter(b => b.average)
            .map(b => b.average);

        if (times.length === 0) return 0;
        return times.reduce((sum, time) => sum + time, 0) / times.length;
    }

    compareWithBaseline(current, baseline) {
        const regressions = [];

        // Compare benchmark performance
        for (const [benchmarkName, currentResults] of Object.entries(current.benchmarks)) {
            const baselineResults = baseline.benchmarks[benchmarkName];

            if (baselineResults && currentResults.average && baselineResults.average) {
                const increase = (currentResults.average - baselineResults.average) / baselineResults.average;

                if (increase > this.thresholds.benchmarkSlowdown) {
                    regressions.push({
                        type: 'benchmark',
                        benchmark: benchmarkName,
                        metric: 'average',
                        baseline: baselineResults.average,
                        current: currentResults.average,
                        increase: increase,
                        percentage: (increase * 100).toFixed(1)
                    });
                }
            }
        }

        // Compare overall performance
        if (baseline.summary.averageBenchmarkTime && current.summary.averageBenchmarkTime) {
            const overallIncrease = (current.summary.averageBenchmarkTime - baseline.summary.averageBenchmarkTime) / baseline.summary.averageBenchmarkTime;

            if (overallIncrease > this.thresholds.renderTimeIncrease) {
                regressions.push({
                    type: 'overall',
                    metric: 'averageBenchmarkTime',
                    baseline: baseline.summary.averageBenchmarkTime,
                    current: current.summary.averageBenchmarkTime,
                    increase: overallIncrease,
                    percentage: (overallIncrease * 100).toFixed(1)
                });
            }
        }

        // Check for new slow tests
        const newSlowTests = current.performance.slowTests?.length || 0;
        const baselineSlowTests = baseline.performance.slowTests?.length || 0;

        if (newSlowTests > baselineSlowTests) {
            regressions.push({
                type: 'slowTests',
                metric: 'count',
                baseline: baselineSlowTests,
                current: newSlowTests,
                increase: newSlowTests - baselineSlowTests
            });
        }

        return regressions;
    }

    generateReport(current, baseline, regressions) {
        console.log('\n📊 PERFORMANCE REGRESSION ANALYSIS');
        console.log('====================================');

        if (!baseline) {
            console.log('🆕 Initial baseline created');
            console.log(`Benchmarks: ${current.summary.totalBenchmarks}`);
            console.log(`Average benchmark time: ${current.summary.averageBenchmarkTime.toFixed(2)}ms`);
            console.log('Use this as baseline for future comparisons.');
            return;
        }

        console.log(`📅 Baseline: ${new Date(baseline.timestamp).toLocaleDateString()}`);
        console.log(`📅 Current:  ${new Date(current.timestamp).toLocaleDateString()}`);
        console.log('');

        if (regressions.length === 0) {
            console.log('✅ No performance regressions detected!');
            console.log('');
            console.log('Performance Summary:');
            console.log(`  Benchmarks: ${current.summary.totalBenchmarks}`);
            console.log(`  Average time: ${current.summary.averageBenchmarkTime.toFixed(2)}ms`);
            console.log(`  Slow tests: ${current.summary.slowTestsCount}`);
            console.log(`  Memory issues: ${current.summary.memoryIssuesCount}`);
        } else {
            console.log('⚠️ PERFORMANCE REGRESSIONS DETECTED!');
            console.log('');

            regressions.forEach((regression, index) => {
                console.log(`${index + 1}. ${regression.type.toUpperCase()} Regression:`);

                if (regression.benchmark) {
                    console.log(`   Benchmark: ${regression.benchmark}`);
                }

                console.log(`   Metric: ${regression.metric}`);
                console.log(`   Baseline: ${regression.baseline}${regression.type === 'benchmark' ? 'ms' : ''}`);
                console.log(`   Current:  ${regression.current}${regression.type === 'benchmark' ? 'ms' : ''}`);

                if (regression.percentage) {
                    console.log(`   Increase: ${regression.percentage}% (threshold: ${this.getThresholdForType(regression.type) * 100}%)`);
                } else if (regression.increase) {
                    console.log(`   Increase: +${regression.increase}`);
                }
                console.log('');
            });
        }

        console.log('====================================\n');
    }

    getThresholdForType(type) {
        switch (type) {
            case 'benchmark':
                return this.thresholds.benchmarkSlowdown;
            case 'overall':
                return this.thresholds.renderTimeIncrease;
            default:
                return this.thresholds.renderTimeIncrease;
        }
    }

    async run() {
        console.log('🔍 Starting performance regression analysis...\n');

        const baseline = this.loadBaseline();
        const current = await this.runPerformanceTests();

        if (!current) {
            console.error('❌ Failed to run performance tests');
            process.exit(1);
        }

        let regressions = [];
        if (baseline) {
            regressions = this.compareWithBaseline(current, baseline);
        }

        this.generateReport(current, baseline, regressions);

        // Update baseline if no regressions or if this is the first run
        if (regressions.length === 0 || !baseline) {
            this.saveBaseline(current);
        }

        // Exit with error code if regressions found
        if (regressions.length > 0) {
            console.log('💡 To update baseline after fixing regressions, run:');
            console.log('   npm run performance:update-baseline');
            process.exit(1);
        }

        console.log('✅ Performance regression analysis completed successfully');
    }
}

// Add command line handling
if (import.meta.url === `file://${process.argv[1]}`) {
    const regression = new PerformanceRegression();

    if (process.argv.includes('--update-baseline')) {
        console.log('🔄 Updating performance baseline...');
        const current = await regression.runPerformanceTests();
        if (current) {
            regression.saveBaseline(current);
            console.log('✅ Baseline updated successfully');
        }
    } else {
        regression.run().catch(console.error);
    }
}

export { PerformanceRegression };