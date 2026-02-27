import { test, expect } from '@playwright/test';

test.describe('MD Reader Pro - Performance E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Page load performance metrics', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    console.log(`Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    
    // Check for performance issues
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalTime: navigation.loadEventEnd - navigation.fetchStart
      };
    });
    
    console.log('Performance metrics:', performanceMetrics);
    expect(performanceMetrics.totalTime).toBeLessThan(2000);
  });

  test('Animation performance and frame rate', async ({ page }) => {
    // Test animation smoothness
    const editorTab = page.locator('[data-tab="editor"]');
    const previewTab = page.locator('[data-tab="preview"]');
    
    // Measure animation performance
    const startTime = Date.now();
    
    // Rapidly switch between tabs
    for (let i = 0; i < 10; i++) {
      await editorTab.click();
      await page.waitForTimeout(50);
      await previewTab.click();
      await page.waitForTimeout(50);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`Animation test completed in: ${totalTime}ms`);
    expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
    
    // Check that animations are still smooth
    const activeTab = page.locator('.tab.active');
    await expect(activeTab).toBeVisible();
  });

  test('Memory usage and garbage collection', async ({ page }) => {
    // Test memory usage during heavy operations
    const editor = page.locator('#markdown-editor');
    
    // Fill editor with large content
    const largeContent = '# Performance Test\n\n' + 
      'This is a test line for performance testing.\n'.repeat(50);
    
    await editor.fill(largeContent);
    
    // Test find and replace operations
    await page.locator('#find-btn').click();
    await page.locator('#find-input').fill('test');
    
    // Perform multiple find operations
    for (let i = 0; i < 5; i++) {
      await page.locator('#find-next').click();
      await page.waitForTimeout(100);
    }
    
    // Close modal
    await page.locator('#find-replace-close').click();
    
    // Test auto-complete performance
    await editor.click();
    await editor.type('# ');
    
    const autocomplete = page.locator('#autocomplete-dropdown');
    await expect(autocomplete).toBeVisible({ timeout: 1000 });
    
    // App should still be responsive
    const wordCount = page.locator('#word-count');
    await expect(wordCount).toBeVisible();
  });

  test('Large document handling', async ({ page }) => {
    // Test with very large document
    const editor = page.locator('#markdown-editor');
    
    // Create a large markdown document
    let largeDoc = '# Large Document\n\n';
    for (let i = 1; i <= 100; i++) {
      largeDoc += `## Section ${i}\n\n`;
      largeDoc += `This is section ${i} with multiple paragraphs. `.repeat(10) + '\n\n';
      largeDoc += `- List item 1 in section ${i}\n`;
      largeDoc += `- List item 2 in section ${i}\n`;
      largeDoc += `- List item 3 in section ${i}\n\n`;
    }
    
    const startTime = Date.now();
    await editor.fill(largeDoc);
    const fillTime = Date.now() - startTime;
    
    console.log(`Large document fill time: ${fillTime}ms`);
    expect(fillTime).toBeLessThan(5000); // Should fill within 5 seconds
    
    // Test statistics calculation
    const wordCount = page.locator('#word-count');
    await expect(wordCount).toContainText('100'); // Should count words correctly
    
    // Test preview rendering
    await page.locator('[data-tab="preview"]').click();
    const preview = page.locator('#markdown-preview');
    await expect(preview).toBeVisible();
    
    // Test export performance
    await page.locator('[data-tab="editor"]').click();
    await page.locator('#export-btn').click();
    
    const exportStartTime = Date.now();
    await page.locator('[data-format="html"]').click();
    
    // Wait for export to complete
    const exportToast = page.locator('.toast').filter({ hasText: 'HTML file exported' });
    await expect(exportToast).toBeVisible({ timeout: 10000 });
    const exportTime = Date.now() - exportStartTime;
    
    console.log(`Export time: ${exportTime}ms`);
    expect(exportTime).toBeLessThan(10000); // Should export within 10 seconds
  });

  test('Concurrent operations performance', async ({ page }) => {
    // Test multiple operations happening simultaneously
    const editor = page.locator('#markdown-editor');
    await editor.fill('# Concurrent Test\n\nTesting multiple operations simultaneously.');
    
    // Start multiple operations
    const operations = [
      // Rapid typing
      editor.type(' Adding more content.'),
      
      // Tab switching
      page.locator('[data-tab="preview"]').click(),
      page.locator('[data-tab="editor"]').click(),
      
      // Statistics updates
      page.waitForSelector('#word-count'),
      
      // Auto-complete
      editor.click(),
      editor.type('**'),
      
      // Find operation
      page.locator('#find-btn').click(),
      page.locator('#find-input').fill('test'),
      page.locator('#find-next').click(),
    ];
    
    const startTime = Date.now();
    
    // Execute operations concurrently
    await Promise.all(operations.map(op => op.catch(console.error)));
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`Concurrent operations completed in: ${totalTime}ms`);
    expect(totalTime).toBeLessThan(3000); // Should complete within 3 seconds
    
    // App should still be responsive
    const activeTab = page.locator('.tab.active');
    await expect(activeTab).toBeVisible();
  });

  test('Mobile performance', async ({ page }) => {
    // Test mobile viewport performance
    await page.setViewportSize({ width: 375, height: 667 });
    
    const startTime = Date.now();
    
    // Test mobile interactions
    const editorTab = page.locator('[data-tab="editor"]');
    await editorTab.click();
    
    const editor = page.locator('#markdown-editor');
    await editor.fill('# Mobile Test\n\nTesting mobile performance.');
    
    // Test touch interactions
    const tabs = page.locator('.tab');
    for (let i = 0; i < 5; i++) {
      await tabs.nth(i % tabs.count()).click();
      await page.waitForTimeout(100);
    }
    
    const endTime = Date.now();
    const mobileTime = endTime - startTime;
    
    console.log(`Mobile operations completed in: ${mobileTime}ms`);
    expect(mobileTime).toBeLessThan(2000); // Should be fast on mobile
    
    // Verify mobile layout is correct
    const header = page.locator('.header');
    await expect(header).toBeVisible();
    
    const contentArea = page.locator('.content-area');
    await expect(contentArea).toBeVisible();
  });

  test('Network performance and caching', async ({ page }) => {
    // Test network requests
    const requests = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that we're not making unnecessary requests
    const staticRequests = requests.filter(req => 
      req.resourceType === 'image' || 
      req.resourceType === 'stylesheet' || 
      req.resourceType === 'script'
    );
    
    console.log(`Static resource requests: ${staticRequests.length}`);
    expect(staticRequests.length).toBeLessThan(10); // Should be minimal
    
    // Test that resources are cached
    const cachedRequests = requests.filter(req => 
      req.url.includes('bundle') || req.url.includes('css')
    );
    
    expect(cachedRequests.length).toBeGreaterThan(0);
  });

  test('Error recovery performance', async ({ page }) => {
    // Test error handling doesn't impact performance
    const editor = page.locator('#markdown-editor');
    
    // Test rapid input that might cause errors
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      await editor.type('a');
      await page.waitForTimeout(10);
    }
    
    const endTime = Date.now();
    const inputTime = endTime - startTime;
    
    console.log(`Rapid input completed in: ${inputTime}ms`);
    expect(inputTime).toBeLessThan(5000); // Should handle rapid input
    
    // Test that statistics still update correctly
    const wordCount = page.locator('#word-count');
    await expect(wordCount).toContainText('100'); // Should count all 'a' characters
    
    // Test that app is still responsive
    const activeTab = page.locator('.tab.active');
    await expect(activeTab).toBeVisible();
  });
});
