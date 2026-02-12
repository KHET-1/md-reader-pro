/**
 * Tests for PluginLoader module
 */
import PluginLoader from '../src/plugins/PluginLoader.js';
import PluginBridge from '../src/plugins/PluginBridge.js';

// Mock PluginBridge to avoid spawning real processes in test
jest.mock('../src/plugins/PluginBridge.js', () => {
    return jest.fn().mockImplementation((options) => ({
        pluginId: options.pluginId,
        type: options.type,
        ready: false,
        mockMode: true,
        start: jest.fn().mockImplementation(function() {
            this.ready = true;
            if (options.onReady) options.onReady();
            return Promise.resolve();
        }),
        stop: jest.fn().mockImplementation(function() {
            this.ready = false;
        }),
        send: jest.fn().mockResolvedValue({ pong: true }),
        isReady: jest.fn().mockReturnValue(true)
    }));
});

describe('PluginLoader', () => {
    let loader;

    beforeEach(() => {
        PluginBridge.mockClear();
        loader = new PluginLoader({
            pluginsDir: './test-plugins',
            onPluginReady: jest.fn(),
            onPluginError: jest.fn(),
            onPluginMessage: jest.fn()
        });
    });

    afterEach(() => {
        loader.stopAll();
    });

    describe('constructor', () => {
        test('creates with default options', () => {
            const defaultLoader = new PluginLoader();
            expect(defaultLoader.pluginsDir).toBe('./plugins');
            expect(defaultLoader.manifests.size).toBe(0);
            expect(defaultLoader.instances.size).toBe(0);
        });

        test('accepts custom options', () => {
            expect(loader.pluginsDir).toBe('./test-plugins');
        });
    });

    describe('discover', () => {
        test('discovers diamond-drill plugin', async () => {
            const plugins = await loader.discover();
            expect(plugins).toHaveLength(1);
            expect(plugins[0].id).toBe('diamond-drill');
            expect(plugins[0].name).toBe('Diamond Drill');
            expect(plugins[0].type).toBe('native');
        });

        test('stores manifest in internal map', async () => {
            await loader.discover();
            expect(loader.manifests.has('diamond-drill')).toBe(true);
        });

        test('returns correct manifest structure', async () => {
            const [manifest] = await loader.discover();
            expect(manifest).toHaveProperty('id');
            expect(manifest).toHaveProperty('name');
            expect(manifest).toHaveProperty('version');
            expect(manifest).toHaveProperty('type');
            expect(manifest).toHaveProperty('description');
            expect(manifest).toHaveProperty('capabilities');
            expect(manifest).toHaveProperty('entry');
            expect(manifest).toHaveProperty('permissions');
        });
    });

    describe('load', () => {
        beforeEach(async () => {
            await loader.discover();
        });

        test('loads a native plugin', async () => {
            const instance = await loader.load('diamond-drill');
            expect(instance.id).toBe('diamond-drill');
            expect(instance.status).toBe('ready');
            expect(instance.bridge).toBeDefined();
            expect(typeof instance.send).toBe('function');
            expect(typeof instance.stop).toBe('function');
        });

        test('returns existing instance if already loaded', async () => {
            const first = await loader.load('diamond-drill');
            const second = await loader.load('diamond-drill');
            expect(first).toBe(second);
        });

        test('throws for unknown plugin', async () => {
            await expect(loader.load('nonexistent')).rejects.toThrow('Plugin not found: nonexistent');
        });

        test('loaded instance can send messages', async () => {
            const instance = await loader.load('diamond-drill');
            const result = await instance.send('ping');
            expect(result).toEqual({ pong: true });
        });

        test('handles wasm plugin type', async () => {
            loader.manifests.set('test-wasm', {
                id: 'test-wasm',
                name: 'Test WASM',
                version: '1.0.0',
                type: 'wasm',
                entry: { wasm: 'test.wasm' }
            });

            const instance = await loader.load('test-wasm');
            expect(instance.status).toBe('error');
            await expect(instance.send('ping')).rejects.toThrow('WASM not implemented');
        });

        test('handles iframe plugin type', async () => {
            loader.manifests.set('test-iframe', {
                id: 'test-iframe',
                name: 'Test IFrame',
                version: '1.0.0',
                type: 'iframe',
                entry: { iframe: 'test.html' }
            });

            const instance = await loader.load('test-iframe');
            expect(instance.status).toBe('error');
            await expect(instance.send('ping')).rejects.toThrow('IFrame not implemented');
        });

        test('handles worker plugin type', async () => {
            loader.manifests.set('test-worker', {
                id: 'test-worker',
                name: 'Test Worker',
                version: '1.0.0',
                type: 'worker',
                entry: { worker: 'test.js' }
            });

            const instance = await loader.load('test-worker');
            expect(instance.status).toBe('error');
            await expect(instance.send('ping')).rejects.toThrow('Worker not implemented');
        });

        test('throws for unknown plugin type', async () => {
            loader.manifests.set('test-unknown', {
                id: 'test-unknown',
                name: 'Test Unknown',
                version: '1.0.0',
                type: 'alien',
                entry: {}
            });

            await expect(loader.load('test-unknown')).rejects.toThrow('Unknown plugin type: alien');
        });
    });

    describe('unload', () => {
        test('unloads a loaded plugin', async () => {
            await loader.discover();
            await loader.load('diamond-drill');
            expect(loader.isLoaded('diamond-drill')).toBe(true);

            await loader.unload('diamond-drill');
            expect(loader.isLoaded('diamond-drill')).toBe(false);
        });

        test('no-op for non-loaded plugin', async () => {
            await expect(loader.unload('nonexistent')).resolves.toBeUndefined();
        });
    });

    describe('hotReload', () => {
        test('hot reloads a loaded plugin', async () => {
            await loader.discover();
            await loader.load('diamond-drill');

            const reloaded = await loader.hotReload('diamond-drill');
            expect(reloaded.id).toBe('diamond-drill');
            expect(reloaded.status).toBe('ready');
        });

        test('hot reloads a plugin not currently loaded', async () => {
            await loader.discover();

            const instance = await loader.hotReload('diamond-drill');
            expect(instance.id).toBe('diamond-drill');
            expect(instance.status).toBe('ready');
        });

        test('restores old manifest if rediscovery loses it', async () => {
            await loader.discover();
            // Add a custom plugin that discover() won't find
            const customManifest = {
                id: 'custom-plugin',
                name: 'Custom Plugin',
                version: '1.0.0',
                type: 'native',
                entry: { native: { binary: 'custom', args: [] } }
            };
            loader.manifests.set('custom-plugin', customManifest);

            const instance = await loader.hotReload('custom-plugin');
            expect(instance.id).toBe('custom-plugin');
        });

        test('throws when plugin cannot be found after rediscovery and no old manifest', async () => {
            await expect(loader.hotReload('nonexistent-never-was')).rejects.toThrow('Plugin not found after rediscovery');
        });
    });

    describe('get', () => {
        test('returns loaded instance', async () => {
            await loader.discover();
            await loader.load('diamond-drill');
            const instance = loader.get('diamond-drill');
            expect(instance.id).toBe('diamond-drill');
        });

        test('returns undefined for non-loaded plugin', () => {
            expect(loader.get('nonexistent')).toBeUndefined();
        });
    });

    describe('isLoaded', () => {
        test('returns true for loaded plugin', async () => {
            await loader.discover();
            await loader.load('diamond-drill');
            expect(loader.isLoaded('diamond-drill')).toBe(true);
        });

        test('returns false for non-loaded plugin', () => {
            expect(loader.isLoaded('nonexistent')).toBe(false);
        });
    });

    describe('getLoadedPlugins', () => {
        test('returns array of loaded plugin IDs', async () => {
            await loader.discover();
            await loader.load('diamond-drill');
            expect(loader.getLoadedPlugins()).toEqual(['diamond-drill']);
        });

        test('returns empty array when none loaded', () => {
            expect(loader.getLoadedPlugins()).toEqual([]);
        });
    });

    describe('getAvailablePlugins', () => {
        test('returns available manifests', async () => {
            await loader.discover();
            const available = loader.getAvailablePlugins();
            expect(available).toHaveLength(1);
            expect(available[0].id).toBe('diamond-drill');
        });

        test('returns empty array before discover', () => {
            expect(loader.getAvailablePlugins()).toEqual([]);
        });
    });

    describe('stopAll', () => {
        test('stops all loaded plugins', async () => {
            await loader.discover();
            await loader.load('diamond-drill');
            expect(loader.instances.size).toBe(1);

            loader.stopAll();
            expect(loader.instances.size).toBe(0);
        });

        test('no-op when nothing loaded', () => {
            expect(() => loader.stopAll()).not.toThrow();
        });
    });
});
