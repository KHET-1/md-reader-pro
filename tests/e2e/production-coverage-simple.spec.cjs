import { test, expect } from '@playwright/test';

test.describe('Production Coverage Validation - Core Tests', () => {

  test('should initialize global console commands (Lines 359-366) ✅', async ({ page }) => {
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
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

  test('should maintain application stability after DOM manipulation', async ({ page }) => {
    const errorLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#markdown-editor', { timeout: 5000 });

    // Remove DOM elements dynamically to test error handling (Line 38)
    await page.evaluate(() => {
      document.getElementById('markdown-editor')?.remove();
      document.getElementById('markdown-preview')?.remove();

      // Trigger reinitialization to cause DOM error
      if (window.markdownEditor) {
        window.markdownEditor.init();
      }
    });

    await page.waitForTimeout(1000);

    // Verify error was logged (Line 38)
    expect(errorLogs.some(log =>
      log.includes('Required DOM elements not found')
    )).toBeTruthy();

    // Verify other functionality still works
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

  test('should simulate file loading success logging (Line 149)', async ({ page }) => {
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#markdown-editor', { timeout: 5000 });

    // Simulate file loading by calling loadFile directly
    await page.evaluate(() => {
      // Create a mock file object
      const mockFile = {
        name: 'test-production-file.md',
        size: 100,
        type: 'text/markdown'
      };

      // Create a mock FileReader that succeeds
      class MockFileReader {
        constructor() {
          this.onload = null;
          this.onerror = null;
          this.onabort = null;
          this.result = null;
        }

        readAsText() {
          setTimeout(() => {
            this.result = '# Test Content\n\nProduction validation test.';
            if (this.onload) {
              this.onload({ target: this });
            }
          }, 100);
        }
      }

      // Override FileReader temporarily
      const originalFileReader = window.FileReader;
      window.FileReader = MockFileReader;

      try {
        // Call loadFile method if available
        if (window.markdownEditor && window.markdownEditor.loadFile) {
          window.markdownEditor.loadFile(mockFile);
        }
      } finally {
        // Restore original FileReader after a delay
        setTimeout(() => {
          window.FileReader = originalFileReader;
        }, 500);
      }
    });

    await page.waitForTimeout(1500);

    // Verify file loading success log (Line 149)
    expect(consoleLogs.some(log =>
      log.includes('📄 Loaded file:') && log.includes('test-production-file.md')
    )).toBeTruthy();
  });
});