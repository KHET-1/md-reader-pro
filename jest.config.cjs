module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '!<rootDir>/tests/e2e/**/*',
    '!<rootDir>/tests/edge-tools.test.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/edge-tools.test.js',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(marked|dompurify)/)', // Transform marked and dompurify
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.min.js',
    '!src/**/vendor/**',
    '!src/**/*.test.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  coverageThreshold: {
    global: {
      branches: 64, // Realistic threshold - improved from 52.3%
      functions: 75, // Adjusted to current: 75.43%
      lines: 77, // Adjusted to current: 77.24%
      statements: 74 // Realistic threshold - improved from 67.84%
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css)$': '<rootDir>/tests/__mocks__/styleMock.js'
  },
  testTimeout: 15000,
  maxWorkers: 1, // Run tests serially for consistent performance measurements
  cache: true,
  clearMocks: true,
  restoreMocks: true,
  verbose: false,
  // Reduce test environment interference
  detectOpenHandles: true,
  forceExit: false
};
