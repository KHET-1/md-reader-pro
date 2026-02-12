/**
 * Tests for Settings module
 */
import Settings from '../src/core/Settings.js';

describe('Settings', () => {
    let settings;
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
        test('creates with default settings', () => {
            settings = new Settings({ storage: mockStorage });
            expect(settings.get('editMode')).toBe(true);
            expect(settings.get('theme')).toBe('dark');
            expect(settings.get('autoSave')).toBe(true);
        });

        test('creates with null storage', () => {
            settings = new Settings({ storage: null });
            expect(settings.get('editMode')).toBe(true);
        });

        test('loads saved settings from storage', () => {
            mockStorage.store['md-reader-pro-settings'] = JSON.stringify({
                editMode: false,
                theme: 'light'
            });
            settings = new Settings({ storage: mockStorage });
            expect(settings.get('editMode')).toBe(false);
            expect(settings.get('theme')).toBe('light');
        });

        test('handles corrupt storage data', () => {
            mockStorage.store['md-reader-pro-settings'] = 'not-json{{';
            settings = new Settings({ storage: mockStorage });
            expect(settings.get('editMode')).toBe(true);
        });

        test('accepts onChange callback', () => {
            const onChange = jest.fn();
            settings = new Settings({ storage: mockStorage, onChange });
            settings.set('theme', 'light');
            expect(onChange).toHaveBeenCalledWith('theme', 'light');
        });
    });

    describe('get', () => {
        beforeEach(() => {
            settings = new Settings({ storage: mockStorage });
        });

        test('gets top-level settings', () => {
            expect(settings.get('editMode')).toBe(true);
            expect(settings.get('autoSaveInterval')).toBe(60000);
        });

        test('gets nested settings via dot notation', () => {
            expect(settings.get('plugins.autoLoad')).toBe(true);
            expect(settings.get('plugins.enabled')).toEqual([]);
        });

        test('returns undefined for missing keys', () => {
            expect(settings.get('nonexistent')).toBeUndefined();
            expect(settings.get('a.b.c.d')).toBeUndefined();
        });

        test('gets deeply nested settings', () => {
            expect(settings.get('customTheme.colors.accent')).toBe('#FFD700');
        });
    });

    describe('set', () => {
        beforeEach(() => {
            settings = new Settings({ storage: mockStorage });
        });

        test('sets top-level settings', () => {
            settings.set('theme', 'light');
            expect(settings.get('theme')).toBe('light');
        });

        test('sets nested settings via dot notation', () => {
            settings.set('plugins.autoLoad', false);
            expect(settings.get('plugins.autoLoad')).toBe(false);
        });

        test('persists to storage on set', () => {
            settings.set('theme', 'light');
            const stored = JSON.parse(mockStorage.store['md-reader-pro-settings']);
            expect(stored.theme).toBe('light');
        });

        test('creates intermediate objects for new paths', () => {
            settings.set('newSection.nested.value', 42);
            expect(settings.get('newSection.nested.value')).toBe(42);
        });

        test('prevents prototype pollution with __proto__', () => {
            settings.set('__proto__.polluted', true);
            expect(({}).polluted).toBeUndefined();
        });

        test('prevents prototype pollution with constructor', () => {
            settings.set('constructor.polluted', true);
            expect(settings.get('constructor.polluted')).toBeUndefined();
        });

        test('prevents prototype pollution with prototype', () => {
            settings.set('prototype.polluted', true);
            expect(settings.get('prototype.polluted')).toBeUndefined();
        });

        test('prevents prototype pollution on last segment', () => {
            settings.set('a.__proto__', 'bad');
            // __proto__ should not be set to 'bad' value
            expect(settings.get('a.__proto__')).not.toBe('bad');
        });

        test('handles storage failure gracefully', () => {
            const badStorage = {
                getItem: () => null,
                setItem: () => { throw new Error('quota exceeded'); }
            };
            settings = new Settings({ storage: badStorage });
            expect(() => settings.set('theme', 'light')).not.toThrow();
        });
    });

    describe('getAll', () => {
        test('returns a copy of all settings', () => {
            settings = new Settings({ storage: mockStorage });
            const all = settings.getAll();
            expect(all.editMode).toBe(true);
            expect(all.theme).toBe('dark');
            // Ensure it's a copy
            all.editMode = false;
            expect(settings.get('editMode')).toBe(true);
        });
    });

    describe('reset', () => {
        test('resets to defaults', () => {
            settings = new Settings({ storage: mockStorage });
            settings.set('theme', 'light');
            settings.set('editMode', false);
            settings.reset();
            expect(settings.get('theme')).toBe('dark');
            expect(settings.get('editMode')).toBe(true);
        });

        test('calls onChange with wildcard', () => {
            const onChange = jest.fn();
            settings = new Settings({ storage: mockStorage, onChange });
            settings.reset();
            expect(onChange).toHaveBeenCalledWith('*', expect.any(Object));
        });

        test('persists reset to storage', () => {
            settings = new Settings({ storage: mockStorage });
            settings.set('theme', 'light');
            settings.reset();
            const stored = JSON.parse(mockStorage.store['md-reader-pro-settings']);
            expect(stored.theme).toBe('dark');
        });
    });

    describe('convenience methods', () => {
        beforeEach(() => {
            settings = new Settings({ storage: mockStorage });
        });

        test('isEditModeEnabled returns edit mode state', () => {
            expect(settings.isEditModeEnabled()).toBe(true);
        });

        test('toggleEditMode toggles and returns new value', () => {
            const result = settings.toggleEditMode();
            expect(result).toBe(false);
            expect(settings.isEditModeEnabled()).toBe(false);

            const result2 = settings.toggleEditMode();
            expect(result2).toBe(true);
        });

        test('setEditMode sets edit mode', () => {
            settings.setEditMode(false);
            expect(settings.isEditModeEnabled()).toBe(false);
            settings.setEditMode(true);
            expect(settings.isEditModeEnabled()).toBe(true);
        });

        test('getTheme returns current theme', () => {
            expect(settings.getTheme()).toBe('dark');
        });

        test('setTheme sets theme', () => {
            settings.setTheme('light');
            expect(settings.getTheme()).toBe('light');
        });

        test('isAutoSaveEnabled returns auto-save state', () => {
            expect(settings.isAutoSaveEnabled()).toBe(true);
        });

        test('getEnabledPlugins returns enabled plugins list', () => {
            expect(settings.getEnabledPlugins()).toEqual([]);
        });

        test('enablePlugin adds plugin to enabled list', () => {
            settings.enablePlugin('test-plugin');
            expect(settings.getEnabledPlugins()).toEqual(['test-plugin']);
        });

        test('enablePlugin does not duplicate', () => {
            settings.enablePlugin('test-plugin');
            settings.enablePlugin('test-plugin');
            expect(settings.getEnabledPlugins()).toEqual(['test-plugin']);
        });

        test('disablePlugin removes plugin from enabled list', () => {
            settings.enablePlugin('plugin-a');
            settings.enablePlugin('plugin-b');
            settings.disablePlugin('plugin-a');
            const enabled = settings.getEnabledPlugins();
            expect(enabled).toContain('plugin-b');
            expect(enabled).not.toContain('plugin-a');
        });

        test('disablePlugin handles non-existent plugin', () => {
            expect(() => settings.disablePlugin('nonexistent')).not.toThrow();
        });
    });

    describe('_merge', () => {
        test('deep merges nested objects', () => {
            mockStorage.store['md-reader-pro-settings'] = JSON.stringify({
                customTheme: {
                    enabled: true,
                    colors: { accent: '#FF0000' }
                }
            });
            settings = new Settings({ storage: mockStorage });
            expect(settings.get('customTheme.enabled')).toBe(true);
            expect(settings.get('customTheme.colors.accent')).toBe('#FF0000');
            // Other default colors should remain
            expect(settings.get('customTheme.colors.bgPrimary')).toBe('#0a0a0a');
        });

        test('handles array override (not deep merge)', () => {
            mockStorage.store['md-reader-pro-settings'] = JSON.stringify({
                plugins: { enabled: ['plugin-a'] }
            });
            settings = new Settings({ storage: mockStorage });
            expect(settings.get('plugins.enabled')).toEqual(['plugin-a']);
        });
    });
});
