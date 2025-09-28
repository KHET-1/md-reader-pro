import { marked } from 'marked';

class MarkdownEditor {
    constructor() {
        this.version = '3.0.0';
        this.editor = null;
        this.preview = null;
        this.fileInput = null;
        this.uploadArea = null;
    }
    
    init() {
        // Only initialize if we are in a browser environment
        if (typeof window === 'undefined') return;

        console.log(`✅ MD Reader Pro v${this.version} initialized`);
        console.log('📝 Professional markdown editor ready');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEditor());
        }
        else {
            this.setupEditor();
        }
    }
    
    setupEditor() {
        // Get DOM elements
        this.editor = document.getElementById('markdown-editor');
        this.preview = document.getElementById('markdown-preview');
        this.fileInput = document.getElementById('file-input');
        this.uploadArea = document.querySelector('.upload-area');
        
        if (!this.editor || !this.preview) {
            // Do not log error in test environment
            if (typeof jest === 'undefined') {
                console.error('Required DOM elements not found');
            }
            return;
        }
        
        // Configure marked options
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            sanitize: false,
            mangle: false, // Disable deprecated mangle option
            async: false // Ensure synchronous parsing
        });
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initial render of placeholder content
        this.updatePreview();
        
        console.log('📝 Markdown editor initialized successfully');
    }
    
    setupEventListeners() {
        // Real-time markdown preview
        this.editor.addEventListener('input', () => this.updatePreview());

        // File upload handling
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Drag and drop functionality
        if (this.uploadArea) {
            this.setupDragAndDrop();
        }

        // Keyboard shortcuts
        this.editor.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Help bar functionality
        this.setupHelpBar();
    }
    
    updatePreview() {
        if (!this.editor || !this.preview) return;
        
        const markdownText = this.editor.value;
        
        if (!markdownText.trim()) {
            this.preview.innerHTML = `
                <div style="color: #666; text-align: center; padding: 2rem;">
                    <h2>📝 Start typing markdown</h2>
                    <p>Your preview will appear here as you type</p>
                </div>
            `;
            return;
        }
        
        try {
            // Parse markdown to HTML
            const html = marked.parse(markdownText);
            this.preview.innerHTML = html;
        } catch (error) {
            console.error('Markdown parsing error:', error);
            // Safely escape error message to prevent XSS
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'color: #ff6b6b; padding: 1rem; background: rgba(255, 107, 107, 0.1); border-radius: 4px;';

            const errorTitle = document.createElement('strong');
            errorTitle.textContent = 'Markdown Error: ';

            const errorMessage = document.createTextNode(error.message);

            errorDiv.appendChild(errorTitle);
            errorDiv.appendChild(errorMessage);

            this.preview.innerHTML = '';
            this.preview.appendChild(errorDiv);
        }
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.loadFile(file);
    }
    
    loadFile(file) {
        if (!file) {
            console.error('No file provided to loadFile method');
            return;
        }

        const reader = new FileReader();

        const cleanup = () => {
            // Clean up event handlers to prevent memory leaks
            reader.onload = null;
            reader.onerror = null;
            reader.onabort = null;
        };

        reader.onload = (e) => {
            const content = e.target.result;
            this.editor.value = content;
            this.updatePreview();
            // Only log in production environment, not during tests
            if (typeof jest === 'undefined') {
                console.log(`📄 Loaded file: ${file.name}`);
            }
            cleanup();
        };

        reader.onerror = (e) => {
            console.error('File reading error:', e);
            alert('Error reading file. Please try again.');
            cleanup();
        };

        reader.onabort = () => {
            console.warn('File reading was aborted');
            cleanup();
        };

        reader.readAsText(file);
    }
    
    setupDragAndDrop() {
        // Only setup if uploadArea exists
        if (!this.uploadArea) return;
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, () => {
                this.uploadArea.classList.add('drag-over');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, () => {
                this.uploadArea.classList.remove('drag-over');
            }, false);
        });
        
        // Handle dropped files
        this.uploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                this.loadFile(files[0]);
            }
        }, false);
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + S to save (prevent browser save dialog)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveMarkdown();
        }
        
        // Tab key for indentation - only if editor exists
        if (e.key === 'Tab' && this.editor) {
            e.preventDefault();
            const start = this.editor.selectionStart;
            const end = this.editor.selectionEnd;
            
            // Insert tab or spaces
            this.editor.value = this.editor.value.substring(0, start) + 
                               '    ' + 
                               this.editor.value.substring(end);
            
            // Move cursor
            this.editor.selectionStart = this.editor.selectionEnd = start + 4;
            this.updatePreview();
        }
    }
    
    saveMarkdown() {
        const content = this.editor ? this.editor.value : '';
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'document.md';
        document.body.appendChild(a);
a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('💾 Markdown saved');
    }

    setupHelpBar() {
        const helpToggle = document.getElementById('help-toggle');
        const helpBar = document.querySelector('.help-bar');

        if (helpToggle && helpBar) {
            helpToggle.addEventListener('click', () => {
                helpBar.classList.toggle('show');

                // Update button text/icon
                const isVisible = helpBar.classList.contains('show');
                helpToggle.textContent = isVisible ? '✕' : '?';
                helpToggle.setAttribute('aria-label', isVisible ? 'Close help' : 'Open help');
            });

            // Close help bar when clicking outside
            document.addEventListener('click', (e) => {
                if (!helpBar.contains(e.target) && !helpToggle.contains(e.target)) {
                    helpBar.classList.remove('show');
                    helpToggle.textContent = '?';
                    helpToggle.setAttribute('aria-label', 'Open help');
                }
            });

            // Prevent help bar clicks from closing it
            helpBar.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Make copyToEditor globally available for onclick handlers
        window.copyToEditor = (example) => this.copyToEditor(example);
    }

    copyToEditor(example) {
        if (!this.editor) return;

        // Clear current content and add the example
        this.editor.value = example;

        // Update the preview
        this.updatePreview();

        // Focus the editor
        this.editor.focus();

        // Show success feedback
        this.showCopyFeedback();

        console.log('📋 Example copied to editor');
    }

    showCopyFeedback() {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.textContent = '✅ Example copied!';
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 420px;
            background: #4caf50;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1001;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        `;

        document.body.appendChild(feedback);

        // Remove after animation
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 2000);
    }
    
    // Console helper for collaboration story
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

// Export the class as default
export default MarkdownEditor;

// Initialize the markdown editor only in browser environment
if (typeof window !== 'undefined' && typeof jest === 'undefined') {
    const markdownEditor = new MarkdownEditor();
    markdownEditor.init(); // Initialize the editor
    window.markdownEditor = markdownEditor;
    window.showCollabStory = () => markdownEditor.showCollaborationStory();

    console.log('💡 Console commands available:');
    console.log('   • markdownEditor - Editor instance');
    console.log('   • showCollabStory() - Development journey!');
}