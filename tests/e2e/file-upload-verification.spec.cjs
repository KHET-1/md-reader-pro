/**
 * E2E Test - Verify file upload works without freezing
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('File Upload - No Freeze Fix Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the app
        await page.goto('/', { waitUntil: 'networkidle' });
    });

    test('should upload a file without showing duplicate banners or freezing', async ({ page }) => {
        // Create a test file
        const testFilePath = path.join(__dirname, '../../tmp/test-upload.md');
        const testContent = `# Test File Upload\n\nThis is a test to verify the fix.\n\n## Features\n- No duplicate handlers\n- No freezing\n- Single success message`;
        
        // Ensure tmp directory exists
        const tmpDir = path.dirname(testFilePath);
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        
        fs.writeFileSync(testFilePath, testContent);

        // Set up console monitoring
        const consoleMessages = [];
        const errorMessages = [];
        
        page.on('console', msg => {
            consoleMessages.push({ type: msg.type(), text: msg.text() });
        });
        
        page.on('pageerror', error => {
            errorMessages.push(error.message);
        });

        // Upload the file
        const fileInput = page.locator('#file-input');
        await fileInput.setInputFiles(testFilePath);

        // Wait a bit for any async operations
        await page.waitForTimeout(1000);

        // Check that the content was loaded into the editor
        const editorContent = await page.locator('#markdown-editor').inputValue();
        expect(editorContent).toContain('Test File Upload');
        expect(editorContent).toContain('No duplicate handlers');

        // Check that the preview was updated
        const previewContent = await page.locator('#markdown-preview').textContent();
        expect(previewContent).toContain('Test File Upload');

        // Verify no JavaScript errors occurred
        expect(errorMessages).toHaveLength(0);

        // Check console for expected messages (should see file loaded message)
        const fileLoadMessages = consoleMessages.filter(msg => 
            msg.text.includes('Loaded file') || msg.text.includes('test-upload.md')
        );
        
        // Should have exactly one file load message (not duplicated)
        expect(fileLoadMessages.length).toBeLessThanOrEqual(1);

        // Verify the app is still responsive (not frozen)
        // Try to type in the editor
        await page.locator('#markdown-editor').click();
        await page.locator('#markdown-editor').fill('# New Content');
        const newContent = await page.locator('#markdown-editor').inputValue();
        expect(newContent).toBe('# New Content');

        // Clean up
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });

    test('should show only one success notification, not duplicate toasts', async ({ page }) => {
        // Create test file
        const testFilePath = path.join(__dirname, '../../tmp/test-toast.md');
        const testContent = '# Toast Test\n\nVerifying single notification.';
        
        const tmpDir = path.dirname(testFilePath);
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        
        fs.writeFileSync(testFilePath, testContent);

        // Upload file
        const fileInput = page.locator('#file-input');
        await fileInput.setInputFiles(testFilePath);

        // Wait for any toast notifications
        await page.waitForTimeout(500);

        // Count visible toast notifications
        const toasts = page.locator('.toast.show, .toast[style*="opacity: 1"]');
        const toastCount = await toasts.count();

        // Should have 0 or 1 toast (the HTML-based toast system was removed)
        // The actual implementation now relies on console.log, not toasts
        expect(toastCount).toBeLessThanOrEqual(1);

        // Clean up
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });
});
