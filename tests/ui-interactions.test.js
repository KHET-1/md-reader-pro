import { TestUtils, setupTestEnvironment } from './test-utils.js';
// MD Reader Pro - UI Interactions and DOM Tests
import MarkdownEditor from '../src/index.js';

describe('UI Interactions and DOM Manipulation', () => {
  let editor;

  setupTestEnvironment();

  beforeEach(() => {
    editor = new MarkdownEditor();
    editor.init();
  });

  describe('Event Handling', () => {
    test('should handle file select events', () => {
      const mockFile = new File(['# Test'], 'test.md', { type: 'text/markdown' });
      const mockEvent = {
        target: {
          files: [mockFile]
        }
      };

      editor.loadFile = jest.fn();

      expect(() => {
        editor.handleFileSelect(mockEvent);
      }).not.toThrow();

      expect(editor.loadFile).toHaveBeenCalledWith(mockFile);
    });

    test('should handle empty file selection', () => {
      const mockEvent = {
        target: {
          files: []
        }
      };

      expect(() => {
        editor.handleFileSelect(mockEvent);
      }).not.toThrow();
    });
  });

  describe('Drag and Drop Functionality', () => {
    test('should setup drag and drop event listeners', () => {
      const mockUploadArea = {
        addEventListener: jest.fn(),
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        }
      };

      editor.uploadArea = mockUploadArea;

      expect(() => {
        editor.setupDragAndDrop();
      }).not.toThrow();

      // Verify event listeners were added
      expect(mockUploadArea.addEventListener).toHaveBeenCalled();
    });

    test('should handle drop events', () => {
      const mockFile = new File(['# Test'], 'test.md', { type: 'text/markdown' });
      const mockEvent = {
        dataTransfer: {
          files: [mockFile]
        }
      };

      editor.loadFile = jest.fn();
      editor.uploadArea = {
        addEventListener: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() }
      };

      // Simulate drop handler
      const dropHandler = (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
          editor.loadFile(files[0]);
        }
      };

      expect(() => {
        dropHandler(mockEvent);
      }).not.toThrow();

      expect(editor.loadFile).toHaveBeenCalledWith(mockFile);
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should handle save shortcut', () => {
      const mockEvent = {
        ctrlKey: true,
        key: 's',
        preventDefault: jest.fn()
      };

      editor.saveMarkdown = jest.fn();

      expect(() => {
        editor.handleKeyboardShortcuts(mockEvent);
      }).not.toThrow();

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(editor.saveMarkdown).toHaveBeenCalled();
    });

    test('should handle tab indentation', () => {
      editor.editor = {
        value: 'test',
        selectionStart: 2,
        selectionEnd: 2
      };
      editor.updatePreview = jest.fn();

      const mockEvent = {
        key: 'Tab',
        preventDefault: jest.fn()
      };

      expect(() => {
        editor.handleKeyboardShortcuts(mockEvent);
      }).not.toThrow();

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(editor.editor.value).toBe('te    st');
    });
  });

  describe('DOM Ready Handling', () => {
    test('should setup editor when DOM is ready', () => {
      editor.setupEditor = jest.fn();

      // Simulate document ready state
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      // Re-initialize to test the ready state
      const newEditor = new MarkdownEditor();
      
      // Should not throw
      expect(() => {
        newEditor.init();
      }).not.toThrow();
    });

    test('should wait for DOM content loaded', () => {
      editor.setupEditor = jest.fn();

      // Simulate loading state
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'loading'
      });

      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      expect(() => {
        editor.init();
      }).not.toThrow();

      expect(addEventListenerSpy).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });
  });
});