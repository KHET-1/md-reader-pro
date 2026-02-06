/**
 * @jest-environment jsdom
 */

import PluginLoader from '../src/plugins/PluginLoader.js';
import PluginBridge from '../src/plugins/PluginBridge.js';

// Mock PluginBridge
jest.mock('../src/plugins/PluginBridge.js');

describe('PluginLoader', () => {
    let loader;
    let mockBridge;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Create mock bridge instance
        mockBridge = {
            start: jest.fn().mockResolvedValue(undefined),
            send: jest.fn().mockResolvedValue({}),
            stop: jest.fn(),
            isReady: jest.fn().mockReturnValue(true)
        };

        // Mock PluginBridge constructor
        PluginBridge.mockImplementation(() => mockBridge);

        loader = new PluginLoader({
            pluginsDir: './test-plugins'
        });
    });

    afterEach(() => {
        loader.stopAll();
    });

    describe('Constructor', () => {
        test('should initialize with empty maps', () => {
            expect(loader.manifests).toBeDefined();
            expect(loader.instances).toBeDefined();
            expect(loader.manifests.size).toBe(0);
            expect(loader.instances.size).toBe(0);
        });

        test('should use provided options', () => {
            const onReady = jest.fn();
            const onError = jest.fn();
            const onMessage = jest.fn();

            const customLoader = new PluginLoader({
                pluginsDir: './custom-dir',
                onPluginReady: onReady,
                onPluginError: onError,
                onPluginMessage: onMessage
            });

            expect(customLoader.pluginsDir).toBe('./custom-dir');
            expect(customLoader.onPluginReady).toBe(onReady);
            expect(customLoader.onPluginError).toBe(onError);
            expect(customLoader.onPluginMessage).toBe(onMessage);
        });

        test('should use default options', () => {
            expect(loader.pluginsDir).toBe('./test-plugins');
            expect(typeof loader.onPluginReady).toBe('function');
            expect(typeof loader.onPluginError).toBe('function');
            expect(typeof loader.onPluginMessage).toBe('function');
        });
    });

    describe('discover()', () => {
        test('should discover available plugins', async () => {
            const plugins = await loader.discover();

            expect(plugins).toHaveLength(1);
            expect(plugins[0].id).toBe('diamond-drill');
            expect(plugins[0].name).toBe('Diamond Drill');
        });

        test('should store manifests in map', async () => {
            await loader.discover();

            expect(loader.manifests.size).toBe(1);
            expect(loader.manifests.has('diamond-drill')).toBe(true);
        });

        test('should return plugin with correct structure', async () => {
            const plugins = await loader.discover();
            const plugin = plugins[0];

            expect(plugin.id).toBeDefined();
            expect(plugin.name).toBeDefined();
            expect(plugin.version).toBeDefined();
            expect(plugin.type).toBeDefined();
            expect(plugin.description).toBeDefined();
            expect(plugin.capabilities).toBeDefined();
            expect(plugin.entry).toBeDefined();
            expect(plugin.permissions).toBeDefined();
        });
    });

    describe('load()', () => {
        beforeEach(async () => {
            await loader.discover();
        });

        test('should load a native plugin', async () => {
            const instance = await loader.load('diamond-drill');

            expect(instance).toBeDefined();
            expect(instance.id).toBe('diamond-drill');
            expect(instance.status).toBe('ready');
            expect(instance.bridge).toBeDefined();
        });

        test('should return cached instance if already loaded', async () => {
            const instance1 = await loader.load('diamond-drill');
            const instance2 = await loader.load('diamond-drill');

            expect(instance1).toBe(instance2);
            expect(PluginBridge).toHaveBeenCalledTimes(1);
        });

        test('should throw error for non-existent plugin', async () => {
            await expect(loader.load('non-existent')).rejects.toThrow('Plugin not found: non-existent');
        });

        test('should create PluginBridge with correct options', async () => {
            await loader.load('diamond-drill');

            expect(PluginBridge).toHaveBeenCalledWith(
                expect.objectContaining({
                    pluginId: 'diamond-drill',
                    type: 'native',
                    binary: 'diamond',
                    args: ['--plugin-mode']
                })
            );
        });

        test('should call bridge.start()', async () => {
            await loader.load('diamond-drill');

            expect(mockBridge.start).toHaveBeenCalled();
        });

        test('should store instance in map', async () => {
            await loader.load('diamond-drill');

            expect(loader.instances.has('diamond-drill')).toBe(true);
        });

        test('should provide send method on instance', async () => {
            const instance = await loader.load('diamond-drill');

            expect(instance.send).toBeDefined();
            expect(typeof instance.send).toBe('function');

            await instance.send('test-action', { foo: 'bar' });
            expect(mockBridge.send).toHaveBeenCalledWith('test-action', { foo: 'bar' });
        });

        test('should provide stop method on instance', async () => {
            const instance = await loader.load('diamond-drill');

            expect(instance.stop).toBeDefined();
            expect(typeof instance.stop).toBe('function');

            instance.stop();
            expect(mockBridge.stop).toHaveBeenCalled();
        });
    });

    describe('_loadWasmPlugin()', () => {
        test('should return stub instance for WASM plugins', async () => {
            const manifest = {
                id: 'wasm-plugin',
                type: 'wasm',
                name: 'WASM Plugin'
            };

            const instance = await loader._loadWasmPlugin(manifest);

            expect(instance.id).toBe('wasm-plugin');
            expect(instance.status).toBe('error');
            expect(instance.bridge).toBeNull();
        });

        test('should reject send attempts', async () => {
            const manifest = {
                id: 'wasm-plugin',
                type: 'wasm',
                name: 'WASM Plugin'
            };

            const instance = await loader._loadWasmPlugin(manifest);

            await expect(instance.send()).rejects.toThrow('WASM not implemented');
        });
    });

    describe('_loadIframePlugin()', () => {
        test('should return stub instance for iframe plugins', async () => {
            const manifest = {
                id: 'iframe-plugin',
                type: 'iframe',
                name: 'IFrame Plugin'
            };

            const instance = await loader._loadIframePlugin(manifest);

            expect(instance.id).toBe('iframe-plugin');
            expect(instance.status).toBe('error');
            expect(instance.bridge).toBeNull();
        });

        test('should reject send attempts', async () => {
            const manifest = {
                id: 'iframe-plugin',
                type: 'iframe',
                name: 'IFrame Plugin'
            };

            const instance = await loader._loadIframePlugin(manifest);

            await expect(instance.send()).rejects.toThrow('IFrame not implemented');
        });
    });

    describe('_loadWorkerPlugin()', () => {
        test('should return stub instance for worker plugins', async () => {
            const manifest = {
                id: 'worker-plugin',
                type: 'worker',
                name: 'Worker Plugin'
            };

            const instance = await loader._loadWorkerPlugin(manifest);

            expect(instance.id).toBe('worker-plugin');
            expect(instance.status).toBe('error');
            expect(instance.bridge).toBeNull();
        });

        test('should reject send attempts', async () => {
            const manifest = {
                id: 'worker-plugin',
                type: 'worker',
                name: 'Worker Plugin'
            };

            const instance = await loader._loadWorkerPlugin(manifest);

            await expect(instance.send()).rejects.toThrow('Worker not implemented');
        });
    });

    describe('unload()', () => {
        beforeEach(async () => {
            await loader.discover();
        });

        test('should unload a plugin', async () => {
            await loader.load('diamond-drill');
            expect(loader.instances.has('diamond-drill')).toBe(true);

            await loader.unload('diamond-drill');
            expect(loader.instances.has('diamond-drill')).toBe(false);
        });

        test('should call stop on the instance', async () => {
            await loader.load('diamond-drill');
            await loader.unload('diamond-drill');

            expect(mockBridge.stop).toHaveBeenCalled();
        });

        test('should handle unloading non-existent plugin', async () => {
            await expect(loader.unload('non-existent')).resolves.toBeUndefined();
        });
    });

    describe('hotReload()', () => {
        beforeEach(async () => {
            await loader.discover();
        });

        test('should hot reload a plugin', async () => {
            const instance1 = await loader.load('diamond-drill');
            
            const instance2 = await loader.hotReload('diamond-drill');

            expect(instance2).toBeDefined();
            expect(instance2.id).toBe('diamond-drill');
            expect(mockBridge.stop).toHaveBeenCalled();
        });

        test('should unload before reloading', async () => {
            await loader.load('diamond-drill');
            
            await loader.hotReload('diamond-drill');

            expect(mockBridge.stop).toHaveBeenCalled();
            expect(mockBridge.start).toHaveBeenCalledTimes(2);
        });

        test('should rediscover plugins', async () => {
            const discoverSpy = jest.spyOn(loader, 'discover');
            
            await loader.hotReload('diamond-drill');

            expect(discoverSpy).toHaveBeenCalled();
        });

        test('should restore old manifest if rediscovery fails', async () => {
            await loader.load('diamond-drill');
            const oldManifest = loader.manifests.get('diamond-drill');
            
            // Mock discover to clear manifests
            jest.spyOn(loader, 'discover').mockResolvedValue([]);
            
            await loader.hotReload('diamond-drill');

            // Old manifest should still be there
            expect(loader.manifests.has('diamond-drill')).toBe(true);
        });

        test('should throw error if plugin not found after rediscovery', async () => {
            // Mock discover to clear manifests
            jest.spyOn(loader, 'discover').mockResolvedValue([]);
            
            await expect(loader.hotReload('non-existent')).rejects.toThrow('Plugin not found after rediscovery: non-existent');
        });
    });

    describe('get()', () => {
        beforeEach(async () => {
            await loader.discover();
        });

        test('should get loaded plugin instance', async () => {
            const loaded = await loader.load('diamond-drill');
            const retrieved = loader.get('diamond-drill');

            expect(retrieved).toBe(loaded);
        });

        test('should return undefined for non-loaded plugin', () => {
            const retrieved = loader.get('diamond-drill');
            expect(retrieved).toBeUndefined();
        });
    });

    describe('isLoaded()', () => {
        beforeEach(async () => {
            await loader.discover();
        });

        test('should return true for loaded plugin', async () => {
            await loader.load('diamond-drill');
            expect(loader.isLoaded('diamond-drill')).toBe(true);
        });

        test('should return false for non-loaded plugin', () => {
            expect(loader.isLoaded('diamond-drill')).toBe(false);
        });
    });

    describe('getLoadedPlugins()', () => {
        beforeEach(async () => {
            await loader.discover();
        });

        test('should return empty array when no plugins loaded', () => {
            const loaded = loader.getLoadedPlugins();
            expect(loaded).toEqual([]);
        });

        test('should return list of loaded plugin IDs', async () => {
            await loader.load('diamond-drill');
            
            const loaded = loader.getLoadedPlugins();
            expect(loaded).toEqual(['diamond-drill']);
        });
    });

    describe('getAvailablePlugins()', () => {
        test('should return empty array before discovery', () => {
            const available = loader.getAvailablePlugins();
            expect(available).toEqual([]);
        });

        test('should return list of available plugins after discovery', async () => {
            await loader.discover();
            
            const available = loader.getAvailablePlugins();
            expect(available).toHaveLength(1);
            expect(available[0].id).toBe('diamond-drill');
        });
    });

    describe('stopAll()', () => {
        beforeEach(async () => {
            await loader.discover();
        });

        test('should stop all loaded plugins', async () => {
            await loader.load('diamond-drill');
            
            loader.stopAll();

            expect(mockBridge.stop).toHaveBeenCalled();
        });

        test('should clear instances map', async () => {
            await loader.load('diamond-drill');
            expect(loader.instances.size).toBe(1);
            
            loader.stopAll();
            
            expect(loader.instances.size).toBe(0);
        });

        test('should handle stopping with no loaded plugins', () => {
            expect(() => loader.stopAll()).not.toThrow();
        });
    });

    describe('Error handling', () => {
        beforeEach(async () => {
            await loader.discover();
        });

        test('should handle bridge start error', async () => {
            mockBridge.start.mockRejectedValueOnce(new Error('Start failed'));

            await expect(loader.load('diamond-drill')).rejects.toThrow('Start failed');
        });

        test('should throw error for unknown plugin type', async () => {
            loader.manifests.set('unknown-type', {
                id: 'unknown-type',
                type: 'unknown',
                name: 'Unknown Type'
            });

            await expect(loader.load('unknown-type')).rejects.toThrow('Unknown plugin type: unknown');
        });
    });

    describe('Callback handling', () => {
        test('should call onPluginReady callback', async () => {
            const onReady = jest.fn();
            const customLoader = new PluginLoader({ onPluginReady: onReady });
            
            await customLoader.discover();
            await customLoader.load('diamond-drill');

            expect(PluginBridge).toHaveBeenCalledWith(
                expect.objectContaining({
                    onReady: expect.any(Function)
                })
            );
        });

        test('should call onPluginError callback', async () => {
            const onError = jest.fn();
            const customLoader = new PluginLoader({ onPluginError: onError });
            
            await customLoader.discover();
            await customLoader.load('diamond-drill');

            expect(PluginBridge).toHaveBeenCalledWith(
                expect.objectContaining({
                    onError: expect.any(Function)
                })
            );
        });

        test('should call onPluginMessage callback', async () => {
            const onMessage = jest.fn();
            const customLoader = new PluginLoader({ onPluginMessage: onMessage });
            
            await customLoader.discover();
            await customLoader.load('diamond-drill');

            expect(PluginBridge).toHaveBeenCalledWith(
                expect.objectContaining({
                    onMessage: expect.any(Function)
                })
            );
        });
    });
});
