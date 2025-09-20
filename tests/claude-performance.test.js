import { TestUtils, setupTestEnvironment } from './test-utils.js';
import MarkdownEditor from '../src/index.js';
import fs from 'fs';
import path from 'path';

describe('Claude Performance Analysis', () => {
    let editor;
    let markdownContent;

    setupTestEnvironment();

    beforeAll(() => {
        const filePath = path.join(__dirname, 'performance-test-document.md');
        markdownContent = fs.readFileSync(filePath, 'utf8');
    });

    beforeEach(() => {
        editor = new MarkdownEditor();
        editor.init();
    });

    describe('Rendering Performance', () => {
        test('should render the performance test document', () => {
            const startTime = performance.now();
            editor.editor.value = markdownContent;
            editor.updatePreview();
            const endTime = performance.now();
            const duration = endTime - startTime;
            console.log(`Rendering Performance: ${duration.toFixed(2)}ms`);
            expect(duration).toBeLessThan(1000);
        });
    });

    describe('File Loading Performance', () => {
        test('should load the performance test document', async () => {
            const file = new File([markdownContent], 'performance-test-document.md', { type: 'text/markdown' });
            const startTime = performance.now();
            editor.loadFile(file);
            await TestUtils.waitFor(10);
            const endTime = performance.now();
            const duration = endTime - startTime;
            console.log(`File Loading Performance: ${duration.toFixed(2)}ms`);
            expect(duration).toBeLessThan(1000);
        });
    });

    describe('Interactive Performance', () => {
        test('should handle typing simulation', () => {
            const textToType = markdownContent.substring(0, 100);
            const startTime = performance.now();
            for (let i = 0; i < textToType.length; i++) {
                editor.editor.value = textToType.substring(0, i + 1);
                editor.updatePreview();
            }
            const endTime = performance.now();
            const duration = endTime - startTime;
            const averageTime = duration / textToType.length;
            console.log(`Interactive Performance (Typing): ${averageTime.toFixed(2)}ms per character`);
            expect(averageTime).toBeLessThan(10);
        });

        test('should handle tab indentation', () => {
            const startTime = performance.now();
            for (let i = 0; i < 20; i++) {
                const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
                editor.handleKeyboardShortcuts(tabEvent);
            }
            const endTime = performance.now();
            const duration = endTime - startTime;
            console.log(`Interactive Performance (Tab Indentation): ${(duration / 20).toFixed(2)}ms per tab`);
            expect(duration).toBeLessThan(100);
        });
    });

    describe('Memory Performance', () => {
        test('should measure memory usage after rendering', () => {
            const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            editor.editor.value = markdownContent;
            editor.updatePreview();
            const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            const memoryUsage = finalMemory - initialMemory;
            console.log(`Memory Performance (Rendering): ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
            expect(memoryUsage).toBeLessThan(20 * 1024 * 1024);
        });

        test('should check for memory leaks', () => {
            const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            for (let i = 0; i < 50; i++) {
                editor.editor.value = markdownContent;
                editor.updatePreview();
                editor.editor.value = '';
                editor.updatePreview();
            }
            if (global.gc) {
                global.gc();
            }
            const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            const memoryIncrease = finalMemory - initialMemory;
            console.log(`Memory Performance (Leak Check): ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
            expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
        });
    });
});
