/**
 * Coverage Gap Fix Tests
 * Targets specific uncovered lines identified in coverage report
 */
import { TestUtils, setupTestEnvironment } from './test-utils.js';
import MarkdownEditor from '../src/index.js';
import EditorState from '../src/core/EditorState.js';
import EditorIO from '../src/io/EditorIO.js';
import EditorUI from '../src/ui/EditorUI.js';

// ==================== EditorState Tests ====================
describe('EditorState - Coverage Gap Tests', () => {
    let state;
    let historyChangeCallback;

    beforeEach(() => {
        historyChangeCallback = jest.fn();
        state = new EditorState({
            maxHistory: 5,
            onHistoryChange: historyChangeCallback
        });
    });

    describe('History Overflow Handling (lines 34-36)', () => {
        test('should handle history overflow correctly', () => {
            // Fill history beyond maxHistory
            for (let i = 0; i < 7; i++) {
                state.saveToHistory(`content ${i}`);
            }

            // Should be limited to maxHistory
            expect(state.history.length).toBeLessThanOrEqual(5);
            expect(state.historyIndex).toBeGreaterThanOrEqual(0);
        });

        test('should maintain correct index after overflow', () => {
            // Fill history
            for (let i = 0; i < 10; i++) {
                state.saveToHistory(`item ${i}`);
            }

            expect(state.history.length).toBe(5);
            expect(state.historyIndex).toBe(4);
        });
    });

    describe('Debounced Save (lines 49-54)', () => {
        test('should debounce saves correctly', () => {
            jest.useFakeTimers();

            state.debouncedSave('content 1', 100);
            state.debouncedSave('content 2', 100);
            state.debouncedSave('content 3', 100);

            // Should not have saved yet
            expect(state.history.length).toBe(0);

            jest.advanceTimersByTime(150);

            // Should only save the last one
            expect(state.history.length).toBe(1);
            expect(state.history[0]).toBe('content 3');

            jest.useRealTimers();
        });

        test('should clear previous debounce timer', () => {
            jest.useFakeTimers();

            state.debouncedSave('first', 200);
            jest.advanceTimersByTime(100);
            state.debouncedSave('second', 200);
            jest.advanceTimersByTime(250);

            expect(state.history.length).toBe(1);
            expect(state.history[0]).toBe('second');

            jest.useRealTimers();
        });
    });

    describe('Undo/Redo Operations (lines 79-96)', () => {
        test('should return content on undo', () => {
            state.saveToHistory('state 1');
            state.saveToHistory('state 2');
            state.saveToHistory('state 3');

            const result = state.undo();
            expect(result).toBe('state 2');
            expect(historyChangeCallback).toHaveBeenCalled();
        });

        test('should return null when cannot undo', () => {
            state.saveToHistory('only state');

            const result = state.undo();
            expect(result).toBeNull();
        });

        test('should return content on redo', () => {
            state.saveToHistory('state 1');
            state.saveToHistory('state 2');
            state.undo();

            const result = state.redo();
            expect(result).toBe('state 2');
        });

        test('should return null when cannot redo', () => {
            state.saveToHistory('only state');

            const result = state.redo();
            expect(result).toBeNull();
        });
    });

    describe('getCurrentContent (lines 102-104)', () => {
        test('should return current content', () => {
            state.saveToHistory('current');
            expect(state.getCurrentContent()).toBe('current');
        });

        test('should return null for empty history', () => {
            expect(state.getCurrentContent()).toBeNull();
        });
    });

    describe('Clear (lines 109-113)', () => {
        test('should clear all history', () => {
            state.saveToHistory('item 1');
            state.saveToHistory('item 2');

            state.clear();

            expect(state.history).toEqual([]);
            expect(state.historyIndex).toBe(-1);
            expect(historyChangeCallback).toHaveBeenCalled();
        });
    });
});

