// Jest setup file for MD Reader Pro
// This configures the testing environment

// Mock DOM environment setup  
require('jest-environment-jsdom');

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  // Suppress all console output during tests
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
});

afterAll(() => {
  // Restore original console methods
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
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

// Mock URL APIs for file operations
global.URL = {
  createObjectURL: jest.fn(() => 'blob:test-url'),
  revokeObjectURL: jest.fn()
};

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

