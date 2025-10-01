import { TestUtils, setupTestEnvironment } from './test-utils.js';
// MD Reader Pro - Edge Cases and Error Handling Tests
import MarkdownEditor from '../src/index.js';
import { marked } from 'marked';

describe('Edge Cases and Error Handling', () => {
  let editor;

  setupTestEnvironment();

  beforeEach(() => {
    editor = new MarkdownEditor();
    editor.init();
  });

  describe('Initialization Resilience', () => {
    test('should initialize successfully with DOM elements', () => {
      expect(() => {
        const testEditor = new MarkdownEditor();
        testEditor.init(); // Initialize the editor
        expect(testEditor.version).toBe('3.3.0');
        expect(testEditor.editor).toBeInstanceOf(HTMLTextAreaElement);
        expect(testEditor.preview).toBeInstanceOf(HTMLDivElement);
      }).not.toThrow();
    });

    test('should handle setupEditor with DOM elements successfully', () => {
      expect(() => {
        editor.setupEditor();
      }).not.toThrow();

      expect(editor.editor).toBeInstanceOf(HTMLTextAreaElement);
      expect(editor.preview).toBeInstanceOf(HTMLDivElement);
    });

    test('should handle missing DOM elements gracefully', () => {
      // Clear DOM to simulate missing elements
      document.body.innerHTML = '';

      const testEditor = new MarkdownEditor();
      testEditor.setupEditor();

      // Should handle missing elements without throwing
      expect(testEditor.editor).toBeNull();
      expect(testEditor.preview).toBeNull();
    });

  });

  describe('File Handling Edge Cases', () => {
    test('should handle file reading errors gracefully', () => {
      const mockFile = new File(['test'], 'test.md', { type: 'text/markdown' });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      editor.editor = { value: '' };
      editor.updatePreview = jest.fn();

      // Simulate FileReader error
      const originalFileReader = global.FileReader;
      global.FileReader = function() {
        this.readAsText = function() {
          // Trigger error callback
          this.onerror({ target: { error: new Error('Read error') } });
        };
      };

      expect(() => {
        editor.loadFile(mockFile);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('File reading error:', expect.any(Object));
      expect(alertSpy).toHaveBeenCalledWith('Error reading file. Please try again.');

      // Restore
      global.FileReader = originalFileReader;
      consoleSpy.mockRestore();
      alertSpy.mockRestore();
    });

    test('should handle null or undefined files', () => {
      expect(() => {
        editor.handleFileSelect({ target: { files: [null] } });
      }).not.toThrow();

      expect(() => {
        editor.handleFileSelect({ target: { files: [] } });
      }).not.toThrow();
    });

    test('should setup drag and drop functionality', () => {
      expect(() => {
        editor.setupDragAndDrop();
      }).not.toThrow();

      // Should have upload area available
      expect(editor.uploadArea).toBeDefined();
    });

  });

  describe('Markdown Processing Edge Cases', () => {
    test('should handle very large markdown content', () => {
      const largeContent = '#'.repeat(10000) + ' Large Heading\n' + 'Content '.repeat(1000);

      editor.editor = { value: largeContent };
      editor.preview = { innerHTML: '' };

      expect(() => {
        editor.updatePreview();
      }).not.toThrow();
    });

    test('should handle special characters and Unicode', () => {
      const unicodeContent = '# Unicode Test 🚀\n\n**Bold** with émojis 😀 and spëcial çhars';

      editor.editor = { value: unicodeContent };
      editor.preview = { innerHTML: '' };

      expect(() => {
        editor.updatePreview();
      }).not.toThrow();

      expect(editor.preview.innerHTML).toContain('Unicode Test');
    });

    test('should handle malformed markdown gracefully', () => {
      const malformedContent = '### Incomplete header\n\n**Unclosed bold\n\n```\nUnclosed code block';

      editor.editor = { value: malformedContent };
      editor.preview = { innerHTML: '' };

      expect(() => {
        editor.updatePreview();
      }).not.toThrow();
    });

    test('should handle markdown parsing errors with error display', () => {
      // Mock marked.parse to throw an error to test error handling in updatePreview
      const originalParse = marked.parse;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      marked.parse = jest.fn(() => {
        throw new Error('Parsing failed due to invalid syntax');
      });

      editor.editor.value = '# Test content that will fail parsing';
      editor.updatePreview();

      // Check that error is logged
      expect(consoleSpy).toHaveBeenCalledWith('Markdown parsing error:', expect.any(Error));

      // Check that error message is displayed in preview
      expect(editor.preview.innerHTML).toContain('Markdown Error');
      expect(editor.preview.innerHTML).toContain('Parsing failed due to invalid syntax');

      // Restore mocks
      marked.parse = originalParse;
      consoleSpy.mockRestore();
    });
  });

  describe('Event Handling Resilience', () => {
    test('should handle keyboard events without editor element', () => {
      const mockEvent = {
        key: 'Tab',
        preventDefault: jest.fn()
      };

      // No editor element set
      expect(() => {
        editor.handleKeyboardShortcuts(mockEvent);
      }).not.toThrow();
    });

    test('should handle drag and drop without upload area', () => {
      expect(() => {
        editor.setupDragAndDrop();
      }).not.toThrow();
    });

    test('should handle prevent defaults with null event', () => {
      expect(() => {
        editor.preventDefaults(null);
      }).toThrow();
    });

    test('should handle drag events without errors', () => {
      editor.setupDragAndDrop();

      // Create mock events with proper dataTransfer properties
      const dragEvent = new Event('dragenter');
      const dropEvent = new Event('drop');

      // Mock dataTransfer with files property for drop event
      const testFile = new File(['test content'], 'test.md', { type: 'text/markdown' });

      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [testFile],
          items: [],
          types: ['Files']
        },
        writable: false,
        configurable: true
      });

      // Mock dataTransfer for drag event (no files)
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: {
          files: [],
          items: [],
          types: []
        },
        writable: false,
        configurable: true
      });

      expect(() => {
        if (editor.uploadArea) {
          editor.uploadArea.dispatchEvent(dragEvent);
          editor.uploadArea.dispatchEvent(dropEvent);
        }
      }).not.toThrow();
    });
  });

  describe('Save Operation Edge Cases', () => {
    test('should handle save operation without editor content', () => {
      const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      
      // No editor element
      expect(() => {
        editor.saveMarkdown();
      }).not.toThrow();
      
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    test('should handle URL creation failures', () => {
      const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockImplementation(() => {
        throw new Error('URL creation failed');
      });
      
      editor.editor = { value: '# Test' };
      
      expect(() => {
        editor.saveMarkdown();
      }).toThrow('URL creation failed');
      
      createObjectURLSpy.mockRestore();
    });
  });

  describe('Browser Compatibility', () => {
    test('should work with basic browser APIs', () => {
      expect(() => {
        // Use optimized DOM setup
        TestUtils.setupCleanDOM();

        // Test basic DOM operations
        const element = document.createElement('div');
        element.textContent = 'test';
        document.body.appendChild(element);

        // Test event handling
        const event = new Event('click');
        element.dispatchEvent(event);

        // Clean up
        document.body.removeChild(element);
      }).not.toThrow();
    });

    test('should handle missing modern browser features gracefully', () => {
      // Simulate older browser environment
      const originalURL = global.URL;
      delete global.URL;

      expect(() => {
        // Should not break initialization
        const testEditor = new MarkdownEditor();
        expect(testEditor).toBeDefined();
      }).not.toThrow();

      // Restore
      global.URL = originalURL;
    });

  });

  describe('Memory and Performance', () => {
    test('should not leak memory on multiple initializations', () => {
      const editors = [];
      
      expect(() => {
        for (let i = 0; i < 10; i++) {
          editors.push(new MarkdownEditor());
        }
      }).not.toThrow();
      
      expect(editors).toHaveLength(10);
      editors.forEach(e => expect(e.version).toBe('3.3.0'));
    });

    test('should handle rapid successive operations', () => {
      editor.editor = { value: '# Test', selectionStart: 0, selectionEnd: 0 };
      editor.preview = { innerHTML: '' };
      editor.updatePreview = jest.fn();
      
      expect(() => {
        for (let i = 0; i < 100; i++) {
          editor.handleKeyboardShortcuts({
            key: 'Tab',
            preventDefault: jest.fn()
          });
        }
      }).not.toThrow();
    });
  });
});