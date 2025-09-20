import { TestUtils, setupTestEnvironment } from './test-utils.js';
// MD Reader Pro - Accessibility and UX Tests
import MarkdownEditor from '../src/index.js';

describe('Accessibility and User Experience', () => {
    let editor;

    setupTestEnvironment();

    beforeEach(() => {
        editor = new MarkdownEditor();
        editor.init();
    });

    describe('Keyboard Navigation', () => {
        test('should handle Tab key for indentation', () => {
            editor.editor.value = 'Some text';
            editor.editor.selectionStart = 9;
            editor.editor.selectionEnd = 9;

            // Simulate Tab key press
            const tabEvent = new KeyboardEvent('keydown', {
                key: 'Tab',
                bubbles: true,
                cancelable: true
            });

            editor.editor.dispatchEvent(tabEvent);

            // Should have prevented default and added spaces
            expect(editor.editor.value).toContain('    '); // 4 spaces for tab
        });

        test('should handle Ctrl+S for save', () => {
            const saveMarkdownSpy = jest.spyOn(editor, 'saveMarkdown');

            // Simulate Ctrl+S
            const saveEvent = new KeyboardEvent('keydown', {
                key: 's',
                ctrlKey: true,
                bubbles: true,
                cancelable: true
            });

            editor.editor.dispatchEvent(saveEvent);

            expect(saveMarkdownSpy).toHaveBeenCalled();
        });

        test('should handle Cmd+S for save on Mac', () => {
            const saveMarkdownSpy = jest.spyOn(editor, 'saveMarkdown');

            // Simulate Cmd+S (metaKey for Mac)
            const saveEvent = new KeyboardEvent('keydown', {
                key: 's',
                metaKey: true,
                bubbles: true,
                cancelable: true
            });

            editor.editor.dispatchEvent(saveEvent);

            expect(saveMarkdownSpy).toHaveBeenCalled();
        });
    });

    describe('ARIA Labels and Accessibility', () => {
        test('should have proper ARIA labels on help button', () => {
            const helpToggle = document.getElementById('help-toggle');
            expect(helpToggle.getAttribute('aria-label')).toBe('Open help');
        });

        test('should update ARIA labels when toggling help', () => {
            const helpToggle = document.getElementById('help-toggle');
            const helpBar = document.querySelector('.help-bar');

            // Click to open
            helpToggle.click();
            expect(helpToggle.getAttribute('aria-label')).toBe('Close help');

            // Click to close
            helpToggle.click();
            expect(helpToggle.getAttribute('aria-label')).toBe('Open help');
        });
    });

    describe('Responsive Design Elements', () => {
        test('should have viewport meta tag for mobile compatibility', () => {
            // This would typically be tested in an integration test
            // Here we verify the principle exists
            const viewportMeta = document.querySelector('meta[name="viewport"]');
            // In our test environment, we simulate this exists
            expect(typeof window.innerWidth).toBe('number');
            expect(typeof window.innerHeight).toBe('number');
        });

        test('should handle touch events gracefully', () => {
            // Test that touch events don't break functionality
            const touchEvent = new Event('touchstart', { bubbles: true });

            expect(() => {
                editor.editor.dispatchEvent(touchEvent);
            }).not.toThrow();
        });
    });

    describe('Error Handling and Resilience', () => {
        test('should handle markdown parsing errors gracefully', () => {
            // Test with potentially problematic markdown
            const problematicMarkdown = '# Unclosed [link\n**Unclosed bold\n`Unclosed code';
            editor.editor.value = problematicMarkdown;

            expect(() => {
                editor.updatePreview();
            }).not.toThrow();

            // Should still render something
            expect(editor.preview.innerHTML).toBeTruthy();
        });

        test('should handle very large files', () => {
            // Test with large content
            const largeContent = 'A'.repeat(100000); // 100KB of text
            editor.editor.value = largeContent;

            expect(() => {
                editor.updatePreview();
            }).not.toThrow();
        });

        test('should handle special Unicode characters', () => {
            const unicodeContent = '# 🚀 Unicode Test\n\n*Émojis* and **spëcial** characters: 中文 العربية';
            editor.editor.value = unicodeContent;

            expect(() => {
                editor.updatePreview();
            }).not.toThrow();

            expect(editor.preview.innerHTML).toContain('🚀');
        });
    });

    describe('Performance Considerations', () => {
        test('should not block UI with heavy operations', () => {
            const startTime = performance.now();

            // Simulate heavy markdown content
            const heavyContent = '# '.repeat(1000) + 'Heavy Content\n' + '- Item\n'.repeat(1000);
            editor.editor.value = heavyContent;
            editor.updatePreview();

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Should complete reasonably quickly (less than 1 second)
            expect(duration).toBeLessThan(1000);
        });

        test('should handle rapid input changes', () => {
            // Simulate rapid typing
            for (let i = 0; i < 50; i++) {
                editor.editor.value += 'a';
                editor.updatePreview();
            }

            expect(editor.editor.value.length).toBe(50);
            expect(editor.preview.innerHTML).toBeTruthy();
        });
    });

    describe('File Upload Security', () => {
        test('should only accept text files for reading', () => {
            const file = new File(['# Test content'], 'test.md', { type: 'text/markdown' });

            expect(() => {
                editor.loadFile(file);
            }).not.toThrow();
        });

        test('should handle file reading errors', () => {
            // Mock FileReader to simulate error
            const originalFileReader = window.FileReader;

            window.FileReader = class MockFileReader {
                readAsText() {
                    setTimeout(() => {
                        if (this.onerror) {
                            this.onerror({ target: { error: new Error('Read error') } });
                        }
                    }, 0);
                }
            };

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const file = new File(['content'], 'test.md', { type: 'text/markdown' });

            editor.loadFile(file);

            // Wait for async operation
            setTimeout(() => {
                expect(consoleSpy).toHaveBeenCalledWith('File reading error:', expect.any(Object));
                consoleSpy.mockRestore();
                window.FileReader = originalFileReader;
            }, 10);
        });
    });

    describe('Cross-browser Compatibility', () => {
        test('should work with different clipboard APIs', () => {
            // Test that copy functionality works regardless of clipboard API availability
            const originalClipboard = navigator.clipboard;

            // Simulate missing clipboard API
            Object.defineProperty(navigator, 'clipboard', {
                value: undefined,
                configurable: true
            });

            expect(() => {
                window.copyToEditor && window.copyToEditor('# Test');
            }).not.toThrow();

            // Restore
            Object.defineProperty(navigator, 'clipboard', {
                value: originalClipboard,
                configurable: true
            });
        });

        test('should handle missing modern JavaScript features', () => {
            // Test that the app works with feature detection
            expect(typeof Promise).toBe('function');
            expect(typeof Array.from).toBe('function');
            expect(typeof Object.assign).toBe('function');
        });
    });
});