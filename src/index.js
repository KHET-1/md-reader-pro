// MD Reader Pro - Professional Markdown Editor
// Real-time markdown processing with live preview

import { marked } from 'marked';

class MarkdownEditor {
    constructor() {
        this.version = '3.0.0';
        this.editor = null;
        this.preview = null;
        this.fileInput = null;
        this.uploadArea = null;
        
        this.init();
    }
    
    init() {
        console.log(`✅ MD Reader Pro v${this.version} initialized`);
        console.log('📝 Professional markdown editor ready');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEditor());
        } else {
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
            console.error('Required DOM elements not found');
            return;
        }
        
        // Configure marked options
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            sanitize: false
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
            this.preview.innerHTML = `
                <div style="color: #ff6b6b; padding: 1rem; background: rgba(255, 107, 107, 0.1); border-radius: 4px;">
                    <strong>Markdown Error:</strong> ${error.message}
                </div>
            `;
        }
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.loadFile(file);
    }
    
    loadFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const content = e.target.result;
            this.editor.value = content;
            this.updatePreview();
            console.log(`📄 Loaded file: ${file.name}`);
        };
        
        reader.onerror = (e) => {
            console.error('File reading error:', e);
            alert('Error reading file. Please try again.');
        };
        
        reader.readAsText(file);
    }
    
    setupDragAndDrop() {
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
        
        // Tab key for indentation
        if (e.key === 'Tab') {
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
        const content = this.editor.value;
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

// Initialize the markdown editor
const markdownEditor = new MarkdownEditor();

// Export for testing and potential use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkdownEditor;
}

// Global access for console interaction
if (typeof window !== 'undefined') {
    window.markdownEditor = markdownEditor;
    window.showCollabStory = () => markdownEditor.showCollaborationStory();
}

console.log('💡 Console commands available:');
console.log('   • markdownEditor - Editor instance');
console.log('   • showCollabStory() - Development journey!');
