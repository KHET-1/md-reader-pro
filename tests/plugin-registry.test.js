/**
 * @jest-environment jsdom
 */

import PluginRegistry from '../src/plugins/PluginRegistry.js';

describe('PluginRegistry', () => {
    let registry;
    let mockStorage;

    beforeEach(() => {
        // Create mock storage
        mockStorage = {
            data: {},
            getItem: jest.fn((key) => mockStorage.data[key] || null),
            setItem: jest.fn((key, value) => {
                mockStorage.data[key] = value;
            }),
            removeItem: jest.fn((key) => {
                delete mockStorage.data[key];
            }),
            clear: jest.fn(() => {
                mockStorage.data = {};
            })
        };

        registry = new PluginRegistry({ storage: mockStorage });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with empty entries', () => {
            expect(registry.entries).toBeInstanceOf(Map);
            expect(registry.entries.size).toBe(0);
        });

        test('should use provided storage', () => {
            expect(registry.storage).toBe(mockStorage);
        });

        test('should handle no storage gracefully', () => {
            const noStorageRegistry = new PluginRegistry({ storage: null });
            // Storage could be null or undefined or a fallback object
            expect(noStorageRegistry.entries.size).toBe(0);
        });

        test('should use localStorage by default in browser', () => {
            const defaultRegistry = new PluginRegistry();
            expect(defaultRegistry.storage).toBeDefined();
        });
    });

    describe('_load()', () => {
        test('should load registry from storage', () => {
            const testData = [
                {
                    id: 'plugin1',
                    enabled: true,
                    settings: { test: true },
                    installedAt: '2024-01-01T00:00:00.000Z'
                }
            ];
            mockStorage.data['md-reader-pro-plugins'] = JSON.stringify(testData);

            const newRegistry = new PluginRegistry({ storage: mockStorage });

            expect(newRegistry.entries.size).toBe(1);
            expect(newRegistry.entries.has('plugin1')).toBe(true);
        });

        test('should handle invalid JSON gracefully', () => {
            mockStorage.data['md-reader-pro-plugins'] = 'invalid json';
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            const newRegistry = new PluginRegistry({ storage: mockStorage });

            expect(newRegistry.entries.size).toBe(0);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'Failed to load plugin registry:',
                expect.any(Error)
            );

            consoleWarnSpy.mockRestore();
        });

        test('should handle no storage gracefully', () => {
            const noStorageRegistry = new PluginRegistry({ storage: null });
            expect(noStorageRegistry.entries.size).toBe(0);
        });
    });

    describe('_save()', () => {
        test('should save registry to storage', () => {
            registry.register('plugin1', { test: true });

            expect(mockStorage.setItem).toHaveBeenCalledWith(
                'md-reader-pro-plugins',
                expect.any(String)
            );

            const savedData = JSON.parse(mockStorage.data['md-reader-pro-plugins']);
            expect(savedData).toHaveLength(1);
            expect(savedData[0].id).toBe('plugin1');
        });

        test('should handle storage errors gracefully', () => {
            mockStorage.setItem.mockImplementation(() => {
                throw new Error('Storage error');
            });
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            registry.register('plugin1');

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'Failed to save plugin registry:',
                expect.any(Error)
            );

            consoleWarnSpy.mockRestore();
        });

        test('should handle no storage gracefully', () => {
            const noStorageRegistry = new PluginRegistry({ storage: null });
            expect(() => noStorageRegistry.register('plugin1')).not.toThrow();
        });
    });

    describe('register()', () => {
        test('should register a plugin', () => {
            const entry = registry.register('plugin1', { test: true });

            expect(entry).toBeDefined();
            expect(entry.id).toBe('plugin1');
            expect(entry.enabled).toBe(true);
            expect(entry.settings).toEqual({ test: true });
            expect(entry.installedAt).toBeDefined();
        });

        test('should register with default settings', () => {
            const entry = registry.register('plugin2');

            expect(entry.settings).toEqual({});
        });

        test('should store entry in registry', () => {
            registry.register('plugin1');

            expect(registry.entries.has('plugin1')).toBe(true);
            expect(registry.entries.size).toBe(1);
        });

        test('should include ISO timestamp', () => {
            const entry = registry.register('plugin1');

            expect(entry.installedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });
    });

    describe('unregister()', () => {
        test('should unregister a plugin', () => {
            registry.register('plugin1');
            expect(registry.entries.has('plugin1')).toBe(true);

            registry.unregister('plugin1');

            expect(registry.entries.has('plugin1')).toBe(false);
        });

        test('should save after unregistering', () => {
            registry.register('plugin1');
            mockStorage.setItem.mockClear();

            registry.unregister('plugin1');

            expect(mockStorage.setItem).toHaveBeenCalled();
        });

        test('should handle unregistering non-existent plugin', () => {
            expect(() => registry.unregister('non-existent')).not.toThrow();
        });
    });

    describe('get()', () => {
        test('should get a registered plugin entry', () => {
            const entry = registry.register('plugin1', { test: true });
            const retrieved = registry.get('plugin1');

            expect(retrieved).toEqual(entry);
        });

        test('should return undefined for non-existent plugin', () => {
            const retrieved = registry.get('non-existent');

            expect(retrieved).toBeUndefined();
        });
    });

    describe('isRegistered()', () => {
        test('should return true for registered plugin', () => {
            registry.register('plugin1');

            expect(registry.isRegistered('plugin1')).toBe(true);
        });

        test('should return false for non-registered plugin', () => {
            expect(registry.isRegistered('plugin1')).toBe(false);
        });
    });

    describe('isEnabled()', () => {
        test('should return true for enabled plugin', () => {
            registry.register('plugin1');

            expect(registry.isEnabled('plugin1')).toBe(true);
        });

        test('should return false for disabled plugin', () => {
            registry.register('plugin1');
            registry.disable('plugin1');

            expect(registry.isEnabled('plugin1')).toBe(false);
        });

        test('should return false for non-existent plugin', () => {
            expect(registry.isEnabled('non-existent')).toBe(false);
        });
    });

    describe('enable()', () => {
        test('should enable a plugin', () => {
            registry.register('plugin1');
            registry.disable('plugin1');
            expect(registry.isEnabled('plugin1')).toBe(false);

            registry.enable('plugin1');

            expect(registry.isEnabled('plugin1')).toBe(true);
        });

        test('should save after enabling', () => {
            registry.register('plugin1');
            mockStorage.setItem.mockClear();

            registry.enable('plugin1');

            expect(mockStorage.setItem).toHaveBeenCalled();
        });

        test('should handle enabling non-existent plugin gracefully', () => {
            expect(() => registry.enable('non-existent')).not.toThrow();
        });
    });

    describe('disable()', () => {
        test('should disable a plugin', () => {
            registry.register('plugin1');
            expect(registry.isEnabled('plugin1')).toBe(true);

            registry.disable('plugin1');

            expect(registry.isEnabled('plugin1')).toBe(false);
        });

        test('should save after disabling', () => {
            registry.register('plugin1');
            mockStorage.setItem.mockClear();

            registry.disable('plugin1');

            expect(mockStorage.setItem).toHaveBeenCalled();
        });

        test('should handle disabling non-existent plugin gracefully', () => {
            expect(() => registry.disable('non-existent')).not.toThrow();
        });
    });

    describe('updateSettings()', () => {
        test('should update plugin settings', () => {
            registry.register('plugin1', { setting1: 'value1' });

            registry.updateSettings('plugin1', { setting2: 'value2' });

            const entry = registry.get('plugin1');
            expect(entry.settings).toEqual({
                setting1: 'value1',
                setting2: 'value2'
            });
        });

        test('should merge with existing settings', () => {
            registry.register('plugin1', { setting1: 'value1', setting2: 'old' });

            registry.updateSettings('plugin1', { setting2: 'new', setting3: 'value3' });

            const entry = registry.get('plugin1');
            expect(entry.settings).toEqual({
                setting1: 'value1',
                setting2: 'new',
                setting3: 'value3'
            });
        });

        test('should save after updating', () => {
            registry.register('plugin1');
            mockStorage.setItem.mockClear();

            registry.updateSettings('plugin1', { test: true });

            expect(mockStorage.setItem).toHaveBeenCalled();
        });

        test('should handle updating non-existent plugin gracefully', () => {
            expect(() => registry.updateSettings('non-existent', { test: true })).not.toThrow();
        });
    });

    describe('getEnabledPlugins()', () => {
        test('should return empty array when no plugins enabled', () => {
            const enabled = registry.getEnabledPlugins();

            expect(enabled).toEqual([]);
        });

        test('should return enabled plugin IDs', () => {
            registry.register('plugin1');
            registry.register('plugin2');
            registry.register('plugin3');
            registry.disable('plugin2');

            const enabled = registry.getEnabledPlugins();

            expect(enabled).toEqual(['plugin1', 'plugin3']);
        });

        test('should only include enabled plugins', () => {
            registry.register('plugin1');
            registry.register('plugin2');
            registry.disable('plugin1');
            registry.disable('plugin2');

            const enabled = registry.getEnabledPlugins();

            expect(enabled).toEqual([]);
        });
    });

    describe('getAll()', () => {
        test('should return empty array when no plugins registered', () => {
            const all = registry.getAll();

            expect(all).toEqual([]);
        });

        test('should return all registered plugin entries', () => {
            registry.register('plugin1', { test1: true });
            registry.register('plugin2', { test2: true });

            const all = registry.getAll();

            expect(all).toHaveLength(2);
            expect(all.map(e => e.id)).toEqual(['plugin1', 'plugin2']);
        });

        test('should include both enabled and disabled plugins', () => {
            registry.register('plugin1');
            registry.register('plugin2');
            registry.disable('plugin1');

            const all = registry.getAll();

            expect(all).toHaveLength(2);
        });
    });

    describe('clear()', () => {
        test('should clear all entries', () => {
            registry.register('plugin1');
            registry.register('plugin2');
            expect(registry.entries.size).toBe(2);

            registry.clear();

            expect(registry.entries.size).toBe(0);
        });

        test('should save after clearing', () => {
            registry.register('plugin1');
            mockStorage.setItem.mockClear();

            registry.clear();

            expect(mockStorage.setItem).toHaveBeenCalled();
        });
    });

    describe('Integration', () => {
        test('should persist and load registry across instances', () => {
            // First instance - register plugins
            registry.register('plugin1', { setting1: true });
            registry.register('plugin2', { setting2: false });
            registry.disable('plugin2');

            // Create new instance with same storage
            const newRegistry = new PluginRegistry({ storage: mockStorage });

            expect(newRegistry.entries.size).toBe(2);
            expect(newRegistry.isRegistered('plugin1')).toBe(true);
            expect(newRegistry.isRegistered('plugin2')).toBe(true);
            expect(newRegistry.isEnabled('plugin1')).toBe(true);
            expect(newRegistry.isEnabled('plugin2')).toBe(false);
            expect(newRegistry.get('plugin1').settings).toEqual({ setting1: true });
        });
    });
});
