/**
 * @jest-environment jsdom
 */

import PluginRegistry from '../src/plugins/PluginRegistry.js';

describe('PluginRegistry', () => {
    let registry;
    let mockStorage;

    beforeEach(() => {
        // Mock localStorage
        mockStorage = {
            data: {},
            getItem(key) {
                return this.data[key] || null;
            },
            setItem(key, value) {
                this.data[key] = value;
            },
            removeItem(key) {
                delete this.data[key];
            },
            clear() {
                this.data = {};
            }
        };

        registry = new PluginRegistry({ storage: mockStorage });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with empty entries', () => {
            expect(registry.entries).toBeDefined();
            expect(registry.entries.size).toBe(0);
        });

        test('should use provided storage', () => {
            expect(registry.storage).toBe(mockStorage);
        });

        test('should work without storage', () => {
            const registryNoStorage = new PluginRegistry({ storage: null });
            // Storage defaults to localStorage if available, so check it handles operations
            expect(() => registryNoStorage.register('test-plugin')).not.toThrow();
        });

        test('should load existing data from storage', () => {
            const existingData = [
                { id: 'plugin1', enabled: true, settings: {}, installedAt: '2024-01-01' },
                { id: 'plugin2', enabled: false, settings: {}, installedAt: '2024-01-02' }
            ];
            mockStorage.setItem('md-reader-pro-plugins', JSON.stringify(existingData));

            const loadedRegistry = new PluginRegistry({ storage: mockStorage });
            expect(loadedRegistry.entries.size).toBe(2);
            expect(loadedRegistry.isRegistered('plugin1')).toBe(true);
            expect(loadedRegistry.isRegistered('plugin2')).toBe(true);
        });

        test('should handle corrupted storage data gracefully', () => {
            mockStorage.setItem('md-reader-pro-plugins', 'invalid json');
            
            const registryWithBadData = new PluginRegistry({ storage: mockStorage });
            expect(registryWithBadData.entries.size).toBe(0);
        });
    });

    describe('register()', () => {
        test('should register a plugin', () => {
            const entry = registry.register('test-plugin', { foo: 'bar' });

            expect(entry).toBeDefined();
            expect(entry.id).toBe('test-plugin');
            expect(entry.enabled).toBe(true);
            expect(entry.settings).toEqual({ foo: 'bar' });
            expect(entry.installedAt).toBeDefined();
        });

        test('should register plugin with default settings', () => {
            const entry = registry.register('test-plugin');

            expect(entry.settings).toEqual({});
        });

        test('should persist to storage', () => {
            registry.register('test-plugin');

            const stored = mockStorage.getItem('md-reader-pro-plugins');
            expect(stored).toBeDefined();
            
            const parsed = JSON.parse(stored);
            expect(parsed).toHaveLength(1);
            expect(parsed[0].id).toBe('test-plugin');
        });

        test('should overwrite existing plugin registration', () => {
            registry.register('test-plugin', { setting1: 'value1' });
            const entry = registry.register('test-plugin', { setting2: 'value2' });

            expect(entry.settings).toEqual({ setting2: 'value2' });
            expect(registry.entries.size).toBe(1);
        });
    });

    describe('unregister()', () => {
        test('should unregister a plugin', () => {
            registry.register('test-plugin');
            expect(registry.isRegistered('test-plugin')).toBe(true);

            registry.unregister('test-plugin');
            expect(registry.isRegistered('test-plugin')).toBe(false);
        });

        test('should persist removal to storage', () => {
            registry.register('test-plugin');
            registry.unregister('test-plugin');

            const stored = mockStorage.getItem('md-reader-pro-plugins');
            const parsed = JSON.parse(stored);
            expect(parsed).toHaveLength(0);
        });

        test('should handle unregistering non-existent plugin', () => {
            expect(() => registry.unregister('non-existent')).not.toThrow();
        });
    });

    describe('get()', () => {
        test('should get plugin entry', () => {
            registry.register('test-plugin', { foo: 'bar' });
            const entry = registry.get('test-plugin');

            expect(entry).toBeDefined();
            expect(entry.id).toBe('test-plugin');
            expect(entry.settings.foo).toBe('bar');
        });

        test('should return undefined for non-existent plugin', () => {
            const entry = registry.get('non-existent');
            expect(entry).toBeUndefined();
        });
    });

    describe('isRegistered()', () => {
        test('should return true for registered plugin', () => {
            registry.register('test-plugin');
            expect(registry.isRegistered('test-plugin')).toBe(true);
        });

        test('should return false for non-registered plugin', () => {
            expect(registry.isRegistered('non-existent')).toBe(false);
        });
    });

    describe('isEnabled()', () => {
        test('should return true for enabled plugin', () => {
            registry.register('test-plugin');
            expect(registry.isEnabled('test-plugin')).toBe(true);
        });

        test('should return false for disabled plugin', () => {
            registry.register('test-plugin');
            registry.disable('test-plugin');
            expect(registry.isEnabled('test-plugin')).toBe(false);
        });

        test('should return false for non-existent plugin', () => {
            expect(registry.isEnabled('non-existent')).toBe(false);
        });
    });

    describe('enable()', () => {
        test('should enable a plugin', () => {
            registry.register('test-plugin');
            registry.disable('test-plugin');
            
            registry.enable('test-plugin');
            expect(registry.isEnabled('test-plugin')).toBe(true);
        });

        test('should persist enabled state to storage', () => {
            registry.register('test-plugin');
            registry.disable('test-plugin');
            registry.enable('test-plugin');

            const stored = mockStorage.getItem('md-reader-pro-plugins');
            const parsed = JSON.parse(stored);
            expect(parsed[0].enabled).toBe(true);
        });

        test('should handle enabling non-existent plugin', () => {
            expect(() => registry.enable('non-existent')).not.toThrow();
        });
    });

    describe('disable()', () => {
        test('should disable a plugin', () => {
            registry.register('test-plugin');
            
            registry.disable('test-plugin');
            expect(registry.isEnabled('test-plugin')).toBe(false);
        });

        test('should persist disabled state to storage', () => {
            registry.register('test-plugin');
            registry.disable('test-plugin');

            const stored = mockStorage.getItem('md-reader-pro-plugins');
            const parsed = JSON.parse(stored);
            expect(parsed[0].enabled).toBe(false);
        });

        test('should handle disabling non-existent plugin', () => {
            expect(() => registry.disable('non-existent')).not.toThrow();
        });
    });

    describe('updateSettings()', () => {
        test('should update plugin settings', () => {
            registry.register('test-plugin', { setting1: 'value1' });
            
            registry.updateSettings('test-plugin', { setting2: 'value2' });
            
            const entry = registry.get('test-plugin');
            expect(entry.settings).toEqual({ setting1: 'value1', setting2: 'value2' });
        });

        test('should merge settings with existing ones', () => {
            registry.register('test-plugin', { a: 1, b: 2 });
            
            registry.updateSettings('test-plugin', { b: 3, c: 4 });
            
            const entry = registry.get('test-plugin');
            expect(entry.settings).toEqual({ a: 1, b: 3, c: 4 });
        });

        test('should persist updated settings to storage', () => {
            registry.register('test-plugin', { setting1: 'value1' });
            registry.updateSettings('test-plugin', { setting2: 'value2' });

            const stored = mockStorage.getItem('md-reader-pro-plugins');
            const parsed = JSON.parse(stored);
            expect(parsed[0].settings).toEqual({ setting1: 'value1', setting2: 'value2' });
        });

        test('should handle updating non-existent plugin', () => {
            expect(() => registry.updateSettings('non-existent', { foo: 'bar' })).not.toThrow();
        });
    });

    describe('getEnabledPlugins()', () => {
        test('should return list of enabled plugin IDs', () => {
            registry.register('plugin1');
            registry.register('plugin2');
            registry.register('plugin3');
            registry.disable('plugin2');

            const enabled = registry.getEnabledPlugins();
            expect(enabled).toEqual(['plugin1', 'plugin3']);
        });

        test('should return empty array when no plugins enabled', () => {
            registry.register('plugin1');
            registry.disable('plugin1');

            const enabled = registry.getEnabledPlugins();
            expect(enabled).toEqual([]);
        });

        test('should return empty array when no plugins registered', () => {
            const enabled = registry.getEnabledPlugins();
            expect(enabled).toEqual([]);
        });
    });

    describe('getAll()', () => {
        test('should return all plugin entries', () => {
            registry.register('plugin1', { a: 1 });
            registry.register('plugin2', { b: 2 });

            const all = registry.getAll();
            expect(all).toHaveLength(2);
            expect(all.find(e => e.id === 'plugin1')).toBeDefined();
            expect(all.find(e => e.id === 'plugin2')).toBeDefined();
        });

        test('should return empty array when no plugins', () => {
            const all = registry.getAll();
            expect(all).toEqual([]);
        });

        test('should return a new array (not reference to internal data)', () => {
            registry.register('plugin1');
            const all1 = registry.getAll();
            const all2 = registry.getAll();
            
            expect(all1).not.toBe(all2);
        });
    });

    describe('clear()', () => {
        test('should clear all entries', () => {
            registry.register('plugin1');
            registry.register('plugin2');
            
            registry.clear();
            
            expect(registry.entries.size).toBe(0);
            expect(registry.getAll()).toEqual([]);
        });

        test('should persist clear to storage', () => {
            registry.register('plugin1');
            registry.clear();

            const stored = mockStorage.getItem('md-reader-pro-plugins');
            const parsed = JSON.parse(stored);
            expect(parsed).toEqual([]);
        });
    });

    describe('Storage edge cases', () => {
        test('should handle storage without localStorage available', () => {
            const registryNoStorage = new PluginRegistry();
            expect(registryNoStorage.storage).toBeDefined();
        });

        test('should handle storage save errors gracefully', () => {
            const errorStorage = {
                getItem: () => null,
                setItem: () => { throw new Error('Storage full'); }
            };

            const registryWithErrorStorage = new PluginRegistry({ storage: errorStorage });
            
            // Should not throw
            expect(() => registryWithErrorStorage.register('test-plugin')).not.toThrow();
        });

        test('should handle storage load errors gracefully', () => {
            const errorStorage = {
                getItem: () => { throw new Error('Storage error'); },
                setItem: () => {}
            };

            // Should not throw during construction
            expect(() => new PluginRegistry({ storage: errorStorage })).not.toThrow();
        });
    });

    describe('Timestamp validation', () => {
        test('should set installedAt timestamp', () => {
            const entry = registry.register('test-plugin');
            
            expect(entry.installedAt).toBeDefined();
            expect(typeof entry.installedAt).toBe('string');
            
            // Should be valid ISO date
            const date = new Date(entry.installedAt);
            expect(date.toString()).not.toBe('Invalid Date');
        });

        test('should set installedAt as ISO string', () => {
            const entry = registry.register('test-plugin');
            
            // ISO format includes 'T' and 'Z' or timezone offset
            expect(entry.installedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
        });
    });
});
