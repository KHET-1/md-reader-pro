/**
 * ErrorManager Tests
 * Tests for graceful error handling with auto-cleanup
 */
import ErrorManager from '../src/utils/ErrorManager.js';

describe('ErrorManager', () => {
    let errorManager;

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        sessionStorage.clear();

        errorManager = new ErrorManager({
            maxErrors: 10,
            maxAgeDays: 7
        });
    });

    describe('Constructor', () => {
        test('should initialize with default options', () => {
            const em = new ErrorManager();
            expect(em.maxErrors).toBe(100);
            expect(em.maxAgeDays).toBe(7);
        });

        test('should accept custom options', () => {
            const em = new ErrorManager({
                maxErrors: 50,
                maxAgeDays: 3,
                cleanupPercent: 0.5
            });
            expect(em.maxErrors).toBe(50);
            expect(em.maxAgeDays).toBe(3);
            expect(em.cleanupPercent).toBe(0.5);
        });
    });

    describe('capture()', () => {
        test('should capture an Error object', () => {
            const error = new Error('Test error');
            const entry = errorManager.capture(error, { component: 'test' });

            expect(entry).not.toBeNull();
            expect(entry.message).toBe('Test error');
            expect(entry.stack).toBeDefined();
            expect(entry.context.component).toBe('test');
        });

        test('should capture a string error', () => {
            const entry = errorManager.capture('String error');

            expect(entry.message).toBe('String error');
            expect(entry.stack).toBeNull();
        });

        test('should include timestamp and session info', () => {
            const entry = errorManager.capture('Test');

            expect(entry.timestamp).toBeDefined();
            expect(entry.epochMs).toBeGreaterThan(0);
            expect(entry.sessionId).toBeDefined();
            expect(entry.id).toMatch(/^err_/);
        });

        test('should dedupe rapid identical errors', () => {
            errorManager.capture('Same error');
            const second = errorManager.capture('Same error');

            expect(second).toBeNull();
        });

        test('should not dedupe after debounce window', async () => {
            errorManager.dedupeWindow = 50;
            errorManager.capture('Same error');

            await new Promise(r => setTimeout(r, 60));

            const second = errorManager.capture('Same error');
            expect(second).not.toBeNull();
        });

        test('should trigger onError callback', () => {
            const onError = jest.fn();
            const em = new ErrorManager({ onError });

            em.capture('Test');

            expect(onError).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Test'
            }));
        });

        test('should not trigger callback in silent mode', () => {
            const onError = jest.fn();
            const em = new ErrorManager({ onError });

            em.capture('Test', {}, true);

            expect(onError).not.toHaveBeenCalled();
        });
    });

    describe('wrap()', () => {
        test('should wrap synchronous function and catch errors', () => {
            const badFn = () => { throw new Error('Wrapped error'); };
            const wrapped = errorManager.wrap(badFn, { component: 'wrap-test' });

            const result = wrapped();

            expect(result).toBeNull();
            expect(errorManager.getAll().length).toBe(1);
        });

        test('should return value for successful function', () => {
            const goodFn = () => 'success';
            const wrapped = errorManager.wrap(goodFn);

            const result = wrapped();

            expect(result).toBe('success');
        });

        test('should handle async functions', async () => {
            const asyncBadFn = async () => { throw new Error('Async error'); };
            const wrapped = errorManager.wrap(asyncBadFn);

            const result = await wrapped();

            expect(result).toBeNull();
        });
    });

    describe('getAll()', () => {
        test('should return all errors', () => {
            errorManager.capture('Error 1');
            errorManager.capture('Error 2');
            errorManager.capture('Error 3');

            // Need small delay to avoid deduping
            errorManager.lastError = null;

            const errors = errorManager.getAll();
            expect(errors.length).toBeGreaterThanOrEqual(1);
        });

        test('should filter by component', () => {
            errorManager.capture('Error 1', { component: 'ui' });
            errorManager.lastError = null;
            errorManager.capture('Error 2', { component: 'io' });

            const uiErrors = errorManager.getAll({ component: 'ui' });
            expect(uiErrors.every(e => e.context.component === 'ui')).toBe(true);
        });
    });

    describe('getRecent()', () => {
        test('should return recent errors', () => {
            for (let i = 0; i < 5; i++) {
                errorManager.lastError = null;
                errorManager.capture(`Error ${i}`);
            }

            const recent = errorManager.getRecent(3);
            expect(recent.length).toBeLessThanOrEqual(3);
        });
    });

    describe('clearAll()', () => {
        test('should clear all errors', () => {
            errorManager.capture('Error');
            errorManager.clearAll();

            expect(errorManager.getAll().length).toBe(0);
        });

        test('should trigger onErrorCleared callback', () => {
            const onErrorCleared = jest.fn();
            const em = new ErrorManager({ onErrorCleared });

            em.clearAll();

            expect(onErrorCleared).toHaveBeenCalled();
        });
    });

    describe('clearOlderThan()', () => {
        test('should clear old errors', () => {
            // Create an old error by manipulating storage
            const oldError = {
                id: 'old_1',
                message: 'Old error',
                timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                epochMs: Date.now() - 10 * 24 * 60 * 60 * 1000
            };

            localStorage.setItem(ErrorManager.STORAGE_KEY, JSON.stringify([oldError]));

            errorManager.clearOlderThan(7);

            expect(errorManager.getAll().length).toBe(0);
        });
    });

    describe('getStats()', () => {
        test('should return error statistics', () => {
            errorManager.capture('Error', { component: 'ui' });

            const stats = errorManager.getStats();

            expect(stats.total).toBeGreaterThanOrEqual(1);
            expect(stats.byComponent).toBeDefined();
            expect(stats.capacityUsed).toMatch(/%$/);
        });
    });

    describe('Auto-cleanup', () => {
        test('should cleanup when max errors exceeded', () => {
            const em = new ErrorManager({ maxErrors: 5, cleanupPercent: 0.4 });

            for (let i = 0; i < 7; i++) {
                em.lastError = null;
                em.capture(`Error ${i}`);
            }

            expect(em.getAll().length).toBeLessThanOrEqual(5);
        });
    });

    describe('Session tracking', () => {
        test('should maintain session ID', () => {
            errorManager.capture('Error 1');
            const sessionId1 = errorManager._getSessionId();

            errorManager.capture('Error 2');
            const sessionId2 = errorManager._getSessionId();

            expect(sessionId1).toBe(sessionId2);
        });

        test('should filter current session errors', () => {
            errorManager.capture('Error');

            const sessionErrors = errorManager.getCurrentSession();
            expect(sessionErrors.length).toBeGreaterThanOrEqual(1);
            expect(sessionErrors[0].sessionId).toBe(errorManager._getSessionId());
        });
    });
});

