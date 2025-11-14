// MD Reader Pro - Test Server Tests
// Testing the Express test server with rate limiting functionality

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Test Server - scripts/test-utils/test-server.cjs', () => {
  let mockApp, mockServer, mockExpress, mockRateLimit;
  let mockFs, mockPath, mockEscape, originalProcessOn;

  beforeEach(() => {
    jest.resetModules();
    originalProcessOn = process.on;
    
    mockApp = { get: jest.fn(), use: jest.fn(), listen: jest.fn() };
    mockExpress = jest.fn(() => mockApp);
    mockExpress.static = jest.fn();
    
    const mockServerClose = jest.fn((cb) => cb && cb());
    mockServer = { close: mockServerClose };
    mockApp.listen.mockReturnValue(mockServer);
    
    mockRateLimit = jest.fn(() => jest.fn());
    mockFs = { existsSync: jest.fn(), readdirSync: jest.fn() };
    mockPath = { join: jest.fn((...args) => args.join('/')) };
    mockEscape = jest.fn((str) => str.replace(/[&<>"']/g, (char) => {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return map[char];
    }));
    
    process.on = jest.fn();
    
    jest.doMock('express', () => mockExpress);
    jest.doMock('express-rate-limit', () => mockRateLimit);
    jest.doMock('fs', () => mockFs);
    jest.doMock('path', () => mockPath);
    jest.doMock('escape-html', () => mockEscape);
  });

  afterEach(() => {
    process.on = originalProcessOn;
    jest.restoreAllMocks();
  });

  describe('Server Initialization', () => {
    test('should create Express app instance', () => {
      require('../../scripts/test-utils/test-server.cjs');
      expect(mockExpress).toHaveBeenCalled();
    });

    test('should use default PORT 3100', () => {
      delete process.env.PORT;
      require('../../scripts/test-utils/test-server.cjs');
      expect(mockApp.listen).toHaveBeenCalledWith(3100, expect.any(Function));
    });

    test('should use custom PORT from env', () => {
      process.env.PORT = '4000';
      require('../../scripts/test-utils/test-server.cjs');
      expect(mockApp.listen).toHaveBeenCalledWith('4000', expect.any(Function));
      delete process.env.PORT;
    });
  });

  describe('Rate Limiting', () => {
    test('should configure rate limiter correctly', () => {
      require('../../scripts/test-utils/test-server.cjs');
      expect(mockRateLimit).toHaveBeenCalledWith({
        windowMs: 900000,
        max: 100
      });
    });

    test('should apply rate limiter middleware', () => {
      require('../../scripts/test-utils/test-server.cjs');
      const limiter = mockRateLimit.mock.results[0].value;
      expect(mockApp.use).toHaveBeenCalledWith(limiter);
    });
  });

  describe('Routes and Middleware', () => {
    test('should register /test-missing-dom.html route', () => {
      require('../../scripts/test-utils/test-server.cjs');
      const route = mockApp.get.mock.calls.find(c => c[0] === '/test-missing-dom.html');
      expect(route).toBeTruthy();
    });

    test('should configure static file serving', () => {
      require('../../scripts/test-utils/test-server.cjs');
      expect(mockExpress.static).toHaveBeenCalled();
    });

    test('should escape bundle filename in HTML', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['bundle<script>.js']);
      require('../../scripts/test-utils/test-server.cjs');
      
      const route = mockApp.get.mock.calls.find(c => c[0] === '/test-missing-dom.html');
      const mockRes = { send: jest.fn() };
      route[1]({}, mockRes);
      
      expect(mockEscape).toHaveBeenCalled();
    });
  });

  describe('Graceful Shutdown', () => {
    test('should register SIGINT handler', () => {
      require('../../scripts/test-utils/test-server.cjs');
      const handler = process.on.mock.calls.find(c => c[0] === 'SIGINT');
      expect(handler).toBeTruthy();
    });

    test('should register SIGTERM handler', () => {
      require('../../scripts/test-utils/test-server.cjs');
      const handler = process.on.mock.calls.find(c => c[0] === 'SIGTERM');
      expect(handler).toBeTruthy();
    });

    test('should close server on SIGINT', () => {
      jest.spyOn(console, 'log').mockImplementation();
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();
      
      require('../../scripts/test-utils/test-server.cjs');
      const handler = process.on.mock.calls.find(c => c[0] === 'SIGINT')[1];
      handler();
      
      expect(exitSpy).toHaveBeenCalledWith(0);
      exitSpy.mockRestore();
    });
  });
});
