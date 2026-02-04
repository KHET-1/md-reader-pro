/**
 * PluginLoader - Lazy-load plugins on demand
 *
 * Supports multiple plugin types:
 * - native: Spawns external binary (e.g., Diamond Drill)
 * - wasm: Loads WebAssembly module
 * - iframe: Loads plugin in sandboxed iframe
 * - worker: Loads plugin in Web Worker
 *
 * @module PluginLoader
 * @version 1.0.0
 */

import PluginBridge from './PluginBridge.js';

/**
 * Plugin manifest structure
 * @typedef {Object} PluginManifest
 * @property {string} id - Unique plugin identifier
 * @property {string} name - Display name
 * @property {string} version - Semver version
 * @property {string} type - Plugin type: native|wasm|iframe|worker
 * @property {string} description - Plugin description
 * @property {string[]} capabilities - List of capabilities
 * @property {Object} entry - Entry points by type
 * @property {string[]} permissions - Required permissions
 */

/**
 * Loaded plugin instance
 * @typedef {Object} PluginInstance
 * @property {string} id - Plugin ID
 * @property {PluginManifest} manifest - Plugin manifest
 * @property {string} status - Status: loading|ready|error|stopped
 * @property {PluginBridge} bridge - Communication bridge
 * @property {Function} send - Send message to plugin
 * @property {Function} stop - Stop the plugin
 */

class PluginLoader {
    constructor(options = {}) {
        this.pluginsDir = options.pluginsDir || './plugins';
        this.manifests = new Map(); // id -> manifest
        this.instances = new Map(); // id -> PluginInstance
        this.onPluginReady = options.onPluginReady || (() => {});
        this.onPluginError = options.onPluginError || console.error;
        this.onPluginMessage = options.onPluginMessage || (() => {});
    }

    /**
     * Discover available plugins by scanning manifests
     * @returns {Promise<PluginManifest[]>}
     */
    async discover() {
        // In browser, we'd fetch from a known list
        // For now, return hardcoded Diamond Drill
        const diamondDrill = {
            id: 'diamond-drill',
            name: 'Diamond Drill',
            version: '0.1.0',
            type: 'native',
            description: 'Security-focused file analyzer with read-only enforcement',
            author: 'Diamond Forgemaster',
            capabilities: ['file:analyze', 'file:report', 'file:browse', 'ui:panel'],
            entry: {
                native: { binary: 'diamond', args: ['--plugin-mode'] },
                wasm: 'diamond_drill.wasm'
            },
            permissions: ['read:files', 'write:reports'],
            settings: {
                defaultView: { type: 'select', default: 'panel' },
                readOnlyEnforce: { type: 'boolean', default: true }
            }
        };

        this.manifests.set(diamondDrill.id, diamondDrill);
        return [diamondDrill];
    }

    /**
     * Load a plugin by ID
     * @param {string} pluginId - Plugin identifier
     * @returns {Promise<PluginInstance>}
     */
    async load(pluginId) {
        // Check if already loaded
        if (this.instances.has(pluginId)) {
            return this.instances.get(pluginId);
        }

        // Get manifest
        const manifest = this.manifests.get(pluginId);
        if (!manifest) {
            throw new Error(`Plugin not found: ${pluginId}`);
        }

        // Create instance based on type
        let instance;
        switch (manifest.type) {
            case 'native':
                instance = await this._loadNativePlugin(manifest);
                break;
            case 'wasm':
                instance = await this._loadWasmPlugin(manifest);
                break;
            case 'iframe':
                instance = await this._loadIframePlugin(manifest);
                break;
            case 'worker':
                instance = await this._loadWorkerPlugin(manifest);
                break;
            default:
                throw new Error(`Unknown plugin type: ${manifest.type}`);
        }

        this.instances.set(pluginId, instance);
        return instance;
    }

    /**
     * Load a native plugin (spawns external process)
     * @private
     */
    async _loadNativePlugin(manifest) {
        const bridge = new PluginBridge({
            pluginId: manifest.id,
            type: 'native',
            binary: manifest.entry.native.binary,
            args: manifest.entry.native.args,
            onMessage: (msg) => this.onPluginMessage(manifest.id, msg),
            onError: (err) => this.onPluginError(manifest.id, err),
            onReady: () => this.onPluginReady(manifest.id)
        });

        await bridge.start();

        return {
            id: manifest.id,
            manifest,
            status: 'ready',
            bridge,
            send: (action, payload) => bridge.send(action, payload),
            stop: () => bridge.stop()
        };
    }

    /**
     * Load a WASM plugin
     * @private
     */
    async _loadWasmPlugin(manifest) {
        // WASM loading would go here
        // For now, return a stub
        console.warn(`WASM plugins not yet implemented: ${manifest.id}`);

        return {
            id: manifest.id,
            manifest,
            status: 'error',
            bridge: null,
            send: () => Promise.reject(new Error('WASM not implemented')),
            stop: () => {}
        };
    }

    /**
     * Load an iframe plugin
     * @private
     */
    async _loadIframePlugin(manifest) {
        // IFrame loading would go here
        console.warn(`IFrame plugins not yet implemented: ${manifest.id}`);

        return {
            id: manifest.id,
            manifest,
            status: 'error',
            bridge: null,
            send: () => Promise.reject(new Error('IFrame not implemented')),
            stop: () => {}
        };
    }

    /**
     * Load a worker plugin
     * @private
     */
    async _loadWorkerPlugin(manifest) {
        // Worker loading would go here
        console.warn(`Worker plugins not yet implemented: ${manifest.id}`);

        return {
            id: manifest.id,
            manifest,
            status: 'error',
            bridge: null,
            send: () => Promise.reject(new Error('Worker not implemented')),
            stop: () => {}
        };
    }

    /**
     * Unload a plugin
     * @param {string} pluginId - Plugin identifier
     */
    async unload(pluginId) {
        const instance = this.instances.get(pluginId);
        if (instance) {
            instance.stop();
            this.instances.delete(pluginId);
        }
    }

    /**
     * Get a loaded plugin instance
     * @param {string} pluginId - Plugin identifier
     * @returns {PluginInstance|undefined}
     */
    get(pluginId) {
        return this.instances.get(pluginId);
    }

    /**
     * Check if a plugin is loaded
     * @param {string} pluginId - Plugin identifier
     * @returns {boolean}
     */
    isLoaded(pluginId) {
        return this.instances.has(pluginId);
    }

    /**
     * Get all loaded plugin IDs
     * @returns {string[]}
     */
    getLoadedPlugins() {
        return Array.from(this.instances.keys());
    }

    /**
     * Get all available plugin manifests
     * @returns {PluginManifest[]}
     */
    getAvailablePlugins() {
        return Array.from(this.manifests.values());
    }

    /**
     * Stop all plugins
     */
    stopAll() {
        for (const instance of this.instances.values()) {
            instance.stop();
        }
        this.instances.clear();
    }
}

export default PluginLoader;
