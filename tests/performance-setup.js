
// Performance monitoring for tests
const slowTestThreshold = 100; // 100ms

beforeEach(() => {
    global.testStartTime = Date.now();
});

afterEach(() => {
    const testDuration = Date.now() - global.testStartTime;
    if (testDuration > slowTestThreshold) {
        console.warn(`⚠️  Slow test detected: ${expect.getState().currentTestName} (${testDuration}ms)`);
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
        console.warn(`🧠 High memory usage detected: ${expect.getState().currentTestName} (+${memoryMB.toFixed(2)}MB)`);
    }
});