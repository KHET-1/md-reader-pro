import { TestUtils, setupTestEnvironment } from './test-utils.js';
// MD Reader Pro - Markdown Rendering Tests
import MarkdownEditor from '../src/index.js';

describe('Markdown Rendering Features', () => {
  let editor;

  setupTestEnvironment();

  beforeEach(() => {
    editor = new MarkdownEditor();
    editor.init();
  });

  describe('Heading Rendering', () => {
    test('should render H1 headings correctly', () => {
      editor.editor.value = '# This is an H1 heading';
      editor.updatePreview();

      const h1 = editor.preview.querySelector('h1');
      expect(h1).toBeTruthy();
      expect(h1.textContent).toBe('This is an H1 heading');
    });

    test('should render H2 headings correctly', () => {
      editor.editor.value = '## This is an H2 heading';
      editor.updatePreview();

      const h2 = editor.preview.querySelector('h2');
      expect(h2).toBeTruthy();
      expect(h2.textContent).toBe('This is an H2 heading');
    });

    test('should render H3 headings correctly', () => {
      editor.editor.value = '### This is an H3 heading';
      editor.updatePreview();

      const h3 = editor.preview.querySelector('h3');
      expect(h3).toBeTruthy();
      expect(h3.textContent).toBe('This is an H3 heading');
    });

    test('should render multiple heading levels', () => {
      const markdown = `# Main Title
## Section Title
### Subsection
#### Sub-subsection
##### Small heading
###### Smallest heading`;

      editor.editor.value = markdown;
      editor.updatePreview();

      expect(editor.preview.querySelector('h1')).toBeTruthy();
      expect(editor.preview.querySelector('h2')).toBeTruthy();
      expect(editor.preview.querySelector('h3')).toBeTruthy();
      expect(editor.preview.querySelector('h4')).toBeTruthy();
      expect(editor.preview.querySelector('h5')).toBeTruthy();
      expect(editor.preview.querySelector('h6')).toBeTruthy();
    });
  });

  describe('Text Formatting', () => {
    test('should render bold text correctly', () => {
      editor.editor.value = 'This is **bold text** in a sentence.';
      editor.updatePreview();

      const strong = editor.preview.querySelector('strong');
      expect(strong).toBeTruthy();
      expect(strong.textContent).toBe('bold text');
    });

    test('should render italic text correctly', () => {
      editor.editor.value = 'This is *italic text* in a sentence.';
      editor.updatePreview();

      const em = editor.preview.querySelector('em');
      expect(em).toBeTruthy();
      expect(em.textContent).toBe('italic text');
    });

    test('should render inline code correctly', () => {
      editor.editor.value = 'Use `console.log()` for debugging.';
      editor.updatePreview();

      const code = editor.preview.querySelector('code');
      expect(code).toBeTruthy();
      expect(code.textContent).toBe('console.log()');
    });
  });

  describe('Code Blocks', () => {
    test('should render code blocks correctly', () => {
      const markdown = `\`\`\`javascript
function hello() {
  console.log('Hello World');
}
\`\`\``;

      editor.editor.value = markdown;
      editor.updatePreview();

      const pre = editor.preview.querySelector('pre');
      const code = pre?.querySelector('code');
      expect(pre).toBeTruthy();
      expect(code).toBeTruthy();
      expect(code.textContent).toContain('function hello()');
    });

    test('should render code blocks without language specification', () => {
      const markdown = `\`\`\`
const x = 42;
console.log(x);
\`\`\``;

      editor.editor.value = markdown;
      editor.updatePreview();

      const pre = editor.preview.querySelector('pre');
      expect(pre).toBeTruthy();
      expect(pre.textContent).toContain('const x = 42');
    });
  });

  describe('Lists', () => {
    test('should render unordered lists correctly', () => {
      const markdown = `- First item
- Second item
- Third item`;

      editor.editor.value = markdown;
      editor.updatePreview();

      const ul = editor.preview.querySelector('ul');
      const items = ul?.querySelectorAll('li');
      expect(ul).toBeTruthy();
      expect(items).toHaveLength(3);
      expect(items[0].textContent).toBe('First item');
    });

    test('should render ordered lists correctly', () => {
      const markdown = `1. First item
2. Second item
3. Third item`;

      editor.editor.value = markdown;
      editor.updatePreview();

      const ol = editor.preview.querySelector('ol');
      const items = ol?.querySelectorAll('li');
      expect(ol).toBeTruthy();
      expect(items).toHaveLength(3);
      expect(items[0].textContent).toBe('First item');
    });

    test('should render nested lists correctly', () => {
      const markdown = `- Main item
  - Nested item 1
  - Nested item 2
- Another main item`;

      editor.editor.value = markdown;
      editor.updatePreview();

      const outerUl = editor.preview.querySelector('ul');
      const nestedUl = outerUl?.querySelector('ul');
      expect(outerUl).toBeTruthy();
      expect(nestedUl).toBeTruthy();
    });
  });

  describe('Links and Images', () => {
    test('should render links correctly', () => {
      editor.editor.value = '[Visit GitHub](https://github.com)';
      editor.updatePreview();

      const link = editor.preview.querySelector('a');
      expect(link).toBeTruthy();
      expect(link.textContent).toBe('Visit GitHub');
      expect(link.getAttribute('href')).toBe('https://github.com');
    });

    test('should render images correctly', () => {
      editor.editor.value = '![Alt text](https://example.com/image.png)';
      editor.updatePreview();

      const img = editor.preview.querySelector('img');
      expect(img).toBeTruthy();
      expect(img.getAttribute('alt')).toBe('Alt text');
      expect(img.getAttribute('src')).toBe('https://example.com/image.png');
    });
  });

  describe('Blockquotes', () => {
    test('should render blockquotes correctly', () => {
      editor.editor.value = '> This is a blockquote\n> with multiple lines';
      editor.updatePreview();

      const blockquote = editor.preview.querySelector('blockquote');
      expect(blockquote).toBeTruthy();
      expect(blockquote.textContent).toContain('This is a blockquote');
    });

    test('should render nested blockquotes correctly', () => {
      editor.editor.value = '> Outer quote\n>> Nested quote';
      editor.updatePreview();

      const outerQuote = editor.preview.querySelector('blockquote');
      const nestedQuote = outerQuote?.querySelector('blockquote');
      expect(outerQuote).toBeTruthy();
      expect(nestedQuote).toBeTruthy();
    });
  });

  describe('Tables', () => {
    test('should render tables correctly', () => {
      const markdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`;

      editor.editor.value = markdown;
      editor.updatePreview();

      const table = editor.preview.querySelector('table');
      const headers = table?.querySelectorAll('th');
      const cells = table?.querySelectorAll('td');

      expect(table).toBeTruthy();
      expect(headers).toHaveLength(2);
      expect(cells).toHaveLength(4);
      expect(headers[0].textContent).toBe('Header 1');
    });
  });

  describe('Horizontal Rules', () => {
    test('should render horizontal rules correctly', () => {
      editor.editor.value = 'Text above\n\n---\n\nText below';
      editor.updatePreview();

      const hr = editor.preview.querySelector('hr');
      expect(hr).toBeTruthy();
    });
  });

  describe('Mixed Content Rendering', () => {
    test('should render complex markdown with multiple features', () => {
      const complexMarkdown = `# Main Title

This is a paragraph with **bold** and *italic* text.

## Features List

- [x] Completed task
- [ ] Pending task
- Regular list item

### Code Example

\`\`\`javascript
function test() {
  return "Hello World";
}
\`\`\`

> This is a blockquote with \`inline code\`

| Feature | Status |
|---------|---------|
| Headings | ✅ |
| Lists | ✅ |

---

*End of document*`;

      editor.editor.value = complexMarkdown;
      editor.updatePreview();

      // Verify multiple elements exist
      expect(editor.preview.querySelector('h1')).toBeTruthy();
      expect(editor.preview.querySelector('h2')).toBeTruthy();
      expect(editor.preview.querySelector('h3')).toBeTruthy();
      expect(editor.preview.querySelector('strong')).toBeTruthy();
      expect(editor.preview.querySelector('em')).toBeTruthy();
      expect(editor.preview.querySelector('ul')).toBeTruthy();
      expect(editor.preview.querySelector('pre')).toBeTruthy();
      expect(editor.preview.querySelector('blockquote')).toBeTruthy();
      expect(editor.preview.querySelector('table')).toBeTruthy();
      expect(editor.preview.querySelector('hr')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('should handle malformed markdown gracefully', () => {
      editor.editor.value = '# Incomplete heading\n**Unclosed bold\n`Unclosed code';

      expect(() => {
        editor.updatePreview();
      }).not.toThrow();

      expect(editor.preview.innerHTML).toBeTruthy();
    });

    test('should handle special characters correctly', () => {
      editor.editor.value = '# Title with émojis 🚀\n\nSpecial chars: < > & " \'';
      editor.updatePreview();

      const h1 = editor.preview.querySelector('h1');
      expect(h1).toBeTruthy();
      expect(h1.textContent).toContain('🚀');
    });

    test('should handle very long content', () => {
      const longContent = '# '.repeat(1000) + 'Long Title\n' + 'Lorem ipsum '.repeat(1000);
      editor.editor.value = longContent;

      expect(() => {
        editor.updatePreview();
      }).not.toThrow();
    });
  });
});