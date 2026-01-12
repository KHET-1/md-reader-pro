/**
 * MD Reader Pro v4.0.0 - Cathedral Edition
 * Enterprise-grade markdown editor with live preview, auto-save, and undo/redo.
 *
 * Architecture: Thin orchestrator composing EditorState, EditorIO, and EditorUI modules.
 * All cross-module communication flows through callbacks for testability.
 *
 * @module MarkdownEditor
 * @version 4.0.0
 */
import AnimationManager from './utils/AnimationManager.js';
import NotificationManager from './utils/NotificationManager.js';
import EditorState from './core/EditorState.js';
import EditorIO from './io/EditorIO.js';
import EditorUI from './ui/EditorUI.js';
import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/animations.css';
import './styles/utilities.css';

/**
 * Main MarkdownEditor class - orchestrates all editor functionality.
 * @class
 */
class MarkdownEditor {
    constructor() {
        this.version = '4.0.0';
        this.anim = new AnimationManager();
        this.notify = new NotificationManager();

        // Compose modules with dependency injection
        this.state = new EditorState({
            onHistoryChange: () => this._onHistoryChange()
        });

        this.io = new EditorIO({
            version: this.version,
            getEditorValue: () => this.editor?.value || '',
            setEditorValue: (v) => { if (this.editor) this.editor.value = v; },
            getPreviewHTML: () => this.preview?.innerHTML || '',
            triggerFileInput: () => this.fileInput?.click(),
            notify: this.notify,
            showNotification: (m, t, d) => this.ui?.showNotification(m, t, d),
            onContentLoaded: () => this.updatePreview(),
            focusEditor: () => this.editor?.focus()
        });

        this.ui = new EditorUI({
            anim: this.anim,
            notify: this.notify,
            onEditorInput: () => this._onEditorInput(),
            onFileSelect: (f) => this.loadFile(f),
            onSave: () => this.saveMarkdown(),
            onUndo: () => this.undo(),
            onRedo: () => this.redo(),
            onExport: () => this.exportAsHTML(),
            onCopyMarkdown: () => this.copyMarkdown(),
            onCopyHTML: () => this.copyHTML(),
            onCopyToEditor: (t) => this.copyToEditor(t),
            onSetMode: (m) => this.setMode(m),
            onUpdatePreview: () => this.updatePreview(),
            getEditorValue: () => this.editor?.value || ''
        });

        // Legacy compatibility - expose state
        this.history = this.state.history;
        this.historyIndex = this.state.historyIndex;
        this.maxHistory = this.state.maxHistory;
        this.autoSaveTimer = null;
        this.lastSaveTime = null;
        this.stats = this.ui.stats;
        this.currentTheme = this.ui.currentTheme;
        this.cachedElements = this.ui.cachedElements;
        this.sanitizeConfig = this.ui.sanitizeConfig;
        this.debounceTimer = null;
        this._copyButtonsInitialized = false;
    }

    // === Static Constants ===
    static get CONSTANTS() {
        return {
            TAB_WIDTH: 4, INDENTATION_SPACES: '    ',
            FEEDBACK_DURATION: 2000, FEEDBACK_FADE_DURATION: 300,
            HELP_BAR_TRANSITION_DURATION: 300, MAX_FILE_SIZE: 10 * 1024 * 1024,
            SUPPORTED_EXTENSIONS: ['.md', '.txt', '.markdown'],
            HELP_BAR_WIDTH: 400, TOGGLE_BUTTON_SIZE: 50,
            DEBOUNCE_DELAY: 300, MEMORY_LEAK_THRESHOLD: 1024 * 1024,
            KEYBOARD_SHORTCUTS: { SAVE: ['Control', 's'], TAB: 'Tab', ESCAPE: 'Escape' }
        };
    }

    // === Proxied Element Access (with setters for test compatibility) ===
    get editor() { return this.ui?.editor; }
    set editor(v) { if (this.ui) this.ui.editor = v; }
    get preview() { return this.ui?.preview; }
    set preview(v) { if (this.ui) this.ui.preview = v; }
    get fileInput() { return this.ui?.fileInput; }
    set fileInput(v) { if (this.ui) this.ui.fileInput = v; }
    get uploadArea() { return this.ui?.uploadArea; }
    set uploadArea(v) { if (this.ui) this.ui.uploadArea = v; }
    get statsDisplay() { return this.ui?.statsDisplay; }
    set statsDisplay(v) { if (this.ui) this.ui.statsDisplay = v; }
    get saveIndicator() { return this.ui?.saveIndicator; }
    set saveIndicator(v) { if (this.ui) this.ui.saveIndicator = v; }
    get undoBtn() { return this.ui?.undoBtn; }
    set undoBtn(v) { if (this.ui) this.ui.undoBtn = v; }
    get redoBtn() { return this.ui?.redoBtn; }
    set redoBtn(v) { if (this.ui) this.ui.redoBtn = v; }

