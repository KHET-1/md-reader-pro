/**
 * Tests for PluginBridge module
 */
import PluginBridge from '../src/plugins/PluginBridge.js';

describe('PluginBridge', () => {
    let bridge;

    afterEach(() => {
        if (bridge) {
            bridge.stop();
        }
    });

    describe('constructor', () => {
        test('creates with default options', () => {
            bridge = new PluginBridge();
            expect(bridge.pluginId).toBe('unknown');
            expect(bridge.type).toBe('native');
            expect(bridge.ready).toBe(false);
            expect(bridge.buffer).toBe('');
            expect(bridge.args).toEqual([]);
        });

        test('accepts custom options', () => {
            const onMessage = jest.fn();
            const onError = jest.fn();
            const onReady = jest.fn();
            const onExit = jest.fn();

            bridge = new PluginBridge({
                pluginId: 'test-plugin',
                type: 'native',
                binary: '/usr/bin/test',
                args: ['--mode', 'plugin'],
                onMessage,
                onError,
                onReady,
                onExit
            });

            expect(bridge.pluginId).toBe('test-plugin');
            expect(bridge.binary).toBe('/usr/bin/test');
            expect(bridge.args).toEqual(['--mode', 'plugin']);
        });

        test('detects browser environment (no node process)', () => {
            bridge = new PluginBridge();
            // In jsdom, process is defined but it's Node
            expect(bridge.isNode).toBeDefined();
        });
    });

    describe('start - browser mode', () => {
        test('starts in browser mock mode for native type', async () => {
            bridge = new PluginBridge({
                pluginId: 'test',
                type: 'native'
            });
            // Override isNode to simulate browser
            bridge.isNode = false;

            await bridge.start();
            expect(bridge.ready).toBe(true);
            expect(bridge.mockMode).toBe(true);
        });

        test('calls onReady when starting in browser', async () => {
            const onReady = jest.fn();
            bridge = new PluginBridge({
                pluginId: 'test',
                type: 'native',
                onReady
            });
            bridge.isNode = false;

            await bridge.start();
            expect(onReady).toHaveBeenCalled();
        });

        test('does nothing for non-native type', async () => {
            bridge = new PluginBridge({
                pluginId: 'test',
                type: 'wasm'
            });
            bridge.isNode = false;

            await bridge.start();
            expect(bridge.ready).toBe(false);
        });
    });

    describe('send - mock mode', () => {
        beforeEach(async () => {
            bridge = new PluginBridge({
                pluginId: 'test',
                type: 'native'
            });
            bridge.isNode = false;
            await bridge.start();
        });

        test('throws when not ready', async () => {
            bridge.ready = false;
            await expect(bridge.send('ping')).rejects.toThrow('Plugin not ready');
        });

        test('handles ping action', async () => {
            const result = await bridge.send('ping');
            expect(result).toEqual({ pong: true });
        });

        test('handles get_capabilities action', async () => {
            const result = await bridge.send('get_capabilities');
            expect(result.actions).toContain('ping');
            expect(result.actions).toContain('analyze');
            expect(result.version).toBe('0.1.0');
        });

        test('handles browse action', async () => {
            const result = await bridge.send('browse', { path: '/test' });
            expect(result.path).toBe('/test');
            expect(result.entries).toBeInstanceOf(Array);
        });

        test('handles browse with default path', async () => {
            const result = await bridge.send('browse', {});
            expect(result.path).toBe('.');
        });

        test('handles analyze action', async () => {
            const result = await bridge.send('analyze', {
                files: ['file1.md', 'file2.md']
            });
            expect(result.files_analyzed).toBe(2);
            expect(result.analyses).toHaveLength(2);
            expect(result.analyses[0].path).toBe('file1.md');
        });

        test('handles analyze with no files', async () => {
            const result = await bridge.send('analyze', {});
            expect(result.files_analyzed).toBe(0);
            expect(result.analyses).toHaveLength(0);
        });

        test('handles unknown action', async () => {
            await expect(bridge.send('unknown_action')).rejects.toThrow('Mock: Unknown action unknown_action');
        });

        test('handles request timeout', async () => {
            // Send with very short timeout
            const promise = bridge.send('ping', {}, 1);
            // The mock has a 50ms delay, so 1ms timeout should fail
            await expect(promise).rejects.toThrow('Request timeout: ping');
        });
    });

    describe('_handleData', () => {
        test('processes complete JSON lines', () => {
            bridge = new PluginBridge({ pluginId: 'test' });
            bridge.isNode = false;
            bridge.ready = true;

            const handleMessage = jest.fn();
            bridge._handleMessage = handleMessage;

            bridge._handleData('{"id":"msg-1","success":true,"data":{"ok":true}}\n');
            expect(handleMessage).toHaveBeenCalledWith({
                id: 'msg-1',
                success: true,
                data: { ok: true }
            });
        });

        test('buffers incomplete lines', () => {
            bridge = new PluginBridge({ pluginId: 'test' });
            bridge._handleMessage = jest.fn();

            bridge._handleData('{"incomplete":');
            expect(bridge.buffer).toBe('{"incomplete":');
            expect(bridge._handleMessage).not.toHaveBeenCalled();
        });

        test('processes buffered data when completed', () => {
            bridge = new PluginBridge({ pluginId: 'test' });
            bridge._handleMessage = jest.fn();

            bridge._handleData('{"id":"msg-1"');
            bridge._handleData(',"success":true}\n');
            expect(bridge._handleMessage).toHaveBeenCalledWith({
                id: 'msg-1',
                success: true
            });
        });

        test('skips empty lines', () => {
            bridge = new PluginBridge({ pluginId: 'test' });
            bridge._handleMessage = jest.fn();

            bridge._handleData('\n\n\n');
            expect(bridge._handleMessage).not.toHaveBeenCalled();
        });

        test('handles invalid JSON gracefully', () => {
            bridge = new PluginBridge({ pluginId: 'test' });
            bridge._handleMessage = jest.fn();

            bridge._handleData('not-json\n');
            expect(bridge._handleMessage).not.toHaveBeenCalled();
        });
    });

    describe('_handleMessage', () => {
        test('resolves pending request on success', async () => {
            bridge = new PluginBridge({ pluginId: 'test' });
            bridge.isNode = false;
            bridge.ready = true;
            bridge.mockMode = true;

            const resolvePromise = new Promise((resolve) => {
                bridge.pendingRequests.set('test-msg', {
                    resolve,
                    reject: jest.fn(),
                    timeout: setTimeout(() => {}, 10000)
                });
            });

            bridge._handleMessage({ id: 'test-msg', success: true, data: { result: 'ok' } });
            const result = await resolvePromise;
            expect(result).toEqual({ result: 'ok' });
            expect(bridge.pendingRequests.has('test-msg')).toBe(false);
        });

        test('rejects pending request on failure', async () => {
            bridge = new PluginBridge({ pluginId: 'test' });

            const rejectPromise = new Promise((resolve, reject) => {
                bridge.pendingRequests.set('test-msg', {
                    resolve: jest.fn(),
                    reject: (err) => { resolve(err); },
                    timeout: setTimeout(() => {}, 10000)
                });
            });

            bridge._handleMessage({ id: 'test-msg', success: false, error: 'something broke' });
            const err = await rejectPromise;
            expect(err.message).toBe('something broke');
        });

        test('rejects with default message when no error string', async () => {
            bridge = new PluginBridge({ pluginId: 'test' });

            const rejectPromise = new Promise((resolve) => {
                bridge.pendingRequests.set('test-msg', {
                    resolve: jest.fn(),
                    reject: (err) => { resolve(err); },
                    timeout: setTimeout(() => {}, 10000)
                });
            });

            bridge._handleMessage({ id: 'test-msg', success: false });
            const err = await rejectPromise;
            expect(err.message).toBe('Unknown error');
        });

        test('calls onMessage for unsolicited messages', () => {
            const onMessage = jest.fn();
            bridge = new PluginBridge({ pluginId: 'test', onMessage });

            bridge._handleMessage({ id: 'event-1', type: 'notification', data: { text: 'hello' } });
            expect(onMessage).toHaveBeenCalledWith({
                id: 'event-1',
                type: 'notification',
                data: { text: 'hello' }
            });
        });
    });

    describe('_rejectPendingRequests', () => {
        test('rejects all pending requests', () => {
            bridge = new PluginBridge({ pluginId: 'test' });
            const reject1 = jest.fn();
            const reject2 = jest.fn();

            bridge.pendingRequests.set('msg-1', {
                resolve: jest.fn(),
                reject: reject1,
                timeout: setTimeout(() => {}, 10000)
            });
            bridge.pendingRequests.set('msg-2', {
                resolve: jest.fn(),
                reject: reject2,
                timeout: setTimeout(() => {}, 10000)
            });

            bridge._rejectPendingRequests('shutting down');
            expect(reject1).toHaveBeenCalledWith(expect.any(Error));
            expect(reject2).toHaveBeenCalledWith(expect.any(Error));
            expect(bridge.pendingRequests.size).toBe(0);
        });
    });

    describe('stop', () => {
        test('stops and sets ready to false', async () => {
            bridge = new PluginBridge({ pluginId: 'test' });
            bridge.isNode = false;
            await bridge.start();

            bridge.stop();
            expect(bridge.ready).toBe(false);
        });

        test('rejects pending requests on stop', async () => {
            bridge = new PluginBridge({ pluginId: 'test' });
            bridge.isNode = false;
            await bridge.start();

            const reject = jest.fn();
            bridge.pendingRequests.set('msg-1', {
                resolve: jest.fn(),
                reject,
                timeout: setTimeout(() => {}, 10000)
            });

            bridge.stop();
            expect(reject).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('isReady', () => {
        test('returns false initially', () => {
            bridge = new PluginBridge({ pluginId: 'test' });
            expect(bridge.isReady()).toBe(false);
        });

        test('returns true after start', async () => {
            bridge = new PluginBridge({ pluginId: 'test' });
            bridge.isNode = false;
            await bridge.start();
            expect(bridge.isReady()).toBe(true);
        });
    });

    describe('send without process', () => {
        test('rejects when no process and not mock mode', async () => {
            bridge = new PluginBridge({ pluginId: 'test' });
            bridge.ready = true;
            bridge.mockMode = false;
            bridge.process = null;

            await expect(bridge.send('ping')).rejects.toThrow('No plugin process');
        });
    });
});
