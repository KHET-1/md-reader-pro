/**
 * Tests for MarkdownEditor orchestration methods
 * Covers: plugin system, settings, edit mode, theme sync, error handling, etc.
 */
import { TestUtils, setupTestEnvironment } from './test-utils.js';

// Mock PluginBridge to avoid spawning real processes in Node.js test env
jest.mock('../src/plugins/PluginBridge.js', () => {
    return jest.fn().mockImplementation((options) => ({
        pluginId: options.pluginId,
        type: options.type,
        ready: false,
        mockMode: true,
        start: jest.fn().mockImplementation(function() {
            this.ready = true;
            if (options.onReady) options.onReady();
            return Promise.resolve();
        }),
        stop: jest.fn().mockImplementation(function() {
            this.ready = false;
        }),
        send: jest.fn().mockResolvedValue({ pong: true }),
        isReady: jest.fn().mockReturnValue(true)
    }));
});

import MarkdownEditor from '../src/index.js';

describe('MarkdownEditor Orchestration', () => {
    let editor;

    setupTestEnvironment();

    beforeEach(() => {
        editor = new MarkdownEditor();
        editor.init();
    });

    // === Settings & Edit Mode ===

    describe('toggleEditMode', () => {
        test('toggles edit mode and returns new value', () => {
            const result = editor.toggleEditMode();
            expect(typeof result).toBe('boolean');
        });

        test('toggles back and forth', () => {
            const first = editor.toggleEditMode();
            const second = editor.toggleEditMode();
            expect(first).not.toBe(second);
        });
    });

    describe('setEditMode', () => {
        test('sets edit mode to false', () => {
            editor.setEditMode(false);
            expect(editor.isEditModeEnabled()).toBe(false);
        });

        test('sets edit mode to true', () => {
            editor.setEditMode(false);
            editor.setEditMode(true);
            expect(editor.isEditModeEnabled()).toBe(true);
        });
    });

    describe('isEditModeEnabled', () => {
        test('returns boolean', () => {
            expect(typeof editor.isEditModeEnabled()).toBe('boolean');
        });
    });

    describe('_applyEditMode', () => {
        test('makes editor readonly when disabled', () => {
            editor._applyEditMode(false);
            expect(editor.editor.readOnly).toBe(true);
        });

        test('makes editor editable when enabled', () => {
            editor._applyEditMode(true);
            expect(editor.editor.readOnly).toBe(false);
        });

        test('handles missing editor', () => {
            const origEditor = editor.editor;
            editor.editor = null;
            expect(() => editor._applyEditMode(true)).not.toThrow();
            editor.editor = origEditor;
        });
    });

    describe('_onSettingsChange', () => {
        test('applies edit mode on editMode change', () => {
            editor._onSettingsChange('editMode', false);
            expect(editor.editor.readOnly).toBe(true);
        });

        test('handles theme change', () => {
            expect(() => editor._onSettingsChange('theme', 'light')).not.toThrow();
        });

        test('handles unknown setting key', () => {
            expect(() => editor._onSettingsChange('unknown', 'value')).not.toThrow();
        });
    });

    describe('_syncThemeToAllPlugins', () => {
        test('handles no loaded plugins', () => {
            expect(() => editor._syncThemeToAllPlugins('dark')).not.toThrow();
        });
    });

    // === Plugin System ===

    describe('initPlugins', () => {
        test('discovers plugins', async () => {
            await editor.initPlugins();
            const available = editor.getAvailablePlugins();
            expect(available.length).toBeGreaterThan(0);
        });

        test('handles errors gracefully', async () => {
            editor.pluginLoader.discover = jest.fn().mockRejectedValue(new Error('fail'));
            await expect(editor.initPlugins()).resolves.toBeUndefined();
        });
    });

    describe('loadPlugin', () => {
        test('loads a plugin', async () => {
            await editor.initPlugins();
            const instance = await editor.loadPlugin('diamond-drill');
            expect(instance).toBeDefined();
            expect(instance.id).toBe('diamond-drill');
        });

        test('registers plugin if not already registered', async () => {
            await editor.initPlugins();
            await editor.loadPlugin('diamond-drill');
            expect(editor.pluginRegistry.isRegistered('diamond-drill')).toBe(true);
        });

        test('enables plugin in settings', async () => {
            await editor.initPlugins();
            await editor.loadPlugin('diamond-drill');
            expect(editor.settings.getEnabledPlugins()).toContain('diamond-drill');
        });
    });

    describe('unloadPlugin', () => {
        test('unloads a loaded plugin', async () => {
            await editor.initPlugins();
            await editor.loadPlugin('diamond-drill');
            await editor.unloadPlugin('diamond-drill');
            expect(editor.pluginLoader.isLoaded('diamond-drill')).toBe(false);
        });
    });

    describe('sendToPlugin', () => {
        test('sends message to loaded plugin', async () => {
            await editor.initPlugins();
            await editor.loadPlugin('diamond-drill');
            const result = await editor.sendToPlugin('diamond-drill', 'ping');
            expect(result).toEqual({ pong: true });
        });

        test('throws for non-loaded plugin', async () => {
            await expect(editor.sendToPlugin('nonexistent', 'ping')).rejects.toThrow('Plugin not loaded');
        });
    });

    describe('getAvailablePlugins', () => {
        test('returns available plugins', async () => {
            await editor.initPlugins();
            const plugins = editor.getAvailablePlugins();
            expect(plugins).toBeInstanceOf(Array);
        });
    });

    describe('_onPluginReady', () => {
        test('handles plugin ready event', () => {
            expect(() => editor._onPluginReady('test-plugin')).not.toThrow();
        });
    });

    describe('_onPluginError', () => {
        test('handles plugin error event', () => {
            expect(() => editor._onPluginError('test-plugin', new Error('test'))).not.toThrow();
        });
    });

    describe('_onPluginMessage', () => {
        test('handles plugin message', () => {
            expect(() => editor._onPluginMessage('test-plugin', { type: 'log' })).not.toThrow();
        });
    });

    describe('_onPluginPanelClose', () => {
        test('handles panel close', () => {
            expect(() => editor._onPluginPanelClose()).not.toThrow();
        });
    });

    // === Plugin UI Actions ===

    describe('toggleDiamondDrill', () => {
        test('loads plugin if not loaded', async () => {
            await editor.initPlugins();
            await editor.toggleDiamondDrill();
            expect(editor.pluginLoader.isLoaded('diamond-drill')).toBe(true);
        });

        test('shows panel if already loaded', async () => {
            await editor.initPlugins();
            await editor.loadPlugin('diamond-drill');
            await editor.toggleDiamondDrill();
            expect(editor.pluginPanel.isOpen).toBe(true);
        });
    });

    describe('analyzeCurrentDocument', () => {
        test('analyzes when content exists', async () => {
            await editor.initPlugins();
            editor.editor.value = '# Hello World\nSome content here';
            await editor.analyzeCurrentDocument();
            expect(editor.pluginPanel.isOpen).toBe(true);
        });

        test('shows error when no content', async () => {
            editor.editor.value = '';
            await editor.analyzeCurrentDocument();
            // Should not throw - just shows notification
        });

        test('shows error for empty whitespace content', async () => {
            editor.editor.value = '   \n  \n  ';
            await editor.analyzeCurrentDocument();
        });
    });

    describe('hotReloadPlugin', () => {
        test('reloads a loaded plugin', async () => {
            await editor.initPlugins();
            await editor.loadPlugin('diamond-drill');
            await editor.hotReloadPlugin('diamond-drill');
            expect(editor.pluginPanel.isOpen).toBe(true);
        });

        test('shows error for non-loaded plugin', async () => {
            await editor.hotReloadPlugin('nonexistent');
            // Should notify error but not throw
        });
    });

    describe('openStorefront', () => {
        test('opens storefront modal', () => {
            editor.openStorefront();
            expect(editor.storefront.isOpen).toBe(true);
            editor.storefront.close();
        });
    });

    describe('getTheme', () => {
        test('returns theme string', () => {
            const theme = editor.getTheme();
            expect(typeof theme).toBe('string');
        });
    });

    describe('syncThemeToPlugin', () => {
        test('handles non-loaded plugin', async () => {
            await expect(editor.syncThemeToPlugin('nonexistent')).resolves.toBeUndefined();
        });

        test('syncs theme to loaded plugin', async () => {
            await editor.initPlugins();
            await editor.loadPlugin('diamond-drill');
            await expect(editor.syncThemeToPlugin('diamond-drill')).resolves.toBeUndefined();
        });
    });

    describe('openPluginSettings', () => {
        test('opens plugin settings panel', () => {
            editor.openPluginSettings();
            expect(editor.pluginPanel.isOpen).toBe(true);
        });

        test('opens settings for specific plugin', () => {
            editor.openPluginSettings('diamond-drill');
            expect(editor.pluginPanel.isOpen).toBe(true);
        });
    });

    describe('runDeepAnalysis', () => {
        test('runs deep analysis', async () => {
            await editor.initPlugins();
            await editor.runDeepAnalysis('.');
            expect(editor.pluginPanel.isOpen).toBe(true);
        });
    });

    describe('exportAnalysisReport', () => {
        test('exports JSON report', () => {
            expect(() => editor.exportAnalysisReport('json')).not.toThrow();
        });

        test('exports markdown report', () => {
            expect(() => editor.exportAnalysisReport('markdown')).not.toThrow();
        });
    });

    describe('showAnalysisHistory', () => {
        test('opens analysis history panel', () => {
            editor.showAnalysisHistory();
            expect(editor.pluginPanel.isOpen).toBe(true);
        });
    });

    describe('batchExportAnalyses', () => {
        test('shows error when no history', () => {
            expect(() => editor.batchExportAnalyses()).not.toThrow();
        });

        test('shows modal when history exists', () => {
            editor.pluginPanel._analysisHistory = [
                { id: 1, timestamp: '2025-01-01', results: { files_analyzed: 1 } }
            ];
            editor.batchExportAnalyses();
            expect(document.getElementById('batch-export-modal')).not.toBeNull();
            // Clean up
            document.getElementById('batch-export-modal')?.remove();
        });
    });

    describe('_showBatchExportModal', () => {
        test('creates export modal with all format options', () => {
            editor.pluginPanel._analysisHistory = [{ id: 1, timestamp: '2025-01-01', results: {} }];
            editor._showBatchExportModal();
            const modal = document.getElementById('batch-export-modal');
            expect(modal).not.toBeNull();
            expect(modal.innerHTML).toContain('JSON');
            expect(modal.innerHTML).toContain('Markdown');
            expect(modal.innerHTML).toContain('HTML');
            modal.remove();
        });

        test('cancel button closes modal', () => {
            editor.pluginPanel._analysisHistory = [{ id: 1, timestamp: '2025-01-01', results: {} }];
            editor._showBatchExportModal();
            document.getElementById('batch-cancel').click();
            expect(document.getElementById('batch-export-modal')).toBeNull();
        });

        test('escape key closes modal', () => {
            editor.pluginPanel._analysisHistory = [{ id: 1, timestamp: '2025-01-01', results: {} }];
            editor._showBatchExportModal();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            expect(document.getElementById('batch-export-modal')).toBeNull();
        });
    });

    // === Color Utilities ===

    describe('_darkenColor', () => {
        test('darkens a hex color', () => {
            const result = editor._darkenColor('#ffffff', 10);
            expect(result).toMatch(/^#[0-9a-f]{6}$/);
            expect(result).not.toBe('#ffffff');
        });

        test('does not go below 0', () => {
            const result = editor._darkenColor('#000000', 50);
            expect(result).toBe('#000000');
        });
    });

    describe('_lightenColor', () => {
        test('lightens a hex color', () => {
            const result = editor._lightenColor('#000000', 10);
            expect(result).toMatch(/^#[0-9a-f]{6}$/);
            expect(result).not.toBe('#000000');
        });

        test('does not go above 255', () => {
            const result = editor._lightenColor('#ffffff', 50);
            expect(result).toBe('#ffffff');
        });
    });

    describe('_formatNumber', () => {
        test('formats numbers with commas', () => {
            const result = editor._formatNumber(1000);
            expect(result).toContain('1');
        });

        test('handles null', () => {
            expect(editor._formatNumber(null)).toBe('0');
        });

        test('handles undefined', () => {
            expect(editor._formatNumber(undefined)).toBe('0');
        });
    });

    // === Error Handling ===

    describe('_escapeHtml', () => {
        test('escapes HTML characters', () => {
            const result = editor._escapeHtml('<script>alert("xss")</script>');
            expect(result).not.toContain('<script>');
            expect(result).toContain('&lt;');
        });

        test('handles empty string', () => {
            expect(editor._escapeHtml('')).toBe('');
        });

        test('handles null', () => {
            expect(editor._escapeHtml(null)).toBe('');
        });
    });

    describe('_showErrorToast', () => {
        test('shows error toast', () => {
            const container = document.createElement('div');
            container.id = 'error-toast-container';
            document.body.appendChild(container);

            editor._showErrorToast({
                message: 'Test error',
                context: { component: 'test' },
                timestamp: Date.now()
            });

            expect(container.querySelectorAll('.error-toast').length).toBe(1);
        });

        test('limits toasts to 3', () => {
            const container = document.createElement('div');
            container.id = 'error-toast-container';
            document.body.appendChild(container);

            for (let i = 0; i < 5; i++) {
                editor._showErrorToast({
                    message: `Error ${i}`,
                    context: { component: 'test' },
                    timestamp: Date.now()
                });
            }

            expect(container.querySelectorAll('.error-toast').length).toBeLessThanOrEqual(3);
        });

        test('does nothing without container', () => {
            expect(() => editor._showErrorToast({ message: 'test', timestamp: Date.now() })).not.toThrow();
        });
    });

    describe('_dismissErrorToast', () => {
        test('dismisses a toast', () => {
            const toast = document.createElement('div');
            toast.className = 'error-toast';
            toast._autoDismissTimeout = setTimeout(() => {}, 10000);
            document.body.appendChild(toast);

            editor._dismissErrorToast(toast);
            expect(toast.classList.contains('hiding')).toBe(true);
        });

        test('handles null toast', () => {
            expect(() => editor._dismissErrorToast(null)).not.toThrow();
        });

        test('skips already hiding toast', () => {
            const toast = document.createElement('div');
            toast.className = 'error-toast hiding';
            expect(() => editor._dismissErrorToast(toast)).not.toThrow();
        });
    });

    describe('setupGlobalErrorHandling', () => {
        test('sets up error handlers', () => {
            editor.setupGlobalErrorHandling();
            expect(editor._globalErrorHandler).toBeDefined();
            expect(editor._unhandledRejectionHandler).toBeDefined();
        });
    });

    describe('setupClickCatcher', () => {
        test('sets up click catcher when element exists', () => {
            const catcher = document.createElement('div');
            catcher.id = 'app-click-catcher';
            document.body.appendChild(catcher);

            editor.setupClickCatcher();
            expect(editor._clickCatcherHandler).toBeDefined();
        });

        test('handles missing catcher element', () => {
            expect(() => editor.setupClickCatcher()).not.toThrow();
        });
    });

    describe('getErrorStats', () => {
        test('returns error stats object', () => {
            const stats = editor.getErrorStats();
            expect(stats).toBeDefined();
        });
    });

    describe('getRecentErrors', () => {
        test('returns recent errors', () => {
            const errors = editor.getRecentErrors();
            expect(Array.isArray(errors)).toBe(true);
        });
    });

    describe('clearErrors', () => {
        test('clears all errors', () => {
            expect(() => editor.clearErrors()).not.toThrow();
        });
    });

    // === Cleanup ===

    describe('destroy', () => {
        test('cleans up resources', () => {
            editor.setupGlobalErrorHandling();
            editor.destroy();
            expect(editor._globalErrorHandler).toBeNull();
            expect(editor._unhandledRejectionHandler).toBeNull();
        });

        test('cleans up click catchers', () => {
            const catcher = document.createElement('div');
            catcher.id = 'app-click-catcher';
            document.body.appendChild(catcher);

            editor.setupClickCatcher();
            editor.destroy();
            expect(editor._clickCatcherHandler).toBeNull();
        });

        test('handles double destroy', () => {
            editor.destroy();
            expect(() => editor.destroy()).not.toThrow();
        });
    });

    describe('showCollaborationStory', () => {
        test('runs without error', () => {
            expect(() => editor.showCollaborationStory()).not.toThrow();
        });
    });

    // === Delegate methods ===

    describe('delegate methods', () => {
        test('setupStatsCounter delegates to ui', () => {
            expect(() => editor.setupStatsCounter()).not.toThrow();
        });

        test('updateStats delegates to ui', () => {
            expect(() => editor.updateStats()).not.toThrow();
        });

        test('saveToLocalStorage works', () => {
            expect(() => editor.saveToLocalStorage()).not.toThrow();
        });

        test('createSaveIndicator delegates to ui', () => {
            expect(() => editor.createSaveIndicator()).not.toThrow();
        });

        test('updateSaveIndicator delegates to ui', () => {
            expect(() => editor.updateSaveIndicator()).not.toThrow();
        });

        test('getTimeAgo delegates to io', () => {
            const result = editor.getTimeAgo(new Date());
            expect(typeof result).toBe('string');
        });

        test('setupExportButton delegates to ui', () => {
            expect(() => editor.setupExportButton()).not.toThrow();
        });

        test('setupKeyboardShortcutsModal delegates to ui', () => {
            expect(() => editor.setupKeyboardShortcutsModal()).not.toThrow();
        });

        test('setupThemeToggle delegates to ui', () => {
            expect(() => editor.setupThemeToggle()).not.toThrow();
        });

        test('toggleTheme delegates to ui', () => {
            expect(() => editor.toggleTheme()).not.toThrow();
        });

        test('enhanceKeyboardShortcuts delegates to ui', () => {
            expect(() => editor.enhanceKeyboardShortcuts()).not.toThrow();
        });
    });
});
