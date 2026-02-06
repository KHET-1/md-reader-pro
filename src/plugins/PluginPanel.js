/**
 * PluginPanel - Sidebar panel for plugin UI
 *
 * Provides a collapsible panel that plugins can render into.
 * Diamond Drill uses this to show analysis results.
 *
 * @module PluginPanel
 * @version 1.0.0
 */

import DOMPurify from 'dompurify';

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

        // v13b/c: Analysis history for batch export
        this._analysisHistory = [];
        this._maxHistory = 50;

        // DOMPurify sanitization config for plugin content
        this.sanitizeConfig = {
            ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                          'strong', 'em', 'br', 'hr', 'ul', 'ol', 'li',
                          'button', 'input', 'select', 'option', 'label',
                          'table', 'thead', 'tbody', 'tr', 'th', 'td'],
            ALLOWED_ATTR: ['style', 'class', 'id', 'type', 'checked', 'selected',
                          'disabled', 'value', 'data-*']
        };
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
            const safeIcon = this._escapeHtml(icon);
            const safeTitle = this._escapeHtml(title);
            this.titleEl.innerHTML = `${safeIcon} ${safeTitle}`;
        }
    }

    /**
     * Set content as HTML (sanitized for security)
     * @param {string} html
     */
    setContent(html) {
        if (this.contentArea) {
            const cleanHtml = DOMPurify.sanitize(html, this.sanitizeConfig);
            this.contentArea.innerHTML = cleanHtml;
        }
    }

    /**
     * Append content (sanitized for security)
     * @param {HTMLElement|string} content
     */
    appendContent(content) {
        if (!this.contentArea) return;

        if (typeof content === 'string') {
            const cleanHtml = DOMPurify.sanitize(content, this.sanitizeConfig);
            this.contentArea.insertAdjacentHTML('beforeend', cleanHtml);
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
     * Escape HTML entities to prevent XSS
     * @private
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text safe for HTML
     */
    _escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show loading state
     * @param {string} message
     */
    showLoading(message = 'Loading...') {
        const safeMessage = this._escapeHtml(message);
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
                <p style="color: #888;">${safeMessage}</p>
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
        const safeMessage = this._escapeHtml(message);
        this.setContent(`
            <div style="text-align: center; padding: 40px; color: #ff6b6b;">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <p>${safeMessage}</p>
            </div>
        `);
    }

    /**
     * Show analysis results (Diamond Drill format)
     * @param {Object} results
     */
    showAnalysisResults(results) {
        // v13c: Add to history
        this._addToHistory(results);
        this._lastAnalysisResults = results;

        const { files_analyzed, analyses } = results;

        let html = `
            <div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--accent, #FFD700); font-weight: bold;">
                        📊 Analysis Complete
                    </span>
                    <span style="color: #888; font-size: 12px;">
                        ${parseInt(files_analyzed) || 0} file(s)
                    </span>
                </div>
            </div>
        `;

        if (analyses && analyses.length > 0) {
            html += '<div style="display: flex; flex-direction: column; gap: 12px;">';

            for (const analysis of analyses) {
                const fileName = this._escapeHtml(analysis.path.split('/').pop());
                const fileType = this._escapeHtml(analysis.file_type);
                const sizeStr = this._escapeHtml(this._formatSize(analysis.size));
                const lineCount = parseInt(analysis.line_count) || 0;
                const wordCount = parseInt(analysis.word_count) || 0;

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
                            <span>Type: ${fileType}</span>
                            <span>Size: ${sizeStr}</span>
                            ${lineCount ? `<span>Lines: ${lineCount}</span>` : ''}
                            ${wordCount ? `<span>Words: ${wordCount}</span>` : ''}
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
     * Show deep analysis results (directory analysis)
     * @param {Object} results - Deep analysis results from analyzer module
     */
    showDeepAnalysisResults(results) {
        const { source_path, total_files, total_size, file_types, files } = results;
        const safePath = this._escapeHtml(source_path || 'Unknown');
        const safeFiles = parseInt(total_files) || 0;
        const safeSize = parseInt(total_size) || 0;

        let html = `
            <div style="margin-bottom: 16px;">
                <div style="color: var(--accent, #FFD700); font-weight: bold; margin-bottom: 8px;">
                    📂 Deep Analysis Report
                </div>
                <div style="font-size: 12px; color: #888;">
                    Source: ${safePath}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: rgba(76, 175, 80, 0.1); padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; color: #4caf50;">${safeFiles}</div>
                    <div style="font-size: 11px; color: #888;">Files</div>
                </div>
                <div style="background: rgba(33, 150, 243, 0.1); padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; color: #2196f3;">${this._escapeHtml(this._formatSize(safeSize))}</div>
                    <div style="font-size: 11px; color: #888;">Total Size</div>
                </div>
            </div>
        `;

        // File types breakdown
        if (file_types && Object.keys(file_types).length > 0) {
            html += `
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 12px; color: #fff; margin-bottom: 8px;">File Types</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            `;

            for (const [ext, count] of Object.entries(file_types)) {
                const safeExt = this._escapeHtml(ext);
                const safeCount = parseInt(count) || 0;
                html += `
                    <span style="
                        background: rgba(255, 215, 0, 0.1);
                        border: 1px solid #333;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                        color: #e0e0e0;
                    ">.${safeExt} (${safeCount})</span>
                `;
            }

            html += '</div></div>';
        }

        // Export buttons
        html += `
            <div style="display: flex; gap: 8px; margin-top: 16px;">
                <button id="export-json-btn" style="
                    flex: 1; padding: 8px; border: 1px solid #FFD700;
                    background: transparent; color: #FFD700;
                    border-radius: 6px; cursor: pointer; font-size: 12px;
                ">📄 Export JSON</button>
                <button id="export-md-btn" style="
                    flex: 1; padding: 8px; border: 1px solid #4caf50;
                    background: transparent; color: #4caf50;
                    border-radius: 6px; cursor: pointer; font-size: 12px;
                ">📝 Export MD</button>
            </div>
        `;

        this.setContent(html);
        this._lastAnalysisResults = results;

        // Wire up export buttons
        document.getElementById('export-json-btn')?.addEventListener('click', () => {
            this.exportReport('json');
        });
        document.getElementById('export-md-btn')?.addEventListener('click', () => {
            this.exportReport('markdown');
        });
    }

    /**
     * Show plugin settings UI
     * @param {Object} currentSettings
     * @param {Function} onSave
     */
    showSettings(currentSettings, onSave) {
        const settings = currentSettings || {};

        const html = `
            <div style="padding: 8px 0;">
                <h4 style="color: var(--accent, #FFD700); margin: 0 0 16px;">⚙️ Plugin Settings</h4>

                <div style="margin-bottom: 16px;">
                    <label style="display: flex; align-items: center; gap: 8px; color: #e0e0e0; cursor: pointer;">
                        <input type="checkbox" id="setting-auto-analyze" ${settings.autoAnalyze ? 'checked' : ''}>
                        <span>Auto-analyze on file load</span>
                    </label>
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; color: #888; font-size: 12px; margin-bottom: 4px;">
                        Report Format
                    </label>
                    <select id="setting-report-format" style="
                        width: 100%; padding: 8px; background: #252540;
                        border: 1px solid #333; border-radius: 6px; color: #e0e0e0;
                    ">
                        <option value="json" ${settings.reportFormat === 'json' ? 'selected' : ''}>JSON</option>
                        <option value="markdown" ${settings.reportFormat === 'markdown' ? 'selected' : ''}>Markdown</option>
                        <option value="html" ${settings.reportFormat === 'html' ? 'selected' : ''}>HTML</option>
                    </select>
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; color: #888; font-size: 12px; margin-bottom: 4px;">
                        Theme Sync
                    </label>
                    <select id="setting-theme" style="
                        width: 100%; padding: 8px; background: #252540;
                        border: 1px solid #333; border-radius: 6px; color: #e0e0e0;
                    ">
                        <option value="auto" ${settings.theme === 'auto' ? 'selected' : ''}>Auto (follow editor)</option>
                        <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                        <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
                    </select>
                </div>

                <div style="display: flex; gap: 8px; margin-top: 24px;">
                    <button id="settings-save-btn" style="
                        flex: 1; padding: 10px; border: none;
                        background: #FFD700; color: #000;
                        border-radius: 6px; cursor: pointer; font-weight: bold;
                    ">Save Settings</button>
                    <button id="settings-cancel-btn" style="
                        padding: 10px 16px; border: 1px solid #666;
                        background: transparent; color: #888;
                        border-radius: 6px; cursor: pointer;
                    ">Cancel</button>
                </div>
            </div>
        `;

        this.setContent(html);

        // Wire up save button
        document.getElementById('settings-save-btn')?.addEventListener('click', () => {
            const newSettings = {
                autoAnalyze: document.getElementById('setting-auto-analyze')?.checked || false,
                reportFormat: document.getElementById('setting-report-format')?.value || 'json',
                theme: document.getElementById('setting-theme')?.value || 'auto'
            };
            if (onSave) onSave(newSettings);
        });

        document.getElementById('settings-cancel-btn')?.addEventListener('click', () => {
            this.close();
        });
    }

    /**
     * Export analysis report
     * @param {string} format - json, markdown, or html
     */
    exportReport(format = 'json') {
        const results = this._lastAnalysisResults;
        if (!results) {
            console.warn('No analysis results to export');
            return;
        }

        let content, filename, mimeType;

        if (format === 'json') {
            content = JSON.stringify(results, null, 2);
            filename = 'analysis-report.json';
            mimeType = 'application/json';
        } else if (format === 'markdown') {
            content = this._generateMarkdownReport(results);
            filename = 'analysis-report.md';
            mimeType = 'text/markdown';
        } else {
            content = this._generateHtmlReport(results);
            filename = 'analysis-report.html';
            mimeType = 'text/html';
        }

        // Download file
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Generate Markdown report
     * @private
     */
    _generateMarkdownReport(results) {
        let md = `# Analysis Report\n\n`;
        md += `**Generated:** ${new Date().toISOString()}\n\n`;

        if (results.source_path) {
            md += `**Source:** ${results.source_path}\n\n`;
        }

        md += `## Summary\n\n`;
        md += `| Metric | Value |\n`;
        md += `|--------|-------|\n`;
        md += `| Files Analyzed | ${results.total_files || results.files_analyzed || 0} |\n`;
        md += `| Total Size | ${this._formatSize(results.total_size || 0)} |\n\n`;

        if (results.file_types) {
            md += `## File Types\n\n`;
            for (const [ext, count] of Object.entries(results.file_types)) {
                md += `- **.${ext}**: ${count} files\n`;
            }
            md += `\n`;
        }

        if (results.analyses || results.files) {
            const files = results.analyses || results.files || [];
            md += `## Files\n\n`;
            for (const file of files) {
                md += `### ${file.path}\n\n`;
                md += `- Type: ${file.file_type}\n`;
                md += `- Size: ${this._formatSize(file.size)}\n`;
                if (file.line_count) md += `- Lines: ${file.line_count}\n`;
                if (file.word_count) md += `- Words: ${file.word_count}\n`;
                md += `\n`;
            }
        }

        return md;
    }

    /**
     * Generate HTML report
     * @private
     */
    _generateHtmlReport(results) {
        return `<!DOCTYPE html>
<html>
<head>
    <title>Analysis Report</title>
    <style>
        body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 0 20px; background: #1a1a2e; color: #e0e0e0; }
        h1 { color: #FFD700; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; border: 1px solid #333; text-align: left; }
        th { background: #252540; }
    </style>
</head>
<body>
    <h1>📊 Analysis Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>
    <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Files Analyzed</td><td>${results.total_files || results.files_analyzed || 0}</td></tr>
        <tr><td>Total Size</td><td>${this._formatSize(results.total_size || 0)}</td></tr>
    </table>
    <pre>${JSON.stringify(results, null, 2)}</pre>
</body>
</html>`;
    }

    // === v13b: Batch Export ===

    /**
     * Export multiple analyses as a batch
     * @param {string} format - json, markdown, html
     * @param {number[]} indices - Indices of history items to export (all if empty)
     */
    batchExport(format = 'json', indices = []) {
        const historyToExport = indices.length > 0
            ? indices.map(i => this._analysisHistory[i]).filter(Boolean)
            : this._analysisHistory;

        if (historyToExport.length === 0) {
            console.warn('No analysis history to export');
            return;
        }

        const batchReport = {
            batch_export: true,
            exported_at: new Date().toISOString(),
            total_analyses: historyToExport.length,
            analyses: historyToExport
        };

        let content, filename, mimeType;

        if (format === 'json') {
            content = JSON.stringify(batchReport, null, 2);
            filename = `batch-analysis-${Date.now()}.json`;
            mimeType = 'application/json';
        } else if (format === 'markdown') {
            content = this._generateBatchMarkdown(batchReport);
            filename = `batch-analysis-${Date.now()}.md`;
            mimeType = 'text/markdown';
        } else {
            content = this._generateBatchHtml(batchReport);
            filename = `batch-analysis-${Date.now()}.html`;
            mimeType = 'text/html';
        }

        // Download file
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Generate batch markdown report
     * @private
     */
    _generateBatchMarkdown(batchReport) {
        let md = `# Batch Analysis Report\n\n`;
        md += `**Exported:** ${batchReport.exported_at}\n`;
        md += `**Total Analyses:** ${batchReport.total_analyses}\n\n`;
        md += `---\n\n`;

        batchReport.analyses.forEach((entry, idx) => {
            md += `## Analysis #${idx + 1}\n\n`;
            md += `**Time:** ${entry.timestamp}\n\n`;
            md += this._generateMarkdownReport(entry.results);
            md += `\n---\n\n`;
        });

        return md;
    }

    /**
     * Generate batch HTML report
     * @private
     */
    _generateBatchHtml(batchReport) {
        const analysesHtml = batchReport.analyses.map((entry, idx) => `
            <section style="margin: 20px 0; padding: 20px; border: 1px solid #333; border-radius: 8px;">
                <h2>Analysis #${idx + 1}</h2>
                <p style="color: #888;">Time: ${entry.timestamp}</p>
                <pre style="background: #16162a; padding: 15px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(entry.results, null, 2)}</pre>
            </section>
        `).join('');

        return `<!DOCTYPE html>
<html>
<head>
    <title>Batch Analysis Report</title>
    <style>
        body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #1a1a2e; color: #e0e0e0; }
        h1 { color: #FFD700; }
        h2 { color: #4CAF50; }
    </style>
</head>
<body>
    <h1>📊 Batch Analysis Report</h1>
    <p>Exported: ${batchReport.exported_at}</p>
    <p>Total Analyses: ${batchReport.total_analyses}</p>
    ${analysesHtml}
</body>
</html>`;
    }

    // === v13c: Analysis History ===

    /**
     * Add analysis to history
     * @private
     */
    _addToHistory(results) {
        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            results: results
        };

        this._analysisHistory.unshift(entry);

        // Trim to max history
        if (this._analysisHistory.length > this._maxHistory) {
            this._analysisHistory = this._analysisHistory.slice(0, this._maxHistory);
        }
    }

    /**
     * Get analysis history
     * @returns {Array}
     */
    getHistory() {
        return [...this._analysisHistory];
    }

    /**
     * Clear analysis history
     */
    clearHistory() {
        this._analysisHistory = [];
    }

    /**
     * Show analysis history UI
     */
    showHistory() {
        if (this._analysisHistory.length === 0) {
            this.setContent(`
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                    <p>No analysis history yet</p>
                    <p style="font-size: 12px;">Analyze some files to build your history</p>
                </div>
            `);
            return;
        }

        let html = `
            <div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--accent, #FFD700); font-weight: bold;">
                        📜 Analysis History
                    </span>
                    <span style="color: #888; font-size: 12px;">
                        ${this._analysisHistory.length} entries
                    </span>
                </div>
            </div>

            <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                <button id="batch-export-json" style="
                    flex: 1; padding: 8px; border: 1px solid #FFD700;
                    background: transparent; color: #FFD700;
                    border-radius: 6px; cursor: pointer; font-size: 11px;
                ">Export All JSON</button>
                <button id="batch-export-md" style="
                    flex: 1; padding: 8px; border: 1px solid #4caf50;
                    background: transparent; color: #4caf50;
                    border-radius: 6px; cursor: pointer; font-size: 11px;
                ">Export All MD</button>
                <button id="clear-history" style="
                    padding: 8px 12px; border: 1px solid #ff6b6b;
                    background: transparent; color: #ff6b6b;
                    border-radius: 6px; cursor: pointer; font-size: 11px;
                ">Clear</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
        `;

        this._analysisHistory.forEach((entry, idx) => {
            const results = entry.results;
            const fileCount = parseInt(results.files_analyzed || results.total_files || 1);
            const time = this._escapeHtml(new Date(entry.timestamp).toLocaleString());
            const safeIdx = parseInt(idx);

            html += `
                <div class="history-item" data-idx="${safeIdx}" style="
                    background: rgba(255, 215, 0, 0.05);
                    border: 1px solid #333;
                    border-radius: 8px;
                    padding: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <div style="font-weight: bold; color: #fff; font-size: 13px;">
                                ${fileCount} file(s) analyzed
                            </div>
                            <div style="font-size: 11px; color: #888; margin-top: 2px;">
                                ${time}
                            </div>
                        </div>
                        <button class="history-view-btn" data-idx="${safeIdx}" style="
                            padding: 4px 8px; border: 1px solid #666;
                            background: transparent; color: #888;
                            border-radius: 4px; cursor: pointer; font-size: 10px;
                        ">View</button>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        this.setContent(html);

        // Wire up batch export buttons
        document.getElementById('batch-export-json')?.addEventListener('click', () => {
            this.batchExport('json');
        });
        document.getElementById('batch-export-md')?.addEventListener('click', () => {
            this.batchExport('markdown');
        });
        document.getElementById('clear-history')?.addEventListener('click', () => {
            if (confirm('Clear all analysis history?')) {
                this.clearHistory();
                this.showHistory();
            }
        });

        // Wire up view buttons
        document.querySelectorAll('.history-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx, 10);
                const entry = this._analysisHistory[idx];
                if (entry) {
                    this._lastAnalysisResults = entry.results;
                    if (entry.results.source_path || entry.results.total_files) {
                        this.showDeepAnalysisResults(entry.results);
                    } else {
                        this.showAnalysisResults(entry.results);
                    }
                }
            });
        });
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
