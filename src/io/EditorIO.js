/**
 * EditorIO - File operations, persistence, and export
 * Handles all I/O: files, localStorage, clipboard, downloads
 */
class EditorIO {
    constructor(options = {}) {
        this.version = options.version || '4.0.0';
        this.autoSaveTimer = null;
        this.lastSaveTime = null;

        // Callbacks to get/set editor content (injected by orchestrator)
        this.getEditorValue = options.getEditorValue || (() => '');
        this.setEditorValue = options.setEditorValue || (() => {});
        this.getPreviewHTML = options.getPreviewHTML || (() => '');
        this.triggerFileInput = options.triggerFileInput || (() => {});

        // Notification callbacks
        this.notify = options.notify || { success: () => {}, error: () => {}, warning: () => {} };
        this.showNotification = options.showNotification || (() => {});
        this.focusEditor = options.focusEditor || (() => {});

        // Update callback
        this.onContentLoaded = options.onContentLoaded || (() => {});

        // Environment check
        this.isTestEnvironment = options.isTestEnvironment || (() => typeof jest !== 'undefined');

        // Constants
        this.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        this.SUPPORTED_EXTENSIONS = ['.md', '.txt', '.markdown'];
    }

    /**
     * Load and validate a file
     * @param {File} file - The file to load
     */
    loadFile(file) {
        if (!file) {
            console.error('No file provided to loadFile method');
            return;
        }

        // Validate file size
        if (file.size > this.MAX_FILE_SIZE) {
            this.notify.error(
                `File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB.`,
                {
                    actions: [{
                        label: 'Choose Another File',
                        primary: true,
                        onClick: () => this.triggerFileInput()
                    }]
                }
            );
            return;
        }

        // Validate file extension
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
        if (!this.SUPPORTED_EXTENSIONS.includes(ext)) {
            this.notify.warning(
                `Unsupported file type: ${ext}. Supported types: ${this.SUPPORTED_EXTENSIONS.join(', ')}`,
                {
                    actions: [
                        {
                            label: 'Load Anyway',
                            primary: true,
                            onClick: () => this.readFile(file)
                        },
                        {
                            label: 'Choose Another',
                            onClick: () => this.triggerFileInput()
                        }
                    ]
                }
            );
            return;
        }

        this.readFile(file);
    }

    /**
     * Read file contents
     * @param {File} file - The file to read
     */
    readFile(file) {
        const reader = new FileReader();

        const cleanup = () => {
            reader.onload = null;
            reader.onerror = null;
            reader.onabort = null;
        };

        reader.onload = (e) => {
            const content = this._getFileReaderResult(e, reader);
            this.setEditorValue(content || '');
            this.onContentLoaded();
            if (!this.isTestEnvironment()) {
                console.log(`📄 Loaded file: ${file.name}`);
            }
            cleanup();
        };

        reader.onerror = (e) => {
            console.error('File reading error:', e);
            this.notify.error('Failed to read file. Please try again.', {
                actions: [{
                    label: 'Try Again',
                    primary: true,
                    onClick: () => this.triggerFileInput()
                }]
            });
            cleanup();
        };

        reader.onabort = () => {
            console.warn('File reading was aborted');
            cleanup();
        };

        reader.readAsText(file);
    }

    /**
     * Save markdown to file download
     */
    saveMarkdown() {
        const content = this.getEditorValue();

        if (!content.trim()) {
            this.notify.warning('Document is empty. Nothing to save.', {
                actions: [{
                    label: 'Start Writing',
                    primary: true,
                    onClick: () => this.focusEditor()
                }]
            });
            return false;
        }

        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        try {
            a.href = url;
            a.download = 'document.md';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } finally {
            URL.revokeObjectURL(url);
        }

        this.notify.success('Document saved successfully!');
        console.log('💾 Markdown saved');
        return true;
    }

    /**
     * Export as HTML file
     */
    exportAsHTML() {
        const previewHTML = this.getPreviewHTML();
        if (!previewHTML) return false;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported from MD Reader Pro</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
    <style>
        body {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
        pre { background: #2d2d2d; padding: 1rem; border-radius: 8px; overflow-x: auto; }
        pre code { background: none; color: #f8f8f2; }
    </style>
</head>
<body>
${previewHTML}
<hr>
<footer style="text-align: center; color: #999; margin-top: 2rem;">
    <p><small>Generated by MD Reader Pro v${this.version}</small></p>
</footer>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        try {
            a.href = url;
            a.download = `markdown-export-${Date.now()}.html`;
            a.click();
        } finally {
            URL.revokeObjectURL(url);
        }

        this.showNotification('📤 Exported as HTML!', 'success');
        return true;
    }

    /**
     * Save to localStorage
     */
    saveToLocalStorage() {
        const content = this.getEditorValue();
        if (!content) return false;

        try {
            const timestamp = new Date().toISOString();
            localStorage.setItem('md-reader-autosave', JSON.stringify({
                content,
                timestamp,
                version: this.version
            }));

            this.lastSaveTime = new Date();
            console.log('💾 Auto-saved at', timestamp);
            return true;
        } catch (err) {
            console.error('❌ Auto-save failed:', err);
            return false;
        }
    }

    /**
     * Load from localStorage auto-save
     * @returns {{ content: string, timestamp: string } | null}
     */
    getAutoSaveData() {
        try {
            const saved = localStorage.getItem('md-reader-autosave');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (err) {
            console.error('❌ Failed to load auto-save:', err);
        }
        return null;
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>}
     */
    async copyToClipboard(text) {
        try {
            if (typeof window === 'undefined' || !window.navigator?.clipboard) {
                throw new Error('Clipboard API not available');
            }
            await window.navigator.clipboard.writeText(text);
            console.log('✅ Text copied to clipboard');
            return true;
        } catch (err) {
            console.error('❌ Clipboard API failed:', err);
            return false;
        }
    }

    /**
     * Copy markdown content to clipboard
     * @returns {Promise<boolean>}
     */
    async copyMarkdown() {
        const content = this.getEditorValue();
        if (!content) return false;
        return this.copyToClipboard(content);
    }

    /**
     * Copy HTML content to clipboard
     * @returns {Promise<boolean>}
     */
    async copyHTML() {
        const html = this.getPreviewHTML();
        if (!html) return false;
        return this.copyToClipboard(html);
    }

    /**
     * Get time ago string
     * @param {Date} date
     * @returns {string}
     */
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    }

    // Private helper
    _getFileReaderResult(e, reader) {
        try {
            if (e?.target?.result !== undefined) return e.target.result;
            if (reader?.result !== undefined && reader.result !== null) return reader.result;
        } catch (_) { }
        return '';
    }
}

export default EditorIO;