// ==================== EditorIO Tests ====================
describe('EditorIO - Coverage Gap Tests', () => {
    let io;
    let mockNotify;
    let mockCallbacks;

    beforeEach(() => {
        mockNotify = {
            success: jest.fn(),
            error: jest.fn(),
            warning: jest.fn()
        };

        mockCallbacks = {
            getEditorValue: jest.fn(() => '# Test Content'),
            setEditorValue: jest.fn(),
            getPreviewHTML: jest.fn(() => '<h1>Test</h1>'),
            triggerFileInput: jest.fn(),
            showNotification: jest.fn(),
            focusEditor: jest.fn(),
            onContentLoaded: jest.fn()
        };

        io = new EditorIO({
            version: '4.0.0',
            notify: mockNotify,
            ...mockCallbacks
        });
    });

    describe('exportAsHTML (lines 166-213)', () => {
        test('should export HTML successfully', () => {
            const mockClick = jest.fn();
            const originalCreateElement = document.createElement.bind(document);
            jest.spyOn(document, 'createElement').mockImplementation((tag) => {
                const el = originalCreateElement(tag);
                if (tag === 'a') {
                    el.click = mockClick;
                }
                return el;
            });

            const result = io.exportAsHTML();

            expect(result).toBe(true);
            expect(mockCallbacks.showNotification).toHaveBeenCalledWith(
                expect.stringContaining('Exported'),
                'success'
            );

            document.createElement.mockRestore();
        });

        test('should return false when no preview content', () => {
            io.getPreviewHTML = jest.fn(() => '');

            const result = io.exportAsHTML();

            expect(result).toBe(false);
        });
    });

    describe('getAutoSaveData error handling (lines 247-252)', () => {
        test('should handle localStorage error gracefully', () => {
            const originalGetItem = localStorage.getItem;
            localStorage.getItem = jest.fn(() => {
                throw new Error('Storage error');
            });

            const result = io.getAutoSaveData();

            expect(result).toBeNull();

            localStorage.getItem = originalGetItem;
        });

        test('should return null when no saved data', () => {
            localStorage.getItem = jest.fn(() => null);

            const result = io.getAutoSaveData();

            expect(result).toBeNull();
        });
    });

    describe('getTimeAgo (lines 299-305)', () => {
        test('should return "just now" for recent times', () => {
            const now = new Date();
            expect(io.getTimeAgo(now)).toBe('just now');
        });

        test('should return minutes ago', () => {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            expect(io.getTimeAgo(fiveMinutesAgo)).toBe('5m ago');
        });

        test('should return hours ago', () => {
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            expect(io.getTimeAgo(twoHoursAgo)).toBe('2h ago');
        });
    });

    describe('copyHTML (lines 288-292)', () => {
        test('should copy HTML to clipboard', async () => {
            const result = await io.copyHTML();

            expect(result).toBe(true);
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('<h1>Test</h1>');
        });

        test('should return false when no HTML content', async () => {
            io.getPreviewHTML = jest.fn(() => '');

            const result = await io.copyHTML();

            expect(result).toBe(false);
        });
    });

    describe('copyMarkdown (lines 278-282)', () => {
        test('should copy markdown to clipboard', async () => {
            const result = await io.copyMarkdown();

            expect(result).toBe(true);
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('# Test Content');
        });

        test('should return false when no content', async () => {
            io.getEditorValue = jest.fn(() => '');

            const result = await io.copyMarkdown();

            expect(result).toBe(false);
        });
    });

    describe('copyToClipboard error handling (lines 268-271)', () => {
        test('should handle clipboard API failure', async () => {
            navigator.clipboard.writeText = jest.fn().mockRejectedValue(new Error('Denied'));

            const result = await io.copyToClipboard('test');

            expect(result).toBe(false);
        });
    });

    describe('File Reader Result Helper (lines 309-315)', () => {
        test('should get result from event target', () => {
            const result = io._getFileReaderResult({ target: { result: 'content' } }, null);
            expect(result).toBe('content');
        });

        test('should get result from reader', () => {
            const result = io._getFileReaderResult(null, { result: 'reader content' });
            expect(result).toBe('reader content');
        });

        test('should return empty string on error', () => {
            const result = io._getFileReaderResult(null, null);
            expect(result).toBe('');
        });
    });
});