    // === Environment Helpers (delegated) ===
    isBrowser() { return this.ui.isBrowser(); }
    isTestEnvironment() { return this.ui.isTestEnvironment(); }
    hasRequiredElements() { return this.ui.hasRequiredElements(); }
    getCachedElement(id, sel) { return this.ui.getCachedElement(id, sel); }
    removeDOMElement(el) { return this.ui.removeDOMElement(el); }
    getFileReaderResult(e, r) { return this.io._getFileReaderResult(e, r); }

    // === Lifecycle ===

    /**
     * Initialize the editor. Call this after construction.
     * Sets up DOM, event listeners, and Cathedral features.
     */
    init() {
        if (!this.isBrowser()) return;
        console.log(`✅ MD Reader Pro v${this.version} initialized`);
        console.log('📝 Professional markdown editor ready');
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEditor());
        } else {
            this.setupEditor();
        }
    }

    setupEditor() {
        if (!this.ui.setupDOM()) return;
        this.ui.setupEventListeners();
        this.updatePreview();
        this.initCathedralFeatures();
        this.ui.setupEnhancedKeyboardShortcuts();
        console.log('📝 Markdown editor initialized successfully');
        console.log('🏰 MD Reader Pro Cathedral Edition v' + this.version);
    }

    setupEventListeners() { this.ui.setupEventListeners(); }

    // === Preview ===
    debouncedUpdatePreview() { this.ui.debouncedUpdatePreview(); }
    updatePreview() { this.ui.updatePreview(); }

    // === File Operations (delegated to IO) ===
    handleFileSelect(e) { const f = e.target.files[0]; if (f) this.loadFile(f); }
    loadFile(file) { this.io.loadFile(file); }
    readFile(file) { this.io.readFile(file); }
    saveMarkdown() { this.io.saveMarkdown(); }
    exportAsHTML() { this.io.exportAsHTML(); }

    // === History (delegated to State) ===
    saveToHistory(content) {
        this.state.saveToHistory(content);
        this.history = this.state.history;
        this.historyIndex = this.state.historyIndex;
    }

    undo() {
        const content = this.state.undo();
        if (content !== null && this.editor) {
            this.editor.value = content;
            this.updatePreview();
            this.showNotification('↩️ Undo', 'success', 1000);
        }
        this._syncHistoryState();
    }

    redo() {
        const content = this.state.redo();
        if (content !== null && this.editor) {
            this.editor.value = content;
            this.updatePreview();
            this.showNotification('↪️ Redo', 'success', 1000);
        }
        this._syncHistoryState();
    }

    _syncHistoryState() {
        this.history = this.state.history;
        this.historyIndex = this.state.historyIndex;
        this.updateUndoRedoButtons();
    }

    _onHistoryChange() { this.updateUndoRedoButtons(); }

    _onEditorInput() {
        if (this.editor) this.state.debouncedSave(this.editor.value);
        this._handleAutoSave();
    }

    // === UI Setup (delegated) ===
    setupTabs() { this.ui.setupTabs(); }
    setMode(m) { this.ui.setMode(m); }
    updateStatus(m) { this.ui.updateStatus(m); }
    setupHelpBar() { this.ui.setupHelpBar(); }
    setupCopyButtons() { this.ui.setupCopyButtons(); }
    setupDragAndDrop() { this.ui.setupDragAndDrop(); }
    handleKeyboardShortcuts(e) { this.ui.handleKeyboardShortcuts(e); }
    preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
    updateHelpBarState(v, i, t, b) { this.ui._updateHelpBarState(v, i, t, b); }

    // === Notifications ===
    showNotification(m, t, d) { this.ui.showNotification(m, t, d); }
    showCopyFeedback() { this.showNotification('✅ Example copied!', 'success'); }
    showClipboardError(t) { this.ui.showClipboardError(t); }

    // === Copy Operations ===
    copyToEditor(example) {
        this.ui.copyToEditor(example);
        this.copyToClipboard(example);
        console.log('📋 Example copied to clipboard and editor');
    }

    async copyToClipboard(text) {
        const success = await this.io.copyToClipboard(text);
        if (success) {
            this.notify.success('Example copied to editor and clipboard!', {
                duration: NotificationManager.CONSTANTS.DURATION.SHORT
            });
        } else {
            this.showClipboardError(text);
        }
        return success;
    }

    async copyMarkdown() {
        const success = await this.io.copyMarkdown();
        this.showNotification(success ? '📝 Markdown copied to clipboard!' : '❌ Failed to copy', success ? 'success' : 'error');
    }

    async copyHTML() {
        const success = await this.io.copyHTML();
        this.showNotification(success ? '🌐 HTML copied to clipboard!' : '❌ Failed to copy', success ? 'success' : 'error');
    }

    createCopyDropdown() { return this.ui._createCopyDropdown(); }
    createDropdownItem(t, c) { /* legacy - handled internally */ }

    // === Cathedral Features ===
    initCathedralFeatures() {
        this.setupStatsCounter();
        this.setupAutoSave();
        this.setupUndoRedo();
        this.ui.setupToolbarCopyDropdown();
        this.ui.setupExportButton();
        this.ui.setupKeyboardShortcutsModal();
        this.ui.setupThemeToggle();
        this.ui.setupHelpBar();
        this.ui.setupTabs();
        console.log('🏰 Cathedral features initialized!');
    }

    setupStatsCounter() { this.ui.setupStatsCounter(); }
    updateStats() { this.ui.updateStats(); this.stats = this.ui.stats; }

    setupAutoSave() {
        this.loadFromAutoSave();
        window.addEventListener('beforeunload', () => this.saveToLocalStorage());
        this.ui.createSaveIndicator();
    }

    _handleAutoSave() {
        if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(() => this.saveToLocalStorage(), 30000);
    }

    saveToLocalStorage() {
        if (this.io.saveToLocalStorage()) {
            this.lastSaveTime = this.io.lastSaveTime;
            this.updateSaveIndicator();
        }
    }

    loadFromAutoSave() {
        if (!this.editor) return;
        const data = this.io.getAutoSaveData();
        if (data?.content && data.content !== this.editor.value) {
            const restore = confirm(`Restore auto-saved content from ${new Date(data.timestamp).toLocaleString()}?`);
            if (restore) {
                this.editor.value = data.content;
                this.updatePreview();
                this.showNotification('✅ Content restored from auto-save', 'success');
            }
        }
    }

    createSaveIndicator() { this.ui.createSaveIndicator(); }
    updateSaveIndicator() { this.ui.updateSaveIndicator(this.lastSaveTime, (d) => this.io.getTimeAgo(d)); }
    getTimeAgo(d) { return this.io.getTimeAgo(d); }

    setupUndoRedo() {
        if (!this.editor) return;
        this.saveToHistory(this.editor.value);
        this.ui.addUndoRedoButtons();
    }

    addUndoRedoButtons() { this.ui.addUndoRedoButtons(); }
    updateUndoRedoButtons() { this.ui.updateUndoRedoButtons(this.state.canUndo(), this.state.canRedo()); }

    setupExportButton() { this.ui.setupExportButton(); }
    setupKeyboardShortcutsModal() { this.ui.setupKeyboardShortcutsModal(); }
    showKeyboardShortcutsModal() { this.ui.showKeyboardShortcutsModal(); }
    setupThemeToggle() { this.ui.setupThemeToggle(); }
    toggleTheme() { this.ui.toggleTheme(); this.currentTheme = this.ui.currentTheme; }
    enhanceKeyboardShortcuts() { this.ui.setupEnhancedKeyboardShortcuts(); }

    showCollaborationStory() {
        console.log('');
        console.log('🎭 ======================================');
        console.log('📖 THE DEVELOPMENT JOURNEY');
        console.log('🎭 ======================================');
        console.log('');
        console.log('🚀 Phase 1: Professional tooling setup');
        console.log('🧪 Phase 2: Comprehensive testing suite');
        console.log('✨ Phase 3: Real markdown functionality!');
        console.log('🎯 Result: From demo to actual working editor');
        console.log('');
        console.log('💡 Features now working:');
        console.log('   • Real-time markdown parsing');
        console.log('   • File upload & drag-drop');
        console.log('   • Professional split-pane UI');
        console.log('   • Keyboard shortcuts (Tab, Ctrl+S)');
        console.log('   • Live preview with styling');
        console.log('');
        console.log('🎊 This is now a REAL markdown editor! 🎉');
    }
}

export default MarkdownEditor;

// Browser initialization
if (typeof window !== 'undefined' && typeof jest === 'undefined') {
    const markdownEditor = new MarkdownEditor();
    markdownEditor.init();
    window.markdownEditor = markdownEditor;

    try {
        if (window.markdownEditor?.constructor?.name !== 'MarkdownEditor') {
            Object.defineProperty(window.markdownEditor, 'constructor', {
                value: { name: 'MarkdownEditor' }, configurable: true, enumerable: false, writable: false
            });
        }
    } catch (_) { }

    window.showCollabStory = () => markdownEditor.showCollaborationStory();
    window.getAnimationFPS = () => { try { return Math.round(markdownEditor?.anim?.getFPS() ?? 0); } catch (_) { return 0; } };

    console.log('💡 Console commands available:');
    console.log('   • markdownEditor - Editor instance');
    console.log('   • showCollabStory() - Development journey!');
    console.log('   • getAnimationFPS() - Current animation FPS estimate');
}
