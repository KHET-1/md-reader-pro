/**
 * PluginRegistry - Tracks installed and enabled plugins
 *
 * Manages plugin state persistence and settings.
 *
 * @module PluginRegistry
 * @version 1.0.0
 */

const STORAGE_KEY = 'md-reader-pro-plugins';

/**
 * Plugin registration entry
 * @typedef {Object} PluginEntry
 * @property {string} id - Plugin ID
 * @property {boolean} enabled - Whether plugin is enabled
 * @property {Object} settings - Plugin-specific settings
 * @property {string} installedAt - ISO timestamp
 */

class PluginRegistry {
    constructor(options = {}) {
        this.storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
        this.entries = new Map();
        this._load();
    }

    /**
     * Load registry from storage
     * @private
     */
    _load() {
        if (!this.storage) return;

        try {
            const data = this.storage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                for (const entry of parsed) {
                    this.entries.set(entry.id, entry);
                }
            }
        } catch (err) {
            console.warn('Failed to load plugin registry:', err);
        }
    }

    /**
     * Save registry to storage
     * @private
     */
    _save() {
        if (!this.storage) return;

        try {
            const data = Array.from(this.entries.values());
            this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (err) {
            console.warn('Failed to save plugin registry:', err);
        }
    }

    /**
     * Register a plugin
     * @param {string} id - Plugin ID
     * @param {Object} settings - Initial settings
     * @returns {PluginEntry}
     */
    register(id, settings = {}) {
        const entry = {
            id,
            enabled: true,
            settings,
            installedAt: new Date().toISOString()
        };

        this.entries.set(id, entry);
        this._save();
        return entry;
    }

    /**
     * Unregister a plugin
     * @param {string} id - Plugin ID
     */
    unregister(id) {
        this.entries.delete(id);
        this._save();
    }

    /**
     * Get a plugin entry
     * @param {string} id - Plugin ID
     * @returns {PluginEntry|undefined}
     */
    get(id) {
        return this.entries.get(id);
    }

    /**
     * Check if plugin is registered
     * @param {string} id - Plugin ID
     * @returns {boolean}
     */
    isRegistered(id) {
        return this.entries.has(id);
    }

    /**
     * Check if plugin is enabled
     * @param {string} id - Plugin ID
     * @returns {boolean}
     */
    isEnabled(id) {
        const entry = this.entries.get(id);
        return entry?.enabled ?? false;
    }

    /**
     * Enable a plugin
     * @param {string} id - Plugin ID
     */
    enable(id) {
        const entry = this.entries.get(id);
        if (entry) {
            entry.enabled = true;
            this._save();
        }
    }

    /**
     * Disable a plugin
     * @param {string} id - Plugin ID
     */
    disable(id) {
        const entry = this.entries.get(id);
        if (entry) {
            entry.enabled = false;
            this._save();
        }
    }

    /**
     * Update plugin settings
     * @param {string} id - Plugin ID
     * @param {Object} settings - Settings to merge
     */
    updateSettings(id, settings) {
        const entry = this.entries.get(id);
        if (entry) {
            entry.settings = { ...entry.settings, ...settings };
            this._save();
        }
    }

    /**
     * Get all enabled plugin IDs
     * @returns {string[]}
     */
    getEnabledPlugins() {
        return Array.from(this.entries.values())
            .filter(e => e.enabled)
            .map(e => e.id);
    }

    /**
     * Get all registered plugin entries
     * @returns {PluginEntry[]}
     */
    getAll() {
        return Array.from(this.entries.values());
    }

    /**
     * Clear all entries
     */
    clear() {
        this.entries.clear();
        this._save();
    }
}

export default PluginRegistry;