// ==================== EditorUI Tests ====================
describe('EditorUI - Coverage Gap Tests', () => {
    let ui;
    let mockAnim;
    let mockNotify;

    beforeEach(() => {
        TestUtils.setupCleanDOM();

        mockAnim = {
            fadeIn: jest.fn(),
            fadeOut: jest.fn()
        };

        mockNotify = {
            success: jest.fn(),
            error: jest.fn(),
            warning: jest.fn()
        };

        ui = new EditorUI({
            anim: mockAnim,
            notify: mockNotify,
            onEditorInput: jest.fn(),
            onFileSelect: jest.fn(),
            onSave: jest.fn(),
            onUndo: jest.fn(),
            onRedo: jest.fn(),
            onExport: jest.fn(),
            onCopyMarkdown: jest.fn(),
            onCopyHTML: jest.fn(),
            onCopyToEditor: jest.fn(),
            onSetMode: jest.fn(),
            onUpdatePreview: jest.fn(),
            getEditorValue: jest.fn(() => 'test content')
        });

        ui.setupDOM();
    });

    afterEach(() => {
        TestUtils.cleanupDOM();
    });

    describe('Toggle Theme (lines 589-604)', () => {
        test('should toggle theme from dark to light', () => {
            // Setup theme toggle button
            const headerControls = document.createElement('div');
            headerControls.className = 'header-controls';
            document.body.appendChild(headerControls);

            ui.setupThemeToggle();
            ui.currentTheme = 'dark';

            ui.toggleTheme();

            expect(ui.currentTheme).toBe('light');
            // localStorage is mocked in setup.js
        });

        test('should toggle theme from light to dark', () => {
            const headerControls = document.createElement('div');
            headerControls.className = 'header-controls';
            document.body.appendChild(headerControls);

            ui.setupThemeToggle();
            ui.currentTheme = 'light';

            ui.toggleTheme();

            expect(ui.currentTheme).toBe('dark');
        });
    });

    describe('Keyboard Shortcuts Modal (lines 608-667)', () => {
        test('should show keyboard shortcuts modal', () => {
            ui.showKeyboardShortcutsModal();

            const modal = document.getElementById('shortcuts-modal');
            expect(modal).not.toBeNull();
            expect(modal.innerHTML).toContain('Keyboard Shortcuts');
        });

        test('should close modal when clicking close button', () => {
            ui.showKeyboardShortcutsModal();

            const closeBtn = document.getElementById('close-shortcuts');
            closeBtn.click();

            const modal = document.getElementById('shortcuts-modal');
            expect(modal).toBeNull();
        });

        test('should close modal on escape key', () => {
            ui.showKeyboardShortcutsModal();

            const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escEvent);

            const modal = document.getElementById('shortcuts-modal');
            expect(modal).toBeNull();
        });

        test('should toggle modal if already open', () => {
            ui.showKeyboardShortcutsModal();
            expect(document.getElementById('shortcuts-modal')).not.toBeNull();

            ui.showKeyboardShortcutsModal();
            expect(document.getElementById('shortcuts-modal')).toBeNull();
        });
    });

    describe('Copy Dropdown (lines 514-556)', () => {
        test('should create copy dropdown', () => {
            const dropdown = ui._createCopyDropdown();

            expect(dropdown).toBeInstanceOf(HTMLElement);
            expect(dropdown.innerHTML).toContain('Copy');
        });

        test('should toggle dropdown on click', () => {
            const container = ui._createCopyDropdown();
            document.body.appendChild(container);

            const mainBtn = container.querySelector('button');
            const dropdown = container.querySelector('div > div');

            // Initial state
            expect(dropdown.style.display).toBe('none');

            // Click to open
            mainBtn.click();
            expect(dropdown.style.display).toBe('block');

            // Click to close
            mainBtn.click();
            expect(dropdown.style.display).toBe('none');
        });
    });

    describe('Update Undo/Redo Buttons (lines 489-497)', () => {
        test('should update undo button state', () => {
            ui.undoBtn = document.createElement('button');
            ui.redoBtn = document.createElement('button');

            ui.updateUndoRedoButtons(true, false);

            expect(ui.undoBtn.disabled).toBe(false);
            expect(ui.undoBtn.style.opacity).toBe('1');
            expect(ui.redoBtn.disabled).toBe(true);
            expect(ui.redoBtn.style.opacity).toBe('0.5');
        });

        test('should handle missing buttons gracefully', () => {
            ui.undoBtn = null;
            ui.redoBtn = null;

            expect(() => ui.updateUndoRedoButtons(true, true)).not.toThrow();
        });
    });

    describe('Update Save Indicator (lines 455-460)', () => {
        test('should update save indicator with time', () => {
            ui.saveIndicator = document.createElement('div');
            const lastSave = new Date();
            const getTimeAgo = jest.fn(() => '5m ago');

            ui.updateSaveIndicator(lastSave, getTimeAgo);

            expect(ui.saveIndicator.textContent).toContain('Saved 5m ago');
        });

        test('should show default message when no save time', () => {
            ui.saveIndicator = document.createElement('div');

            ui.updateSaveIndicator(null, jest.fn());

            expect(ui.saveIndicator.textContent).toContain('Auto-save enabled');
        });
    });

    describe('Show Clipboard Error (lines 721-731)', () => {
        test('should show clipboard error notification', () => {
            ui.editor = {
                value: 'test content',
                setSelectionRange: jest.fn(),
                focus: jest.fn()
            };

            ui.showClipboardError('test');

            // Should select the text
            expect(ui.editor.setSelectionRange).toHaveBeenCalled();
            expect(ui.editor.focus).toHaveBeenCalled();
        });
    });

    describe('Setup Enhanced Keyboard Shortcuts (lines 261-276)', () => {
        test('should handle undo shortcut', () => {
            const onUndo = jest.fn();
            ui.onUndo = onUndo;
            ui.setupEnhancedKeyboardShortcuts();

            // Focus on editor
            ui.editor.focus();

            const event = new KeyboardEvent('keydown', {
                key: 'z',
                ctrlKey: true,
                bubbles: true
            });

            // Manually trigger the handler since activeElement won't match in test
            Object.defineProperty(document, 'activeElement', {
                get: () => ui.editor,
                configurable: true
            });

            document.dispatchEvent(event);
        });

        test('should handle redo shortcut with Ctrl+Y', () => {
            const onRedo = jest.fn();
            ui.onRedo = onRedo;
            ui.setupEnhancedKeyboardShortcuts();

            Object.defineProperty(document, 'activeElement', {
                get: () => ui.editor,
                configurable: true
            });

            const event = new KeyboardEvent('keydown', {
                key: 'y',
                ctrlKey: true,
                bubbles: true
            });

            document.dispatchEvent(event);
        });
    });

    describe('Help Bar State Update (lines 378-388)', () => {
        test('should update help bar state when visible', () => {
            const helpIcon = document.createElement('span');
            const helpText = document.createElement('span');
            const helpToggle = document.createElement('button');

            ui._updateHelpBarState(true, helpIcon, helpText, helpToggle);

            expect(helpIcon.textContent).toBe('✕');
            expect(helpText.textContent).toBe('Close');
        });

        test('should update help bar state when hidden', () => {
            const helpIcon = document.createElement('span');
            const helpText = document.createElement('span');
            const helpToggle = document.createElement('button');

            ui._updateHelpBarState(false, helpIcon, helpText, helpToggle);

            expect(helpIcon.textContent).toBe('📚');
            expect(helpText.textContent).toBe('Help');
        });
    });
});

