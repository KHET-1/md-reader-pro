// E2E Test Utilities for Production Coverage Validation

export class E2ETestUtils {
  /**
   * Create a temporary HTML file for testing missing DOM scenarios
   * @param {string} content - HTML content
   * @param {string} filename - File name
   * @returns {string} File path
   */
  static createTempHtmlFile(content, filename = 'temp-test.html') {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'dist', filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  /**
   * Clean up temporary files
   * @param {string} filePath - Path to file to delete
   */
  static cleanup(filePath) {
    const fs = require('fs');
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      // File may already be deleted
    }
  }

  /**
   * HTML template for missing DOM elements test
   */
  static get missingDomTemplate() {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Missing DOM Test</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .test-info { background: #f0f0f0; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="test-info">
        <h1>Missing DOM Elements Test</h1>
        <p>This page intentionally lacks the required DOM elements (editor, preview, fileInput) to test error handling.</p>
    </div>
    <!-- Missing required elements for production error testing -->
</body>
</html>`;
  }

  /**
   * Create test markdown content
   * @param {string} title - Title for the markdown
   * @returns {string} Markdown content
   */
  static createTestMarkdown(title = 'Test Document') {
    return `# ${title}

## Overview
This is a test markdown document for production validation testing.

### Features Tested
- File loading success logging
- Filename display with special characters
- Content processing verification

### Code Example
\`\`\`javascript
// Production validation test
console.log('📄 Loaded file: ${title}');
\`\`\`

**Status**: ✅ Production Ready
`;
  }

  /**
   * Console message collectors for Playwright tests
   */
  static createConsoleCollectors() {
    return {
      logs: [],
      errors: [],
      warnings: [],

      setupListeners(page) {
        page.on('console', msg => {
          const text = msg.text();
          switch (msg.type()) {
            case 'log':
              this.logs.push(text);
              break;
            case 'error':
              this.errors.push(text);
              break;
            case 'warning':
              this.warnings.push(text);
              break;
          }
        });
      },

      reset() {
        this.logs = [];
        this.errors = [];
        this.warnings = [];
      }
    };
  }

  /**
   * Wait for specific console message with timeout
   * @param {Array} messageArray - Array to monitor
   * @param {string|RegExp} expectedMessage - Message to wait for
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<boolean>}
   */
  static async waitForConsoleMessage(messageArray, expectedMessage, timeout = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const found = messageArray.some(msg => {
        if (typeof expectedMessage === 'string') {
          return msg.includes(expectedMessage);
        }
        return expectedMessage.test(msg);
      });

      if (found) return true;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return false;
  }
}