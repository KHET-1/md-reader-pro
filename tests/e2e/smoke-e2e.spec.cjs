/**
 * Smoke E2E: minimal critical path for fast CI/swarm runs.
 * Run with: npx playwright test tests/e2e/smoke-e2e.spec.cjs
 */
const { test, expect } = require('@playwright/test');

test.describe('MD Reader Pro - Smoke E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('app loads and main content is visible', async ({ page }) => {
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('.tab').first()).toBeVisible();
  });

  test('editor tab has textarea and preview updates', async ({ page }) => {
    const editor = page.locator('#markdown-editor');
    await expect(editor).toBeVisible();
    await editor.fill('# Hello\n\nWorld.');
    await expect(page.locator('#markdown-preview')).toContainText('Hello');
  });

  test('Find modal opens from toolbar', async ({ page }) => {
    await page.locator('#find-btn').click();
    await expect(page.locator('#find-replace-modal')).toBeVisible({ timeout: 2000 });
  });

  test('Export button exports and shows toast', async ({ page }) => {
    await page.locator('[data-tab="editor"]').click();
    await page.locator('#markdown-editor').fill('# Test');
    const exportBtn = page.getByRole('button', { name: /export/i });
    await expect(exportBtn.first()).toBeVisible();
    const downloadPromise = page.waitForEvent('download', { timeout: 6000 });
    await exportBtn.first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.html$/);
  });
});
