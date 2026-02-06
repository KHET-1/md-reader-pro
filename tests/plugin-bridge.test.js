/**
 * @jest-environment jsdom
 */

import PluginBridge from '../src/plugins/PluginBridge.js';

describe('PluginBridge', () => {
    let bridge;
    let mockOnMessage;
    let mockOnError;
    let mockOnReady;
    let mockOnExit;

    beforeEach(() => {
        mockOnMessage = jest.fn();
        mockOnError = jest.fn();
        mockOnReady = jest.fn();
        mockOnExit = jest.fn();

        bridge = new PluginBridge({
            pluginId: 'test-plugin',
            type: 'native',
            binary: 'test-binary',
            args: ['--test'],
            onMessage: mockOnMessage,
            onError: mockOnError,
            onReady: mockOnReady,
            onExit: mockOnExit
        });
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
            expect(bridge.args).toEqual(['--test']);
        });

        test('should initialize with default options', () => {
            const defaultBridge = new PluginBridge();

            expect(defaultBridge.pluginId).toBe('unknown');
            expect(defaultBridge.type).toBe('native');
            expect(defaultBridge.args).toEqual([]);
        });

        test('should initialize callbacks', () => {
            expect(bridge.onMessage).toBe(mockOnMessage);
            expect(bridge.onError).toBe(mockOnError);
            expect(bridge.onReady).toBe(mockOnReady);
            expect(bridge.onExit).toBe(mockOnExit);
        });

        test('should initialize state', () => {
            expect(bridge.process).toBeNull();
            expect(bridge.ready).toBe(false);
            expect(bridge.pendingRequests).toBeInstanceOf(Map);
            expect(bridge.buffer).toBe('');
        });

        test('should detect browser environment', () => {
            expect(bridge.isNode).toBeDefined();
        });
    });

    describe('start() - Browser Mode', () => {
        test('should start in browser mock mode', async () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            await bridge.start();

            expect(bridge.ready).toBe(true);
            expect(bridge.mockMode).toBe(true);
            expect(mockOnReady).toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Running in browser mock mode')
            );

            consoleWarnSpy.mockRestore();
        });
    });

    describe('_handleData()', () => {
        test('should handle complete JSON lines', () => {
            const message = { id: 'test', success: true, data: { result: 'ok' } };
            const data = JSON.stringify(message) + '\n';

            bridge._handleData(data);

            expect(mockOnMessage).toHaveBeenCalledWith(message);
        });

        test('should handle multiple JSON lines', () => {
            const msg1 = { id: 'msg1', success: true };
            const msg2 = { id: 'msg2', success: false };
            const data = JSON.stringify(msg1) + '\n' + JSON.stringify(msg2) + '\n';

            bridge._handleData(data);

            expect(mockOnMessage).toHaveBeenCalledTimes(2);
            expect(mockOnMessage).toHaveBeenCalledWith(msg1);
            expect(mockOnMessage).toHaveBeenCalledWith(msg2);
        });

        test('should buffer incomplete JSON lines', () => {
            const message = { id: 'test', success: true };
            const json = JSON.stringify(message);
            const part1 = json.slice(0, 10);
            const part2 = json.slice(10) + '\n';

            bridge._handleData(part1);
            expect(mockOnMessage).not.toHaveBeenCalled();
            expect(bridge.buffer).toBe(part1);

            bridge._handleData(part2);
            expect(mockOnMessage).toHaveBeenCalledWith(message);
            expect(bridge.buffer).toBe('');
        });

        test('should ignore empty lines', () => {
            const data = '\n\n\n';

            bridge._handleData(data);

            expect(mockOnMessage).not.toHaveBeenCalled();
        });

        test('should handle invalid JSON gracefully', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            const data = 'invalid json\n';

            bridge._handleData(data);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Invalid JSON'),
                'invalid json'
            );

            consoleErrorSpy.mockRestore();
        });
    });

    describe('_handleMessage()', () => {
        test('should resolve pending request on success', () => {
            const messageId = 'req-123';
            const resolve = jest.fn();
            const reject = jest.fn();
            const timeout = setTimeout(() => {}, 1000);

            bridge.pendingRequests.set(messageId, { resolve, reject, timeout });

            bridge._handleMessage({
                id: messageId,
                success: true,
                data: { result: 'success' }
            });

            expect(resolve).toHaveBeenCalledWith({ result: 'success' });
            expect(reject).not.toHaveBeenCalled();
            expect(bridge.pendingRequests.has(messageId)).toBe(false);
        });

        test('should reject pending request on error', () => {
            const messageId = 'req-456';
            const resolve = jest.fn();
            const reject = jest.fn();
            const timeout = setTimeout(() => {}, 1000);

            bridge.pendingRequests.set(messageId, { resolve, reject, timeout });

            bridge._handleMessage({
                id: messageId,
                success: false,
                error: 'Something failed'
            });

            expect(reject).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Something failed'
            }));
            expect(resolve).not.toHaveBeenCalled();
            expect(bridge.pendingRequests.has(messageId)).toBe(false);
        });

        test('should call onMessage for unsolicited messages', () => {
            const message = {
                id: 'event-1',
                type: 'event',
                data: { event: 'progress', value: 50 }
            };

            bridge._handleMessage(message);

            expect(mockOnMessage).toHaveBeenCalledWith(message);
        });
    });

    describe('send() - Mock Mode', () => {
        beforeEach(async () => {
            await bridge.start(); // Start in browser mock mode
        });

        test('should send ping command', async () => {
            const result = await bridge.send('ping');

            expect(result).toEqual({ pong: true });
        });

        test('should send get_capabilities command', async () => {
            const result = await bridge.send('get_capabilities');

            expect(result).toHaveProperty('actions');
            expect(result).toHaveProperty('version');
            expect(result.actions).toContain('ping');
            expect(result.actions).toContain('analyze');
        });

        test('should send browse command', async () => {
            const result = await bridge.send('browse', { path: '/test' });

            expect(result).toHaveProperty('path');
            expect(result).toHaveProperty('entries');
            expect(Array.isArray(result.entries)).toBe(true);
        });

        test('should send analyze command', async () => {
            const result = await bridge.send('analyze', { files: ['test.md'] });

            expect(result).toHaveProperty('files_analyzed');
            expect(result).toHaveProperty('analyses');
            expect(result.files_analyzed).toBe(1);
        });

        test('should reject unknown commands', async () => {
            await expect(bridge.send('unknown_action')).rejects.toThrow('Mock: Unknown action');
        });

        test('should reject when not ready', async () => {
            const notReadyBridge = new PluginBridge({ pluginId: 'test' });

            await expect(notReadyBridge.send('ping')).rejects.toThrow('Plugin not ready');
        });

        test('should handle timeout', async () => {
            jest.useFakeTimers();

            const promise = bridge.send('ping', {}, 100);

            jest.advanceTimersByTime(150);

            await expect(promise).rejects.toThrow('Request timeout: ping');

            jest.useRealTimers();
        });
    });

    describe('_rejectPendingRequests()', () => {
        test('should reject all pending requests', () => {
            const resolve1 = jest.fn();
            const reject1 = jest.fn();
            const resolve2 = jest.fn();
            const reject2 = jest.fn();

            bridge.pendingRequests.set('req1', {
                resolve: resolve1,
                reject: reject1,
                timeout: setTimeout(() => {}, 1000)
            });
            bridge.pendingRequests.set('req2', {
                resolve: resolve2,
                reject: reject2,
                timeout: setTimeout(() => {}, 1000)
            });

            bridge._rejectPendingRequests('Test reason');

            expect(reject1).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Test reason'
            }));
            expect(reject2).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Test reason'
            }));
            expect(bridge.pendingRequests.size).toBe(0);
        });
    });

    describe('stop()', () => {
        test('should set ready to false', async () => {
            await bridge.start();
            expect(bridge.ready).toBe(true);

            bridge.stop();

            expect(bridge.ready).toBe(false);
        });

        test('should reject pending requests', async () => {
            await bridge.start();

            const promise = bridge.send('ping', {}, 10000);
            bridge.stop();

            await expect(promise).rejects.toThrow('Plugin stopped');
        });

        test('should handle no process gracefully', () => {
            expect(() => bridge.stop()).not.toThrow();
        });
    });

    describe('isReady()', () => {
        test('should return false initially', () => {
            expect(bridge.isReady()).toBe(false);
        });

        test('should return true after start', async () => {
            await bridge.start();

            expect(bridge.isReady()).toBe(true);
        });

        test('should return false after stop', async () => {
            await bridge.start();
            bridge.stop();

            expect(bridge.isReady()).toBe(false);
        });
    });

    describe('generateMessageId', () => {
        test('should generate unique message IDs', () => {
            // We need to test this indirectly through send
            const ids = new Set();

            bridge.start().then(() => {
                for (let i = 0; i < 10; i++) {
                    bridge.send('ping').then(() => {}).catch(() => {});
                }
            });

            // Check that pending requests have different IDs
            setTimeout(() => {
                for (const [id] of bridge.pendingRequests) {
                    ids.add(id);
                }
                expect(ids.size).toBeGreaterThan(1);
            }, 100);
        });
    });

    describe('Edge Cases', () => {
        test('should handle rapid successive messages', () => {
            const messages = Array.from({ length: 100 }, (_, i) => ({
                id: `msg-${i}`,
                success: true,
                data: { index: i }
            }));

            const data = messages.map(m => JSON.stringify(m)).join('\n') + '\n';

            bridge._handleData(data);

            expect(mockOnMessage).toHaveBeenCalledTimes(100);
        });

        test('should handle large payloads', async () => {
            await bridge.start();

            const largePayload = {
                files: Array.from({ length: 1000 }, (_, i) => `file-${i}.md`)
            };

            const result = await bridge.send('analyze', largePayload);

            expect(result.files_analyzed).toBe(1000);
        });

        test('should handle special characters in messages', () => {
            const message = {
                id: 'test',
                success: true,
                data: { text: 'Hello\nWorld\t"Test"' }
            };

            const data = JSON.stringify(message) + '\n';

            bridge._handleData(data);

            expect(mockOnMessage).toHaveBeenCalledWith(message);
        });
    });
});
