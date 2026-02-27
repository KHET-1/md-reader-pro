import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-markup.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-markdown.js';

/**
 * EditorUI - Full Vision Brain System
 *
 * v13f Architecture:
 * - Brain Core: Central state and coordination
 * - Subsystems: Modular UI components with lifecycle hooks
 * - Event Bus: Inter-subsystem communication
 * - State Machine: UI mode transitions
 *
 * Subsystems:
 * - Rendering: Preview, syntax highlighting
 * - Input: Keyboard shortcuts, tabs, modes
 * - Toolbar: Copy, export, theme, undo/redo
 * - Feedback: Notifications, save indicator, stats
 * - Layout: Help bar, panels, responsive
 *
 * @module EditorUI
 * @version 2.0.0 (Brain System)
 */
class EditorUI {
    constructor(options = {}) {
        // === Brain Core: Central State ===
        this._brainState = {
            initialized: false,
            mode: 'split',
            theme: 'dark',
            focused: false,
            dirty: false,
            subsystems: new Map()
        };

        // === Event Bus ===
        this._eventBus = {
            listeners: new Map(),
            emit: (event, data) => this._emitEvent(event, data),
            on: (event, handler) => this._addEventListener(event, handler),
            off: (event, handler) => this._removeEventListener(event, handler)
        };

        // === DOM Elements ===
        this.editor = null;
        this.preview = null;
        this.fileInput = null;
        this.uploadArea = null;
        this.statsDisplay = null;
        this.saveIndicator = null;
        this.undoBtn = null;
        this.redoBtn = null;

        this.cachedElements = {};
        this.debounceTimer = null;
        this._copyButtonsInitialized = false;

        // Track event listeners for cleanup
        this.eventListeners = [];

        // Cache for DOM queries
        this.cachedTabs = null;
        this.cachedPanes = null;
        this.statsDebounceTimer = null;

        // Animation and notification managers (injected)
        this.anim = options.anim;
        this.notify = options.notify;

        // Callbacks to orchestrator
        this.onEditorInput = options.onEditorInput || (() => {});
        this.onFileSelect = options.onFileSelect || (() => {});
        this.onSave = options.onSave || (() => {});
        this.onUndo = options.onUndo || (() => {});
        this.onRedo = options.onRedo || (() => {});
        this.onExport = options.onExport || (() => {});
        this.onCopyMarkdown = options.onCopyMarkdown || (() => {});
        this.onCopyHTML = options.onCopyHTML || (() => {});
        this.onCopyToEditor = options.onCopyToEditor || (() => {});
        this.onSetMode = options.onSetMode || ((m) => this.setMode(m));
        this.onUpdatePreview = options.onUpdatePreview || (() => this.updatePreview());
        this.getEditorValue = options.getEditorValue || (() => '');

        // v13a: File drag analysis callback - returns Promise<boolean> to proceed
        this.onFileDragAnalysis = options.onFileDragAnalysis || null;

        // Theme
        this.currentTheme = localStorage.getItem('md-reader-theme') || 'dark';

        // Stats
        this.stats = { words: 0, characters: 0, lines: 0, readingTime: 0 };

        // DOMPurify config
        this.sanitizeConfig = {
            ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a',
                          'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
                          'strong', 'em', 'img', 'table', 'thead', 'tbody',
                          'tr', 'th', 'td', 'br', 'hr', 'del', 'input', 'span'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'type',
                          'checked', 'disabled']
        };

