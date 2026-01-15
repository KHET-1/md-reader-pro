import { test, expect } from '@playwright/test';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

test.describe('Production Coverage Validation', () => {

  test('should handle missing DOM elements gracefully (Line 38)', async ({ page }) => {
    // Create a test page without required DOM elements
    const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Test - Missing DOM</title>
</head>
<body>
    <h1>Missing DOM Elements Test</h1>
    <!-- Missing: textarea#markdown-editor, div#markdown-preview, input#file-input -->
    <script src="bundle.js"></script>
</body>
</html>`;

    const testFile = join(process.cwd(), 'dist', 'test-missing-dom.html');
    writeFileSync(testFile, testHtml);

    const errorLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });

    try {
      await page.goto('/test-missing-dom.html');

      // Wait for bundle.js to load and execute
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify the production error logging (Line 38)
      expect(errorLogs.some(log =>
        log.includes('Required DOM elements not found')
      )).toBeTruthy();

      // Verify app doesn't crash completely
      expect(await page.title()).toBe('Test - Missing DOM');

    } finally {
      if (existsSync(testFile)) {
        unlinkSync(testFile);
      }
    }
  });

  test('should log file loading success (Line 149)', async ({ page }) => {
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for elements to be available
    await page.waitForSelector('#markdown-editor', { timeout: 5000 });

    // Create test file content in browser instead of filesystem
    const testContent = '# Test Markdown\n\nThis is a test file for production validation.';

    // Simulate file loading by directly calling the loadFile method
    const result = await page.evaluate(({ content }) => {
      // Create a mock file object
      const mockFile = {
        name: 'test-file.md',
        size: content.length,
        type: 'text/markdown'
      };

      // Create a mock FileReader
      const mockReader = {
        readAsText: function() {
          setTimeout(() => {
            this.result = content;
            if (this.onload) this.onload();
          }, 100);
        },
        onload: null,
        onerror: null,
        onabort: null,
        result: null
      };

      // Override FileReader for this test
      const originalFileReader = window.FileReader;
      window.FileReader = function() { return mockReader; };

      try {
        // Call loadFile method if available
        if (window.markdownEditor && window.markdownEditor.loadFile) {
          window.markdownEditor.loadFile(mockFile);
          return true;
        }
        return false;
      } finally {
        // Restore original FileReader
        window.FileReader = originalFileReader;
      }
    }, { content: testContent });

    await page.waitForTimeout(1000);

    // Verify file loading success log (Line 149)
    expect(consoleLogs.some(log =>
      log.includes('📄 Loaded file:') && log.includes('test-file.md')
    )).toBeTruthy();
  });

  test('should initialize global console commands (Lines 359-366)', async ({ page }) => {
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Verify console initialization messages (Lines 364-366)
    expect(consoleLogs).toContain('💡 Console commands available:');
    expect(consoleLogs).toContain('   • markdownEditor - Editor instance');
    expect(consoleLogs).toContain('   • showCollabStory() - Development journey!');

    // Test global markdownEditor object (Line 361)
    const markdownEditorExists = await page.evaluate(() =>
      typeof window.markdownEditor !== 'undefined'
    );
    expect(markdownEditorExists).toBeTruthy();

    const markdownEditorType = await page.evaluate(() =>
      window.markdownEditor?.constructor?.name
    );
    expect(markdownEditorType).toBe('MarkdownEditor');

    // Test showCollabStory function (Line 362)
    const showCollabStoryExists = await page.evaluate(() =>
      typeof window.showCollabStory === 'function'
    );
    expect(showCollabStoryExists).toBeTruthy();

    // Execute showCollabStory and verify it works
    const storyResult = await page.evaluate(() => {
      try {
        window.showCollabStory();
        return true;
      } catch (e) {
        return false;
      }
    });
    expect(storyResult).toBeTruthy();
  });

  test('should handle special characters in filenames (Line 149 edge case)', async ({ page }) => {
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#markdown-editor', { timeout: 5000 });

    // Test with special characters and spaces
    const specialFilename = 'test file (with) special-chars & symbols.md';
    const testContent = '# Special Characters Test\n\nTesting filename handling.';

    // Simulate file loading with special characters
    await page.evaluate(({ filename, content }) => {
      const mockFile = {
        name: filename,
        size: content.length,
        type: 'text/markdown'
      };

      const mockReader = {
        readAsText: function() {
          setTimeout(() => {
            this.result = content;
            if (this.onload) this.onload();
          }, 100);
        },
        onload: null,
        onerror: null,
        onabort: null,
        result: null
      };

      const originalFileReader = window.FileReader;
      window.FileReader = function() { return mockReader; };

      try {
        if (window.markdownEditor && window.markdownEditor.loadFile) {
          window.markdownEditor.loadFile(mockFile);
        }
      } finally {
        window.FileReader = originalFileReader;
      }
    }, { filename: specialFilename, content: testContent });

    await page.waitForTimeout(1000);

    // Verify special character handling in filename logging
    expect(consoleLogs.some(log =>
      log.includes('📄 Loaded file:') && log.includes(specialFilename)
    )).toBeTruthy();
  });

  test('should maintain application stability during DOM errors', async ({ page }) => {
    const errorLogs = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#markdown-editor', { timeout: 5000 });

    // Remove DOM elements dynamically to test error handling
    await page.evaluate(() => {
      // Remove key DOM elements
      document.getElementById('markdown-editor')?.remove();
      document.getElementById('markdown-preview')?.remove();

      // Trigger reinitialization to cause DOM error
      if (window.markdownEditor) {
        window.markdownEditor.init();
      }
    });

    await page.waitForTimeout(1000);

    // Verify error was logged
    expect(errorLogs.some(log =>
      log.includes('Required DOM elements not found')
    )).toBeTruthy();

    // Verify other functionality still works (global commands)
    const showCollabWorks = await page.evaluate(() => {
      try {
        if (window.showCollabStory) {
          window.showCollabStory();
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    });

    expect(showCollabWorks).toBeTruthy();
  });
});