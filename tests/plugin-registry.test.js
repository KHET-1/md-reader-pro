/**
 * Tests for PluginRegistry module
 */
import PluginRegistry from '../src/plugins/PluginRegistry.js';

describe('PluginRegistry', () => {
    let registry;
    let mockStorage;

    beforeEach(() => {
        mockStorage = {
            store: {},
            getItem(key) { return this.store[key] || null; },
            setItem(key, value) { this.store[key] = value; },
            removeItem(key) { delete this.store[key]; },
            clear() { this.store = {}; }
        };
    });

    describe('constructor', () => {
        test('creates with empty entries', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            expect(registry.getAll()).toEqual([]);
        });

        test('loads existing entries from storage', () => {
            mockStorage.store['md-reader-pro-plugins'] = JSON.stringify([
                { id: 'plugin-a', enabled: true, settings: {}, installedAt: '2025-01-01' }
            ]);
            registry = new PluginRegistry({ storage: mockStorage });
            expect(registry.isRegistered('plugin-a')).toBe(true);
        });

        test('handles corrupt storage data', () => {
            mockStorage.store['md-reader-pro-plugins'] = 'broken{{{';
            registry = new PluginRegistry({ storage: mockStorage });
            expect(registry.getAll()).toEqual([]);
        });

        test('works without storage', () => {
            registry = new PluginRegistry({ storage: null });
            expect(registry.getAll()).toEqual([]);
        });
    });

    describe('register', () => {
        beforeEach(() => {
            registry = new PluginRegistry({ storage: mockStorage });
        });

        test('registers a plugin with default settings', () => {
            const entry = registry.register('my-plugin');
            expect(entry.id).toBe('my-plugin');
            expect(entry.enabled).toBe(true);
            expect(entry.settings).toEqual({});
            expect(entry.installedAt).toBeDefined();
        });

        test('registers a plugin with custom settings', () => {
            const entry = registry.register('my-plugin', { theme: 'dark' });
            expect(entry.settings).toEqual({ theme: 'dark' });
        });

        test('persists registration to storage', () => {
            registry.register('my-plugin');
            const stored = JSON.parse(mockStorage.store['md-reader-pro-plugins']);
            expect(stored).toHaveLength(1);
            expect(stored[0].id).toBe('my-plugin');
        });
    });

    describe('unregister', () => {
        test('removes a registered plugin', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            registry.register('my-plugin');
            registry.unregister('my-plugin');
            expect(registry.isRegistered('my-plugin')).toBe(false);
        });

        test('persists unregistration to storage', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            registry.register('my-plugin');
            registry.unregister('my-plugin');
            const stored = JSON.parse(mockStorage.store['md-reader-pro-plugins']);
            expect(stored).toHaveLength(0);
        });

        test('handles unregistering non-existent plugin', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            expect(() => registry.unregister('nonexistent')).not.toThrow();
        });
    });

    describe('get', () => {
        test('returns entry for registered plugin', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            registry.register('my-plugin', { key: 'val' });
            const entry = registry.get('my-plugin');
            expect(entry.id).toBe('my-plugin');
            expect(entry.settings.key).toBe('val');
        });

        test('returns undefined for unregistered plugin', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            expect(registry.get('nonexistent')).toBeUndefined();
        });
    });

    describe('isRegistered', () => {
        test('returns true for registered plugin', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            registry.register('my-plugin');
            expect(registry.isRegistered('my-plugin')).toBe(true);
        });

        test('returns false for unregistered plugin', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            expect(registry.isRegistered('nope')).toBe(false);
        });
    });

    describe('isEnabled', () => {
        test('returns true for enabled plugin', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            registry.register('my-plugin');
            expect(registry.isEnabled('my-plugin')).toBe(true);
        });

        test('returns false for disabled plugin', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            registry.register('my-plugin');
            registry.disable('my-plugin');
            expect(registry.isEnabled('my-plugin')).toBe(false);
        });

        test('returns false for non-existent plugin', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            expect(registry.isEnabled('nonexistent')).toBe(false);
        });
    });

    describe('enable', () => {
        test('enables a disabled plugin', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            registry.register('my-plugin');
            registry.disable('my-plugin');
            registry.enable('my-plugin');
            expect(registry.isEnabled('my-plugin')).toBe(true);
        });

        test('no-op for non-existent plugin', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            expect(() => registry.enable('nonexistent')).not.toThrow();
        });
    });

    describe('disable', () => {
        test('disables an enabled plugin', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            registry.register('my-plugin');
            registry.disable('my-plugin');
            expect(registry.isEnabled('my-plugin')).toBe(false);
        });

        test('no-op for non-existent plugin', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            expect(() => registry.disable('nonexistent')).not.toThrow();
        });
    });

    describe('updateSettings', () => {
        test('merges new settings', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            registry.register('my-plugin', { a: 1 });
            registry.updateSettings('my-plugin', { b: 2 });
            const entry = registry.get('my-plugin');
            expect(entry.settings).toEqual({ a: 1, b: 2 });
        });

        test('overwrites existing keys', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            registry.register('my-plugin', { a: 1 });
            registry.updateSettings('my-plugin', { a: 99 });
            expect(registry.get('my-plugin').settings.a).toBe(99);
        });

        test('no-op for non-existent plugin', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            expect(() => registry.updateSettings('nonexistent', { a: 1 })).not.toThrow();
        });

        test('persists to storage', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            registry.register('my-plugin');
            registry.updateSettings('my-plugin', { mode: 'advanced' });
            const stored = JSON.parse(mockStorage.store['md-reader-pro-plugins']);
            expect(stored[0].settings.mode).toBe('advanced');
        });
    });

    describe('getEnabledPlugins', () => {
        test('returns only enabled plugin IDs', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            registry.register('plugin-a');
            registry.register('plugin-b');
            registry.register('plugin-c');
            registry.disable('plugin-b');
            expect(registry.getEnabledPlugins()).toEqual(['plugin-a', 'plugin-c']);
        });

        test('returns empty array when no plugins', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            expect(registry.getEnabledPlugins()).toEqual([]);
        });
    });

    describe('getAll', () => {
        test('returns all registered entries', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            registry.register('plugin-a');
            registry.register('plugin-b');
            const all = registry.getAll();
            expect(all).toHaveLength(2);
        });
    });

    describe('clear', () => {
        test('removes all entries', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            registry.register('plugin-a');
            registry.register('plugin-b');
            registry.clear();
            expect(registry.getAll()).toEqual([]);
        });

        test('persists clear to storage', () => {
            registry = new PluginRegistry({ storage: mockStorage });
            registry.register('plugin-a');
            registry.clear();
            const stored = JSON.parse(mockStorage.store['md-reader-pro-plugins']);
            expect(stored).toEqual([]);
        });
    });

    describe('_save with storage failure', () => {
        test('handles storage setItem failure', () => {
            const badStorage = {
                getItem: () => null,
                setItem: () => { throw new Error('quota exceeded'); }
            };
            registry = new PluginRegistry({ storage: badStorage });
            expect(() => registry.register('test')).not.toThrow();
        });
    });
});
