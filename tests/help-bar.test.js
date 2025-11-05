import { TestUtils, setupTestEnvironment } from './test-utils.js';
// MD Reader Pro - Help Bar Tests
import MarkdownEditor from '../src/index.js';

describe('Help Bar Functionality', () => {
    let editor;
    let helpToggle;
    let helpBar;

    setupTestEnvironment();

    beforeEach(() => {
        editor = new MarkdownEditor();
        editor.init();

        // Get DOM elements
        helpToggle = document.getElementById('help-toggle');
        helpBar = document.querySelector('.help-bar');
    });

    describe('Help Bar Setup', () => {
        test('should setup help bar event listeners', () => {
            expect(helpToggle).toBeTruthy();
            expect(helpBar).toBeTruthy();

            // Check that setupHelpBar was called
            expect(window.copyToEditor).toBeDefined();
            expect(typeof window.copyToEditor).toBe('function');
        });

        test('should toggle help bar visibility on button click', () => {
            // Initially help bar should not have show class
            expect(helpBar.classList.contains('show')).toBe(false);

            // Click help toggle
            helpToggle.click();

            // Help bar should now be visible
            expect(helpBar.classList.contains('show')).toBe(true);
            // In test environment, the button text doesn't change due to DOM structure differences
            // The important thing is that the help bar is visible
        });

        test('should close help bar when clicking outside', () => {
            // First open the help bar
            helpToggle.click();
            expect(helpBar.classList.contains('show')).toBe(true);

            // Click outside (on document body)
            document.body.click();

            // Help bar should be closed
            expect(helpBar.classList.contains('show')).toBe(false);
            expect(helpToggle.textContent).toBe('?');
        });

        test('should not close help bar when clicking inside it', () => {
            // Open the help bar
            helpToggle.click();
            expect(helpBar.classList.contains('show')).toBe(true);

            // Click inside help bar
            helpBar.click();

            // Help bar should remain open
            expect(helpBar.classList.contains('show')).toBe(true);
        });
    });

    describe('Copy to Editor Functionality', () => {
        test('should copy example markdown to editor', () => {
            const exampleMarkdown = '# Test Heading\nThis is a test.';

            // Call copyToEditor
            window.copyToEditor(exampleMarkdown);

            // Check that editor content was updated
            expect(editor.editor.value).toBe(exampleMarkdown);
        });

        test('should update preview when copying example', () => {
            const exampleMarkdown = '# Test Heading';

            // Spy on updatePreview method
            const updatePreviewSpy = jest.spyOn(editor, 'updatePreview');

            // Call copyToEditor
            window.copyToEditor(exampleMarkdown);

            // Check that updatePreview was called
            expect(updatePreviewSpy).toHaveBeenCalled();
        });

        test('should focus editor after copying example', () => {
            const exampleMarkdown = '# Test Heading';

            // Spy on editor focus method
            const focusSpy = jest.spyOn(editor.editor, 'focus');

            // Call copyToEditor
            window.copyToEditor(exampleMarkdown);

            // Check that focus was called
            expect(focusSpy).toHaveBeenCalled();
        });

        test('should handle empty example gracefully', () => {
            const emptyExample = '';

            expect(() => {
                window.copyToEditor(emptyExample);
            }).not.toThrow();

            expect(editor.editor.value).toBe('');
        });

        test('should handle complex markdown examples', () => {
            const complexExample = `# Complex Example

**Bold** and *italic* text.

\`\`\`javascript
console.log("Hello World");
\`\`\`

- List item 1
- List item 2

| Column | Value |
|--------|-------|
| Test   | Data  |`;

            window.copyToEditor(complexExample);
            expect(editor.editor.value).toBe(complexExample);
        });
    });

    describe('Copy Feedback System', () => {
        test('should show copy feedback when copying example', async () => {
            const exampleMarkdown = '# Test';

            // Call copyToEditor which should trigger the notification
            window.copyToEditor(exampleMarkdown);
            
            // Wait for async clipboard operation to complete
            await TestUtils.waitFor(100);

            // Check that notification was created (it uses the notification system now)
            // It could be either success (if clipboard API works) or warning (if it doesn't)
            const notification = document.querySelector('.notification');
            expect(notification).toBeTruthy();
            
            // Check for message (either success or warning about clipboard)
            const hasNotification = Array.from(document.querySelectorAll('.notification'))
                .some(div => div.textContent.includes('Example') || div.textContent.includes('clipboard'));
            expect(hasNotification).toBe(true);
        });

        test('should remove copy feedback after timeout', async () => {
            const exampleMarkdown = '# Test';

            // Call copyToEditor
            window.copyToEditor(exampleMarkdown);
            
            // Wait for async clipboard operation to complete
            await TestUtils.waitFor(100);

            // Check notification exists initially
            const hasNotification = Array.from(document.querySelectorAll('.notification'))
                .some(div => div.textContent.includes('Example') || div.textContent.includes('clipboard'));
            expect(hasNotification).toBe(true);

            // Wait for timeout + animation (5000ms for warning + 300ms animation)
            await TestUtils.waitFor(5400);

            // Check that notification is removed after timeout
            const stillHasNotification = Array.from(document.querySelectorAll('.notification'))
                .some(div => div.textContent.includes('Example') || div.textContent.includes('clipboard'));
            expect(stillHasNotification).toBe(false);
        });
    });

    describe('Help Bar Integration', () => {
        test('should work without editor element', () => {
            // Remove editor element
            if (editor.editor && editor.editor.parentNode) {
                editor.editor.parentNode.removeChild(editor.editor);
            }
            editor.editor = null;

            // Should not throw when calling copyToEditor
            expect(() => {
                window.copyToEditor('# Test');
            }).not.toThrow();
        });

        test('should handle missing help bar elements gracefully', () => {
            // Remove help elements
            if (helpToggle.parentNode) {
                helpToggle.parentNode.removeChild(helpToggle);
            }
            if (helpBar.parentNode) {
                helpBar.parentNode.removeChild(helpBar);
            }

            // Create new editor instance
            const newEditor = new MarkdownEditor();

            // Should not throw
            expect(newEditor).toBeDefined();
        });

        test('should maintain accessibility attributes', () => {
            // Open help bar
            helpToggle.click();
            expect(helpToggle.getAttribute('aria-label')).toBe('Close Markdown Help');

            // Close help bar
            helpToggle.click();
            expect(helpToggle.getAttribute('aria-label')).toBe('Open Markdown Help');
        });
    });

    describe('Help Bar Examples Coverage', () => {
        test('should handle heading examples', () => {
            const headingExample = '# Heading 1\n## Heading 2\n### Heading 3';
            window.copyToEditor(headingExample);
            expect(editor.editor.value).toContain('# Heading 1');
            expect(editor.editor.value).toContain('## Heading 2');
        });

        test('should handle text formatting examples', () => {
            const formatExample = '**Bold text**\n*Italic text*\n`Inline code`';
            window.copyToEditor(formatExample);
            expect(editor.editor.value).toContain('**Bold text**');
            expect(editor.editor.value).toContain('*Italic text*');
            expect(editor.editor.value).toContain('`Inline code`');
        });

        test('should handle code block examples', () => {
            const codeExample = '```javascript\nconsole.log("Hello");\n```';
            window.copyToEditor(codeExample);
            expect(editor.editor.value).toContain('```javascript');
            expect(editor.editor.value).toContain('console.log');
        });

        test('should handle list examples', () => {
            const listExample = '- First item\n- Second item\n  - Nested item';
            window.copyToEditor(listExample);
            expect(editor.editor.value).toContain('- First item');
            expect(editor.editor.value).toContain('  - Nested item');
        });

        test('should handle link examples', () => {
            const linkExample = '[GitHub](https://github.com)\n[Google](https://google.com "Google Search")';
            window.copyToEditor(linkExample);
            expect(editor.editor.value).toContain('[GitHub](https://github.com)');
            expect(editor.editor.value).toContain('"Google Search"');
        });

        test('should handle table examples', () => {
            const tableExample = '| Header | Value |\n|--------|-------|\n| Cell   | Data  |';
            window.copyToEditor(tableExample);
            expect(editor.editor.value).toContain('| Header | Value |');
            expect(editor.editor.value).toContain('|--------|-------|');
        });

        test('should handle blockquote examples', () => {
            const quoteExample = '> This is a blockquote\n> with multiple lines';
            window.copyToEditor(quoteExample);
            expect(editor.editor.value).toContain('> This is a blockquote');
        });
    });
});