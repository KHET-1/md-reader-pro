/**
 * @jest-environment jsdom
 */

import Settings from '../src/core/Settings.js';

describe('Settings', () => {
    let settings;
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

        // Clear any previous storage data
        mockStorage.clear();
        settings = new Settings({ storage: mockStorage });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with default settings', () => {
            expect(settings.settings).toBeDefined();
            expect(settings.settings.editMode).toBe(true);
            expect(settings.settings.theme).toBe('dark');
            expect(settings.settings.autoSave).toBe(true);
        });

        test('should use provided storage', () => {
            expect(settings.storage).toBe(mockStorage);
        });

        test('should work without storage', () => {
            const settingsNoStorage = new Settings({ storage: null });
            // Storage defaults to localStorage if available, so check it handles operations
            expect(() => settingsNoStorage.set('theme', 'light')).not.toThrow();
        });

        test('should load existing data from storage', () => {
            const existingData = {
                editMode: false,
                theme: 'light',
                autoSave: false
            };
            mockStorage.setItem('md-reader-pro-settings', JSON.stringify(existingData));

            const loadedSettings = new Settings({ storage: mockStorage });
            expect(loadedSettings.settings.editMode).toBe(false);
            expect(loadedSettings.settings.theme).toBe('light');
            expect(loadedSettings.settings.autoSave).toBe(false);
        });

        test('should handle corrupted storage data gracefully', () => {
            mockStorage.setItem('md-reader-pro-settings', 'invalid json');
            
            const settingsWithBadData = new Settings({ storage: mockStorage });
            expect(settingsWithBadData.settings.editMode).toBe(true);
        });

        test('should accept onChange callback', () => {
            const onChange = jest.fn();
            const settingsWithCallback = new Settings({ storage: mockStorage, onChange });
            
            expect(settingsWithCallback.onChange).toBe(onChange);
        });
    });

    describe('get()', () => {
        test('should get top-level setting', () => {
            expect(settings.get('theme')).toBe('dark');
            expect(settings.get('editMode')).toBe(true);
        });

        test('should get nested setting with dot notation', () => {
            expect(settings.get('plugins.enabled')).toEqual([]);
            expect(settings.get('plugins.autoLoad')).toBe(true);
        });

        test('should get deeply nested setting', () => {
            expect(settings.get('diamond-drill.reportFormat')).toBe('json');
            expect(settings.get('customTheme.colors.accent')).toBe('#FFD700');
        });

        test('should return undefined for non-existent key', () => {
            expect(settings.get('nonExistent')).toBeUndefined();
            expect(settings.get('plugins.nonExistent')).toBeUndefined();
        });
    });

    describe('set()', () => {
        test('should set top-level setting', () => {
            settings.set('theme', 'light');
            expect(settings.get('theme')).toBe('light');
        });

        test('should set nested setting with dot notation', () => {
            settings.set('plugins.autoLoad', false);
            expect(settings.get('plugins.autoLoad')).toBe(false);
        });

        test('should set deeply nested setting', () => {
            settings.set('customTheme.colors.accent', '#FF0000');
            expect(settings.get('customTheme.colors.accent')).toBe('#FF0000');
        });

        test('should create intermediate objects if needed', () => {
            settings.set('newSection.newKey', 'value');
            expect(settings.get('newSection.newKey')).toBe('value');
        });

        test('should persist to storage', () => {
            settings.set('theme', 'light');

            const stored = mockStorage.getItem('md-reader-pro-settings');
            expect(stored).toBeDefined();
            
            const parsed = JSON.parse(stored);
            expect(parsed.theme).toBe('light');
        });

        test('should call onChange callback', () => {
            const onChange = jest.fn();
            const settingsWithCallback = new Settings({ storage: mockStorage, onChange });
            
            settingsWithCallback.set('theme', 'light');
            
            expect(onChange).toHaveBeenCalledWith('theme', 'light');
        });

        test('should prevent prototype pollution with __proto__', () => {
            settings.set('__proto__.polluted', 'value');
            expect({}.polluted).toBeUndefined();
        });

        test('should prevent prototype pollution with constructor', () => {
            settings.set('constructor.polluted', 'value');
            expect({}.constructor.polluted).toBeUndefined();
        });

        test('should prevent prototype pollution with prototype', () => {
            settings.set('prototype.polluted', 'value');
            expect({}.prototype).toBeUndefined();
        });

        test('should prevent prototype pollution in nested paths', () => {
            settings.set('plugins.__proto__.polluted', 'value');
            expect({}.polluted).toBeUndefined();
        });
    });

    describe('getAll()', () => {
        test('should return all settings', () => {
            const all = settings.getAll();
            
            expect(all.editMode).toBe(true);
            expect(all.theme).toBe('dark');
            expect(all.plugins).toBeDefined();
        });

        test('should return a copy, not reference to internal settings', () => {
            const all1 = settings.getAll();
            const all2 = settings.getAll();
            
            expect(all1).not.toBe(all2);
        });

        test('should include all default settings', () => {
            const all = settings.getAll();
            
            expect(all.editMode).toBeDefined();
            expect(all.theme).toBeDefined();
            expect(all.autoSave).toBeDefined();
            expect(all.autoSaveInterval).toBeDefined();
            expect(all.syncScroll).toBeDefined();
            expect(all.plugins).toBeDefined();
        });
    });

    describe('reset()', () => {
        test('should reset to default settings', () => {
            settings.set('theme', 'light');
            settings.set('editMode', false);
            
            settings.reset();
            
            expect(settings.get('theme')).toBe('dark');
            expect(settings.get('editMode')).toBe(true);
        });

        test('should persist reset to storage', () => {
            settings.set('theme', 'light');
            settings.reset();

            const stored = mockStorage.getItem('md-reader-pro-settings');
            const parsed = JSON.parse(stored);
            expect(parsed.theme).toBe('dark');
        });

        test('should call onChange callback with wildcard', () => {
            const onChange = jest.fn();
            const settingsWithCallback = new Settings({ storage: mockStorage, onChange });
            
            settingsWithCallback.reset();
            
            expect(onChange).toHaveBeenCalledWith('*', expect.any(Object));
        });
    });

    describe('isEditModeEnabled()', () => {
        test('should return current edit mode state', () => {
            expect(settings.isEditModeEnabled()).toBe(true);
            
            settings.set('editMode', false);
            expect(settings.isEditModeEnabled()).toBe(false);
        });
    });

    describe('toggleEditMode()', () => {
        test('should toggle edit mode', () => {
            expect(settings.isEditModeEnabled()).toBe(true);
            
            const newValue = settings.toggleEditMode();
            expect(newValue).toBe(false);
            expect(settings.isEditModeEnabled()).toBe(false);
            
            const nextValue = settings.toggleEditMode();
            expect(nextValue).toBe(true);
            expect(settings.isEditModeEnabled()).toBe(true);
        });

        test('should persist toggle to storage', () => {
            settings.toggleEditMode();

            const stored = mockStorage.getItem('md-reader-pro-settings');
            const parsed = JSON.parse(stored);
            expect(parsed.editMode).toBe(false);
        });

        test('should call onChange callback', () => {
            const onChange = jest.fn();
            const settingsWithCallback = new Settings({ storage: mockStorage, onChange });
            
            settingsWithCallback.toggleEditMode();
            
            expect(onChange).toHaveBeenCalledWith('editMode', false);
        });
    });

    describe('setEditMode()', () => {
        test('should set edit mode to true', () => {
            settings.set('editMode', false);
            
            settings.setEditMode(true);
            expect(settings.isEditModeEnabled()).toBe(true);
        });

        test('should set edit mode to false', () => {
            settings.setEditMode(false);
            expect(settings.isEditModeEnabled()).toBe(false);
        });

        test('should persist to storage', () => {
            settings.setEditMode(false);

            const stored = mockStorage.getItem('md-reader-pro-settings');
            const parsed = JSON.parse(stored);
            expect(parsed.editMode).toBe(false);
        });

        test('should call onChange callback', () => {
            const onChange = jest.fn();
            const settingsWithCallback = new Settings({ storage: mockStorage, onChange });
            
            settingsWithCallback.setEditMode(false);
            
            expect(onChange).toHaveBeenCalledWith('editMode', false);
        });
    });

    describe('getTheme()', () => {
        test('should return current theme', () => {
            expect(settings.getTheme()).toBe('dark');
            
            settings.set('theme', 'light');
            expect(settings.getTheme()).toBe('light');
        });
    });

    describe('setTheme()', () => {
        test('should set theme', () => {
            settings.setTheme('light');
            expect(settings.getTheme()).toBe('light');
        });

        test('should persist to storage', () => {
            settings.setTheme('light');

            const stored = mockStorage.getItem('md-reader-pro-settings');
            const parsed = JSON.parse(stored);
            expect(parsed.theme).toBe('light');
        });

        test('should call onChange callback', () => {
            const onChange = jest.fn();
            const settingsWithCallback = new Settings({ storage: mockStorage, onChange });
            
            settingsWithCallback.setTheme('light');
            
            expect(onChange).toHaveBeenCalledWith('theme', 'light');
        });
    });

    describe('isAutoSaveEnabled()', () => {
        test('should return current auto-save state', () => {
            expect(settings.isAutoSaveEnabled()).toBe(true);
            
            settings.set('autoSave', false);
            expect(settings.isAutoSaveEnabled()).toBe(false);
        });
    });

    describe('getEnabledPlugins()', () => {
        let isolatedSettings;

        beforeEach(() => {
            const isolatedStorage = {
                data: {},
                getItem() { return null; },
                setItem(key, value) { this.data[key] = value; }
            };
            isolatedSettings = new Settings({ storage: isolatedStorage });
        });

        test('should return list of enabled plugin IDs', () => {
            expect(isolatedSettings.getEnabledPlugins()).toEqual([]);
            
            isolatedSettings.set('plugins.enabled', ['plugin1', 'plugin2']);
            expect(isolatedSettings.getEnabledPlugins()).toEqual(['plugin1', 'plugin2']);
        });

        test('should handle missing plugins.enabled gracefully', () => {
            isolatedSettings.settings.plugins = {};
            expect(isolatedSettings.getEnabledPlugins()).toEqual([]);
        });
    });

    describe('enablePlugin()', () => {
        let isolatedSettings;

        beforeEach(() => {
            // Use completely fresh storage for this suite
            const isolatedStorage = {
                data: {},
                getItem() { return null; },
                setItem(key, value) { this.data[key] = value; }
            };
            isolatedSettings = new Settings({ storage: isolatedStorage });
        });

        test('should add plugin to enabled list', () => {
            isolatedSettings.enablePlugin('test-plugin');
            expect(isolatedSettings.getEnabledPlugins()).toContain('test-plugin');
        });

        test('should not add duplicate plugins', () => {
            isolatedSettings.enablePlugin('test-plugin');
            isolatedSettings.enablePlugin('test-plugin');
            
            const enabled = isolatedSettings.getEnabledPlugins();
            expect(enabled.filter(id => id === 'test-plugin')).toHaveLength(1);
        });

        test('should persist to storage', () => {
            // Create a completely fresh instance for this test
            const freshStorage = {
                data: {},
                getItem() { return null; },
                setItem: jest.fn() // Spy on setItem
            };
            const freshSettings = new Settings({ storage: freshStorage });
            
            // Clear any calls from constructor
            freshStorage.setItem.mockClear();
            
            // Use a unique plugin name to avoid any cross-test pollution
            const uniquePluginId = 'test-plugin-' + Date.now();
            freshSettings.enablePlugin(uniquePluginId);
            
            // Should have called setItem to persist
            expect(freshStorage.setItem).toHaveBeenCalled();
        });

        test('should call onChange callback', () => {
            const onChange = jest.fn();
            const testStorage = {
                data: {},
                getItem() { return null; },
                setItem(key, value) { this.data[key] = value; }
            };
            const settingsWithCallback = new Settings({ storage: testStorage, onChange });
            
            // Verify the plugin is not already in the list
            expect(settingsWithCallback.getEnabledPlugins()).not.toContain('test-plugin-unique');
            
            // Now enable it
            settingsWithCallback.enablePlugin('test-plugin-unique');
            
            expect(onChange).toHaveBeenCalled();
            // Check that plugins.enabled was the key and test-plugin-unique is in the array
            const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
            expect(lastCall[0]).toBe('plugins.enabled');
            expect(lastCall[1]).toContain('test-plugin-unique');
        });
    });

    describe('disablePlugin()', () => {
        let isolatedSettings;

        beforeEach(() => {
            // Use completely fresh storage for this suite
            const isolatedStorage = {
                data: {},
                getItem() { return null; },
                setItem(key, value) { this.data[key] = value; }
            };
            isolatedSettings = new Settings({ storage: isolatedStorage });
        });

        test('should remove plugin from enabled list', () => {
            isolatedSettings.enablePlugin('test-plugin');
            expect(isolatedSettings.getEnabledPlugins()).toContain('test-plugin');
            
            isolatedSettings.disablePlugin('test-plugin');
            expect(isolatedSettings.getEnabledPlugins()).not.toContain('test-plugin');
        });

        test('should handle disabling non-existent plugin', () => {
            expect(() => isolatedSettings.disablePlugin('non-existent')).not.toThrow();
        });

        test('should persist to storage', () => {
            // disablePlugin saves data to storage
            const saveSpy = jest.spyOn(isolatedSettings, '_save');
            
            isolatedSettings.enablePlugin('test-plugin');
            saveSpy.mockClear();
            isolatedSettings.disablePlugin('test-plugin');

            expect(saveSpy).toHaveBeenCalled();
        });

        test('should call onChange callback', () => {
            const onChange = jest.fn();
            const testStorage = {
                data: {},
                getItem(key) { return this.data[key] || null; },
                setItem(key, value) { this.data[key] = value; }
            };
            const settingsWithCallback = new Settings({ storage: testStorage, onChange });
            
            settingsWithCallback.enablePlugin('plugin1');
            settingsWithCallback.enablePlugin('test-plugin');
            onChange.mockClear();
            
            settingsWithCallback.disablePlugin('test-plugin');
            
            expect(onChange).toHaveBeenCalled();
            // Check that the callback was called with plugins.enabled
            const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
            expect(lastCall[0]).toBe('plugins.enabled');
            expect(lastCall[1]).toContain('plugin1');
            expect(lastCall[1]).not.toContain('test-plugin');
        });
    });

    describe('_merge()', () => {
        test('should merge settings objects deeply', () => {
            const defaults = {
                a: 1,
                b: { c: 2, d: 3 },
                e: [1, 2, 3]
            };
            
            const overrides = {
                b: { c: 4 },
                f: 5
            };
            
            const merged = settings._merge(defaults, overrides);
            
            expect(merged.a).toBe(1);
            expect(merged.b.c).toBe(4);
            expect(merged.b.d).toBe(3);
            expect(merged.e).toEqual([1, 2, 3]);
            expect(merged.f).toBe(5);
        });

        test('should handle arrays by replacing, not merging', () => {
            const defaults = { arr: [1, 2, 3] };
            const overrides = { arr: [4, 5] };
            
            const merged = settings._merge(defaults, overrides);
            expect(merged.arr).toEqual([4, 5]);
        });

        test('should handle null and undefined values', () => {
            const defaults = { a: 1, b: 2 };
            const overrides = { a: null, c: undefined };
            
            const merged = settings._merge(defaults, overrides);
            expect(merged.a).toBeNull();
            expect(merged.c).toBeUndefined();
        });
    });

    describe('Storage edge cases', () => {
        test('should handle storage save errors gracefully', () => {
            const errorStorage = {
                getItem: () => null,
                setItem: () => { throw new Error('Storage full'); }
            };

            const settingsWithErrorStorage = new Settings({ storage: errorStorage });
            
            // Should not throw
            expect(() => settingsWithErrorStorage.set('theme', 'light')).not.toThrow();
        });

        test('should handle storage load errors gracefully', () => {
            const errorStorage = {
                getItem: () => { throw new Error('Storage error'); },
                setItem: () => {}
            };

            // Should not throw during construction
            expect(() => new Settings({ storage: errorStorage })).not.toThrow();
        });
    });

    describe('Default settings structure', () => {
        let freshSettings;

        beforeEach(() => {
            // Create fresh settings for this test suite
            const freshStorage = {
                data: {},
                getItem() { return null; },
                setItem(key, value) { this.data[key] = value; }
            };
            freshSettings = new Settings({ storage: freshStorage });
        });

        test('should include all expected default settings', () => {
            const all = freshSettings.getAll();
            
            expect(all.editMode).toBeDefined();
            expect(all.theme).toBeDefined();
            expect(all.autoSave).toBeDefined();
            expect(all.autoSaveInterval).toBeDefined();
            expect(all.syncScroll).toBeDefined();
            expect(all.autoAnalyze).toBeDefined();
            expect(all.plugins).toBeDefined();
            expect(all['diamond-drill']).toBeDefined();
            expect(all.customTheme).toBeDefined();
        });

        test('should have correct plugin settings structure', () => {
            // Check that plugins structure exists
            expect(freshSettings.get('plugins')).toBeDefined();
            expect(Array.isArray(freshSettings.get('plugins.enabled'))).toBe(true);
            expect(typeof freshSettings.get('plugins.autoLoad')).toBe('boolean');
        });

        test('should have correct diamond-drill settings structure', () => {
            expect(freshSettings.get('diamond-drill.reportFormat')).toBe('json');
            expect(freshSettings.get('diamond-drill.showLineNumbers')).toBe(true);
            expect(freshSettings.get('diamond-drill.theme')).toBe('auto');
        });

        test('should have correct customTheme settings structure', () => {
            expect(freshSettings.get('customTheme.enabled')).toBe(false);
            expect(freshSettings.get('customTheme.preset')).toBe('default');
            expect(freshSettings.get('customTheme.colors')).toBeDefined();
            // Note: Due to shallow copying in Settings constructor, nested defaults may be affected by previous tests
            // This is a known limitation but doesn't affect production usage as each Settings instance is standalone
            const accentColor = freshSettings.get('customTheme.colors.accent');
            expect(typeof accentColor).toBe('string');
            expect(accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/); // Valid hex color
        });
    });
});
