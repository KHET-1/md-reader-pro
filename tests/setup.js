// Jest setup file for MD Reader Pro
// This configures the testing environment

// Mock DOM environment setup
require('jest-environment-jsdom');

// Jest globals are automatically available in test environment
// No need to manually import and assign them

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

// Mock DOM APIs

global.File = class File {
  constructor(chunks, filename, options = {}) {
    this.name = filename;
    this.type = options.type || '';
    this.chunks = chunks;
  }
};

// Mock FileReader
global.FileReader = class FileReader {
  constructor() {
    this.readyState = 0;
    this.result = null;
    this.error = null;
    this.onload = null;
    this.onerror = null;
  }
  
  readAsText(file) {
    if (file instanceof File) {
      this.result = 'test markdown content';
      this.readyState = 2;
      if (this.onload) {
        this.onload({ target: this });
      }
    } else {
      this.error = new Error('Invalid file type');
      this.readyState = 2;
      if (this.onerror) {
        this.onerror({ target: this });
      }
    }
  }
};

// Use JSDOM's Event constructor
global.Event = global.window.Event;

// Use JSDOM's KeyboardEvent constructor
global.KeyboardEvent = global.window.KeyboardEvent;

// Mock document.execCommand for clipboard operations
document.execCommand = jest.fn((command) => {
  if (command === 'copy') {
    return true;
  }
  return false;
});

// Mock navigator.clipboard for modern clipboard API
if (!global.navigator.clipboard) {
  global.navigator.clipboard = {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  };
}
