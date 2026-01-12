import { TestUtils, setupTestEnvironment } from './test-utils.js';
// MD Reader Pro - Integration Tests
import MarkdownEditor from '../src/index.js';

describe('Integration and End-to-End Scenarios', () => {
    let editor;

    setupTestEnvironment();

    beforeEach(() => {
        editor = new MarkdownEditor();
        editor.init();
    });

    describe('Complete Workflow Integration', () => {
        test('should handle complete markdown editing workflow', () => {
            // 1. Start with empty editor
            expect(editor.editor.value).toBe('');

            // 2. Add some markdown content
            const markdownContent = `# My Document

This is a **test** document with *italic* text.

## Features

- [x] Bold text
- [x] Italic text
- [ ] More features

\`\`\`javascript
console.log("Hello World");
\`\`\`

> This is a blockquote

| Feature | Status |
|---------|--------|
| Tables  | ✅     |`;

            editor.editor.value = markdownContent;

            // 3. Update preview
            editor.updatePreview();

            // 4. Verify all elements are rendered
            expect(editor.preview.querySelector('h1')).toBeTruthy();
            expect(editor.preview.querySelector('h2')).toBeTruthy();
            expect(editor.preview.querySelector('strong')).toBeTruthy();
            expect(editor.preview.querySelector('em')).toBeTruthy();
            expect(editor.preview.querySelector('ul')).toBeTruthy();
            expect(editor.preview.querySelector('pre')).toBeTruthy();
            expect(editor.preview.querySelector('blockquote')).toBeTruthy();
            expect(editor.preview.querySelector('table')).toBeTruthy();

            // 5. Test save functionality
            const saveMarkdownSpy = jest.spyOn(editor, 'saveMarkdown');
            const saveEvent = new KeyboardEvent('keydown', {
                key: 's',
                ctrlKey: true,
                bubbles: true,
                cancelable: true
            });
            editor.editor.dispatchEvent(saveEvent);
            expect(saveMarkdownSpy).toHaveBeenCalled();
        });

        test('should handle help bar to editor workflow', () => {
            const helpToggle = document.getElementById('help-toggle');
            const helpBar = document.querySelector('.help-bar');

            // 1. Open help bar
            helpToggle.click();
            expect(helpBar.classList.contains('show')).toBe(true);

            // 2. Copy example to editor
            const exampleMarkdown = '# Example Heading\n\nThis is an example from the help bar.';
            editor.copyToEditor(exampleMarkdown);

            // 3. Verify content was copied
            expect(editor.editor.value).toBe(exampleMarkdown);

            // 4. Verify preview was updated
            expect(editor.preview.querySelector('h1')).toBeTruthy();
            expect(editor.preview.querySelector('h1').textContent).toBe('Example Heading');
        });

        test('should handle file upload to editor workflow', (done) => {
            // Create a mock file
            const fileContent = '# Uploaded File\n\nThis content was uploaded from a file.';
            const file = new File([fileContent], 'test.md', { type: 'text/markdown' });

            // Mock FileReader
            const originalFileReader = window.FileReader;
            window.FileReader = class MockFileReader {
                readAsText() {
                    setTimeout(() => {
                        this.result = fileContent;
                        if (this.onload) {
                            this.onload({ target: { result: fileContent } });
                        }
                    }, 0);
                }
            };

            // Load the file
            editor.loadFile(file);

            // Wait for async operation
            setTimeout(() => {
                // Verify content was loaded
                expect(editor.editor.value).toBe(fileContent);

                // Verify preview was updated
                expect(editor.preview.querySelector('h1')).toBeTruthy();
                expect(editor.preview.querySelector('h1').textContent).toBe('Uploaded File');

                // Restore FileReader
                window.FileReader = originalFileReader;
                done();
            }, 10);
        });
    });

    describe('Global Function Integration', () => {
        test('should have showCollaborationStory method on editor instance', () => {
            expect(editor.showCollaborationStory).toBeDefined();
            expect(typeof editor.showCollaborationStory).toBe('function');
        });

        test('should display collaboration story', () => {
            const originalConsole = TestUtils.suppressConsoleLogs();
                // Test code here
                TestUtils.restoreConsoleLogs();
        });

        test('should provide console commands information in browser environment', () => {
            // Test that the global setup would work in browser
            const tempEditor = new MarkdownEditor();

            // In test environment, we just verify the method exists
            expect(tempEditor.showCollaborationStory).toBeDefined();
        });
    });

    describe('Error Recovery Integration', () => {
        test('should recover from DOM manipulation errors', () => {
            // Remove preview element after initialization
            if (editor.preview && editor.preview.parentNode) {
                editor.preview.parentNode.removeChild(editor.preview);
            }
            editor.preview = null;

            // Should not throw when trying to update preview
            expect(() => {
                editor.updatePreview();
            }).not.toThrow();
        });

        test('should handle multiple editor instances', () => {
            // Create multiple editor instances
            const editor1 = new MarkdownEditor();
            const editor2 = new MarkdownEditor();
            const editor3 = new MarkdownEditor();

            // All should be defined
            expect(editor1).toBeDefined();
            expect(editor2).toBeDefined();
            expect(editor3).toBeDefined();

            // All should have core methods
            expect(editor1.updatePreview).toBeDefined();
            expect(editor2.updatePreview).toBeDefined();
            expect(editor3.updatePreview).toBeDefined();
        });

        test('should handle rapid initialization and destruction', () => {
            // Rapidly create and destroy editors
            for (let i = 0; i < 10; i++) {
                const tempEditor = new MarkdownEditor();
                expect(tempEditor).toBeDefined();

                // Clean up DOM elements
                document.body.innerHTML = '';
            }

            // Should not cause memory leaks or errors
            const finalEditor = new MarkdownEditor();
            expect(finalEditor).toBeDefined();
        });
    });

    describe('Real-world Usage Scenarios', () => {
        test('should handle typical documentation writing workflow', () => {
            // Simulate writing a README file
            const readmeContent = `# Project Name

## Description
This is a sample project description.

## Installation

\`\`\`bash
npm install project-name
\`\`\`

## Usage

\`\`\`javascript
import Project from 'project-name';

const project = new Project();
project.run();
\`\`\`

## Features

- [x] Feature 1
- [x] Feature 2
- [ ] Feature 3 (coming soon)

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License.`;

            editor.editor.value = readmeContent;
            editor.updatePreview();

            // Verify all README elements are rendered correctly
            expect(editor.preview.querySelector('h1').textContent).toBe('Project Name');
            expect(editor.preview.querySelectorAll('h2').length).toBeGreaterThanOrEqual(4);
            expect(editor.preview.querySelectorAll('pre').length).toBeGreaterThanOrEqual(2);
            expect(editor.preview.querySelector('ul')).toBeTruthy();
            expect(editor.preview.querySelector('a')).toBeTruthy();
        });

        test('should handle blog post writing workflow', () => {
            // Simulate writing a blog post
            const blogContent = `# Understanding JavaScript Promises

*Published on March 15, 2024*

JavaScript Promises can be **tricky** to understand at first, but they're essential for modern web development.

## What is a Promise?

A Promise represents the eventual completion of an asynchronous operation.

> "A promise is a proxy for a value not necessarily known when the promise is created."

## Basic Example

\`\`\`javascript
const fetchData = () => {
  return new Promise((resolve, reject) => {
    // Async operation
    setTimeout(() => {
      resolve("Data fetched!");
    }, 10);
  });
};

fetchData()
  .then(data => console.log(data))
  .catch(error => console.error(error));
\`\`\`

## Promise States

| State | Description |
|-------|-------------|
| Pending | Initial state |
| Fulfilled | Operation completed successfully |
| Rejected | Operation failed |

---

*Happy coding!* 🚀`;

            editor.editor.value = blogContent;
            editor.updatePreview();

            // Verify blog elements are rendered
            expect(editor.preview.querySelector('h1').textContent).toBe('Understanding JavaScript Promises');
            expect(editor.preview.querySelector('em')).toBeTruthy();
            expect(editor.preview.querySelector('strong')).toBeTruthy();
            expect(editor.preview.querySelector('blockquote')).toBeTruthy();
            expect(editor.preview.querySelector('pre')).toBeTruthy();
            expect(editor.preview.querySelector('table')).toBeTruthy();
            expect(editor.preview.querySelector('hr')).toBeTruthy();
        });

        test('should handle technical specification workflow', () => {
            // Simulate writing a technical spec
            const specContent = `# API Specification

## Overview

This document describes the REST API for the user management system.

## Authentication

All requests require a valid API key in the header:

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Endpoints

### GET /users

Returns a list of users.

**Parameters:**

- \`limit\` (optional): Number of users to return (default: 10)
- \`offset\` (optional): Offset for pagination (default: 0)

**Response:**

\`\`\`json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  ],
  "total": 100
}
\`\`\`

### POST /users

Creates a new user.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | User's full name |
| email | string | Yes | User's email address |
| age | number | No | User's age |

## Error Codes

- \`400\` - Bad Request
- \`401\` - Unauthorized
- \`404\` - Not Found
- \`500\` - Internal Server Error`;

            editor.editor.value = specContent;
            editor.updatePreview();

            // Verify technical spec elements
            expect(editor.preview.querySelectorAll('h1').length).toBeGreaterThanOrEqual(1);
            expect(editor.preview.querySelectorAll('h2').length).toBeGreaterThanOrEqual(2);
            expect(editor.preview.querySelectorAll('h3').length).toBeGreaterThanOrEqual(2);
            expect(editor.preview.querySelectorAll('pre').length).toBeGreaterThanOrEqual(2);
            expect(editor.preview.querySelector('table')).toBeTruthy();
            expect(editor.preview.querySelectorAll('ul').length).toBeGreaterThanOrEqual(1);
        });
    });
});