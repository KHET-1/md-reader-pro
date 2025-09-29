#!/usr/bin/env node

/**
 * Performance Budget Monitor
 * Monitors and enforces performance budgets for MD Reader Pro
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceBudget {
    constructor() {
        this.budgets = {
            // Bundle size budgets (in bytes)
            bundle: {
                max: 100 * 1024, // 100KB
                warning: 80 * 1024, // 80KB
                current: 0
            },
            // Rendering performance budgets (in milliseconds)
            rendering: {
                small: { max: 50, warning: 40 },
                medium: { max: 200, warning: 150 },
                large: { max: 1000, warning: 800 }
            },
            // Memory usage budgets (in bytes)
            memory: {
                max: 50 * 1024 * 1024, // 50MB
                warning: 40 * 1024 * 1024, // 40MB
                current: 0
            },
            // File loading budgets (in milliseconds)
            fileLoading: {
                max: 150,
                warning: 100
            }
        };
        
        this.results = {
            bundle: null,
            rendering: null,
            memory: null,
            fileLoading: null
        };
    }

    /**
     * Check bundle size against budget
     */
    checkBundleSize() {
        const distPath = path.join(__dirname, '..', 'dist');
        console.log('Checking bundle size in:', distPath);
        
        if (!fs.existsSync(distPath)) {
            console.log('❌ Dist directory not found. Run npm run build first.');
            return { size: 0, budget: this.budgets.bundle.max, status: 'fail', warning: 'ok' };
        }
        
        const bundleFiles = fs.readdirSync(distPath).filter(file => file.endsWith('.js'));
        console.log('Found bundle files:', bundleFiles);
        
        let totalSize = 0;
        bundleFiles.forEach(file => {
            const filePath = path.join(distPath, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
        });

        this.budgets.bundle.current = totalSize;
        this.results.bundle = {
            size: totalSize,
            budget: this.budgets.bundle.max,
            status: totalSize <= this.budgets.bundle.max ? 'pass' : 'fail',
            warning: totalSize > this.budgets.bundle.warning ? 'warning' : 'ok'
        };

        return this.results.bundle;
    }

    /**
     * Check rendering performance against budget
     */
    checkRenderingPerformance(metrics) {
        const results = {};
        
        Object.keys(this.budgets.rendering).forEach(size => {
            const budget = this.budgets.rendering[size];
            const actual = metrics[size] || 0;
            
            results[size] = {
                actual,
                budget: budget.max,
                status: actual <= budget.max ? 'pass' : 'fail',
                warning: actual > budget.warning ? 'warning' : 'ok'
            };
        });

        this.results.rendering = results;
        return results;
    }

    /**
     * Check memory usage against budget
     */
    checkMemoryUsage(metrics) {
        const memoryUsed = metrics.memoryUsed || 0;
        
        this.budgets.memory.current = memoryUsed;
        this.results.memory = {
            used: memoryUsed,
            budget: this.budgets.memory.max,
            status: memoryUsed <= this.budgets.memory.max ? 'pass' : 'fail',
            warning: memoryUsed > this.budgets.memory.warning ? 'warning' : 'ok'
        };

        return this.results.memory;
    }

    /**
     * Check file loading performance against budget
     */
    checkFileLoadingPerformance(metrics) {
        const loadTime = metrics.loadTime || 0;
        
        this.results.fileLoading = {
            loadTime,
            budget: this.budgets.fileLoading.max,
            status: loadTime <= this.budgets.fileLoading.max ? 'pass' : 'fail',
            warning: loadTime > this.budgets.fileLoading.warning ? 'warning' : 'ok'
        };

        return this.results.fileLoading;
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            budgets: this.budgets,
            results: this.results,
            summary: this.getSummary()
        };

        return report;
    }

    /**
     * Get overall performance summary
     */
    getSummary() {
        const allResults = [
            this.results.bundle,
            this.results.rendering?.small,
            this.results.rendering?.medium,
            this.results.rendering?.large,
            this.results.memory,
            this.results.fileLoading
        ].filter(Boolean);

        const passed = allResults.filter(r => r.status === 'pass').length;
        const total = allResults.length;
        const warnings = allResults.filter(r => r.warning === 'warning').length;

        return {
            passed,
            total,
            warnings,
            overallStatus: passed === total ? 'pass' : 'fail',
            score: Math.round((passed / total) * 100)
        };
    }

    /**
     * Save performance report to file
     */
    saveReport(filename = 'performance-budget-report.json') {
        const report = this.generateReport();
        const reportPath = path.join(__dirname, '..', filename);
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📊 Performance budget report saved to: ${reportPath}`);
        
        return report;
    }

    /**
     * Print performance budget status to console
     */
    printStatus() {
        console.log('\n🚀 Performance Budget Status\n');
        
        // Bundle size
        if (this.results.bundle) {
            const bundle = this.results.bundle;
            const sizeKB = (bundle.size / 1024).toFixed(2);
            const budgetKB = (bundle.budget / 1024).toFixed(2);
            const status = bundle.status === 'pass' ? '✅' : '❌';
            const warning = bundle.warning === 'warning' ? '⚠️' : '';
            
            console.log(`${status} Bundle Size: ${sizeKB}KB / ${budgetKB}KB ${warning}`);
        }

        // Rendering performance
        if (this.results.rendering) {
            console.log('\n📝 Rendering Performance:');
            Object.keys(this.results.rendering).forEach(size => {
                const result = this.results.rendering[size];
                const status = result.status === 'pass' ? '✅' : '❌';
                const warning = result.warning === 'warning' ? '⚠️' : '';
                
                console.log(`  ${status} ${size}: ${result.actual}ms / ${result.budget}ms ${warning}`);
            });
        }

        // Memory usage
        if (this.results.memory) {
            const memory = this.results.memory;
            const usedMB = (memory.used / 1024 / 1024).toFixed(2);
            const budgetMB = (memory.budget / 1024 / 1024).toFixed(2);
            const status = memory.status === 'pass' ? '✅' : '❌';
            const warning = memory.warning === 'warning' ? '⚠️' : '';
            
            console.log(`${status} Memory Usage: ${usedMB}MB / ${budgetMB}MB ${warning}`);
        }

        // File loading
        if (this.results.fileLoading) {
            const fileLoading = this.results.fileLoading;
            const status = fileLoading.status === 'pass' ? '✅' : '❌';
            const warning = fileLoading.warning === 'warning' ? '⚠️' : '';
            
            console.log(`${status} File Loading: ${fileLoading.loadTime}ms / ${fileLoading.budget}ms ${warning}`);
        }

        // Summary
        const summary = this.getSummary();
        console.log(`\n📊 Overall Score: ${summary.score}% (${summary.passed}/${summary.total} passed)`);
        
        if (summary.warnings > 0) {
            console.log(`⚠️  ${summary.warnings} warnings detected`);
        }

        if (summary.overallStatus === 'fail') {
            console.log('❌ Performance budget exceeded! Please optimize.');
            process.exit(1);
        } else {
            console.log('✅ All performance budgets met!');
        }
    }
}

// CLI usage
if (import.meta.url.endsWith('performance-budget.js') || (process.argv[1] && process.argv[1].includes('performance-budget.js'))) {
    const budget = new PerformanceBudget();
    
    // Check bundle size
    budget.checkBundleSize();
    
    // Mock performance metrics for demonstration
    const mockMetrics = {
        small: 45,
        medium: 180,
        large: 850,
        memoryUsed: 25 * 1024 * 1024, // 25MB
        loadTime: 120
    };
    
    budget.checkRenderingPerformance(mockMetrics);
    budget.checkMemoryUsage(mockMetrics);
    budget.checkFileLoadingPerformance(mockMetrics);
    
    // Print status and save report
    budget.printStatus();
    budget.saveReport();
}

export default PerformanceBudget;
