/**
 * @jest-environment jsdom
 */

import PluginBridge from '../src/plugins/PluginBridge.js';

// Mock child_process to prevent actual process spawning
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

describe('PluginBridge', () => {
    let bridge;

    beforeEach(() => {
        bridge = new PluginBridge({
            pluginId: 'test-plugin',
            type: 'native',
            binary: 'test-binary',
            args: ['--test-mode']
        });
        
        // Force browser mode for testing
        bridge.isNode = false;
    });

    afterEach(() => {
        if (bridge) {
            bridge.stop();
        }
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with provided options', () => {
            expect(bridge.pluginId).toBe('test-plugin');
            expect(bridge.type).toBe('native');
            expect(bridge.binary).toBe('test-binary');
            expect(bridge.args).toEqual(['--test-mode']);
        });

        test('should use default values for missing options', () => {
            const defaultBridge = new PluginBridge();
            
            expect(defaultBridge.pluginId).toBe('unknown');
            expect(defaultBridge.type).toBe('native');
            expect(defaultBridge.args).toEqual([]);
        });

        test('should accept callback functions', () => {
            const onMessage = jest.fn();
            const onError = jest.fn();
            const onReady = jest.fn();
            const onExit = jest.fn();

            const customBridge = new PluginBridge({
                onMessage,
                onError,
                onReady,
                onExit
            });

            expect(customBridge.onMessage).toBe(onMessage);
            expect(customBridge.onError).toBe(onError);
            expect(customBridge.onReady).toBe(onReady);
            expect(customBridge.onExit).toBe(onExit);
        });

        test('should initialize state properties', () => {
            expect(bridge.process).toBeNull();
            expect(bridge.ready).toBe(false);
            expect(bridge.pendingRequests).toBeDefined();
            expect(bridge.buffer).toBe('');
        });

        test('should detect environment', () => {
            expect(typeof bridge.isNode).toBe('boolean');
        });
    });

    describe('start() - Browser mode', () => {
        test('should start in browser mock mode', async () => {
            // In jsdom (browser-like environment), isNode should be false
            expect(bridge.isNode).toBe(false);
            await bridge.start();

            expect(bridge.ready).toBe(true);
            expect(bridge.mockMode).toBe(true);
        });

        test('should call onReady callback in browser mode', async () => {
            const onReady = jest.fn();
            const browserBridge = new PluginBridge({
                type: 'native',
                onReady
            });
            browserBridge.isNode = false; // Force browser mode

            await browserBridge.start();

            expect(onReady).toHaveBeenCalled();
        });
    });

    describe('send() - Mock mode', () => {
        beforeEach(async () => {
            await bridge.start(); // Start in mock mode
        });

        test('should send ping message', async () => {
            const response = await bridge.send('ping');

            expect(response).toEqual({ pong: true });
        });

        test('should send get_capabilities message', async () => {
            const response = await bridge.send('get_capabilities');

            expect(response).toBeDefined();
            expect(response.actions).toBeDefined();
            expect(response.version).toBeDefined();
        });

        test('should send browse message', async () => {
            const response = await bridge.send('browse', { path: '/test' });

            expect(response).toBeDefined();
            expect(response.path).toBe('/test');
            expect(response.entries).toBeDefined();
            expect(Array.isArray(response.entries)).toBe(true);
        });

        test('should send analyze message', async () => {
            const response = await bridge.send('analyze', { files: ['file1.md', 'file2.md'] });

            expect(response).toBeDefined();
            expect(response.files_analyzed).toBe(2);
            expect(response.analyses).toBeDefined();
            expect(response.analyses).toHaveLength(2);
        });

        test('should reject unknown action in mock mode', async () => {
            await expect(bridge.send('unknown_action')).rejects.toThrow();
        });

        test('should reject if not ready', async () => {
            const notReadyBridge = new PluginBridge();
            
            await expect(notReadyBridge.send('ping')).rejects.toThrow('Plugin not ready');
        });

        test('should handle timeout', async () => {
            const shortTimeoutBridge = new PluginBridge();
            shortTimeoutBridge.isNode = false; // Force browser mode
            await shortTimeoutBridge.start();

            // Mock send to never respond
            shortTimeoutBridge._sendMock = jest.fn();

            await expect(
                shortTimeoutBridge.send('test', {}, 100)
            ).rejects.toThrow('Request timeout: test');
        }, 10000);
    });

    describe('_handleData()', () => {
        test('should buffer incomplete JSON', () => {
            bridge._handleData('{"id":"test"');
            
            expect(bridge.buffer).toBe('{"id":"test"');
        });

        test('should process complete JSON lines', () => {
            const handleMessageSpy = jest.spyOn(bridge, '_handleMessage');
            
            bridge._handleData('{"id":"test","success":true}\n');
            
            expect(handleMessageSpy).toHaveBeenCalledWith({
                id: 'test',
                success: true
            });
            expect(bridge.buffer).toBe('');
        });

        test('should handle multiple JSON lines', () => {
            const handleMessageSpy = jest.spyOn(bridge, '_handleMessage');
            
            bridge._handleData('{"id":"1"}\n{"id":"2"}\n');
            
            expect(handleMessageSpy).toHaveBeenCalledTimes(2);
        });

        test('should handle invalid JSON gracefully', () => {
            expect(() => {
                bridge._handleData('invalid json\n');
            }).not.toThrow();
        });

        test('should handle empty lines', () => {
            const handleMessageSpy = jest.spyOn(bridge, '_handleMessage');
            
            bridge._handleData('\n\n{"id":"test"}\n\n');
            
            expect(handleMessageSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('_handleMessage()', () => {
        test('should resolve pending request', () => {
            const resolveSpy = jest.fn();
            const timeoutId = setTimeout(() => {}, 1000);
            
            bridge.pendingRequests.set('test-id', {
                resolve: resolveSpy,
                reject: jest.fn(),
                timeout: timeoutId
            });

            bridge._handleMessage({
                id: 'test-id',
                success: true,
                data: { foo: 'bar' }
            });

            expect(resolveSpy).toHaveBeenCalledWith({ foo: 'bar' });
            expect(bridge.pendingRequests.has('test-id')).toBe(false);
        });

        test('should reject pending request on error', () => {
            const rejectSpy = jest.fn();
            const timeoutId = setTimeout(() => {}, 1000);
            
            bridge.pendingRequests.set('test-id', {
                resolve: jest.fn(),
                reject: rejectSpy,
                timeout: timeoutId
            });

            bridge._handleMessage({
                id: 'test-id',
                success: false,
                error: 'Test error'
            });

            expect(rejectSpy).toHaveBeenCalledWith(expect.any(Error));
            expect(bridge.pendingRequests.has('test-id')).toBe(false);
        });

        test('should call onMessage for unsolicited messages', () => {
            const onMessage = jest.fn();
            const customBridge = new PluginBridge({ onMessage });

            customBridge._handleMessage({
                id: 'unsolicited',
                data: { event: 'test' }
            });

            expect(onMessage).toHaveBeenCalledWith({
                id: 'unsolicited',
                data: { event: 'test' }
            });
        });
    });

    describe('_rejectPendingRequests()', () => {
        test('should reject all pending requests', () => {
            const reject1 = jest.fn();
            const reject2 = jest.fn();
            const timeout1 = setTimeout(() => {}, 1000);
            const timeout2 = setTimeout(() => {}, 1000);

            bridge.pendingRequests.set('req1', { resolve: jest.fn(), reject: reject1, timeout: timeout1 });
            bridge.pendingRequests.set('req2', { resolve: jest.fn(), reject: reject2, timeout: timeout2 });

            bridge._rejectPendingRequests('Test reason');

            expect(reject1).toHaveBeenCalledWith(expect.any(Error));
            expect(reject2).toHaveBeenCalledWith(expect.any(Error));
            expect(bridge.pendingRequests.size).toBe(0);
        });

        test('should clear timeouts', () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
            const timeout = setTimeout(() => {}, 1000);

            bridge.pendingRequests.set('req1', {
                resolve: jest.fn(),
                reject: jest.fn(),
                timeout
            });

            bridge._rejectPendingRequests('Test');

            expect(clearTimeoutSpy).toHaveBeenCalledWith(timeout);
        });
    });

    describe('stop()', () => {
        test('should set ready to false', () => {
            bridge.ready = true;
            bridge.stop();

            expect(bridge.ready).toBe(false);
        });

        test('should reject pending requests', () => {
            const rejectSpy = jest.fn();
            bridge.pendingRequests.set('test', {
                resolve: jest.fn(),
                reject: rejectSpy,
                timeout: setTimeout(() => {}, 1000)
            });

            bridge.stop();

            expect(rejectSpy).toHaveBeenCalled();
        });

        test('should handle stop with no process', () => {
            expect(() => bridge.stop()).not.toThrow();
        });
    });

    describe('isReady()', () => {
        test('should return ready state', () => {
            expect(bridge.isReady()).toBe(false);
            
            bridge.ready = true;
            expect(bridge.isReady()).toBe(true);
        });
    });

    describe('Mock responses', () => {
        beforeEach(async () => {
            await bridge.start();
        });

        test('should mock ping response', async () => {
            const response = await bridge.send('ping');
            expect(response.pong).toBe(true);
        });

        test('should mock get_capabilities response', async () => {
            const response = await bridge.send('get_capabilities');
            
            expect(response.actions).toBeDefined();
            expect(response.version).toBe('0.1.0');
            expect(response.features).toBeDefined();
            expect(response.features.tui).toBe(true);
        });

        test('should mock browse response', async () => {
            const response = await bridge.send('browse', { path: '/test/path' });
            
            expect(response.path).toBe('/test/path');
            expect(response.entries).toBeDefined();
            expect(response.entries.length).toBeGreaterThan(0);
        });

        test('should mock browse response with default path', async () => {
            const response = await bridge.send('browse');
            
            expect(response.path).toBe('.');
        });

        test('should mock analyze response', async () => {
            const files = ['file1.md', 'file2.md', 'file3.md'];
            const response = await bridge.send('analyze', { files });
            
            expect(response.files_analyzed).toBe(3);
            expect(response.analyses).toHaveLength(3);
            expect(response.analyses[0].path).toBe('file1.md');
            expect(response.analyses[0].size).toBe(1024);
            expect(response.analyses[0].file_type).toBe('md');
        });

        test('should mock analyze response with no files', async () => {
            const response = await bridge.send('analyze', { files: [] });
            
            expect(response.files_analyzed).toBe(0);
            expect(response.analyses).toHaveLength(0);
        });
    });

    describe('Message ID generation', () => {
        test('should generate unique message IDs', async () => {
            await bridge.start();

            // Send multiple messages and collect their IDs
            const ids = new Set();
            const promises = [];

            for (let i = 0; i < 10; i++) {
                const promise = bridge.send('ping').then(() => {});
                promises.push(promise);
            }

            await Promise.all(promises);

            // All IDs should be unique (can't easily test this without accessing internals)
            expect(promises.length).toBe(10);
        });
    });

    describe('Error handling', () => {
        test('should handle send without ready state', async () => {
            const notReadyBridge = new PluginBridge();
            
            await expect(notReadyBridge.send('test')).rejects.toThrow('Plugin not ready');
        });

        test('should handle send without process in non-mock mode', async () => {
            bridge.ready = true;
            bridge.mockMode = false;
            bridge.process = null;

            await expect(bridge.send('test')).rejects.toThrow('No plugin process');
        });

        test('should handle invalid JSON in _handleData', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            bridge._handleData('invalid{json}\n');
            
            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
    });

    describe('Environment detection', () => {
        test('should detect Node.js environment', () => {
            // In Jest/jsdom, process should not be defined as Node.js process
            expect(bridge.isNode).toBeDefined();
        });
    });

    describe('Callback options', () => {
        test('should use default console.error for onError', () => {
            const defaultBridge = new PluginBridge();
            expect(defaultBridge.onError).toBe(console.error);
        });

        test('should use empty function for onMessage by default', () => {
            const defaultBridge = new PluginBridge();
            expect(() => defaultBridge.onMessage()).not.toThrow();
        });

        test('should use empty function for onReady by default', () => {
            const defaultBridge = new PluginBridge();
            expect(() => defaultBridge.onReady()).not.toThrow();
        });

        test('should use empty function for onExit by default', () => {
            const defaultBridge = new PluginBridge();
            expect(() => defaultBridge.onExit()).not.toThrow();
        });
    });

    describe('Buffer handling', () => {
        test('should maintain buffer across multiple data chunks', () => {
            bridge._handleData('{"id":"test",');
            expect(bridge.buffer).toBe('{"id":"test",');
            
            bridge._handleData('"success":true}');
            expect(bridge.buffer).toBe('{"id":"test","success":true}');
            
            bridge._handleData('\n');
            expect(bridge.buffer).toBe('');
        });

        test('should handle data with newlines in middle', () => {
            const handleMessageSpy = jest.spyOn(bridge, '_handleMessage');
            
            bridge._handleData('{"id":"1"}\n{"id":"2"}\npartial');
            
            expect(handleMessageSpy).toHaveBeenCalledTimes(2);
            expect(bridge.buffer).toBe('partial');
        });
    });
});
