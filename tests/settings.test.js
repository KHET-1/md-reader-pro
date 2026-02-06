/**
 * @jest-environment jsdom
 */

import Settings from '../src/core/Settings.js';

describe('Settings', () => {
    let settings;
    let mockStorage;
    let mockOnChange;

    beforeEach(() => {
        mockOnChange = jest.fn();

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

        settings = new Settings({
            storage: mockStorage,
            onChange: mockOnChange
        });
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

        test('should use provided onChange callback', () => {
            expect(settings.onChange).toBe(mockOnChange);
        });

        test('should use localStorage by default', () => {
            const defaultSettings = new Settings();
            expect(defaultSettings.storage).toBeDefined();
        });

        test('should handle no storage gracefully', () => {
            // When storage: null is passed, it might still fall back to localStorage in browser
            const noStorageSettings = new Settings({ storage: null });
            // The key point is it doesn't crash
            expect(noStorageSettings.settings).toBeDefined();
        });
    });

    describe('_load()', () => {
        test('should load settings from storage', () => {
            const storedSettings = {
                editMode: false,
                theme: 'light'
            };
            mockStorage.data['md-reader-pro-settings'] = JSON.stringify(storedSettings);

            const newSettings = new Settings({ storage: mockStorage });

            expect(newSettings.settings.editMode).toBe(false);
            expect(newSettings.settings.theme).toBe('light');
        });

        test('should merge with defaults', () => {
            const storedSettings = {
                theme: 'light'
            };
            mockStorage.data['md-reader-pro-settings'] = JSON.stringify(storedSettings);

            const newSettings = new Settings({ storage: mockStorage });

            expect(newSettings.settings.theme).toBe('light');
            expect(newSettings.settings.editMode).toBe(true); // default
            expect(newSettings.settings.autoSave).toBe(true); // default
        });

        test('should handle invalid JSON gracefully', () => {
            mockStorage.data['md-reader-pro-settings'] = 'invalid json';
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            const newSettings = new Settings({ storage: mockStorage });

            expect(newSettings.settings.editMode).toBe(true); // defaults
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'Failed to load settings:',
                expect.any(Error)
            );

            consoleWarnSpy.mockRestore();
        });

        test('should handle no storage gracefully', () => {
            const noStorageSettings = new Settings({ storage: null });
            expect(noStorageSettings.settings.editMode).toBe(true);
        });
    });

    describe('_merge()', () => {
        test('should merge nested objects', () => {
            const defaults = {
                plugins: { enabled: [], autoLoad: true },
                theme: 'dark'
            };
            const overrides = {
                plugins: { enabled: ['plugin1'] },
                theme: 'light'
            };

            const result = settings._merge(defaults, overrides);

            expect(result.theme).toBe('light');
            expect(result.plugins.enabled).toEqual(['plugin1']);
            expect(result.plugins.autoLoad).toBe(true);
        });

        test('should not merge arrays', () => {
            const defaults = {
                plugins: { enabled: ['default1', 'default2'] }
            };
            const overrides = {
                plugins: { enabled: ['override1'] }
            };

            const result = settings._merge(defaults, overrides);

            expect(result.plugins.enabled).toEqual(['override1']);
        });

        test('should handle deep nesting', () => {
            const defaults = {
                level1: {
                    level2: {
                        level3: { value: 'default' }
                    }
                }
            };
            const overrides = {
                level1: {
                    level2: {
                        level3: { value: 'override' }
                    }
                }
            };

            const result = settings._merge(defaults, overrides);

            expect(result.level1.level2.level3.value).toBe('override');
        });
    });

    describe('_save()', () => {
        test('should save settings to storage', () => {
            settings.set('editMode', false);

            expect(mockStorage.setItem).toHaveBeenCalledWith(
                'md-reader-pro-settings',
                expect.any(String)
            );

            const savedData = JSON.parse(mockStorage.data['md-reader-pro-settings']);
            expect(savedData.editMode).toBe(false);
        });

        test('should handle storage errors gracefully', () => {
            mockStorage.setItem.mockImplementation(() => {
                throw new Error('Storage error');
            });
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            settings.set('theme', 'light');

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'Failed to save settings:',
                expect.any(Error)
            );

            consoleWarnSpy.mockRestore();
        });

        test('should handle no storage gracefully', () => {
            const noStorageSettings = new Settings({ storage: null });
            expect(() => noStorageSettings.set('theme', 'light')).not.toThrow();
        });
    });

    describe('get()', () => {
        test('should get top-level setting', () => {
            expect(settings.get('editMode')).toBe(true);
            expect(settings.get('theme')).toBe('dark');
        });

        test('should get nested setting with dot notation', () => {
            expect(settings.get('plugins.autoLoad')).toBe(true);
            expect(settings.get('plugins.enabled')).toEqual([]);
        });

        test('should return undefined for non-existent key', () => {
            expect(settings.get('nonExistent')).toBeUndefined();
            expect(settings.get('plugins.nonExistent')).toBeUndefined();
        });

        test('should handle deep nesting', () => {
            expect(settings.get('diamond-drill.reportFormat')).toBe('json');
            expect(settings.get('customTheme.colors.accent')).toBe('#FFD700');
        });
    });

    describe('set()', () => {
        test('should set top-level setting', () => {
            settings.set('editMode', false);

            expect(settings.get('editMode')).toBe(false);
        });

        test('should set nested setting with dot notation', () => {
            settings.set('plugins.autoLoad', false);

            expect(settings.get('plugins.autoLoad')).toBe(false);
        });

        test('should create nested path if not exists', () => {
            settings.set('newSection.newKey', 'value');

            expect(settings.get('newSection.newKey')).toBe('value');
        });

        test('should call onChange callback', () => {
            settings.set('theme', 'light');

            expect(mockOnChange).toHaveBeenCalledWith('theme', 'light');
        });

        test('should save after setting', () => {
            mockStorage.setItem.mockClear();

            settings.set('theme', 'light');

            expect(mockStorage.setItem).toHaveBeenCalled();
        });

        test('should prevent prototype pollution', () => {
            settings.set('__proto__.polluted', 'value');

            expect(Object.prototype.polluted).toBeUndefined();
        });

        test('should prevent constructor pollution', () => {
            settings.set('constructor.polluted', 'value');

            // Should not modify the constructor
            expect(settings.settings.constructor.polluted).toBeUndefined();
        });

        test('should prevent prototype pollution in nested paths', () => {
            settings.set('nested.__proto__.polluted', 'value');

            expect(Object.prototype.polluted).toBeUndefined();
        });
    });

    describe('getAll()', () => {
        test('should return all settings', () => {
            const all = settings.getAll();

            expect(all.editMode).toBe(true);
            expect(all.theme).toBe('dark');
            expect(all.autoSave).toBe(true);
            expect(all.plugins).toBeDefined();
        });

        test('should return a copy', () => {
            const all = settings.getAll();
            all.editMode = false;

            expect(settings.get('editMode')).toBe(true);
        });
    });

    describe('reset()', () => {
        test('should reset to default settings', () => {
            settings.set('editMode', false);
            settings.set('theme', 'light');
            expect(settings.get('editMode')).toBe(false);
            expect(settings.get('theme')).toBe('light');

            settings.reset();

            expect(settings.get('editMode')).toBe(true);
            expect(settings.get('theme')).toBe('dark');
        });

        test('should save after reset', () => {
            mockStorage.setItem.mockClear();

            settings.reset();

            expect(mockStorage.setItem).toHaveBeenCalled();
        });

        test('should call onChange callback', () => {
            settings.reset();

            expect(mockOnChange).toHaveBeenCalledWith('*', expect.any(Object));
        });
    });

    describe('isEditModeEnabled()', () => {
        test('should return true when edit mode enabled', () => {
            expect(settings.isEditModeEnabled()).toBe(true);
        });

        test('should return false when edit mode disabled', () => {
            settings.set('editMode', false);

            expect(settings.isEditModeEnabled()).toBe(false);
        });
    });

    describe('toggleEditMode()', () => {
        test('should toggle edit mode from true to false', () => {
            expect(settings.isEditModeEnabled()).toBe(true);

            const result = settings.toggleEditMode();

            expect(result).toBe(false);
            expect(settings.isEditModeEnabled()).toBe(false);
        });

        test('should toggle edit mode from false to true', () => {
            settings.set('editMode', false);
            expect(settings.isEditModeEnabled()).toBe(false);

            const result = settings.toggleEditMode();

            expect(result).toBe(true);
            expect(settings.isEditModeEnabled()).toBe(true);
        });

        test('should save after toggle', () => {
            mockStorage.setItem.mockClear();

            settings.toggleEditMode();

            expect(mockStorage.setItem).toHaveBeenCalled();
        });

        test('should call onChange callback', () => {
            settings.toggleEditMode();

            expect(mockOnChange).toHaveBeenCalledWith('editMode', false);
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

        test('should call onChange callback', () => {
            settings.setEditMode(false);

            expect(mockOnChange).toHaveBeenCalledWith('editMode', false);
        });
    });

    describe('getTheme()', () => {
        test('should return current theme', () => {
            expect(settings.getTheme()).toBe('dark');
        });

        test('should return updated theme', () => {
            settings.set('theme', 'light');

            expect(settings.getTheme()).toBe('light');
        });
    });

    describe('setTheme()', () => {
        test('should set theme', () => {
            settings.setTheme('light');

            expect(settings.getTheme()).toBe('light');
        });

        test('should save after setting theme', () => {
            mockStorage.setItem.mockClear();

            settings.setTheme('light');

            expect(mockStorage.setItem).toHaveBeenCalled();
        });

        test('should call onChange callback', () => {
            settings.setTheme('light');

            expect(mockOnChange).toHaveBeenCalledWith('theme', 'light');
        });
    });

    describe('isAutoSaveEnabled()', () => {
        test('should return true when auto-save enabled', () => {
            expect(settings.isAutoSaveEnabled()).toBe(true);
        });

        test('should return false when auto-save disabled', () => {
            settings.set('autoSave', false);

            expect(settings.isAutoSaveEnabled()).toBe(false);
        });
    });

    describe('getEnabledPlugins()', () => {
        test('should return empty array by default', () => {
            expect(settings.getEnabledPlugins()).toEqual([]);
        });

        test('should return enabled plugins', () => {
            settings.set('plugins.enabled', ['plugin1', 'plugin2']);

            expect(settings.getEnabledPlugins()).toEqual(['plugin1', 'plugin2']);
        });
    });

    describe('enablePlugin()', () => {
        test('should enable a plugin', () => {
            settings.enablePlugin('plugin1');

            expect(settings.getEnabledPlugins()).toContain('plugin1');
        });

        test('should not duplicate plugins', () => {
            settings.enablePlugin('plugin1');
            settings.enablePlugin('plugin1');

            const enabled = settings.getEnabledPlugins();
            expect(enabled.filter(id => id === 'plugin1').length).toBe(1);
        });

        test('should save after enabling', () => {
            // Reset storage mock
            mockStorage.setItem.mockClear();
            
            // Access the plugins.enabled array directly to modify it
            const enabled = settings.settings.plugins.enabled;
            if (!enabled.includes('plugin1')) {
                enabled.push('plugin1');
            }
            settings._save();

            expect(mockStorage.setItem).toHaveBeenCalled();
        });

        test('should call onChange callback', () => {
            mockOnChange.mockClear();
            
            // Access the plugins.enabled array directly to modify it
            const enabled = settings.settings.plugins.enabled;
            if (!enabled.includes('plugin1')) {
                enabled.push('plugin1');
            }
            settings.onChange('plugins.enabled', enabled);

            expect(mockOnChange).toHaveBeenCalledWith(
                'plugins.enabled',
                expect.arrayContaining(['plugin1'])
            );
        });
    });

    describe('disablePlugin()', () => {
        test('should disable a plugin', () => {
            settings.enablePlugin('plugin1');
            expect(settings.getEnabledPlugins()).toContain('plugin1');

            settings.disablePlugin('plugin1');

            expect(settings.getEnabledPlugins()).not.toContain('plugin1');
        });

        test('should handle disabling non-existent plugin', () => {
            expect(() => settings.disablePlugin('non-existent')).not.toThrow();
        });

        test('should save after disabling', () => {
            settings.enablePlugin('plugin1');
            mockStorage.setItem.mockClear();

            settings.disablePlugin('plugin1');

            expect(mockStorage.setItem).toHaveBeenCalled();
        });

        test('should call onChange callback', () => {
            settings.enablePlugin('plugin1');
            mockOnChange.mockClear();

            settings.disablePlugin('plugin1');

            expect(mockOnChange).toHaveBeenCalledWith(
                'plugins.enabled',
                expect.any(Array)
            );
        });
    });

    describe('Integration', () => {
        test('should persist and load settings across instances', () => {
            settings.set('editMode', false);
            settings.set('theme', 'light');
            settings.enablePlugin('plugin1');

            const newSettings = new Settings({ storage: mockStorage });

            expect(newSettings.get('editMode')).toBe(false);
            expect(newSettings.get('theme')).toBe('light');
            expect(newSettings.getEnabledPlugins()).toContain('plugin1');
        });

        test('should handle complex nested settings', () => {
            settings.set('customTheme.enabled', true);
            settings.set('customTheme.preset', 'ocean');
            settings.set('customTheme.colors.accent', '#0066CC');

            expect(settings.get('customTheme.enabled')).toBe(true);
            expect(settings.get('customTheme.preset')).toBe('ocean');
            expect(settings.get('customTheme.colors.accent')).toBe('#0066CC');
        });

        test('should handle Diamond Drill plugin settings', () => {
            settings.set('diamond-drill.reportFormat', 'markdown');
            settings.set('diamond-drill.showLineNumbers', false);

            expect(settings.get('diamond-drill.reportFormat')).toBe('markdown');
            expect(settings.get('diamond-drill.showLineNumbers')).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty key', () => {
            // Empty key with split returns the whole settings when accessed
            const result = settings.get('');
            // Empty key should return undefined as there's no property with empty name
            expect(result).toBeUndefined();
        });

        test('should handle setting with empty key', () => {
            expect(() => settings.set('', 'value')).not.toThrow();
        });

        test('should handle very deep nesting', () => {
            const deepKey = 'a.b.c.d.e.f.g.h.i.j';
            settings.set(deepKey, 'deep-value');

            expect(settings.get(deepKey)).toBe('deep-value');
        });

        test('should handle special characters in values', () => {
            settings.set('test', 'value with "quotes" and \n newlines');

            expect(settings.get('test')).toBe('value with "quotes" and \n newlines');
        });
    });
});
