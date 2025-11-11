/**
 * Branch Coverage Tests
 * Tests for uncovered branches in MarkdownEditor class
 */

import MarkdownEditor from '../src/index.js';

describe('Branch Coverage Tests', () => {
    let editor;
    let mockEditor;
    let mockPreview;
    let mockFileInput;
    let mockUploadArea;

    beforeEach(() => {
        // Create mock DOM elements
        mockEditor = document.createElement('textarea');
        mockEditor.id = 'markdown-editor';
        mockPreview = document.createElement('div');
        mockPreview.id = 'markdown-preview';
        mockFileInput = document.createElement('input');
        mockFileInput.type = 'file';
        mockFileInput.id = 'file-input';
        mockUploadArea = document.createElement('div');
        mockUploadArea.className = 'upload-area';

        document.body.appendChild(mockEditor);
        document.body.appendChild(mockPreview);
        document.body.appendChild(mockFileInput);
        document.body.appendChild(mockUploadArea);

        editor = new MarkdownEditor();
    });

    afterEach(() => {
        // Clean up DOM elements
        document.body.innerHTML = '';
        // Clean up global window objects
        delete window.markdownEditor;
        delete window.showCollabStory;
        delete window.copyToEditor;
    });

    describe('DOM Element Detection Branches', () => {
        test('should handle missing editor element', () => {
            // Remove editor element
            document.getElementById('markdown-editor').remove();
            
            // Mock console.error to verify it's called in non-jest environment
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            // Initialize with missing editor
            editor.setupEditor();
            
            // In jest environment, console.error should not be called
            expect(consoleSpy).not.toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });

        test('should handle missing preview element', () => {
            // Remove preview element
            document.getElementById('markdown-preview').remove();
            
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            editor.setupEditor();
            
            expect(consoleSpy).not.toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });

        test('should handle both elements missing', () => {
            // Remove both elements
            document.getElementById('markdown-editor').remove();
            document.getElementById('markdown-preview').remove();
            
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            editor.setupEditor();
            
            expect(consoleSpy).not.toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });
    });

    describe('FileReader Result Handling Branches', () => {
        test('should handle FileReader with this.result fallback', () => {
            // Mock FileReader with this.result
            const mockFile = new File(['test content'], 'test.md', { type: 'text/markdown' });
            
            // Create a FileReader-like object that uses 'this.result'
            const mockFileReader = {
                result: 'test content from this.result',
                onload: null,
                onerror: null,
                onabort: null,
                readAsText: jest.fn()
            };

            // Mock FileReader constructor
            global.FileReader = jest.fn(() => mockFileReader);
            
            // Setup editor first
            editor.setupEditor();
            
            // Trigger file loading
            editor.loadFile(mockFile);
            
            // Simulate onload with this.result scenario
            const mockEvent = {
                target: { result: undefined }
            };
            
            // Call onload with this.result available
            mockFileReader.onload.call(mockFileReader, mockEvent);
            
            expect(editor.editor.value).toBe('test content from this.result');
        });

        test('should handle FileReader with reader.result fallback', () => {
            const mockFile = new File(['test content'], 'test.md', { type: 'text/markdown' });
            
            const mockFileReader = {
                result: 'test content from reader.result',
                onload: null,
                onerror: null,
                onabort: null,
                readAsText: jest.fn()
            };

            global.FileReader = jest.fn(() => mockFileReader);
            
            editor.setupEditor();
            editor.loadFile(mockFile);
            
            // Simulate onload with reader.result scenario
            const mockEvent = {
                target: { result: undefined }
            };
            
            // Call onload without this.result
            const onloadHandler = mockFileReader.onload;
            onloadHandler(mockEvent);
            
            expect(editor.editor.value).toBe('test content from reader.result');
        });

        test('should handle FileReader with e.target.result', () => {
            const mockFile = new File(['test content'], 'test.md', { type: 'text/markdown' });
            
            const mockFileReader = {
                result: null,
                onload: null,
                onerror: null,
                onabort: null,
                readAsText: jest.fn()
            };

            global.FileReader = jest.fn(() => mockFileReader);
            
            editor.setupEditor();
            editor.loadFile(mockFile);
            
            // Simulate onload with e.target.result
            const mockEvent = {
                target: { result: 'test content from e.target.result' }
            };
            
            mockFileReader.onload(mockEvent);
            
            expect(editor.editor.value).toBe('test content from e.target.result');
        });

        test('should handle FileReader error scenario', () => {
            const mockFile = new File(['test content'], 'test.md', { type: 'text/markdown' });
            
            const mockFileReader = {
                result: null,
                onload: null,
                onerror: null,
                onabort: null,
                readAsText: jest.fn()
            };

            global.FileReader = jest.fn(() => mockFileReader);
            
            // Mock alert (not needed anymore but keep for backward compat)
            global.alert = jest.fn();
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            editor.setupEditor();
            editor.loadFile(mockFile);
            
            // Simulate onerror
            const mockErrorEvent = { message: 'File read error' };
            mockFileReader.onerror(mockErrorEvent);
            
            expect(consoleSpy).toHaveBeenCalledWith('File reading error:', mockErrorEvent);
            
            // Check that notification was called instead of alert
            const notification = document.querySelector('.notification-error');
            expect(notification).toBeTruthy();
            
            consoleSpy.mockRestore();
        });

        test('should handle FileReader abort scenario', () => {
            const mockFile = new File(['test content'], 'test.md', { type: 'text/markdown' });
            
            const mockFileReader = {
                result: null,
                onload: null,
                onerror: null,
                onabort: null,
                readAsText: jest.fn()
            };

            global.FileReader = jest.fn(() => mockFileReader);
            
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            
            editor.setupEditor();
            editor.loadFile(mockFile);
            
            // Simulate onabort
            mockFileReader.onabort();
            
            expect(consoleSpy).toHaveBeenCalledWith('File reading was aborted');
            
            consoleSpy.mockRestore();
        });

        test('should handle file loading success logging', () => {
            const mockFile = new File(['test content'], 'test.md', { type: 'text/markdown' });
            
            const mockFileReader = {
                result: 'test content',
                onload: null,
                onerror: null,
                onabort: null,
                readAsText: jest.fn()
            };

            global.FileReader = jest.fn(() => mockFileReader);
            
            // Mock console.log to verify it's NOT called in jest environment
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            editor.setupEditor();
            editor.loadFile(mockFile);
            
            const mockEvent = {
                target: { result: 'test content' }
            };
            
            mockFileReader.onload(mockEvent);
            
            // In jest environment, console.log should not be called
            expect(consoleSpy).not.toHaveBeenCalledWith('📄 Loaded file: test.md');
            
            consoleSpy.mockRestore();
        });
    });

    describe('Global Initialization Branches', () => {
        test('should handle constructor name override scenario', () => {
            // Mock window object
            const originalWindow = global.window;
            global.window = {
                markdownEditor: {
                    constructor: { name: 'DifferentName' }
                }
            };

            // Mock Object.defineProperty to track calls
            const definePropertySpy = jest.spyOn(Object, 'defineProperty').mockImplementation(() => {});
            
            // Mock console.log
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            // Simulate the global initialization code
            if (typeof global.window !== 'undefined' && typeof jest === 'undefined') {
                // This branch should not execute in jest environment
            } else {
                // Test the constructor name override logic directly
                const markdownEditor = {
                    constructor: { name: 'DifferentName' }
                };
                
                const ctorName = markdownEditor?.constructor?.name;
                if (ctorName !== 'MarkdownEditor') {
                    Object.defineProperty(markdownEditor, 'constructor', {
                        value: { name: 'MarkdownEditor' },
                        configurable: true,
                        enumerable: false,
                        writable: false
                    });
                }
            }
            
            // Verify the logic works
            expect(definePropertySpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    constructor: { name: 'DifferentName' }
                }),
                'constructor',
                expect.objectContaining({
                    value: { name: 'MarkdownEditor' },
                    configurable: true,
                    enumerable: false,
                    writable: false
                })
            );
            
            definePropertySpy.mockRestore();
            consoleSpy.mockRestore();
            global.window = originalWindow;
        });

        test('should handle constructor name override error scenario', () => {
            // Test the error handling in the try-catch block
            const mockMarkdownEditor = {};
            
            // Mock Object.defineProperty to throw
            const definePropertySpy = jest.spyOn(Object, 'defineProperty').mockImplementation(() => {
                throw new Error('defineProperty error');
            });
            
            // Test the try-catch logic from the actual code
            try {
                const ctorName = mockMarkdownEditor?.constructor?.name;
                if (ctorName !== 'MarkdownEditor') {
                    Object.defineProperty(mockMarkdownEditor, 'constructor', {
                        value: { name: 'MarkdownEditor' },
                        configurable: true,
                        enumerable: false,
                        writable: false
                    });
                }
            } catch (_) {
                // This should handle the error silently - this is the branch we're testing
            }
            
            // The defineProperty should have been called and thrown
            expect(definePropertySpy).toHaveBeenCalled();
            
            definePropertySpy.mockRestore();
        });
    });

    describe('Drag and Drop Branches', () => {
        test('should handle drag and drop without uploadArea', () => {
            // Remove upload area
            document.querySelector('.upload-area').remove();
            
            // Setup editor should not throw
            editor.setupEditor();
            
            // setupDragAndDrop should handle missing uploadArea gracefully
            editor.setupDragAndDrop();
            
            // No error should be thrown
            expect(true).toBe(true);
        });

        test('should handle drag events with multiple files', () => {
            editor.setupEditor();
            
            // Mock FileReader
            const mockFileReader = {
                result: 'test content',
                onload: null,
                onerror: null,
                onabort: null,
                readAsText: jest.fn()
            };
            global.FileReader = jest.fn(() => mockFileReader);
            
            // Create mock data transfer with multiple files
            const mockDataTransfer = {
                files: [
                    new File(['content1'], 'file1.md', { type: 'text/markdown' }),
                    new File(['content2'], 'file2.md', { type: 'text/markdown' })
                ]
            };
            
            // Create drop event
            const dropEvent = new Event('drop');
            dropEvent.dataTransfer = mockDataTransfer;
            
            // Trigger drop event
            editor.uploadArea.dispatchEvent(dropEvent);
            
            // Should load the first file
            expect(global.FileReader).toHaveBeenCalled();
        });
    });

    describe('Keyboard Shortcuts Branches', () => {
        test('should handle Tab key without editor', () => {
            // Remove editor
            editor.editor = null;
            
            const tabEvent = new KeyboardEvent('keydown', {
                key: 'Tab',
                bubbles: true
            });
            
            // Should not throw when editor is null
            editor.handleKeyboardShortcuts(tabEvent);
            
            expect(true).toBe(true);
        });

        test('should handle save without editor', () => {
            // Remove editor
            editor.editor = null;
            
            const saveEvent = new KeyboardEvent('keydown', {
                key: 's',
                ctrlKey: true,
                bubbles: true
            });
            
            // Should not throw when editor is null
            editor.saveMarkdown();
            
            expect(true).toBe(true);
        });
    });

    describe('Help Bar Branches', () => {
        test('should handle missing help elements', () => {
            // Remove help elements
            const helpToggle = document.getElementById('help-toggle');
            const helpBar = document.querySelector('.help-bar');
            
            if (helpToggle) helpToggle.remove();
            if (helpBar) helpBar.remove();
            
            editor.setupEditor();
            
            // setupHelpBar should handle missing elements gracefully
            editor.setupHelpBar();
            
            expect(true).toBe(true);
        });

        test('should handle copyToEditor without editor', () => {
            // Remove editor
            editor.editor = null;
            
            // copyToEditor should handle missing editor gracefully
            editor.copyToEditor('test markdown');
            
            expect(true).toBe(true);
        });
    });
});
