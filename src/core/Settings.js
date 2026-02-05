/**
 * Settings - Editor settings management with persistence
 *
 * Manages user preferences including:
 * - Edit mode (enable/disable editing)
 * - Theme selection
 * - Auto-save preferences
 * - Plugin settings
 *
 * @module Settings
 * @version 1.0.0
 */

const STORAGE_KEY = 'md-reader-pro-settings';

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
    // Editor settings
    editMode: true,           // true = can edit, false = read-only viewer
    theme: 'dark',            // dark, light
    autoSave: true,           // Auto-save to localStorage
    autoSaveInterval: 60000,  // Auto-save interval in ms

    // Preview settings
    syncScroll: true,         // Sync editor and preview scroll

    // Analysis settings
    autoAnalyze: false,       // Auto-analyze on file load

    // Plugin settings
    plugins: {
        enabled: [],          // List of enabled plugin IDs
        autoLoad: true        // Auto-load plugins on startup
    },

    // Diamond Drill settings
    'diamond-drill': {
        reportFormat: 'json',     // json, markdown, html
        showLineNumbers: true,
        showWordCount: true,
        showCharCount: true,
        theme: 'auto'             // auto, dark, light
    },

    // v13e: Custom theme settings
    customTheme: {
        enabled: false,
        preset: 'default',        // default, ocean, forest, sunset, midnight, custom
        colors: {
            accent: '#FFD700',
            bgPrimary: '#0a0a0a',
            bgSecondary: '#111111',
            bgTertiary: '#1a1a1a',
            textPrimary: '#ffffff',
            textSecondary: '#cccccc',
            textMuted: '#888888',
            border: '#333333'
        }
    }
};

class Settings {
    constructor(options = {}) {
        this.storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
        this.onChange = options.onChange || (() => {});
        this.settings = { ...DEFAULT_SETTINGS };
        this._load();
    }

    /**
     * Load settings from storage
     * @private
     */
    _load() {
        if (!this.storage) return;

        try {
            const data = this.storage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                this.settings = this._merge(DEFAULT_SETTINGS, parsed);
            }
        } catch (err) {
            console.warn('Failed to load settings:', err);
        }
    }

    /**
     * Deep merge settings objects
     * @private
     */
    _merge(defaults, overrides) {
        const result = { ...defaults };
        for (const key of Object.keys(overrides)) {
            if (typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {
                result[key] = this._merge(defaults[key], overrides[key]);
            } else {
                result[key] = overrides[key];
            }
        }
        return result;
    }

    /**
     * Save settings to storage
     * @private
     */
    _save() {
        if (!this.storage) return;

        try {
            this.storage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
        } catch (err) {
            console.warn('Failed to save settings:', err);
        }
    }

    /**
     * Get a setting value
     * @param {string} key - Dot-notation key (e.g., 'plugins.enabled')
     * @returns {any}
     */
    get(key) {
        const parts = key.split('.');
        let value = this.settings;
        for (const part of parts) {
            if (value === undefined) return undefined;
            value = value[part];
        }
        return value;
    }

    /**
     * Set a setting value
     * @param {string} key - Dot-notation key
     * @param {any} value - Value to set
     */
    set(key, value) {
        const parts = key.split('.');
        let obj = this.settings;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!obj[parts[i]]) obj[parts[i]] = {};
            obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = value;
        this._save();
        this.onChange(key, value);
    }

    /**
     * Get all settings
     * @returns {Object}
     */
    getAll() {
        return { ...this.settings };
    }

    /**
     * Reset to default settings
     */
    reset() {
        this.settings = { ...DEFAULT_SETTINGS };
        this._save();
        this.onChange('*', this.settings);
    }

    // === Convenience Methods ===

    /**
     * Check if edit mode is enabled
     * @returns {boolean}
     */
    isEditModeEnabled() {
        return this.settings.editMode;
    }

    /**
     * Toggle edit mode
     * @returns {boolean} - New edit mode value
     */
    toggleEditMode() {
        this.settings.editMode = !this.settings.editMode;
        this._save();
        this.onChange('editMode', this.settings.editMode);
        return this.settings.editMode;
    }

    /**
     * Set edit mode
     * @param {boolean} enabled
     */
    setEditMode(enabled) {
        this.settings.editMode = enabled;
        this._save();
        this.onChange('editMode', enabled);
    }

    /**
     * Get current theme
     * @returns {string}
     */
    getTheme() {
        return this.settings.theme;
    }

    /**
     * Set theme
     * @param {string} theme - 'dark' or 'light'
     */
    setTheme(theme) {
        this.settings.theme = theme;
        this._save();
        this.onChange('theme', theme);
    }

    /**
     * Check if auto-save is enabled
     * @returns {boolean}
     */
    isAutoSaveEnabled() {
        return this.settings.autoSave;
    }

    /**
     * Get enabled plugins
     * @returns {string[]}
     */
    getEnabledPlugins() {
        return this.settings.plugins.enabled || [];
    }

    /**
     * Enable a plugin
     * @param {string} pluginId
     */
    enablePlugin(pluginId) {
        if (!this.settings.plugins.enabled.includes(pluginId)) {
            this.settings.plugins.enabled.push(pluginId);
            this._save();
            this.onChange('plugins.enabled', this.settings.plugins.enabled);
        }
    }

    /**
     * Disable a plugin
     * @param {string} pluginId
     */
    disablePlugin(pluginId) {
        const idx = this.settings.plugins.enabled.indexOf(pluginId);
        if (idx !== -1) {
            this.settings.plugins.enabled.splice(idx, 1);
            this._save();
            this.onChange('plugins.enabled', this.settings.plugins.enabled);
        }
    }
}

export default Settings;