        // Constants
        this.CONSTANTS = {
            TAB_WIDTH: 4,
            INDENTATION_SPACES: '    ',
            FEEDBACK_DURATION: 2000,
            FEEDBACK_FADE_DURATION: 300,
            HELP_BAR_TRANSITION_DURATION: 300,
            HELP_BAR_WIDTH: 400,
            DEBOUNCE_DELAY: 300
        };
    }

    // === Brain Core: Event Bus Implementation ===

    /**
     * Emit an event to all listeners
     * @param {string} event - Event name
     * @param {any} data - Event data
     */
    _emitEvent(event, data) {
        const listeners = this._eventBus.listeners.get(event);
        if (listeners) {
            listeners.forEach(handler => {
                try {
                    handler(data);
                } catch (err) {
                    console.error(`Event handler error for ${event}:`, err);
                }
            });
        }
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    _addEventListener(event, handler) {
        if (!this._eventBus.listeners.has(event)) {
            this._eventBus.listeners.set(event, new Set());
        }
        this._eventBus.listeners.get(event).add(handler);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    _removeEventListener(event, handler) {
        const listeners = this._eventBus.listeners.get(event);
        if (listeners) {
            listeners.delete(handler);
        }
    }

    // === Brain Core: Subsystem Management ===

    /**
     * Register a subsystem
     * @param {string} name - Subsystem name
     * @param {Object} config - Subsystem configuration
     */
    registerSubsystem(name, config = {}) {
        this._brainState.subsystems.set(name, {
            name,
            enabled: config.enabled !== false,
            initialized: false,
            init: config.init || (() => {}),
            destroy: config.destroy || (() => {}),
            onModeChange: config.onModeChange || (() => {}),
            onThemeChange: config.onThemeChange || (() => {})
        });
    }

    /**
     * Initialize all registered subsystems
     */
    initializeSubsystems() {
        for (const [name, subsystem] of this._brainState.subsystems) {
            if (subsystem.enabled && !subsystem.initialized) {
                try {
                    subsystem.init.call(this);
                    subsystem.initialized = true;
                    console.log(`✓ Subsystem initialized: ${name}`);
                } catch (err) {
                    console.error(`✗ Subsystem init failed: ${name}`, err);
                }
            }
        }
    }

    /**
     * Get brain state
     * @returns {Object}
     */
    getBrainState() {
        return { ...this._brainState };
    }

    /**
     * Update brain state
     * @param {string} key - State key
     * @param {any} value - New value
     */
    setBrainState(key, value) {
        const oldValue = this._brainState[key];
        this._brainState[key] = value;

        // Emit state change event
        this._emitEvent('stateChange', { key, oldValue, newValue: value });

        // Notify subsystems of specific changes
        if (key === 'mode') {
            this._notifySubsystemsOfModeChange(value);
        } else if (key === 'theme') {
            this._notifySubsystemsOfThemeChange(value);
        }
    }

    /**
     * Notify subsystems of mode change
     * @private
     */
    _notifySubsystemsOfModeChange(mode) {
        for (const [, subsystem] of this._brainState.subsystems) {
            if (subsystem.enabled && subsystem.initialized) {
                subsystem.onModeChange.call(this, mode);
            }
        }
    }

    /**
     * Notify subsystems of theme change
     * @private
     */
    _notifySubsystemsOfThemeChange(theme) {
        for (const [, subsystem] of this._brainState.subsystems) {
            if (subsystem.enabled && subsystem.initialized) {
                subsystem.onThemeChange.call(this, theme);
            }
        }
    }

    // === Environment Helpers ===

    isBrowser() {
        return typeof window !== 'undefined';
    }

    isTestEnvironment() {
        return typeof jest !== 'undefined';
    }

    hasRequiredElements() {
        return this.editor && this.preview;
    }

    getCachedElement(id, selector) {
        const key = id || selector;
        if (!this.cachedElements[key]) {
            this.cachedElements[key] = id ?
                document.getElementById(id) :
                (selector ? document.querySelector(selector) : null);
        }
        return this.cachedElements[key];
    }

    removeDOMElement(element) {
        try {
            if (element?.parentNode) {
                element.parentNode.removeChild(element);
            }
        } catch (_) { }
    }

    // Add event listener via a single abstraction point
    addTrackedListener(target, event, handler, options) {
        target.addEventListener(event, handler, options);
    }
    // === Core Setup ===

    setupDOM() {
        // Register core subsystems (v13f Brain System)
        this._registerCoreSubsystems();

        this.editor = document.getElementById('markdown-editor');
        this.preview = document.getElementById('markdown-preview');
        this.fileInput = document.getElementById('file-input');
        this.uploadArea = document.querySelector('.upload-area');

        if (!this.hasRequiredElements()) {
            if (!this.isTestEnvironment()) {
                console.error('Required DOM elements not found');
            }
            return false;
        }

        // Configure marked
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            async: false,
            highlight: (code, lang) => {
                if (lang && Prism.languages[lang]) {
                    return Prism.highlight(code, Prism.languages[lang], lang);
                }
                return code;
            }
        });

        // Mark brain as initialized
        this.setBrainState('initialized', true);
        this._emitEvent('brain:ready', { timestamp: Date.now() });

        return true;
    }

    /**
     * Register core subsystems (v13f Brain System)
     * @private
     */
    _registerCoreSubsystems() {
        // Rendering subsystem
        this.registerSubsystem('rendering', {
            init: () => {
                this._emitEvent('subsystem:rendering:init', {});
            },
            onModeChange: (mode) => {
                this._emitEvent('subsystem:rendering:modeChange', { mode });
            }
        });

        // Input subsystem
        this.registerSubsystem('input', {
            init: () => {
                this._emitEvent('subsystem:input:init', {});
            }
        });

        // Toolbar subsystem
        this.registerSubsystem('toolbar', {
            init: () => {
                this._emitEvent('subsystem:toolbar:init', {});
            },
            onThemeChange: (theme) => {
                this._emitEvent('subsystem:toolbar:themeChange', { theme });
            }
        });

        // Feedback subsystem
        this.registerSubsystem('feedback', {
            init: () => {
                this._emitEvent('subsystem:feedback:init', {});
            }
        });

        // Layout subsystem
        this.registerSubsystem('layout', {
            init: () => {
                this._emitEvent('subsystem:layout:init', {});
            },
            onModeChange: (mode) => {
                // Layout adjusts for different modes
                this._emitEvent('subsystem:layout:modeChange', { mode });
            }
        });
    }

    setupEventListeners() {
        if (!this.editor) return;

        // Real-time preview with debouncing
        this.editor.addEventListener('input', () => {
            this.debouncedUpdatePreview();
            this.onEditorInput();
        });

        // File upload
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) this.onFileSelect(file);
            });
        }

        // Drag and drop
        if (this.uploadArea) {
            this.setupDragAndDrop();
        }

        // Keyboard shortcuts
        this.editor.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    setupDragAndDrop() {
        if (!this.uploadArea) return;

        const uploadArea = this.uploadArea;
        const preventDefaults = (e) => { e.preventDefault(); e.stopPropagation(); };

        // v13a: Handle file drop with optional pre-analysis
        const handleDrop = async (e) => {
            const files = e.dataTransfer.files;
            if (files.length === 0) return;

            const file = files[0];

            // If drag analysis is enabled, run it first
            if (this.onFileDragAnalysis) {
                try {
                    const shouldProceed = await this.onFileDragAnalysis(file);
                    if (!shouldProceed) {
                        // User cancelled after seeing analysis
                        return;
                    }
                } catch (err) {
                    console.error('File drag analysis error:', err);
                    // Proceed with load on error
                }
            }

            this.onFileSelect(file);
        };

        const handlers = {
            'dragenter': [preventDefaults, () => uploadArea.classList.add('drag-over')],
            'dragover': [preventDefaults, () => uploadArea.classList.add('drag-over')],
            'dragleave': [preventDefaults, () => uploadArea.classList.remove('drag-over')],
            'drop': [
                preventDefaults,
                () => uploadArea.classList.remove('drag-over'),
                handleDrop
            ]
        };

        Object.entries(handlers).forEach(([event, fns]) => {
            fns.forEach(fn => uploadArea.addEventListener(event, fn, false));
            document.body.addEventListener(event, preventDefaults, false);
        });

        // Keyboard: Enter/Space activate (upload area has role="button")
        const fileInput = this.fileInput;
        uploadArea.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            if (fileInput) fileInput.click();
        });
    }

    // === Preview & Rendering ===

    debouncedUpdatePreview() {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.updatePreview();
            this.debounceTimer = null;
        }, this.CONSTANTS.DEBOUNCE_DELAY);
    }

    updatePreview() {
        if (!this.hasRequiredElements()) return;

        const text = this.editor.value;

        if (!text.trim()) {
            this.preview.innerHTML = `
                <div style="color: #666; text-align: center; padding: 2rem;">
                    <h2>📝 Start typing markdown</h2>
                    <p>Your preview will appear here as you type</p>
                </div>`;
            return;
        }

        try {
            const rawHtml = marked.parse(text);
            const cleanHtml = DOMPurify.sanitize(rawHtml, this.sanitizeConfig);
            this.preview.innerHTML = cleanHtml;
        } catch (error) {
            console.error('Markdown parsing error:', error);
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'color: #ff6b6b; padding: 1rem; background: rgba(255, 107, 107, 0.1); border-radius: 4px;';
            errorDiv.innerHTML = `<strong>Markdown Error: </strong>${error.message}`;
            this.preview.innerHTML = '';
            this.preview.appendChild(errorDiv);
        }
    }

    // === Keyboard Shortcuts ===

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.onSave();
            return;
        }

        // Quick tab switching
        if ((e.ctrlKey || e.metaKey) && ['1','2','3','4','5'].includes(e.key)) {
            e.preventDefault();
            const modes = { '1':'editor', '2':'preview', '3':'split', '4':'annotation', '5':'reader' };
            this.onSetMode(modes[e.key]);
            return;
        }

        // Tab for indentation
        if (e.key === 'Tab' && this.editor) {
            e.preventDefault();
            const start = this.editor.selectionStart;
            const end = this.editor.selectionEnd;
            this.editor.value = this.editor.value.substring(0, start) +
                               this.CONSTANTS.INDENTATION_SPACES +
                               this.editor.value.substring(end);
            this.editor.selectionStart = this.editor.selectionEnd = start + this.CONSTANTS.TAB_WIDTH;
            this.updatePreview();
        }
    }

    setupEnhancedKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (document.activeElement !== this.editor) return;

            // Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.onUndo();
            }
            // Redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.onRedo();
            }
        });
    }

    // === Tabs & Modes ===

    setupTabs() {
        // Cache tabs querySelectorAll to avoid repeated DOM queries
        this.cachedTabs = document.querySelectorAll('.tab');
        const editorContainer = this.getCachedElement('editor-container');

        if (!this.cachedTabs || !editorContainer) return;

        this.cachedTabs.forEach(t => {
            t.addEventListener('click', () => this.onSetMode(t.getAttribute('data-tab')));
        });

        this.setMode('editor');
    }

    setMode(mode) {
        // Update brain state (v13f)
        this.setBrainState('mode', mode);
        this._emitEvent('mode:change', { mode, previousMode: this._brainState.mode });

        // Use cached tabs instead of repeated querySelectorAll
        const tabs = this.cachedTabs || document.querySelectorAll('.tab');
        tabs.forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
            if (t.getAttribute('data-tab') === mode) {
                t.classList.add('active');
                t.setAttribute('aria-selected', 'true');
            }
        });

        const container = this.getCachedElement('editor-container');

        // Cache panes for better performance
        if (!this.cachedPanes) {
            this.cachedPanes = {
                editor: container?.querySelector('.editor-pane'),
                preview: container?.querySelector('.preview-pane')
            };
        }

        const editorPane = this.cachedPanes.editor;
        const previewPane = this.cachedPanes.preview;

        const show = (el) => { if (el) el.style.display = 'flex'; };
        const hide = (el) => { if (el) el.style.display = 'none'; };

        // Track display state to avoid getComputedStyle
        const isHidden = (el) => !el || el.style.display === 'none';

        const animateSwap = (outEl, inEl) => {
            if (outEl && this.isBrowser() && !isHidden(outEl)) {
                this.anim?.fadeOut(outEl, 160, 0, () => hide(outEl), { translateY: -6 });
            }
            if (inEl) {
                show(inEl);
                this.anim?.fadeIn(inEl, 180, 40, null, { translateY: 8 });
            }
        };

        if (mode === 'editor') animateSwap(previewPane, editorPane);
        else if (mode === 'preview') { this.updatePreview(); animateSwap(editorPane, previewPane); }
        else if (mode === 'split') { show(editorPane); show(previewPane); }
        else if (mode === 'annotation') { show(editorPane); hide(previewPane); }
        else if (mode === 'reader') { this.updatePreview(); hide(editorPane); show(previewPane); }

        this.updateStatus(mode);
    }

    updateStatus(mode) {
        const statusIndicator = this.getCachedElement('status-indicator');
        if (!statusIndicator) return;

        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('span');
        const statuses = {
            'editor': { text: 'Editing', color: '#00ff00' },
            'preview': { text: 'Previewing', color: '#00d4ff' },
            'split': { text: 'Split View', color: '#ffd700' },
            'annotation': { text: 'Annotating', color: '#ff6b6b' },
            'reader': { text: 'Reading', color: '#4ecdc4' }
        };

        const s = statuses[mode] || { text: 'Ready', color: '#00ff00' };
        if (statusText) statusText.textContent = s.text;
        if (statusDot?.style) statusDot.style.background = s.color;
    }

    // === Help Bar ===

    setupHelpBar() {
        const helpToggle = this.getCachedElement('help-toggle');
        const helpBar = this.getCachedElement(null, '.help-bar');

        if (helpToggle && helpBar) {
            const helpIcon = helpToggle.querySelector('.help-icon');
            const helpText = helpToggle.querySelector('.help-text');

            helpToggle.addEventListener('click', () => {
                helpBar.classList.toggle('show');
                const isVisible = helpBar.classList.contains('show');
                this._updateHelpBarState(isVisible, helpIcon, helpText, helpToggle);
            });

            // Use tracked listener to prevent memory leak
            const clickOutsideHandler = (e) => {
                if (!helpBar.contains(e.target) && !helpToggle.contains(e.target)) {
                    helpBar.classList.remove('show');
                    this._updateHelpBarState(false, helpIcon, helpText, helpToggle);
                }
            };
            this.addTrackedListener(document, 'click', clickOutsideHandler);

            helpBar.addEventListener('click', (e) => e.stopPropagation());
        }

        this.setupCopyButtons();
    }

    _updateHelpBarState(isVisible, helpIcon, helpText, helpToggle) {
        if (isVisible) {
            if (helpIcon) helpIcon.textContent = '✕';
            if (helpText) helpText.textContent = 'Close';
            if (helpToggle) helpToggle.setAttribute('aria-label', 'Close Markdown Help');
        } else {
            if (helpIcon) helpIcon.textContent = '📚';
            if (helpText) helpText.textContent = 'Help';
            if (helpToggle) helpToggle.setAttribute('aria-label', 'Open Markdown Help');
        }
    }

    setupCopyButtons() {
        if (this._copyButtonsInitialized) return;
        this._copyButtonsInitialized = true;

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-btn') && e.target.hasAttribute('data-copy-text')) {
                this.onCopyToEditor(e.target.getAttribute('data-copy-text'));
            }
        });
    }

    // === Stats Counter ===

    setupStatsCounter() {
        const statsDisplay = document.createElement('div');
        statsDisplay.id = 'stats-counter';
        statsDisplay.className = 'stats-counter';
        statsDisplay.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            background: rgba(42, 42, 42, 0.95); backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 8px;
            padding: 12px 16px; font-size: 12px; color: #FFD700;
            z-index: 1000; display: flex; gap: 16px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        `;

        document.body.appendChild(statsDisplay);
        this.statsDisplay = statsDisplay;

        if (this.editor) {
            // Add debounced stats updates to prevent excessive recalculation
            this.editor.addEventListener('input', () => {
                if (this.statsDebounceTimer) {
                    clearTimeout(this.statsDebounceTimer);
                }
                this.statsDebounceTimer = setTimeout(() => {
                    this.updateStats();
                }, this.CONSTANTS.DEBOUNCE_DELAY);
            });
        }
        this.updateStats();
    }

    updateStats() {
        if (!this.editor || !this.statsDisplay) return;

        const text = this.editor.value;
        const trimmedText = text.trim();
        
        // Optimize: single pass for word counting and character counting
        const words = trimmedText ? trimmedText.split(/\s+/).length : 0;
        const characters = text.length;
        const charactersNoSpaces = text.replace(/\s/g, '').length;
        const lines = text.split('\n').length;
        const readingTime = Math.ceil(words / 200);

        this.stats = { words, characters, lines, readingTime };
        
        // Update via textContent if elements exist, otherwise full innerHTML
        if (this.statElements && this.statElements.words) {
            this.statElements.words.textContent = `📝 ${words} words`;
            this.statElements.characters.textContent = `🔤 ${characters} (${charactersNoSpaces}) chars`;
            this.statElements.lines.textContent = `📄 ${lines} lines`;
            this.statElements.time.textContent = `⏱️ ${readingTime} min read`;
        } else {
            // Initial render with class names for future caching
            this.statsDisplay.innerHTML = `
                <span id="word-count" class="stat-words" title="Word count">📝 ${words} words</span>
                <span id="char-count" class="stat-chars" title="Character count">🔤 ${characters} (${charactersNoSpaces}) chars</span>
                <span id="line-count" class="stat-lines" title="Line count">📄 ${lines} lines</span>
                <span id="reading-time" class="stat-time" title="Reading time">⏱️ ${readingTime} min read</span>
            `;
            // Cache elements after initial render
            this.statElements = {
                words: this.statsDisplay.querySelector('.stat-words'),
                characters: this.statsDisplay.querySelector('.stat-chars'),
                lines: this.statsDisplay.querySelector('.stat-lines'),
                time: this.statsDisplay.querySelector('.stat-time')
            };
        }
    }

    // === Save Indicator ===

    createSaveIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'save-indicator';
        indicator.classList.add('save-indicator');
        document.body.appendChild(indicator);
        this.saveIndicator = indicator;
    }

    updateSaveIndicator(lastSaveTime, getTimeAgo) {
        if (!this.saveIndicator) return;
        this.saveIndicator.textContent = lastSaveTime
            ? `💾 Saved ${getTimeAgo(lastSaveTime)}`
            : '💾 Auto-save enabled';
    }

    // === Undo/Redo Buttons ===

    addUndoRedoButtons() {
        const toolbar = document.querySelector('.toolbar');
        if (!toolbar) return;

        const undoBtn = document.createElement('button');
        undoBtn.className = 'toolbar-btn';
        undoBtn.id = 'undo-btn';
        undoBtn.innerHTML = '↩️ Undo';
        undoBtn.title = 'Undo (Ctrl+Z)';
        undoBtn.addEventListener('click', () => this.onUndo());

        const redoBtn = document.createElement('button');
        redoBtn.className = 'toolbar-btn';
        redoBtn.id = 'redo-btn';
        redoBtn.innerHTML = '↪️ Redo';
        redoBtn.title = 'Redo (Ctrl+Y)';
        redoBtn.addEventListener('click', () => this.onRedo());

        toolbar.insertBefore(redoBtn, toolbar.firstChild);
        toolbar.insertBefore(undoBtn, toolbar.firstChild);

        this.undoBtn = undoBtn;
        this.redoBtn = redoBtn;
    }

    updateUndoRedoButtons(canUndo, canRedo) {
        if (this.undoBtn) {
            this.undoBtn.disabled = !canUndo;
            this.undoBtn.style.opacity = canUndo ? '1' : '0.5';
        }
        if (this.redoBtn) {
            this.redoBtn.disabled = !canRedo;
            this.redoBtn.style.opacity = canRedo ? '1' : '0.5';
        }
    }

    // === Copy Dropdown ===

    setupToolbarCopyDropdown() {
        const toolbar = document.querySelector('.toolbar');
        if (!toolbar) return;

        const existingCopyBtn = Array.from(toolbar.querySelectorAll('.toolbar-btn'))
            .find(btn => btn.textContent.includes('Copy'));

        if (existingCopyBtn) {
            existingCopyBtn.replaceWith(this._createCopyDropdown());
        }
    }

    _createCopyDropdown() {
        const container = document.createElement('div');
        container.style.cssText = 'position: relative; display: inline-block;';

        const mainBtn = document.createElement('button');
        mainBtn.className = 'toolbar-btn';
        mainBtn.innerHTML = '📋 Copy ▼';
        mainBtn.title = 'Copy markdown or HTML';

        const dropdown = document.createElement('div');
        dropdown.style.cssText = `
            position: absolute; top: 100%; left: 0; background: #222;
            border: 1px solid #444; border-radius: 4px; margin-top: 4px;
            display: none; min-width: 150px; z-index: 1000;
        `;

        const createItem = (text, onClick) => {
            const item = document.createElement('button');
            item.style.cssText = `
                width: 100%; padding: 8px 12px; background: none; border: none;
                color: #fff; text-align: left; cursor: pointer; font-size: 12px;
            `;
            item.textContent = text;
            item.addEventListener('click', () => { onClick(); dropdown.style.display = 'none'; });
            item.addEventListener('mouseenter', () => item.style.background = '#333');
            item.addEventListener('mouseleave', () => item.style.background = 'none');
            return item;
        };

        dropdown.appendChild(createItem('📝 Copy Markdown', () => this.onCopyMarkdown()));
        dropdown.appendChild(createItem('🌐 Copy HTML', () => this.onCopyHTML()));

        mainBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });

        // Use tracked listener to prevent memory leak
        const closeDropdownHandler = () => dropdown.style.display = 'none';
        this.addTrackedListener(document, 'click', closeDropdownHandler);

        container.appendChild(mainBtn);
        container.appendChild(dropdown);
        return container;
    }

    // === Save Button (toolbar) ===

    setupSaveButton() {
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.onSave());
            saveBtn.title = 'Save markdown (Ctrl+S)';
        }
    }

    // === Export Button ===

    setupExportButton() {
        let exportBtn = document.getElementById('export-btn');
        if (!exportBtn) {
            const toolbar = document.querySelector('.toolbar');
            if (!toolbar) return;
            exportBtn = document.createElement('button');
            exportBtn.id = 'export-btn';
            exportBtn.className = 'toolbar-btn';
            exportBtn.innerHTML = '📤 Export';
            exportBtn.title = 'Export as HTML file';
            toolbar.appendChild(exportBtn);
        }
        exportBtn.addEventListener('click', () => this.onExport());
    }

    // === Theme Toggle ===

    setupThemeToggle() {
        const headerControls = document.querySelector('.header-controls');
        if (!headerControls) return;

        const themeBtn = document.createElement('button');
        themeBtn.className = 'toolbar-btn btn-interactive';
        themeBtn.id = 'theme-toggle';
        themeBtn.innerHTML = this.currentTheme === 'dark' ? '🌙 Dark' : '☀️ Light';
        themeBtn.title = 'Toggle theme';
        themeBtn.addEventListener('click', () => this.toggleTheme());

        headerControls.insertBefore(themeBtn, headerControls.firstChild);
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('md-reader-theme', this.currentTheme);

        // Update brain state (v13f)
        this.setBrainState('theme', this.currentTheme);
        this._emitEvent('theme:change', { theme: this.currentTheme });

        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.innerHTML = this.currentTheme === 'dark' ? '🌙 Dark' : '☀️ Light';
        }

        document.body.classList.toggle('light-theme');
        this.showNotification(
            `${this.currentTheme === 'dark' ? '🌙' : '☀️'} ${this.currentTheme} theme activated`,
            'success',
            1500
        );
    }

    // === v13e: Custom Theme System ===

    /**
     * Theme presets
     */
    static THEME_PRESETS = {
        default: {
            name: 'Default Gold',
            accent: '#FFD700',
            bgPrimary: '#0a0a0a',
            bgSecondary: '#111111',
            bgTertiary: '#1a1a1a',
            textPrimary: '#ffffff',
            textSecondary: '#cccccc',
            textMuted: '#888888',
            border: '#333333'
        },
        ocean: {
            name: 'Ocean Blue',
            accent: '#00d4ff',
            bgPrimary: '#0a1929',
            bgSecondary: '#0d2137',
            bgTertiary: '#132f4c',
            textPrimary: '#ffffff',
            textSecondary: '#b2bac2',
            textMuted: '#6b7a8a',
            border: '#1e4976'
        },
        forest: {
            name: 'Forest Green',
            accent: '#4CAF50',
            bgPrimary: '#0a1a0a',
            bgSecondary: '#0f2a0f',
            bgTertiary: '#1a3a1a',
            textPrimary: '#e8f5e9',
            textSecondary: '#a5d6a7',
            textMuted: '#66bb6a',
            border: '#2e5a2e'
        },
        sunset: {
            name: 'Sunset Orange',
            accent: '#FF6B35',
            bgPrimary: '#1a0f0a',
            bgSecondary: '#2a1a14',
            bgTertiary: '#3a2820',
            textPrimary: '#fff3e0',
            textSecondary: '#ffcc80',
            textMuted: '#ff9800',
            border: '#5d4037'
        },
        midnight: {
            name: 'Midnight Purple',
            accent: '#9C27B0',
            bgPrimary: '#0d0a14',
            bgSecondary: '#150f20',
            bgTertiary: '#1f1830',
            textPrimary: '#f3e5f5',
            textSecondary: '#ce93d8',
            textMuted: '#ab47bc',
            border: '#4a148c'
        },
        rose: {
            name: 'Rose Pink',
            accent: '#E91E63',
            bgPrimary: '#140a0d',
            bgSecondary: '#200f14',
            bgTertiary: '#30181f',
            textPrimary: '#fce4ec',
            textSecondary: '#f48fb1',
            textMuted: '#ec407a',
            border: '#880e4f'
        }
    };

    /**
     * Apply a custom theme
     * @param {Object} themeColors - Theme color object
     */
    applyCustomTheme(themeColors) {
        const root = document.documentElement;

        root.style.setProperty('--accent-color', themeColors.accent);
        root.style.setProperty('--accent-glow', `${themeColors.accent}66`);
        root.style.setProperty('--bg-primary', themeColors.bgPrimary);
        root.style.setProperty('--bg-secondary', themeColors.bgSecondary);
        root.style.setProperty('--bg-tertiary', themeColors.bgTertiary);
        root.style.setProperty('--text-primary', themeColors.textPrimary);
        root.style.setProperty('--text-secondary', themeColors.textSecondary);
        root.style.setProperty('--text-muted', themeColors.textMuted);
        root.style.setProperty('--border-color', themeColors.border);

        // Also update body background
        document.body.style.background = `linear-gradient(135deg, ${themeColors.bgPrimary} 0%, ${themeColors.bgSecondary} 100%)`;
    }

    /**
     * Apply a theme preset by name
     * @param {string} presetName - Preset name from THEME_PRESETS
     */
    applyThemePreset(presetName) {
        const preset = EditorUI.THEME_PRESETS[presetName];
        if (preset) {
            this.applyCustomTheme(preset);
            return true;
        }
        return false;
    }

    /**
     * Reset to default theme
     */
    resetToDefaultTheme() {
        this.applyThemePreset('default');
    }

    /**
     * Get all available theme presets
     * @returns {Object}
     */
    getThemePresets() {
        return EditorUI.THEME_PRESETS;
    }

    // === Keyboard Shortcuts Modal ===

    setupKeyboardShortcutsModal() {
        document.addEventListener('keydown', (e) => {
            if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (document.activeElement === this.editor) return;
                e.preventDefault();
                this.showKeyboardShortcutsModal();
            }
        });
    }

    showKeyboardShortcutsModal() {
        const existing = document.getElementById('shortcuts-modal');
        if (existing) { existing.remove(); return; }

        const modal = document.createElement('div');
        modal.id = 'shortcuts-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.8); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(4px);
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: #1a1a1a; border: 2px solid #FFD700; border-radius: 12px;
            padding: 2rem; max-width: 600px; max-height: 80vh; overflow-y: auto;
            box-shadow: 0 20px 60px rgba(255, 215, 0, 0.3);
        `;

        content.innerHTML = `
            <h2 style="color: #FFD700; margin-top: 0;">⌨️ Keyboard Shortcuts</h2>
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px; color: #fff;">
                <div><kbd style="background: #333; padding: 4px 8px; border-radius: 4px;">Ctrl/Cmd + S</kbd></div><div>Save markdown</div>
                <div><kbd style="background: #333; padding: 4px 8px; border-radius: 4px;">Ctrl/Cmd + Z</kbd></div><div>Undo</div>
                <div><kbd style="background: #333; padding: 4px 8px; border-radius: 4px;">Ctrl/Cmd + Y</kbd></div><div>Redo</div>
                <div><kbd style="background: #333; padding: 4px 8px; border-radius: 4px;">Tab</kbd></div><div>Indent (in editor)</div>
                <div><kbd style="background: #333; padding: 4px 8px; border-radius: 4px;">?</kbd></div><div>Show this help</div>
                <div><kbd style="background: #333; padding: 4px 8px; border-radius: 4px;">Esc</kbd></div><div>Close modals</div>
            </div>
            <button id="close-shortcuts" style="
                margin-top: 1.5rem; padding: 8px 24px; background: #FFD700;
                color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
            ">Close</button>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        const closeModal = () => {
            document.removeEventListener('keydown', closeOnEsc);
            modal.remove();
        };

        const closeOnEsc = (e) => { if (e.key === 'Escape') closeModal(); };

        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        document.getElementById('close-shortcuts').addEventListener('click', closeModal);
        document.addEventListener('keydown', closeOnEsc);
    }

    // === Notifications ===

    showNotification(message, type = 'success', duration = null) {
        const feedbackDuration = duration || this.CONSTANTS.FEEDBACK_DURATION;
        const isError = type === 'error';

        const notification = document.createElement('div');
        notification.setAttribute('data-testid', 'notification');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed; top: 20px;
            right: ${isError ? '420px' : (this.CONSTANTS.HELP_BAR_WIDTH + 20) + 'px'};
            background: ${isError ? '#ff6b6b' : '#4caf50'}; color: white;
            padding: ${isError ? '12px 20px' : '8px 16px'};
            border-radius: ${isError ? '6px' : '4px'};
            font-size: 14px; font-weight: 500; z-index: 1001;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            ${!isError ? `transition: all ${this.CONSTANTS.HELP_BAR_TRANSITION_DURATION}ms ease;` : ''}
        `;

        document.body.appendChild(notification);

        this.anim?.fadeOut(
            notification,
            this.CONSTANTS.FEEDBACK_FADE_DURATION,
            feedbackDuration,
            () => this.removeDOMElement(notification),
            { translateY: -10 }
        );
    }

    // === Copy to Editor ===

    copyToEditor(example) {
        if (!this.editor) return;

        const cursorPos = this.editor.selectionStart;
        const currentValue = this.editor.value;
        const beforeCursor = currentValue.substring(0, cursorPos);
        const afterCursor = currentValue.substring(cursorPos);

        const spacing = (beforeCursor && !beforeCursor.endsWith('\n') && !beforeCursor.endsWith(' ')) ? '\n\n' : '';
        const newValue = beforeCursor + spacing + example + (afterCursor ? '\n\n' + afterCursor : '');

        this.editor.value = newValue;

        const newCursorPos = cursorPos + spacing.length + example.length + (afterCursor ? 2 : 0);
        this.editor.setSelectionRange(newCursorPos, newCursorPos);

        this.onUpdatePreview();
        this.editor.focus();
    }

    showClipboardError(text) {
        this.showNotification('⚠️ Clipboard access denied. Text is selected - press Ctrl+C to copy.', 'error', 5000);

        if (this.editor) {
            const start = this.editor.value.indexOf(text);
            if (start !== -1) {
                this.editor.setSelectionRange(start, start + text.length);
                this.editor.focus();
            }
        }
    }
}

export default EditorUI;