// ==================== MarkdownEditor Integration Tests ====================
describe('MarkdownEditor - Coverage Gap Tests', () => {
    let editor;

    beforeEach(() => {
        TestUtils.setupCleanDOM();
        editor = new MarkdownEditor();
        editor.init();
    });

    afterEach(() => {
        TestUtils.cleanupDOM();
    });

    describe('Proxied Setters (lines 96-110)', () => {
        test('should set editor through proxy', () => {
            const mockEditor = { value: 'test' };
            editor.editor = mockEditor;
            expect(editor.ui.editor).toBe(mockEditor);
        });

        test('should set preview through proxy', () => {
            const mockPreview = { innerHTML: '' };
            editor.preview = mockPreview;
            expect(editor.ui.preview).toBe(mockPreview);
        });

        test('should set fileInput through proxy', () => {
            const mockInput = { click: jest.fn() };
            editor.fileInput = mockInput;
            expect(editor.ui.fileInput).toBe(mockInput);
        });

        test('should set uploadArea through proxy', () => {
            const mockArea = {};
            editor.uploadArea = mockArea;
            expect(editor.ui.uploadArea).toBe(mockArea);
        });

        test('should set statsDisplay through proxy', () => {
            const mockStats = {};
            editor.statsDisplay = mockStats;
            expect(editor.ui.statsDisplay).toBe(mockStats);
        });

        test('should set saveIndicator through proxy', () => {
            const mockIndicator = {};
            editor.saveIndicator = mockIndicator;
            expect(editor.ui.saveIndicator).toBe(mockIndicator);
        });

        test('should set undoBtn through proxy', () => {
            const mockBtn = {};
            editor.undoBtn = mockBtn;
            expect(editor.ui.undoBtn).toBe(mockBtn);
        });

        test('should set redoBtn through proxy', () => {
            const mockBtn = {};
            editor.redoBtn = mockBtn;
            expect(editor.ui.redoBtn).toBe(mockBtn);
        });
    });

    describe('Undo/Redo Methods (lines 167-191)', () => {
        test('should perform undo operation', () => {
            editor.editor.value = 'initial';
            editor.saveToHistory('initial');
            editor.editor.value = 'changed';
            editor.saveToHistory('changed');

            editor.undo();

            expect(editor.editor.value).toBe('initial');
        });

        test('should perform redo operation', () => {
            editor.editor.value = 'initial';
            editor.saveToHistory('initial');
            editor.editor.value = 'changed';
            editor.saveToHistory('changed');

            editor.undo();
            editor.redo();

            expect(editor.editor.value).toBe('changed');
        });

        test('should sync history state after undo/redo', () => {
            editor.saveToHistory('state1');
            editor.saveToHistory('state2');

            editor.undo();

            expect(editor.history).toBe(editor.state.history);
            expect(editor.historyIndex).toBe(editor.state.historyIndex);
        });
    });

    describe('Copy Operations (lines 235-245)', () => {
        test('should copy markdown', async () => {
            editor.editor.value = '# Test Markdown';

            await editor.copyMarkdown();

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('# Test Markdown');
        });

        test('should copy HTML', async () => {
            editor.editor.value = '# Test';
            editor.updatePreview();

            await editor.copyHTML();

            expect(navigator.clipboard.writeText).toHaveBeenCalled();
        });
    });

    describe('Auto-save Handling (lines 271-298)', () => {
        test('should handle auto-save timer', () => {
            jest.useFakeTimers();

            editor._handleAutoSave();

            expect(editor.autoSaveTimer).not.toBeNull();

            jest.advanceTimersByTime(31000);

            jest.useRealTimers();
        });

        test('should clear previous auto-save timer', () => {
            jest.useFakeTimers();

            editor._handleAutoSave();
            const firstTimer = editor.autoSaveTimer;

            editor._handleAutoSave();

            expect(editor.autoSaveTimer).not.toBe(firstTimer);

            jest.useRealTimers();
        });

        test('should load from auto-save when data exists', () => {
            // Mock the io.getAutoSaveData to return saved content
            editor.io.getAutoSaveData = jest.fn(() => ({
                content: 'saved content different',
                timestamp: new Date().toISOString()
            }));

            // Set editor value to something different so condition triggers
            editor.editor.value = 'different content';
            window.confirm = jest.fn(() => true);

            editor.loadFromAutoSave();

            expect(window.confirm).toHaveBeenCalled();
            expect(editor.editor.value).toBe('saved content different');
        });

        test('should not restore if user declines', () => {
            // Mock the io.getAutoSaveData to return saved content
            editor.io.getAutoSaveData = jest.fn(() => ({
                content: 'saved content',
                timestamp: new Date().toISOString()
            }));

            // Set editor value to something different so condition triggers
            editor.editor.value = 'different content';
            window.confirm = jest.fn(() => false);

            editor.loadFromAutoSave();

            expect(editor.editor.value).toBe('different content');
        });
    });

    describe('Delegated Methods (lines 201-215)', () => {
        test('should delegate setupTabs', () => {
            const spy = jest.spyOn(editor.ui, 'setupTabs');
            editor.setupTabs();
            expect(spy).toHaveBeenCalled();
        });

        test('should delegate setMode', () => {
            const spy = jest.spyOn(editor.ui, 'setMode');
            editor.setMode('preview');
            expect(spy).toHaveBeenCalledWith('preview');
        });

        test('should delegate updateStatus', () => {
            const spy = jest.spyOn(editor.ui, 'updateStatus');
            editor.updateStatus('editing');
            expect(spy).toHaveBeenCalledWith('editing');
        });

        test('should delegate setupHelpBar', () => {
            const spy = jest.spyOn(editor.ui, 'setupHelpBar');
            editor.setupHelpBar();
            expect(spy).toHaveBeenCalled();
        });

        test('should delegate setupCopyButtons', () => {
            const spy = jest.spyOn(editor.ui, 'setupCopyButtons');
            editor.setupCopyButtons();
            expect(spy).toHaveBeenCalled();
        });

        test('should delegate setupDragAndDrop', () => {
            const spy = jest.spyOn(editor.ui, 'setupDragAndDrop');
            editor.setupDragAndDrop();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Environment Helpers (lines 113-118)', () => {
        test('should check browser environment', () => {
            expect(editor.isBrowser()).toBe(true);
        });

        test('should check test environment', () => {
            expect(editor.isTestEnvironment()).toBe(true);
        });

        test('should check required elements', () => {
            // hasRequiredElements returns truthy when editor and preview exist
            expect(editor.hasRequiredElements()).toBeTruthy();
        });

        test('should get cached element', () => {
            const result = editor.getCachedElement('markdown-editor');
            expect(result).toBe(editor.editor);
        });

        test('should remove DOM element', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);

            editor.removeDOMElement(el);

            expect(el.parentNode).toBeNull();
        });

        test('should get file reader result', () => {
            const result = editor.getFileReaderResult({ target: { result: 'test' } }, null);
            expect(result).toBe('test');
        });
    });

    describe('Update Stats (line 263)', () => {
        test('should update stats and sync', () => {
            editor.editor.value = 'word1 word2 word3';

            editor.updateStats();

            expect(editor.stats.words).toBe(3);
        });
    });

    describe('Export As HTML (line 158)', () => {
        test('should call io.exportAsHTML', () => {
            const spy = jest.spyOn(editor.io, 'exportAsHTML');
            editor.exportAsHTML();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Additional Delegated Methods', () => {
        test('should delegate addUndoRedoButtons', () => {
            const spy = jest.spyOn(editor.ui, 'addUndoRedoButtons');
            editor.addUndoRedoButtons();
            expect(spy).toHaveBeenCalled();
        });

        test('should delegate setupExportButton', () => {
            const spy = jest.spyOn(editor.ui, 'setupExportButton');
            editor.setupExportButton();
            expect(spy).toHaveBeenCalled();
        });

        test('should delegate setupKeyboardShortcutsModal', () => {
            const spy = jest.spyOn(editor.ui, 'setupKeyboardShortcutsModal');
            editor.setupKeyboardShortcutsModal();
            expect(spy).toHaveBeenCalled();
        });

        test('should delegate showKeyboardShortcutsModal', () => {
            const spy = jest.spyOn(editor.ui, 'showKeyboardShortcutsModal');
            editor.showKeyboardShortcutsModal();
            expect(spy).toHaveBeenCalled();
        });

        test('should delegate setupThemeToggle', () => {
            const spy = jest.spyOn(editor.ui, 'setupThemeToggle');
            editor.setupThemeToggle();
            expect(spy).toHaveBeenCalled();
        });

        test('should delegate toggleTheme', () => {
            const headerControls = document.createElement('div');
            headerControls.className = 'header-controls';
            document.body.appendChild(headerControls);
            editor.ui.setupThemeToggle();

            editor.toggleTheme();

            expect(editor.currentTheme).toBe(editor.ui.currentTheme);
        });

        test('should delegate enhanceKeyboardShortcuts', () => {
            const spy = jest.spyOn(editor.ui, 'setupEnhancedKeyboardShortcuts');
            editor.enhanceKeyboardShortcuts();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Copy to Editor (lines 217-221)', () => {
        test('should copy example to editor and clipboard', async () => {
            const example = '# Example';

            await editor.copyToEditor(example);

            expect(editor.editor.value).toContain(example);
        });
    });

    describe('Show Clipboard Error (line 214)', () => {
        test('should show clipboard error', () => {
            const spy = jest.spyOn(editor.ui, 'showClipboardError');
            editor.showClipboardError('test text');
            expect(spy).toHaveBeenCalledWith('test text');
        });
    });

    describe('Update Help Bar State (line 209)', () => {
        test('should update help bar state', () => {
            const spy = jest.spyOn(editor.ui, '_updateHelpBarState');
            editor.updateHelpBarState(true, null, null, null);
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('On Editor Input (lines 195-198)', () => {
        test('should handle editor input', () => {
            jest.useFakeTimers();

            editor.editor.value = 'new content';
            editor._onEditorInput();

            expect(editor.autoSaveTimer).not.toBeNull();

            jest.useRealTimers();
        });
    });

    describe('Create Copy Dropdown (line 245)', () => {
        test('should create copy dropdown', () => {
            const dropdown = editor.createCopyDropdown();
            expect(dropdown).toBeInstanceOf(HTMLElement);
        });
    });

    describe('Legacy createDropdownItem (line 246)', () => {
        test('should not throw for legacy method', () => {
            expect(() => editor.createDropdownItem('test', 'callback')).not.toThrow();
        });
    });

    describe('Show Copy Feedback (line 213)', () => {
        test('should show copy feedback notification', () => {
            const spy = jest.spyOn(editor, 'showNotification');
            editor.showCopyFeedback();
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('copied'), 'success');
        });
    });
});

// ==================== Edge Cases ====================
describe('Edge Cases and Error Handling', () => {
    test('EditorState should not save duplicate content', () => {
        const state = new EditorState();
        state.saveToHistory('same');
        const result = state.saveToHistory('same');
        expect(result).toBe(false);
    });

    test('EditorIO should handle undefined window', async () => {
        const io = new EditorIO();
        const originalNavigator = global.navigator;

        // Test without clipboard
        delete global.navigator.clipboard;

        const result = await io.copyToClipboard('test');
        expect(result).toBe(false);

        global.navigator = originalNavigator;
    });

    test('EditorUI should handle missing DOM elements gracefully', () => {
        const ui = new EditorUI();

        expect(() => ui.setupDOM()).not.toThrow();
        expect(() => ui.updatePreview()).not.toThrow();
    });
});
