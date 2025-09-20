// Test Utilities - Shared helpers for all test files
export class TestUtils {
    static suppressConsoleLogs() {
        const originalConsole = { ...console };

        // Store original methods
        TestUtils._originalConsole = originalConsole;

        // Mock console methods to reduce noise
        console.log = jest.fn();
        console.info = jest.fn();
        console.warn = jest.fn();
        // Keep console.error for actual test failures

        return originalConsole;
    }

    static restoreConsoleLogs() {
        if (TestUtils._originalConsole) {
            Object.assign(console, TestUtils._originalConsole);
        }
    }

    static createMockEditor() {
        // Create a more efficient mock editor
        const mockEditor = {
            value: '',
            selectionStart: 0,
            selectionEnd: 0,
            focus: jest.fn(),
            addEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
            click: jest.fn()
        };

        const mockPreview = {
            innerHTML: '',
            querySelector: jest.fn(() => ({ textContent: 'Mock Content', getAttribute: jest.fn() })),
            querySelectorAll: jest.fn(() => [{ textContent: 'Mock Content' }])
        };

        return { mockEditor, mockPreview };
    }

    static setupCleanDOM() {
        // Efficient DOM setup
        document.body.innerHTML = `
            <div class="container">
              <div class="toolbar">
                <button id="save-btn">💾 Save Markdown</button>
                <input type="file" id="file-input" accept=".md,.txt" style="display: none;">
                <button id="load-btn">📁 Load File</button>
              </div>
              <div class="editor-container">
                <div class="editor-panel">
                  <div class="upload-area">
                    <p>📝 Drag & drop markdown files here or click to upload</p>
                  </div>
                  <textarea id="markdown-editor" placeholder="Start typing your markdown here..."></textarea>
                </div>
                <div class="preview-panel">
                  <div id="markdown-preview"></div>
                </div>
              </div>
            </div>
            <button id="help-toggle" class="help-toggle" aria-label="Open help">?</button>
            <div class="help-bar" id="help-bar"></div>
        `;

        return {
            editor: document.getElementById('markdown-editor'),
            preview: document.getElementById('markdown-preview'),
            fileInput: document.getElementById('file-input'),
            uploadArea: document.querySelector('.upload-area')
        };
    }

    static cleanupDOM() {
        // Fast DOM cleanup
        document.body.innerHTML = '';

        // Clear any global variables
        delete window.copyToEditor;
        delete window.markdownEditor;
        delete window.showCollabStory;
    }

    static createMockMarkdown() {
        return {
            simple: '# Test\nSimple markdown',
            complex: `# Complex Test\n**Bold** and *italic*\n\`\`\`js\nconsole.log('test');\n\`\`\``,
            table: '| Col | Val |\n|-----|-----|\n| A   | B   |',
            list: '- Item 1\n- Item 2\n  - Nested',
            all: `# Full Test\n**Bold** *italic*\n\`\`\`js\ncode\n\`\`\`\n- List\n> Quote\n| A | B |\n|---|---|\n| 1 | 2 |`
        };
    }

    static waitFor(ms = 0) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static mockFileReader(content) {
        const originalFileReader = window.FileReader;

        window.FileReader = class MockFileReader {
            readAsText() {
                // Use immediate execution instead of setTimeout for faster tests
                this.result = content;
                if (this.onload) {
                    this.onload({ target: { result: content } });
                }
            }
        };

        return () => {
            window.FileReader = originalFileReader;
        };
    }
}

// Global test setup helper
export function setupTestEnvironment() {
    beforeEach(() => {
        TestUtils.suppressConsoleLogs();
        TestUtils.setupCleanDOM();
    });

    afterEach(() => {
        TestUtils.cleanupDOM();
        TestUtils.restoreConsoleLogs();
    });
}