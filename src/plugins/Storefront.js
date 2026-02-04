/**
 * Storefront - Local plugin management UI
 *
 * Modal for browsing, installing, and configuring plugins.
 *
 * @module Storefront
 * @version 1.0.0
 */

class Storefront {
    constructor(options = {}) {
        this.modal = null;
        this.isOpen = false;

        // Plugin system references
        this.pluginLoader = options.pluginLoader;
        this.pluginRegistry = options.pluginRegistry;
        this.settings = options.settings;

        // Callbacks
        this.onPluginLoad = options.onPluginLoad || (() => {});
        this.onPluginUnload = options.onPluginUnload || (() => {});
        this.onClose = options.onClose || (() => {});
    }

    /**
     * Open the storefront modal
     */
    open() {
        if (this.modal) {
            this.modal.remove();
        }

        this.modal = document.createElement('div');
        this.modal.id = 'plugin-storefront';
        this.modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: #1a1a2e;
            border: 2px solid #FFD700;
            border-radius: 16px;
            width: 90%;
            max-width: 800px;
            max-height: 80vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(255, 215, 0, 0.2);
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px 24px;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #16162a;
        `;

        header.innerHTML = `
            <div>
                <h2 style="margin: 0; color: #FFD700; font-size: 20px;">
                    🏪 Plugin Storefront
                </h2>
                <p style="margin: 4px 0 0; color: #888; font-size: 12px;">
                    Browse and manage local plugins
                </p>
            </div>
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: #888;
            font-size: 24px;
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            transition: all 0.2s;
        `;
        closeBtn.addEventListener('click', () => this.close());
        header.appendChild(closeBtn);

        // Body
        const body = document.createElement('div');
        body.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 24px;
        `;

        // Installed section
        const installedSection = document.createElement('div');
        installedSection.innerHTML = `
            <h3 style="color: #fff; margin: 0 0 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                📦 Installed Plugins
            </h3>
        `;

        const installedGrid = document.createElement('div');
        installedGrid.id = 'installed-plugins-grid';
        installedGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
        `;

        // Get available plugins
        const plugins = this.pluginLoader?.getAvailablePlugins() || [];
        const enabledPlugins = this.settings?.getEnabledPlugins() || [];

        if (plugins.length === 0) {
            installedGrid.innerHTML = `
                <div style="color: #666; grid-column: 1 / -1; text-align: center; padding: 40px;">
                    No plugins discovered
                </div>
            `;
        } else {
            plugins.forEach(plugin => {
                const isEnabled = enabledPlugins.includes(plugin.id);
                const isLoaded = this.pluginLoader?.isLoaded(plugin.id);

                const card = this._createPluginCard(plugin, isEnabled, isLoaded);
                installedGrid.appendChild(card);
            });
        }

        installedSection.appendChild(installedGrid);

        // Available section (placeholder for future remote plugins)
        const availableSection = document.createElement('div');
        availableSection.innerHTML = `
            <h3 style="color: #fff; margin: 0 0 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                🌐 Available Plugins
            </h3>
            <div style="color: #666; text-align: center; padding: 40px; border: 1px dashed #333; border-radius: 8px;">
                <div style="font-size: 32px; margin-bottom: 8px;">🔮</div>
                <p style="margin: 0;">More plugins coming soon...</p>
            </div>
        `;

        body.appendChild(installedSection);
        body.appendChild(availableSection);

        content.appendChild(header);
        content.appendChild(body);
        this.modal.appendChild(content);

        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        // Close on Escape
        this._escHandler = (e) => {
            if (e.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this._escHandler);

        document.body.appendChild(this.modal);
        this.isOpen = true;
    }

    /**
     * Create a plugin card element
     * @private
     */
    _createPluginCard(plugin, isEnabled, isLoaded) {
        const card = document.createElement('div');
        card.className = 'plugin-card';
        card.style.cssText = `
            background: #252540;
            border: 1px solid ${isLoaded ? '#FFD700' : '#333'};
            border-radius: 12px;
            padding: 16px;
            transition: all 0.2s;
        `;

        const statusColor = isLoaded ? '#4caf50' : (isEnabled ? '#ff9800' : '#666');
        const statusText = isLoaded ? 'Active' : (isEnabled ? 'Enabled' : 'Disabled');

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div>
                    <h4 style="margin: 0; color: #fff; font-size: 14px;">${plugin.name}</h4>
                    <span style="font-size: 11px; color: #888;">v${plugin.version}</span>
                </div>
                <span style="
                    font-size: 10px;
                    padding: 2px 8px;
                    border-radius: 10px;
                    background: ${statusColor}20;
                    color: ${statusColor};
                ">${statusText}</span>
            </div>
            <p style="margin: 0 0 12px; color: #888; font-size: 12px; line-height: 1.4;">
                ${plugin.description || 'No description'}
            </p>
            <div style="display: flex; gap: 8px;">
                ${isLoaded ? `
                    <button class="plugin-unload-btn" data-plugin="${plugin.id}" style="
                        flex: 1;
                        padding: 8px;
                        border: none;
                        border-radius: 6px;
                        background: #ff6b6b20;
                        color: #ff6b6b;
                        cursor: pointer;
                        font-size: 12px;
                    ">Unload</button>
                ` : `
                    <button class="plugin-load-btn" data-plugin="${plugin.id}" style="
                        flex: 1;
                        padding: 8px;
                        border: none;
                        border-radius: 6px;
                        background: #FFD70020;
                        color: #FFD700;
                        cursor: pointer;
                        font-size: 12px;
                    ">Load</button>
                `}
            </div>
        `;

        // Add button handlers
        const loadBtn = card.querySelector('.plugin-load-btn');
        const unloadBtn = card.querySelector('.plugin-unload-btn');

        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                this.onPluginLoad(plugin.id);
                this.refresh();
            });
        }

        if (unloadBtn) {
            unloadBtn.addEventListener('click', () => {
                this.onPluginUnload(plugin.id);
                this.refresh();
            });
        }

        return card;
    }

    /**
     * Refresh the storefront view
     */
    refresh() {
        if (this.isOpen) {
            this.close();
            this.open();
        }
    }

    /**
     * Close the storefront modal
     */
    close() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler);
            this._escHandler = null;
        }
        this.isOpen = false;
        this.onClose();
    }
}

export default Storefront;
