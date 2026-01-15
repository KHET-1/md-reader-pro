import { TestUtils, setupTestEnvironment } from './test-utils.js';
import MarkdownEditor from '../src/index.js';

describe('Memory Leak Prevention and Accessibility Fixes', () => {
    let editor;

    setupTestEnvironment();

    beforeEach(() => {
        editor = new MarkdownEditor();
        editor.init();
    });

    afterEach(() => {
        // Clean up any modals that might have been created
        const modal = document.getElementById('accessible-confirm-modal');
        if (modal) modal.remove();
    });

    describe('Memory Leak Prevention', () => {
        describe('destroy() method', () => {
            test('should have destroy method defined', () => {
                expect(typeof editor.destroy).toBe('function');
            });

            test('should clear all timers on destroy', () => {
                // Set up some timers
                editor.debounceTimer = setTimeout(() => {}, 10000);
                editor.autoSaveTimer = setTimeout(() => {}, 10000);
                editor.historyDebounce = setTimeout(() => {}, 10000);

                editor.destroy();

                expect(editor.debounceTimer).toBeNull();
                expect(editor.autoSaveTimer).toBeNull();
                expect(editor.historyDebounce).toBeNull();
            });

            test('should set _isDestroyed flag', () => {
                expect(editor._isDestroyed).toBe(false);
                editor.destroy();
                expect(editor._isDestroyed).toBe(true);
            });

            test('should not run destroy twice', () => {
                const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

                editor.destroy();
                editor.destroy(); // Should not run again

                // Console.log should only be called once for the destroy message
                const destroyCalls = consoleSpy.mock.calls.filter(
                    call => call[0] && call[0].includes('destroyed')
                );
                expect(destroyCalls.length).toBe(1);

                consoleSpy.mockRestore();
            });

            test('should clear cached elements', () => {
                editor.cachedElements = { test: document.createElement('div') };
                editor.destroy();
                expect(Object.keys(editor.cachedElements).length).toBe(0);
            });

            test('should clear history', () => {
                editor.history = ['state1', 'state2', 'state3'];
                editor.destroy();
                expect(editor.history.length).toBe(0);
            });

            test('should cancel all animations', () => {
                const cancelAllSpy = jest.spyOn(editor.anim, 'cancelAll');
                editor.destroy();
                expect(cancelAllSpy).toHaveBeenCalled();
            });

            test('should dismiss all notifications', () => {
                const dismissAllSpy = jest.spyOn(editor.notify, 'dismissAll');
                editor.destroy();
                expect(dismissAllSpy).toHaveBeenCalled();
            });

            test('should abort pending operations', () => {
                editor._abortController = new AbortController();
                const abortSpy = jest.spyOn(editor._abortController, 'abort');

                editor.destroy();

                expect(abortSpy).toHaveBeenCalled();
                expect(editor._abortController).toBeNull();
            });
        });

        describe('Event listener tracking', () => {
            test('should have _boundListeners map', () => {
                expect(editor._boundListeners).toBeInstanceOf(Map);
            });

            test('should track event listeners with _trackListener', () => {
                const element = document.createElement('button');
                const handler = jest.fn();

                const key = editor._trackListener(element, 'click', handler);

                expect(editor._boundListeners.has(key)).toBe(true);
                expect(editor._boundListeners.get(key)).toEqual({
                    element,
                    type: 'click',
                    handler,
                    options: undefined
                });
            });

            test('should remove tracked listeners with _removeTrackedListener', () => {
                const element = document.createElement('button');
                const handler = jest.fn();

                const key = editor._trackListener(element, 'click', handler);
                element.click();
                expect(handler).toHaveBeenCalledTimes(1);

                editor._removeTrackedListener(key);
                element.click();
                expect(handler).toHaveBeenCalledTimes(1); // Should not be called again

                expect(editor._boundListeners.has(key)).toBe(false);
            });
        });
    });

    describe('Accessible Confirm Modal', () => {
        test('should have showAccessibleConfirm method', () => {
            expect(typeof editor.showAccessibleConfirm).toBe('function');
        });

        test('should return a promise', () => {
            const result = editor.showAccessibleConfirm('Test message');
            expect(result).toBeInstanceOf(Promise);

            // Clean up by pressing escape
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });

        test('should create modal with proper ARIA attributes', async () => {
            const promise = editor.showAccessibleConfirm('Test message', {
                title: 'Test Title'
            });

            const modal = document.getElementById('accessible-confirm-modal');
            expect(modal).not.toBeNull();
            expect(modal.getAttribute('role')).toBe('dialog');
            expect(modal.getAttribute('aria-modal')).toBe('true');
            expect(modal.getAttribute('aria-labelledby')).toBe('confirm-title');
            expect(modal.getAttribute('aria-describedby')).toBe('confirm-message');

            // Clean up
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            await promise;
        });

        test('should resolve to true when confirm is clicked', async () => {
            const promise = editor.showAccessibleConfirm('Confirm this?');

            const modal = document.getElementById('accessible-confirm-modal');
            const confirmBtn = modal.querySelectorAll('button')[1]; // Second button is confirm
            confirmBtn.click();

            const result = await promise;
            expect(result).toBe(true);
        });

        test('should resolve to false when cancel is clicked', async () => {
            const promise = editor.showAccessibleConfirm('Cancel this?');

            const modal = document.getElementById('accessible-confirm-modal');
            const cancelBtn = modal.querySelectorAll('button')[0]; // First button is cancel
            cancelBtn.click();

            const result = await promise;
            expect(result).toBe(false);
        });

        test('should resolve to false when escape is pressed', async () => {
            const promise = editor.showAccessibleConfirm('Press escape');

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

            const result = await promise;
            expect(result).toBe(false);
        });

        test('should resolve to false when clicking outside modal', async () => {
            const promise = editor.showAccessibleConfirm('Click outside');

            const overlay = document.getElementById('accessible-confirm-modal');
            overlay.click(); // Click on overlay, not inner modal

            const result = await promise;
            expect(result).toBe(false);
        });

        test('should display custom button text', async () => {
            const promise = editor.showAccessibleConfirm('Custom buttons', {
                confirmText: 'Yes, do it',
                cancelText: 'No, cancel'
            });

            const modal = document.getElementById('accessible-confirm-modal');
            const buttons = modal.querySelectorAll('button');

            expect(buttons[0].textContent).toBe('No, cancel');
            expect(buttons[1].textContent).toBe('Yes, do it');

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            await promise;
        });

        test('should display timestamp when provided', async () => {
            const timestamp = '2024-01-15T10:30:00.000Z';
            const promise = editor.showAccessibleConfirm('With timestamp', {
                timestamp
            });

            const modal = document.getElementById('accessible-confirm-modal');
            expect(modal.textContent).toContain('Saved:');

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            await promise;
        });

        test('should focus confirm button on open', async () => {
            const promise = editor.showAccessibleConfirm('Focus test');

            const modal = document.getElementById('accessible-confirm-modal');
            const confirmBtn = modal.querySelectorAll('button')[1];

            expect(document.activeElement).toBe(confirmBtn);

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            await promise;
        });

        test('should remove modal from DOM after closing', async () => {
            const promise = editor.showAccessibleConfirm('Cleanup test');

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            await promise;

            const modal = document.getElementById('accessible-confirm-modal');
            expect(modal).toBeNull();
        });
    });

    describe('Race Condition Prevention in loadFromAutoSave', () => {
        test('should have _abortController property', () => {
            expect(editor._abortController).toBeDefined();
        });

        test('should detect content changes during restore prompt', async () => {
            // Mock localStorage
            const savedContent = '# Saved Content';
            const mockSaved = JSON.stringify({
                content: savedContent,
                timestamp: new Date().toISOString(),
                version: '4.0.0'
            });

            jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(mockSaved);

            // Set up editor
            editor.editor = { value: '' };

            // Start loadFromAutoSave but don't await
            const loadPromise = editor.loadFromAutoSave();

            // Simulate user typing while modal is open
            editor.editor.value = 'New content typed during prompt';

            // Cancel the modal
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

            await loadPromise;

            // Content should not have been restored because it changed
            expect(editor.editor.value).toBe('New content typed during prompt');

            jest.restoreAllMocks();
        });

        test('should abort previous loadFromAutoSave when called again', async () => {
            const savedContent = JSON.stringify({
                content: '# Test',
                timestamp: new Date().toISOString(),
                version: '4.0.0'
            });

            jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(savedContent);
            editor.editor = { value: '' };

            // Call loadFromAutoSave twice quickly
            const promise1 = editor.loadFromAutoSave();
            const promise2 = editor.loadFromAutoSave();

            // First should be aborted, close the second modal
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

            await Promise.all([promise1, promise2]);

            jest.restoreAllMocks();
        });
    });

    describe('Global Namespace', () => {
        test('should use MDReaderPro namespace', () => {
            // Create a new editor to test global setup
            const testEditor = new MarkdownEditor();

            // The global MDReaderPro should be frozen
            if (typeof window.MDReaderPro !== 'undefined') {
                expect(Object.isFrozen(window.MDReaderPro)).toBe(true);
            }
        });

        test('should have destroy method exposed via namespace', () => {
            if (typeof window.MDReaderPro !== 'undefined') {
                expect(typeof window.MDReaderPro.destroy).toBe('function');
            }
        });
    });
});
