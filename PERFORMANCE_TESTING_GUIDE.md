# Performance Testing Standardization Guide

## Environment Setup for Consistent Results

### 1. **Controlled Environment**
```bash
# Close unnecessary applications
# Use consistent Node.js version: v24.8.0
# Run tests in isolation (no background processes)
# Consistent system load
```

### 2. **Standardized Test Execution**
```bash
# Clear Jest cache before performance tests
npm run clean:test

# Run benchmarks only (not regular tests)
npm run test:benchmarks

# For regression testing
npm run performance:regression
```

### 3. **Hardware Considerations**
- **CPU**: Ensure consistent clock speeds (disable power management)
- **Memory**: Close memory-intensive applications
- **Disk**: Use SSD for consistent I/O performance
- **Network**: Disable network-intensive applications

## Performance Test Types

### 1. **Unit Performance Tests** (`performance.test.js`)
- **Purpose**: Validate performance thresholds
- **Methodology**: Single execution with Jest overhead
- **Expected Results**: Higher numbers due to test overhead
- **Thresholds**: 50ms (small), 200ms (medium), 1000ms (large)

### 2. **Benchmark Tests** (`benchmarks.test.js`)
- **Purpose**: Precise performance measurement
- **Methodology**: Multiple iterations with warm-up
- **Expected Results**: Lower, more accurate numbers
- **Thresholds**: 10ms (small), 50ms (medium), 200ms (large)

### 3. **Regression Tests** (`performance-regression.js`)
- **Purpose**: Detect performance degradation over time
- **Methodology**: Compare against baseline
- **Expected Results**: Trend analysis

## Standardized Measurement Commands

### For AI/Automated Testing:
```bash
# 1. Clean environment
npm run clean:test && npm install

# 2. Run isolated benchmarks with multiple iterations
npm run test:benchmarks -- --runInBand --verbose

# 3. Capture baseline for comparison
npm run performance:update-baseline

# 4. Generate comparable metrics
node -e "
const fs = require('fs');
const baseline = JSON.parse(fs.readFileSync('performance-baseline.json', 'utf8'));
console.log('STANDARDIZED RESULTS:');
console.log('Small Markdown:', baseline.benchmarks.small_markdown_rendering.average, 'ms');
console.log('Medium Markdown:', baseline.benchmarks.medium_markdown_rendering.average, 'ms');
console.log('Large Markdown:', baseline.benchmarks.large_markdown_rendering.average, 'ms');
console.log('Test Environment: jsdom, Node.js', process.version);
"
```

### For Cross-Platform Comparison:
```bash
# Include environment metadata
node -e "
console.log('ENVIRONMENT INFO:');
console.log('Node.js:', process.version);
console.log('Platform:', process.platform);
console.log('Arch:', process.arch);
console.log('Memory:', Math.round(process.memoryUsage().heapTotal / 1024 / 1024), 'MB');
console.log('CPU Count:', require('os').cpus().length);
"
```

## Expected Performance Ranges by Environment

### **jsdom (Jest) Environment:**
- Small: 3-15ms (benchmark) vs 20-60ms (test)
- Medium: 20-80ms (benchmark) vs 100-250ms (test)
- Large: 100-300ms (benchmark) vs 400-800ms (test)

### **Real Browser Environment:**
- Small: 1-5ms
- Medium: 5-25ms
- Large: 25-100ms

### **Factors Affecting Results:**
1. **Test Framework Overhead**: Jest adds 20-50ms
2. **DOM Environment**: jsdom is 2-5x slower than real browsers
3. **JIT Warming**: First runs are 3-10x slower
4. **System Load**: Can vary by 50-200%
5. **Hardware**: Can vary by 2-10x

## Apples-to-Apples Comparison Protocol

### 1. **Use Identical Commands**:
```bash
npm run test:benchmarks -- --runInBand --silent=false
```

### 2. **Same Test Data Size**:
- Small: ~100 characters
- Medium: ~2KB
- Large: ~50KB

### 3. **Same Iteration Count**:
- Benchmarks: 50 iterations minimum
- Warm-up: 5 iterations before measurement

### 4. **Same Environment Variables**:
```bash
export NODE_ENV=test
export NODE_OPTIONS="--max-old-space-size=4096"
```

### 5. **Comparable Baselines**:
```bash
# Generate baseline with metadata
npm run performance:update-baseline
# Compare using same baseline structure
npm run performance:regression
```

## Troubleshooting Performance Variations

### If numbers are significantly higher:
1. Check system load (`top`/`Task Manager`)
2. Clear Jest cache (`npm run clean:test`)
3. Close background applications
4. Restart Node.js process
5. Check for memory pressure

### If numbers are significantly lower:
1. Verify test is actually running (not cached)
2. Check for reduced test complexity
3. Verify DOM operations are happening
4. Check for mocked dependencies

### For consistent cross-AI comparison:
1. Use the same Node.js version
2. Use the same test commands
3. Use the same test data
4. Compare benchmark results, not test results
5. Include environment metadata in reports