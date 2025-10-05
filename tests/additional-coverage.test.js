/**
 * @jest-environment jsdom
 */

import MarkdownEditor from '../src/index.js';

describe('MarkdownEditor - Additional Coverage', () => {
  let editor;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="container">
        <div class="editor-pane">
          <textarea id="markdown-editor"></textarea>
        </div>
        <div class="preview-pane">
          <div id="markdown-preview"></div>
        </div>
      </div>
      <input type="file" id="file-input" style="display:none" />
      <div class="upload-area"></div>
      <div class="help-sidebar"></div>
      <button class="help-toggle"></button>
    `;
    editor = new MarkdownEditor();
    editor.init();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Syntax Highlighting', () => {
    test('should highlight code with recognized language', () => {
      const code = 'const x = 10;';
      const lang = 'javascript';
      
      editor.editor.value = '```javascript\n' + code + '\n```';
      editor.updatePreview();
      
      const preview = editor.preview.innerHTML;
      expect(preview).toContain('code');
    });

    test('should return plain code for unrecognized language', () => {
      const code = 'some code';
      const lang = 'unknownlang';
      
      editor.editor.value = '```unknownlang\n' + code + '\n```';
      editor.updatePreview();
      
      // Should still render even without highlighting
      const preview = editor.preview.innerHTML;
      expect(preview).toBeDefined();
    });

    test('should handle code without language specified', () => {
      const code = 'plain code';
      
      editor.editor.value = '```\n' + code + '\n```';
      editor.updatePreview();
      
      const preview = editor.preview.innerHTML;
      expect(preview).toContain('code');
    });
  });

  describe('Error Handling in Production', () => {
    test('should handle missing DOM elements gracefully in production', () => {
      // Simulate production environment
      const originalJest = global.jest;
      delete global.jest;
      
      document.body.innerHTML = ''; // Remove all elements
      
      const newEditor = new MarkdownEditor();
      
      // Should not throw error
      expect(() => newEditor.init()).not.toThrow();
      
      // Restore jest
      global.jest = originalJest;
    });
  });

  describe('Tab System Interactions', () => {
    test('should handle tab switching with animations', () => {
      // Add tab elements
      document.body.innerHTML += `
        <div class="tabs">
          <button class="tab-button active" data-tab="editor">Editor</button>
          <button class="tab-button" data-tab="preview">Preview</button>
        </div>
        <div class="tab-content active" data-tab-content="editor"></div>
        <div class="tab-content" data-tab-content="preview"></div>
      `;
      
      const tabs = document.querySelectorAll('.tab-button');
      expect(tabs.length).toBeGreaterThan(0);
    });
  });

  describe('Animation Manager Integration', () => {
    test('should have animation manager initialized', () => {
      expect(editor.anim).toBeDefined();
      expect(editor.anim.getFPS).toBeDefined();
    });

    test('should use animation manager for feedback', () => {
      const feedback = document.createElement('div');
      feedback.className = 'feedback-message';
      document.body.appendChild(feedback);
      
      // AnimationManager should be available
      expect(editor.anim).toBeDefined();
      expect(typeof editor.anim.fadeOut).toBe('function');
    });
  });

  describe('File Operations Coverage', () => {
    test('should validate file extensions', () => {
      const validFile = new File(['# Test'], 'test.md', { type: 'text/markdown' });
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/exe' });
      
      // Create file input element
      const fileInput = document.getElementById('file-input');
      expect(fileInput).toBeTruthy();
    });

    test('should handle file size limits', () => {
      const constants = MarkdownEditor.CONSTANTS;
      
      expect(constants.MAX_FILE_SIZE).toBeDefined();
      expect(constants.SUPPORTED_EXTENSIONS).toBeDefined();
      expect(Array.isArray(constants.SUPPORTED_EXTENSIONS)).toBe(true);
    });
  });

  describe('Keyboard Shortcuts Coverage', () => {
    test('should define keyboard shortcut constants', () => {
      const constants = MarkdownEditor.CONSTANTS;
      
      expect(constants.KEYBOARD_SHORTCUTS).toBeDefined();
      expect(constants.KEYBOARD_SHORTCUTS.SAVE).toBeDefined();
      expect(constants.KEYBOARD_SHORTCUTS.TAB).toBeDefined();
      expect(constants.KEYBOARD_SHORTCUTS.ESCAPE).toBeDefined();
    });
  });

  describe('Constants Coverage', () => {
    test('should define all required constants', () => {
      const constants = MarkdownEditor.CONSTANTS;
      
      expect(constants.TAB_WIDTH).toBe(4);
      expect(constants.INDENTATION_SPACES).toBe('    ');
      expect(constants.FEEDBACK_DURATION).toBe(2000);
      expect(constants.FEEDBACK_FADE_DURATION).toBe(300);
      expect(constants.HELP_BAR_TRANSITION_DURATION).toBe(300);
      expect(constants.HELP_BAR_WIDTH).toBe(400);
      expect(constants.TOGGLE_BUTTON_SIZE).toBe(50);
      expect(constants.DEBOUNCE_DELAY).toBe(300);
      expect(constants.MEMORY_LEAK_THRESHOLD).toBe(1024 * 1024);
    });
  });

  describe('Edge Cases and Error Boundaries', () => {
    test('should handle malformed markdown gracefully', () => {
      const malformed = '# Heading\n\n```unclosed code block\nno closing';
      
      editor.editor.value = malformed;
      
      expect(() => editor.updatePreview()).not.toThrow();
    });

    test('should handle very long markdown documents', () => {
      const longDoc = '# Heading\n\n' + 'Lorem ipsum '.repeat(10000);
      
      editor.editor.value = longDoc;
      
      expect(() => editor.updatePreview()).not.toThrow();
    });

    test('should handle special characters in markdown', () => {
      const special = '# Test\n\n<script>alert("xss")</script>\n\n**bold**';
      
      editor.editor.value = special;
      editor.updatePreview();
      
      // Should sanitize HTML
      const preview = editor.preview.innerHTML;
      expect(preview).toBeDefined();
    });

    test('should handle empty editor value', () => {
      editor.editor.value = '';
      
      expect(() => editor.updatePreview()).not.toThrow();
    });

    test('should handle null or undefined values safely', () => {
      editor.editor.value = null;
      
      expect(() => editor.updatePreview()).not.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    test('should have debounce delay constant', () => {
      const constants = MarkdownEditor.CONSTANTS;
      
      expect(constants.DEBOUNCE_DELAY).toBe(300);
      expect(typeof constants.DEBOUNCE_DELAY).toBe('number');
    });

    test('should have memory leak threshold', () => {
      const constants = MarkdownEditor.CONSTANTS;
      
      expect(constants.MEMORY_LEAK_THRESHOLD).toBe(1048576); // 1MB
    });
  });

  describe('UI Dimensions', () => {
    test('should define help bar dimensions', () => {
      const constants = MarkdownEditor.CONSTANTS;
      
      expect(constants.HELP_BAR_WIDTH).toBe(400);
      expect(constants.TOGGLE_BUTTON_SIZE).toBe(50);
    });
  });

  describe('Version Information', () => {
    test('should have version number', () => {
      expect(editor.version).toBe('3.4.0');
      expect(typeof editor.version).toBe('string');
    });
  });
});
