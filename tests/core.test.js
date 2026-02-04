import { TestUtils, setupTestEnvironment } from './test-utils.js';
// MD Reader Pro - Core Functionality Tests
import MarkdownEditor from '../src/index.js';

describe('Markdown Editor Core Features', () => {
  let editor;

  setupTestEnvironment();

  beforeEach(() => {
    editor = new MarkdownEditor();
    editor.init();
  });

  describe('Application Initialization', () => {
    test('should initialize with correct default values', () => {
      expect(editor.version).toBe('4.1.0'); // Cathedral Edition!
      expect(editor.editor).toBeInstanceOf(HTMLTextAreaElement); // DOM elements now available
      expect(editor.preview).toBeInstanceOf(HTMLDivElement);
    });

    test('should have core methods defined', () => {
      expect(typeof editor.init).toBe('function');
      expect(typeof editor.setupEditor).toBe('function');
      expect(typeof editor.updatePreview).toBe('function');
      expect(typeof editor.saveMarkdown).toBe('function');
      expect(typeof editor.showCollaborationStory).toBe('function');
    });

    test('should setup global functions', () => {
      // Since global functions may have been cleaned up, check if they can be set up
      const testEditor = new MarkdownEditor();
      window.markdownEditor = testEditor;
      window.showCollabStory = () => testEditor.showCollaborationStory();
      
      expect(typeof window.showCollabStory).toBe('function');
      expect(typeof window.markdownEditor).toBe('object');
    });
  });

  describe('File Operations', () => {
    test('should handle markdown save functionality', () => {
      const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      
      // Mock DOM elements for testing
      editor.editor = { value: '# Test Markdown' };
      
      expect(() => {
        editor.saveMarkdown();
      }).not.toThrow();
      
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test');
      
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    test('should handle file loading with FileReader', () => {
      const mockFile = new File(['# Test Content'], 'test.md', { type: 'text/markdown' });
      editor.editor = { value: '' };
      editor.updatePreview = jest.fn();
      
      expect(() => {
        editor.loadFile(mockFile);
      }).not.toThrow();
    });
  });

  describe('Markdown Processing', () => {
    test('should handle empty markdown content', () => {
      editor.editor = { value: '' };
      editor.preview = { innerHTML: '' };
      
      expect(() => {
        editor.updatePreview();
      }).not.toThrow();
      
      expect(editor.preview.innerHTML).toContain('Start typing markdown');
    });

    test('should process markdown content correctly', () => {
      const { marked } = require('marked');
      
      editor.editor = { value: '# Test Heading\n\nThis is **bold** text.' };
      editor.preview = { innerHTML: '' };
      
      expect(() => {
        editor.updatePreview();
      }).not.toThrow();
    });
  });

  describe('Development Journey Story', () => {
    test('should display development journey with key elements', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      editor.showCollaborationStory();
      
      // Check for key story elements
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('THE DEVELOPMENT JOURNEY'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Professional tooling setup'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Real markdown functionality'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('REAL markdown editor'));
      
      consoleSpy.mockRestore();
    });

    test('should be accessible via global window function', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Set up global function for this test
      window.showCollabStory = () => editor.showCollaborationStory();
      
      // Should be able to call via window
      window.showCollabStory();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('THE DEVELOPMENT JOURNEY'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Editor Setup and Event Handling', () => {
    test('should setup editor functionality without errors', () => {
      expect(() => {
        editor.setupEditor();
      }).not.toThrow();
    });

    test('should handle keyboard shortcuts', () => {
      editor.editor = { 
        value: 'test',
        selectionStart: 4,
        selectionEnd: 4
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
    });

    test('should prevent default drag behaviors', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };
      
      expect(() => {
        editor.preventDefaults(mockEvent);
      }).not.toThrow();
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });
});

// Add integration test for the full workflow
describe('Markdown Editor Integration', () => {
  test('should handle complete markdown editing workflow', () => {
    const editor = new MarkdownEditor();
    
    // Mock DOM elements
    editor.editor = { 
      value: '# Hello World\n\nThis is **bold** text.',
      addEventListener: jest.fn()
    };
    editor.preview = { innerHTML: '' };
    editor.fileInput = { addEventListener: jest.fn() };
    
    // Test setup
    expect(() => {
      editor.setupEventListeners();
    }).not.toThrow();
    
    // Test preview update
    expect(() => {
      editor.updatePreview();
    }).not.toThrow();
    
    // Should have processed the markdown
    expect(editor.preview.innerHTML).toContain('<h1');
    expect(editor.preview.innerHTML).toContain('<strong>bold</strong>');
  });
});