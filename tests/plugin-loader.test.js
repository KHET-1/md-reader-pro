/**
 * @jest-environment jsdom
 */

import PluginLoader from '../src/plugins/PluginLoader.js';
import PluginBridge from '../src/plugins/PluginBridge.js';

// Mock PluginBridge
jest.mock('../src/plugins/PluginBridge.js');

describe('PluginLoader', () => {
    let loader;
    let mockOnPluginReady;
    let mockOnPluginError;
    let mockOnPluginMessage;

    beforeEach(() => {
        mockOnPluginReady = jest.fn();
        mockOnPluginError = jest.fn();
        mockOnPluginMessage = jest.fn();

        loader = new PluginLoader({
            pluginsDir: './test-plugins',
            onPluginReady: mockOnPluginReady,
            onPluginError: mockOnPluginError,
            onPluginMessage: mockOnPluginMessage
        });

        // Clear mock implementations
        PluginBridge.mockClear();
    });

    afterEach(() => {
        if (loader) {
            loader.stopAll();
        }
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with default options', () => {
            const defaultLoader = new PluginLoader();
            expect(defaultLoader.pluginsDir).toBe('./plugins');
            expect(defaultLoader.manifests).toBeInstanceOf(Map);
            expect(defaultLoader.instances).toBeInstanceOf(Map);
        });

        test('should initialize with custom options', () => {
            expect(loader.pluginsDir).toBe('./test-plugins');
            expect(loader.onPluginReady).toBe(mockOnPluginReady);
            expect(loader.onPluginError).toBe(mockOnPluginError);
            expect(loader.onPluginMessage).toBe(mockOnPluginMessage);
        });

        test('should have empty manifests and instances', () => {
            expect(loader.manifests.size).toBe(0);
            expect(loader.instances.size).toBe(0);
        });
    });

    describe('discover()', () => {
        test('should discover Diamond Drill plugin', async () => {
            const plugins = await loader.discover();

            expect(plugins).toHaveLength(1);
            expect(plugins[0].id).toBe('diamond-drill');
            expect(plugins[0].name).toBe('Diamond Drill');
            expect(plugins[0].type).toBe('native');
            expect(plugins[0].version).toBe('0.1.0');
        });

        test('should store discovered plugins in manifests', async () => {
            await loader.discover();

            expect(loader.manifests.size).toBe(1);
            expect(loader.manifests.has('diamond-drill')).toBe(true);
        });

        test('should include plugin capabilities', async () => {
            const plugins = await loader.discover();
            const diamondDrill = plugins[0];

            expect(diamondDrill.capabilities).toContain('file:analyze');
            expect(diamondDrill.capabilities).toContain('file:report');
            expect(diamondDrill.capabilities).toContain('ui:panel');
        });

        test('should include entry points', async () => {
            const plugins = await loader.discover();
            const diamondDrill = plugins[0];

            expect(diamondDrill.entry.native).toBeDefined();
            expect(diamondDrill.entry.native.binary).toBe('diamond');
            expect(diamondDrill.entry.wasm).toBe('diamond_drill.wasm');
        });
    });

    describe('load()', () => {
        beforeEach(async () => {
            await loader.discover();

            // Mock PluginBridge implementation
            PluginBridge.mockImplementation((options) => ({
                start: jest.fn().mockResolvedValue(undefined),
                send: jest.fn().mockResolvedValue({}),
                stop: jest.fn(),
                isReady: jest.fn().mockReturnValue(true)
            }));
        });

        test('should load a plugin by ID', async () => {
            const instance = await loader.load('diamond-drill');

            expect(instance).toBeDefined();
            expect(instance.id).toBe('diamond-drill');
            expect(instance.status).toBe('ready');
            expect(instance.manifest).toBeDefined();
        });

        test('should return existing instance if already loaded', async () => {
            const instance1 = await loader.load('diamond-drill');
            const instance2 = await loader.load('diamond-drill');

            expect(instance1).toBe(instance2);
            expect(loader.instances.size).toBe(1);
        });

        test('should throw error for unknown plugin', async () => {
            await expect(loader.load('unknown-plugin')).rejects.toThrow('Plugin not found: unknown-plugin');
        });

        test('should create PluginBridge for native plugins', async () => {
            await loader.load('diamond-drill');

            expect(PluginBridge).toHaveBeenCalledTimes(1);
            expect(PluginBridge).toHaveBeenCalledWith(
                expect.objectContaining({
                    pluginId: 'diamond-drill',
                    type: 'native'
                })
            );
        });

        test('should provide send function on instance', async () => {
            const instance = await loader.load('diamond-drill');

            expect(instance.send).toBeInstanceOf(Function);
        });

        test('should provide stop function on instance', async () => {
            const instance = await loader.load('diamond-drill');

            expect(instance.stop).toBeInstanceOf(Function);
        });
    });

    describe('_loadWasmPlugin()', () => {
        test('should return error status for WASM plugins', async () => {
            const manifest = {
                id: 'test-wasm',
                type: 'wasm',
                entry: { wasm: 'test.wasm' }
            };

            const instance = await loader._loadWasmPlugin(manifest);

            expect(instance.status).toBe('error');
            expect(instance.bridge).toBeNull();
        });

        test('should reject send calls for WASM plugins', async () => {
            const manifest = {
                id: 'test-wasm',
                type: 'wasm',
                entry: { wasm: 'test.wasm' }
            };

            const instance = await loader._loadWasmPlugin(manifest);

            await expect(instance.send()).rejects.toThrow('WASM not implemented');
        });
    });

    describe('_loadIframePlugin()', () => {
        test('should return error status for iframe plugins', async () => {
            const manifest = {
                id: 'test-iframe',
                type: 'iframe',
                entry: { iframe: 'test.html' }
            };

            const instance = await loader._loadIframePlugin(manifest);

            expect(instance.status).toBe('error');
            expect(instance.bridge).toBeNull();
        });
    });

    describe('_loadWorkerPlugin()', () => {
        test('should return error status for worker plugins', async () => {
            const manifest = {
                id: 'test-worker',
                type: 'worker',
                entry: { worker: 'test.js' }
            };

            const instance = await loader._loadWorkerPlugin(manifest);

            expect(instance.status).toBe('error');
            expect(instance.bridge).toBeNull();
        });
    });

    describe('unload()', () => {
        beforeEach(async () => {
            await loader.discover();

            PluginBridge.mockImplementation((options) => ({
                start: jest.fn().mockResolvedValue(undefined),
                send: jest.fn().mockResolvedValue({}),
                stop: jest.fn(),
                isReady: jest.fn().mockReturnValue(true)
            }));
        });

        test('should unload a plugin', async () => {
            await loader.load('diamond-drill');
            expect(loader.instances.size).toBe(1);

            await loader.unload('diamond-drill');

            expect(loader.instances.size).toBe(0);
            expect(loader.instances.has('diamond-drill')).toBe(false);
        });

        test('should call stop on plugin instance', async () => {
            const instance = await loader.load('diamond-drill');
            const stopSpy = jest.spyOn(instance, 'stop');

            await loader.unload('diamond-drill');

            expect(stopSpy).toHaveBeenCalled();
        });

        test('should handle unloading non-existent plugin', async () => {
            await expect(loader.unload('non-existent')).resolves.not.toThrow();
        });
    });

    describe('hotReload()', () => {
        beforeEach(async () => {
            await loader.discover();

            PluginBridge.mockImplementation((options) => ({
                start: jest.fn().mockResolvedValue(undefined),
                send: jest.fn().mockResolvedValue({}),
                stop: jest.fn(),
                isReady: jest.fn().mockReturnValue(true)
            }));
        });

        test('should hot reload a plugin', async () => {
            await loader.load('diamond-drill');
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const instance = await loader.hotReload('diamond-drill');

            expect(instance).toBeDefined();
            expect(instance.id).toBe('diamond-drill');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Hot reloading plugin'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Hot reload complete'));

            consoleSpy.mockRestore();
        });

        test('should unload existing instance before reloading', async () => {
            const instance1 = await loader.load('diamond-drill');
            const stopSpy = jest.spyOn(instance1, 'stop');

            await loader.hotReload('diamond-drill');

            expect(stopSpy).toHaveBeenCalled();
        });

        test('should restore manifest if not found after rediscovery', async () => {
            // Load plugin first
            const originalInstance = await loader.load('diamond-drill');
            const originalManifest = loader.manifests.get('diamond-drill');

            // Remove it from manifests
            loader.manifests.delete('diamond-drill');

            // Hot reload should restore it and succeed
            const newInstance = await loader.hotReload('diamond-drill');

            expect(newInstance).toBeDefined();
            expect(newInstance.id).toBe('diamond-drill');
            expect(loader.manifests.has('diamond-drill')).toBe(true);
        });
    });

    describe('get()', () => {
        beforeEach(async () => {
            await loader.discover();

            PluginBridge.mockImplementation((options) => ({
                start: jest.fn().mockResolvedValue(undefined),
                send: jest.fn().mockResolvedValue({}),
                stop: jest.fn(),
                isReady: jest.fn().mockReturnValue(true)
            }));
        });

        test('should get a loaded plugin instance', async () => {
            const instance = await loader.load('diamond-drill');
            const retrieved = loader.get('diamond-drill');

            expect(retrieved).toBe(instance);
        });

        test('should return undefined for unloaded plugin', () => {
            const retrieved = loader.get('diamond-drill');

            expect(retrieved).toBeUndefined();
        });
    });

    describe('isLoaded()', () => {
        beforeEach(async () => {
            await loader.discover();

            PluginBridge.mockImplementation((options) => ({
                start: jest.fn().mockResolvedValue(undefined),
                send: jest.fn().mockResolvedValue({}),
                stop: jest.fn(),
                isReady: jest.fn().mockReturnValue(true)
            }));
        });

        test('should return true for loaded plugin', async () => {
            await loader.load('diamond-drill');

            expect(loader.isLoaded('diamond-drill')).toBe(true);
        });

        test('should return false for unloaded plugin', () => {
            expect(loader.isLoaded('diamond-drill')).toBe(false);
        });
    });

    describe('getLoadedPlugins()', () => {
        beforeEach(async () => {
            await loader.discover();

            PluginBridge.mockImplementation((options) => ({
                start: jest.fn().mockResolvedValue(undefined),
                send: jest.fn().mockResolvedValue({}),
                stop: jest.fn(),
                isReady: jest.fn().mockReturnValue(true)
            }));
        });

        test('should return empty array when no plugins loaded', () => {
            const loaded = loader.getLoadedPlugins();

            expect(loaded).toEqual([]);
        });

        test('should return loaded plugin IDs', async () => {
            await loader.load('diamond-drill');
            const loaded = loader.getLoadedPlugins();

            expect(loaded).toEqual(['diamond-drill']);
        });
    });

    describe('getAvailablePlugins()', () => {
        test('should return empty array when no plugins discovered', () => {
            const available = loader.getAvailablePlugins();

            expect(available).toEqual([]);
        });

        test('should return available plugin manifests', async () => {
            await loader.discover();
            const available = loader.getAvailablePlugins();

            expect(available).toHaveLength(1);
            expect(available[0].id).toBe('diamond-drill');
        });
    });

    describe('stopAll()', () => {
        beforeEach(async () => {
            await loader.discover();

            PluginBridge.mockImplementation((options) => ({
                start: jest.fn().mockResolvedValue(undefined),
                send: jest.fn().mockResolvedValue({}),
                stop: jest.fn(),
                isReady: jest.fn().mockReturnValue(true)
            }));
        });

        test('should stop all loaded plugins', async () => {
            const instance = await loader.load('diamond-drill');
            const stopSpy = jest.spyOn(instance, 'stop');

            loader.stopAll();

            expect(stopSpy).toHaveBeenCalled();
            expect(loader.instances.size).toBe(0);
        });

        test('should handle no loaded plugins', () => {
            expect(() => loader.stopAll()).not.toThrow();
        });
    });
});
