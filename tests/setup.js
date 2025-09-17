// Jest setup file for MD Reader Pro
// This configures the testing environment

// Mock DOM environment setup  
require('jest-environment-jsdom');

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress expected warnings/errors during tests
  console.error = (...args) => {
    if (args[0]?.includes?.('Warning: ReactDOM.render is no longer supported')) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args) => {
    if (args[0]?.includes?.('deprecated')) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock TensorFlow.js for testing
global.tf = {
  loadLayersModel: jest.fn().mockResolvedValue({
    predict: jest.fn().mockReturnValue({
      dataSync: jest.fn().mockReturnValue([0.8, 0.2]),
      dispose: jest.fn()
    }),
    dispose: jest.fn()
  }),
  tensor: jest.fn().mockReturnValue({
    dataSync: jest.fn().mockReturnValue([1, 2, 3]),
    dispose: jest.fn()
  }),
  dispose: jest.fn()
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 5000000
  }
};

console.log('✅ Jest environment configured for MD Reader Pro testing');
