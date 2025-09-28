// Coverage Completion Tests - Target remaining legitimate code paths
import { TestUtils, setupTestEnvironment } from './test-utils.js';
import MarkdownEditor from '../src/index.js';

describe('Coverage Completion - Legitimate Code Paths', () => {
    let editor;

    setupTestEnvironment();

    beforeEach(() => {
        editor = new MarkdownEditor();
        editor.init();
    });

    describe('File Validation Error Handling', () => {
        test('should handle null file parameter in loadFile', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            // Test the uncovered lines 130-131
            expect(() => {
                editor.loadFile(null);
            }).not.toThrow();

            expect(consoleSpy).toHaveBeenCalledWith('No file provided to loadFile method');
            consoleSpy.mockRestore();
        });

        test('should handle undefined file parameter in loadFile', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            // Test the uncovered lines 130-131
            expect(() => {
                editor.loadFile(undefined);
            }).not.toThrow();

            expect(consoleSpy).toHaveBeenCalledWith('No file provided to loadFile method');
            consoleSpy.mockRestore();
        });
    });

    describe('FileReader Abort Handling', () => {
        test('should handle FileReader abort event', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            const testFile = new File(['test content'], 'test.md', { type: 'text/markdown' });

            // Mock FileReader to trigger abort
            const originalFileReader = global.FileReader;
            let readerInstance;

            global.FileReader = function() {
                readerInstance = this;
                this.readAsText = function() {
                    // Trigger abort immediately
                    setTimeout(() => {
                        if (this.onabort) {
                            this.onabort();
                        }
                    }, 0);
                };
            };

            editor.loadFile(testFile);

            // Wait for async abort to trigger
            return new Promise(resolve => {
                setTimeout(() => {
                    // Test the uncovered lines 161-162
                    expect(consoleSpy).toHaveBeenCalledWith('File reading was aborted');

                    // Verify cleanup was called (handlers should be null)
                    expect(readerInstance.onload).toBeNull();
                    expect(readerInstance.onerror).toBeNull();
                    expect(readerInstance.onabort).toBeNull();

                    // Restore
                    global.FileReader = originalFileReader;
                    consoleSpy.mockRestore();
                    resolve();
                }, 10);
            });
        });
    });
});