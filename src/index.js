// MD Reader Pro - AI-powered markdown reader with local processing
console.log('🚀 MD Reader Pro - Loading Advanced Markdown Reader...');

// Initialize the application when DOM is loaded
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        initializeMDReaderPro();
    });
} else {
    // Node.js environment - for testing
    console.log('✅ MD Reader Pro - Module loaded successfully!');
}

function initializeMDReaderPro() {
    console.log('🎊 MD Reader Pro - Initializing Application...');
    
    // Add markdown tutorial button to the interface
    addMarkdownTutorialButton();
    
    // Add live markdown editor
    addMarkdownEditor();
    
    // Initialize AI features (placeholder for future TensorFlow.js integration)
    initializeAIFeatures();
    
    console.log('✅ MD Reader Pro - Application ready!');
    console.log('📖 Repository: https://github.com/KHET-1/md-reader-pro');
}

function addMarkdownTutorialButton() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    // Add tutorial button after the features section
    const tutorialSection = document.createElement('div');
    tutorialSection.className = 'tutorial-section';
    tutorialSection.innerHTML = `
        <div class="tutorial-banner">
            <h3>📖 Learn Markdown Interactively</h3>
            <p>Master markdown syntax with our comprehensive tutorial</p>
            <button id="openTutorial" class="tutorial-btn">
                🚀 Open Markdown Tutorial
            </button>
            <button id="toggleEditor" class="tutorial-btn">
                ✏️ Try Live Editor
            </button>
        </div>
    `;
    
    // Insert after features but before status
    const statusDiv = container.querySelector('.status');
    if (statusDiv) {
        container.insertBefore(tutorialSection, statusDiv);
    } else {
        container.appendChild(tutorialSection);
    }
    
    // Add event listeners
    document.getElementById('openTutorial')?.addEventListener('click', () => {
        window.open('markdown-tutorial.md', '_blank');
    });
    
    document.getElementById('toggleEditor')?.addEventListener('click', () => {
        toggleMarkdownEditor();
    });
}

function addMarkdownEditor() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    // Create markdown editor section
    const editorSection = document.createElement('div');
    editorSection.id = 'markdownEditor';
    editorSection.className = 'markdown-editor hidden';
    editorSection.innerHTML = `
        <div class="editor-header">
            <h3>✏️ Live Markdown Editor</h3>
            <button id="closeEditor" class="close-btn">✕</button>
        </div>
        <div class="editor-container">
            <div class="editor-pane">
                <h4>📝 Write Markdown</h4>
                <textarea id="markdownInput" placeholder="# Try typing some markdown here!

## Features
- **Bold text**
- *Italic text*  
- [Links](https://example.com)
- \`inline code\`

\`\`\`javascript
console.log('Hello, World!');
\`\`\`

> This is a blockquote

### Happy writing! 🚀"></textarea>
            </div>
            <div class="preview-pane">
                <h4>👁️ Live Preview</h4>
                <div id="markdownPreview" class="preview-content">
                    <p><em>Your markdown preview will appear here...</em></p>
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(editorSection);
    
    // Add event listeners
    document.getElementById('closeEditor')?.addEventListener('click', () => {
        toggleMarkdownEditor(false);
    });
    
    const input = document.getElementById('markdownInput');
    if (input) {
        input.addEventListener('input', updatePreview);
        // Initial preview update
        setTimeout(updatePreview, 100);
    }
}

function toggleMarkdownEditor(show = null) {
    const editor = document.getElementById('markdownEditor');
    if (!editor) return;
    
    if (show === null) {
        editor.classList.toggle('hidden');
    } else {
        editor.classList.toggle('hidden', !show);
    }
    
    // Update button text
    const button = document.getElementById('toggleEditor');
    if (button) {
        const isHidden = editor.classList.contains('hidden');
        button.textContent = isHidden ? '✏️ Try Live Editor' : '📖 Hide Editor';
    }
}

function updatePreview() {
    const input = document.getElementById('markdownInput');
    const preview = document.getElementById('markdownPreview');
    
    if (!input || !preview) return;
    
    const markdown = input.value;
    
    // Simple markdown to HTML conversion (basic implementation)
    // In a real app, you'd use the 'marked' library here
    const html = convertMarkdownToHTML(markdown);
    
    preview.innerHTML = html;
}

function convertMarkdownToHTML(markdown) {
    // Basic markdown conversion (simplified version)
    // In production, use the 'marked' library for full functionality
    
    let html = markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        
        // Bold and italic
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        
        // Code blocks
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        
        // Line breaks
        .replace(/\n/g, '<br>');
    
    // Handle lists (basic)
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Handle blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
    
    return html;
}

function initializeAIFeatures() {
    // Placeholder for future TensorFlow.js integration
    console.log('🤖 AI Features initialized (ready for TensorFlow.js integration)');
    
    // Add AI assistance hints
    setTimeout(() => {
        const input = document.getElementById('markdownInput');
        if (input) {
            input.addEventListener('keyup', () => {
                // Future: Add AI-powered suggestions here
                showAIHints();
            });
        }
    }, 1000);
}

function showAIHints() {
    // Placeholder for AI-powered writing assistance
    const hints = [
        '💡 Try adding headers with # for better structure',
        '🎯 Use **bold** text to emphasize important points',
        '📝 Consider adding a table to organize data',
        '🔗 Add links to make your content more interactive',
        '📊 Code blocks make technical content clearer'
    ];
    
    // Randomly show hints (simplified version)
    if (Math.random() < 0.1) { // 10% chance
        const hint = hints[Math.floor(Math.random() * hints.length)];
        console.log(`🤖 AI Suggestion: ${hint}`);
    }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeMDReaderPro,
        convertMarkdownToHTML,
        updatePreview
    };
}