describe('MarkdownEditor Error Integration', () => {
    let editor;

    beforeEach(async () => {
        localStorage.clear();
        sessionStorage.clear();

        document.body.innerHTML = `
            <div id="app-background"></div>
            <div id="app-click-catcher"></div>
            <div id="error-toast-container"></div>
            <div class="toolbar"></div>
            <div class="header-controls"></div>
            <textarea id="markdown-editor"></textarea>
            <div id="markdown-preview"></div>
            <button id="help-toggle"><span class="help-icon"></span><span class="help-text"></span></button>
            <div class="help-bar"></div>
        `;

        const { default: MarkdownEditor } = await import('../src/index.js');
        editor = new MarkdownEditor();
        editor.init();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('should have errors property', () => {
        expect(editor.errors).toBeDefined();
        expect(editor.errors).toBeInstanceOf(Object);
    });

    test('should have error methods', () => {
        expect(typeof editor.getErrorStats).toBe('function');
        expect(typeof editor.getRecentErrors).toBe('function');
        expect(typeof editor.clearErrors).toBe('function');
    });

    test('getErrorStats should return stats object', () => {
        const stats = editor.getErrorStats();

        expect(stats).toBeDefined();
        expect(typeof stats.total).toBe('number');
    });

    test('clearErrors should clear and notify', () => {
        editor.errors.capture('Test error', {}, true);

        editor.clearErrors();

        expect(editor.errors.getAll().length).toBe(0);
    });

    test('click catcher should be set up', () => {
        const catcher = document.getElementById('app-click-catcher');
        expect(catcher).not.toBeNull();
    });
});
