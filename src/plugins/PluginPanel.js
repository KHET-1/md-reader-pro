/**
 * PluginPanel - Sidebar panel for plugin UI
 *
 * Provides a collapsible panel that plugins can render into.
 * Diamond Drill uses this to show analysis results.
 *
 * @module PluginPanel
 * @version 1.0.0
 */

class PluginPanel {
    constructor(options = {}) {
        this.container = null;
        this.contentArea = null;
        this.isOpen = false;
        this.currentPlugin = null;
        this.width = options.width || 350;

        // Callbacks
        this.onClose = options.onClose || (() => {});
        this.onPluginAction = options.onPluginAction || (() => {});
    }

    /**
     * Create and mount the panel
     */
    mount() {
        if (this.container) return;

        // Create panel container
        this.container = document.createElement('div');
        this.container.id = 'plugin-panel';
        this.container.className = 'plugin-panel';
        this.container.style.cssText = `
            position: fixed;
            top: 60px;
            right: 0;
            bottom: 0;
            width: ${this.width}px;
            background: var(--bg-secondary, #1a1a2e);
            border-left: 2px solid var(--accent, #FFD700);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
        `;

        // Header
        const header = document.createElement('div');
        header.className = 'plugin-panel-header';
        header.style.cssText = `
            padding: 16px;
            border-bottom: 1px solid var(--border, #333);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--bg-tertiary, #16162a);
        `;

        this.titleEl = document.createElement('h3');
        this.titleEl.style.cssText = `
            margin: 0;
            color: var(--accent, #FFD700);
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        this.titleEl.innerHTML = '🔌 Plugin Panel';

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: #888;
            font-size: 18px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s;
        `;
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(255, 0, 0, 0.2)';
            closeBtn.style.color = '#ff6b6b';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'none';
            closeBtn.style.color = '#888';
        });
        closeBtn.addEventListener('click', () => this.close());

        header.appendChild(this.titleEl);
        header.appendChild(closeBtn);

        // Content area
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'plugin-panel-content';
        this.contentArea.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            color: var(--text, #e0e0e0);
        `;

        // Default content
        this.contentArea.innerHTML = `
            <div style="text-align: center; color: #666; padding: 40px 20px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🔌</div>
                <p>No plugin active</p>
                <p style="font-size: 12px;">Load a plugin from the Plugins menu</p>
            </div>
        `;

        this.container.appendChild(header);
        this.container.appendChild(this.contentArea);

        document.body.appendChild(this.container);
    }

    /**
     * Open the panel
     */
    open() {
        if (!this.container) this.mount();
        this.container.style.transform = 'translateX(0)';
        this.isOpen = true;

        // Adjust main content
        const mainContent = document.querySelector('.content');
        if (mainContent) {
            mainContent.style.marginRight = `${this.width}px`;
            mainContent.style.transition = 'margin-right 0.3s ease';
        }
    }

    /**
     * Close the panel
     */
    close() {
        if (!this.container) return;
        this.container.style.transform = 'translateX(100%)';
        this.isOpen = false;

        // Reset main content
        const mainContent = document.querySelector('.content');
        if (mainContent) {
            mainContent.style.marginRight = '0';
        }

        this.onClose();
    }

    /**
     * Toggle panel visibility
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Set the panel title
     * @param {string} title
     * @param {string} icon
     */
    setTitle(title, icon = '🔌') {
        if (this.titleEl) {
            this.titleEl.innerHTML = `${icon} ${title}`;
        }
    }

    /**
     * Set content as HTML
     * @param {string} html
     */
    setContent(html) {
        if (this.contentArea) {
            this.contentArea.innerHTML = html;
        }
    }

    /**
     * Append content
     * @param {HTMLElement|string} content
     */
    appendContent(content) {
        if (!this.contentArea) return;

        if (typeof content === 'string') {
            this.contentArea.insertAdjacentHTML('beforeend', content);
        } else {
            this.contentArea.appendChild(content);
        }
    }

    /**
     * Clear content
     */
    clearContent() {
        if (this.contentArea) {
            this.contentArea.innerHTML = '';
        }
    }

    /**
     * Show loading state
     * @param {string} message
     */
    showLoading(message = 'Loading...') {
        this.setContent(`
            <div style="text-align: center; padding: 40px;">
                <div class="spinner" style="
                    width: 40px;
                    height: 40px;
                    border: 3px solid #333;
                    border-top-color: var(--accent, #FFD700);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                "></div>
                <p style="color: #888;">${message}</p>
            </div>
            <style>
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        `);
    }

    /**
     * Show error state
     * @param {string} message
     */
    showError(message) {
        this.setContent(`
            <div style="text-align: center; padding: 40px; color: #ff6b6b;">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <p>${message}</p>
            </div>
        `);
    }

    /**
     * Show analysis results (Diamond Drill format)
     * @param {Object} results
     */
    showAnalysisResults(results) {
        const { files_analyzed, analyses } = results;

        let html = `
            <div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--accent, #FFD700); font-weight: bold;">
                        📊 Analysis Complete
                    </span>
                    <span style="color: #888; font-size: 12px;">
                        ${files_analyzed} file(s)
                    </span>
                </div>
            </div>
        `;

        if (analyses && analyses.length > 0) {
            html += '<div style="display: flex; flex-direction: column; gap: 12px;">';

            for (const analysis of analyses) {
                const fileName = analysis.path.split('/').pop();
                const sizeStr = this._formatSize(analysis.size);

                html += `
                    <div style="
                        background: rgba(255, 215, 0, 0.05);
                        border: 1px solid #333;
                        border-radius: 8px;
                        padding: 12px;
                    ">
                        <div style="font-weight: bold; margin-bottom: 8px; color: #fff;">
                            📄 ${fileName}
                        </div>
                        <div style="font-size: 12px; color: #888; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                            <span>Type: ${analysis.file_type}</span>
                            <span>Size: ${sizeStr}</span>
                            ${analysis.line_count ? `<span>Lines: ${analysis.line_count}</span>` : ''}
                            ${analysis.word_count ? `<span>Words: ${analysis.word_count}</span>` : ''}
                        </div>
                        ${analysis.is_binary ? '<div style="color: #ff9800; font-size: 11px; margin-top: 4px;">⚠️ Binary file</div>' : ''}
                    </div>
                `;
            }

            html += '</div>';
        }

        this.setContent(html);
    }

    /**
     * Format file size
     * @private
     */
    _formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    /**
     * Destroy the panel
     */
    destroy() {
        if (this.container) {
            this.container.remove();
            this.container = null;
            this.contentArea = null;
        }
    }
}

export default PluginPanel;
