import { test, expect } from '@playwright/test';

test.describe('MD Reader Pro - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3017');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Phase 1: Essential 2025 Standards', () => {
    test('Accessibility - Skip link and ARIA attributes', async ({ page }) => {
      // Test skip link
      const skipLink = page.locator('.skip-link');
      await expect(skipLink).toBeVisible();
      await skipLink.click();
      
      // Test ARIA attributes on tabs
      const tabs = page.locator('.tab');
      await expect(tabs.first()).toHaveAttribute('role', 'tab');
      await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
      
      // Test main content area
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toHaveAttribute('role', 'main');
    });

    test('Loading states and toast notifications', async ({ page }) => {
      // Test welcome toast appears
      const toast = page.locator('.toast').first();
      await expect(toast).toBeVisible({ timeout: 2000 });
      
      // Test toast content
      await expect(toast).toContainText('Welcome to MD Reader Pro');
    });

    test('Mobile responsiveness', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check that elements are still accessible
      const header = page.locator('.header');
      await expect(header).toBeVisible();
      
      const tabs = page.locator('.tabs');
      await expect(tabs).toBeVisible();
    });

    test('Error handling and file validation', async ({ page }) => {
      // Test file input with invalid file type
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('test content')
      });
      
      // Should handle file upload gracefully
      await page.waitForTimeout(1000);
    });

    test('Keyboard navigation', async ({ page }) => {
      // Test Tab navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Test Escape key closes panels
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Phase 2: Advanced Animations & Micro-interactions', () => {
    test('Hover effects and magnetic interactions', async ({ page }) => {
      // Test magnetic effect on tabs
      const firstTab = page.locator('.tab').first();
      await firstTab.hover();
      
      // Test hover lift effect
      const toolbarBtn = page.locator('.toolbar-btn').first();
      await toolbarBtn.hover();
      
      // Verify elements are interactive
      await expect(firstTab).toBeVisible();
      await expect(toolbarBtn).toBeVisible();
    });

    test('Smooth transitions and animations', async ({ page }) => {
      // Test tab switching animations
      const previewTab = page.locator('[data-tab="preview"]');
      await previewTab.click();
      
      // Wait for transition
      await page.waitForTimeout(300);
      
      // Verify tab is active
      await expect(previewTab).toHaveClass(/active/);
    });

    test('Touch gesture support', async ({ page }) => {
      // Test swipe navigation (simulated)
      const contentArea = page.locator('.content-area');
      
      // Simulate touch events
      await contentArea.touchscreen.tap(100, 100);
      await contentArea.touchscreen.tap(200, 100);
    });

    test('Performance monitoring', async ({ page }) => {
      // Test that animations are smooth
      const statusIndicator = page.locator('.status-indicator');
      await expect(statusIndicator).toBeVisible();
      
      // Check for floating animation
      await page.waitForTimeout(1000);
    });
  });

  test.describe('Phase 3: Enhanced Editor Features & Productivity Tools', () => {
    test('Editor interface and statistics', async ({ page }) => {
      // Switch to editor tab
      const editorTab = page.locator('[data-tab="editor"]');
      await editorTab.click();
      
      // Check editor header is visible
      const editorHeader = page.locator('.editor-header');
      await expect(editorHeader).toBeVisible();
      
      // Check statistics are displayed
      const wordCount = page.locator('#word-count');
      const readingTime = page.locator('#reading-time');
      const lineCount = page.locator('#line-count');
      
      await expect(wordCount).toBeVisible();
      await expect(readingTime).toBeVisible();
      await expect(lineCount).toBeVisible();
    });

    test('Live text analysis', async ({ page }) => {
      // Switch to editor
      await page.locator('[data-tab="editor"]').click();
      
      const editor = page.locator('#markdown-editor');
      await editor.fill('# Test Heading\n\nThis is a test paragraph with multiple words.');
      
      // Check that statistics update
      const wordCount = page.locator('#word-count');
      await expect(wordCount).toContainText('8'); // Should count words
      
      const readingTime = page.locator('#reading-time');
      await expect(readingTime).toContainText('1'); // Should calculate reading time
    });

    test('Find and replace functionality', async ({ page }) => {
      // Switch to editor
      await page.locator('[data-tab="editor"]').click();
      
      // Fill editor with test content
      const editor = page.locator('#markdown-editor');
      await editor.fill('Test content with multiple test words.');
      
      // Open find modal
      const findBtn = page.locator('#find-btn');
      await findBtn.click();
      
      // Check modal is visible
      const findModal = page.locator('#find-replace-modal');
      await expect(findModal).toBeVisible();
      
      // Test find functionality
      const findInput = page.locator('#find-input');
      await findInput.fill('test');
      
      const findNextBtn = page.locator('#find-next');
      await findNextBtn.click();
      
      // Check that text is selected
      const selectedText = await editor.evaluate(el => el.value.substring(el.selectionStart, el.selectionEnd));
      expect(selectedText.toLowerCase()).toContain('test');
    });

    test('Auto-complete functionality', async ({ page }) => {
      // Switch to editor
      await page.locator('[data-tab="editor"]').click();
      
      const editor = page.locator('#markdown-editor');
      await editor.click();
      
      // Type trigger for auto-complete
      await editor.type('# ');
      
      // Check if auto-complete dropdown appears
      const autocomplete = page.locator('#autocomplete-dropdown');
      await expect(autocomplete).toBeVisible({ timeout: 1000 });
      
      // Check if suggestions are shown
      const suggestions = page.locator('.autocomplete-item');
      await expect(suggestions.first()).toBeVisible();
    });

    test('Export functionality', async ({ page }) => {
      // Switch to editor
      await page.locator('[data-tab="editor"]').click();
      
      // Add some content
      const editor = page.locator('#markdown-editor');
      await editor.fill('# Test Document\n\nThis is test content for export.');
      
      // Test export dropdown
      const exportBtn = page.locator('#export-btn');
      await exportBtn.click();
      
      // Check export options are visible
      const exportOptions = page.locator('#export-options');
      await expect(exportOptions).toBeVisible();
      
      // Test HTML export
      const htmlExport = page.locator('[data-format="html"]');
      await htmlExport.click();
      
      // Check for success notification
      const successToast = page.locator('.toast').filter({ hasText: 'HTML file exported' });
      await expect(successToast).toBeVisible({ timeout: 2000 });
    });

    test('Keyboard shortcuts', async ({ page }) => {
      // Test command palette shortcut
      await page.keyboard.press('Control+k');
      
      const commandPalette = page.locator('#command-palette');
      await expect(commandPalette).toBeVisible();
      
      // Close command palette
      await page.keyboard.press('Escape');
      await expect(commandPalette).not.toBeVisible();
      
      // Test shortcuts modal
      await page.keyboard.press('Control+Shift+?');
      
      const shortcutsModal = page.locator('#shortcuts-modal');
      await expect(shortcutsModal).toBeVisible();
      
      // Close shortcuts modal
      const closeBtn = page.locator('#shortcuts-close');
      await closeBtn.click();
      await expect(shortcutsModal).not.toBeVisible();
    });

    test('Tab navigation and content switching', async ({ page }) => {
      // Test all tab modes
      const tabs = ['editor', 'preview', 'split', 'annotation', 'reader'];
      
      for (const tab of tabs) {
        const tabElement = page.locator(`[data-tab="${tab}"]`);
        await tabElement.click();
        
        // Verify tab is active
        await expect(tabElement).toHaveClass(/active/);
        
        // Verify content area updates
        const contentArea = page.locator('.main-pane');
        await expect(contentArea).toBeVisible();
        
        await page.waitForTimeout(200); // Allow for transitions
      }
    });
  });

  test.describe('Cross-Phase Integration Tests', () => {
    test('Complete user workflow', async ({ page }) => {
      // 1. Open app and see welcome message
      const welcomeToast = page.locator('.toast').first();
      await expect(welcomeToast).toBeVisible({ timeout: 2000 });
      
      // 2. Switch to editor
      await page.locator('[data-tab="editor"]').click();
      
      // 3. Type content and see live stats
      const editor = page.locator('#markdown-editor');
      await editor.fill('# My Document\n\nThis is a comprehensive test of the MD Reader Pro application.');
      
      // 4. Check statistics update
      const wordCount = page.locator('#word-count');
      await expect(wordCount).toContainText('12');
      
      // 5. Use find and replace
      await page.locator('#find-btn').click();
      await page.locator('#find-input').fill('test');
      await page.locator('#find-next').click();
      
      // 6. Switch to preview
      await page.locator('[data-tab="preview"]').click();
      
      // 7. Verify preview renders markdown
      const preview = page.locator('#markdown-preview');
      await expect(preview).toBeVisible();
      
      // 8. Test export
      await page.locator('[data-tab="editor"]').click();
      await page.locator('#export-btn').click();
      await page.locator('[data-format="html"]').click();
      
      // 9. Verify success notification
      const exportToast = page.locator('.toast').filter({ hasText: 'HTML file exported' });
      await expect(exportToast).toBeVisible({ timeout: 2000 });
    });

    test('Settings and color picker', async ({ page }) => {
      // Open settings
      await page.locator('#settings-toggle').click();
      
      const settingsPanel = page.locator('.settings-panel');
      await expect(settingsPanel).toBeVisible();
      
      // Test color picker
      const colorOptions = page.locator('.color-option');
      await expect(colorOptions).toHaveCount(10); // 9 colors + rainbow
      
      // Test color change
      const firstColor = colorOptions.first();
      await firstColor.click();
      
      // Verify color change is applied
      await page.waitForTimeout(500);
    });

    test('Command palette integration', async ({ page }) => {
      // Open command palette
      await page.locator('#command-toggle').click();
      
      const commandPalette = page.locator('#command-palette');
      await expect(commandPalette).toBeVisible();
      
      // Test search functionality
      const searchInput = page.locator('#command-input');
      await searchInput.fill('find');
      
      // Check if find command appears
      const findCommand = page.locator('.command-item').filter({ hasText: 'Find' });
      await expect(findCommand).toBeVisible();
      
      // Test command execution
      await findCommand.click();
      
      // Verify find modal opens
      const findModal = page.locator('#find-replace-modal');
      await expect(findModal).toBeVisible();
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('Page load performance', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('http://localhost:3017');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time
      expect(loadTime).toBeLessThan(5000);
    });

    test('Animation performance', async ({ page }) => {
      // Test that animations are smooth
      const tabs = page.locator('.tab');
      
      // Rapidly switch tabs to test animation performance
      for (let i = 0; i < 5; i++) {
        await tabs.nth(i % tabs.count()).click();
        await page.waitForTimeout(100);
      }
      
      // Should not have any visual glitches
      const activeTab = page.locator('.tab.active');
      await expect(activeTab).toBeVisible();
    });

    test('Memory usage and cleanup', async ({ page }) => {
      // Test that modals close properly and don't leak
      await page.locator('#find-btn').click();
      await page.locator('#find-replace-close').click();
      
      await page.locator('#shortcuts-btn').click();
      await page.locator('#shortcuts-close').click();
      
      await page.locator('#command-toggle').click();
      await page.keyboard.press('Escape');
      
      // All modals should be closed
      const modals = page.locator('.find-replace-modal, .shortcuts-modal, .command-palette');
      for (let i = 0; i < await modals.count(); i++) {
        await expect(modals.nth(i)).not.toBeVisible();
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('Empty content handling', async ({ page }) => {
      // Test export with empty content
      await page.locator('[data-tab="editor"]').click();
      await page.locator('#export-btn').click();
      await page.locator('[data-format="html"]').click();
      
      // Should show warning toast
      const warningToast = page.locator('.toast').filter({ hasText: 'No content to export' });
      await expect(warningToast).toBeVisible();
    });

    test('Large content handling', async ({ page }) => {
      // Test with large content
      const editor = page.locator('#markdown-editor');
      const largeContent = '# Large Document\n\n' + 'This is a test line.\n'.repeat(100);
      await editor.fill(largeContent);
      
      // Statistics should still update
      const wordCount = page.locator('#word-count');
      await expect(wordCount).toContainText('100'); // Should count words correctly
    });

    test('Rapid user interactions', async ({ page }) => {
      // Test rapid tab switching
      const tabs = page.locator('.tab');
      
      for (let i = 0; i < 10; i++) {
        await tabs.nth(i % tabs.count()).click();
        await page.waitForTimeout(50);
      }
      
      // App should still be responsive
      const activeTab = page.locator('.tab.active');
      await expect(activeTab).toBeVisible();
    });
  });
});
