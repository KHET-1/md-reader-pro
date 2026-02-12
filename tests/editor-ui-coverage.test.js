/**
 * Tests for EditorUI uncovered functions
 * Targets: brain system, event bus, subsystems, theme presets, custom themes
 */
import { TestUtils, setupTestEnvironment } from './test-utils.js';
import MarkdownEditor from '../src/index.js';
import EditorUI from '../src/ui/EditorUI.js';

describe('EditorUI Additional Coverage', () => {
    let editor;
    let ui;

    setupTestEnvironment();

    beforeEach(() => {
        editor = new MarkdownEditor();
        editor.init();
        ui = editor.ui;
    });

    // === Event Bus ===

    describe('_addEventListener', () => {
        test('adds event listener', () => {
            const handler = jest.fn();
            ui._addEventListener('test-event', handler);
            ui._emitEvent('test-event', { data: 1 });
            expect(handler).toHaveBeenCalledWith({ data: 1 });
        });

        test('creates listener set if not exists', () => {
            const handler = jest.fn();
            ui._addEventListener('new-event', handler);
            expect(ui._eventBus.listeners.has('new-event')).toBe(true);
        });

        test('supports multiple listeners for same event', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            ui._addEventListener('multi', handler1);
            ui._addEventListener('multi', handler2);
            ui._emitEvent('multi', 'data');
            expect(handler1).toHaveBeenCalled();
            expect(handler2).toHaveBeenCalled();
        });
    });

    describe('_removeEventListener', () => {
        test('removes event listener', () => {
            const handler = jest.fn();
            ui._addEventListener('test', handler);
            ui._removeEventListener('test', handler);
            ui._emitEvent('test', 'data');
            expect(handler).not.toHaveBeenCalled();
        });

        test('handles removing from non-existent event', () => {
            expect(() => ui._removeEventListener('nonexistent', jest.fn())).not.toThrow();
        });
    });

    describe('_emitEvent', () => {
        test('handles handler errors gracefully', () => {
            const badHandler = jest.fn(() => { throw new Error('fail'); });
            const goodHandler = jest.fn();
            ui._addEventListener('test', badHandler);
            ui._addEventListener('test', goodHandler);
            ui._emitEvent('test', 'data');
            expect(badHandler).toHaveBeenCalled();
            expect(goodHandler).toHaveBeenCalled();
        });

        test('handles event with no listeners', () => {
            expect(() => ui._emitEvent('no-listeners', 'data')).not.toThrow();
        });
    });

    // === Subsystem Management ===

    describe('registerSubsystem', () => {
        test('registers a new subsystem', () => {
            ui.registerSubsystem('test-subsystem', {
                init: jest.fn(),
                destroy: jest.fn()
            });
            expect(ui._brainState.subsystems.has('test-subsystem')).toBe(true);
        });

        test('registers with default config', () => {
            ui.registerSubsystem('default-sub');
            const sub = ui._brainState.subsystems.get('default-sub');
            expect(sub.enabled).toBe(true);
            expect(sub.initialized).toBe(false);
        });

        test('registers with disabled config', () => {
            ui.registerSubsystem('disabled-sub', { enabled: false });
            const sub = ui._brainState.subsystems.get('disabled-sub');
            expect(sub.enabled).toBe(false);
        });
    });

    describe('initializeSubsystems', () => {
        test('initializes enabled subsystems', () => {
            const initFn = jest.fn();
            ui.registerSubsystem('test', { init: initFn });
            ui.initializeSubsystems();
            expect(initFn).toHaveBeenCalled();
        });

        test('skips disabled subsystems', () => {
            const initFn = jest.fn();
            ui.registerSubsystem('disabled', { enabled: false, init: initFn });
            ui.initializeSubsystems();
            expect(initFn).not.toHaveBeenCalled();
        });

        test('skips already initialized subsystems', () => {
            const initFn = jest.fn();
            ui.registerSubsystem('test', { init: initFn });
            ui.initializeSubsystems();
            ui.initializeSubsystems();
            expect(initFn).toHaveBeenCalledTimes(1);
        });

        test('handles init errors gracefully', () => {
            ui.registerSubsystem('broken', {
                init: () => { throw new Error('init failed'); }
            });
            expect(() => ui.initializeSubsystems()).not.toThrow();
        });
    });

    describe('getBrainState', () => {
        test('returns brain state copy', () => {
            const state = ui.getBrainState();
            expect(state).toHaveProperty('initialized');
            expect(state).toHaveProperty('mode');
            expect(state).toHaveProperty('theme');
        });
    });

    describe('setBrainState', () => {
        test('updates brain state and emits event', () => {
            const handler = jest.fn();
            ui._addEventListener('stateChange', handler);
            ui.setBrainState('mode', 'preview');
            expect(handler).toHaveBeenCalledWith(expect.objectContaining({
                key: 'mode',
                newValue: 'preview'
            }));
        });
    });

    // === Theme Presets ===

    describe('THEME_PRESETS', () => {
        test('has default theme preset', () => {
            const presets = EditorUI.THEME_PRESETS;
            expect(presets).toHaveProperty('default');
            expect(presets.default).toHaveProperty('accent');
        });

        test('has multiple presets', () => {
            const presets = EditorUI.THEME_PRESETS;
            const keys = Object.keys(presets);
            expect(keys.length).toBeGreaterThan(1);
        });
    });

    describe('getThemePresets', () => {
        test('returns theme presets', () => {
            const presets = ui.getThemePresets();
            expect(presets).toBeDefined();
            expect(presets.default).toBeDefined();
        });
    });

    describe('applyCustomTheme', () => {
        test('applies theme colors to CSS variables', () => {
            ui.applyCustomTheme({
                accent: '#FF0000',
                bgPrimary: '#111111',
                bgSecondary: '#222222',
                bgTertiary: '#333333',
                textPrimary: '#ffffff',
                textSecondary: '#cccccc',
                textMuted: '#888888',
                border: '#444444'
            });
            const root = document.documentElement;
            expect(root.style.getPropertyValue('--accent-color')).toBe('#FF0000');
        });
    });

    describe('applyThemePreset', () => {
        test('applies a valid preset', () => {
            const result = ui.applyThemePreset('default');
            expect(result).toBe(true);
        });

        test('returns false for invalid preset', () => {
            const result = ui.applyThemePreset('nonexistent');
            expect(result).toBe(false);
        });
    });

    describe('resetToDefaultTheme', () => {
        test('resets to default', () => {
            ui.applyThemePreset('ocean');
            ui.resetToDefaultTheme();
            // Should not throw
        });
    });

    // === Other Uncovered Functions ===

    describe('addTrackedListener', () => {
        test('adds event listener to target', () => {
            const target = document.createElement('div');
            const handler = jest.fn();
            ui.addTrackedListener(target, 'click', handler);
            target.click();
            expect(handler).toHaveBeenCalled();
        });
    });

    describe('setupCopyButtons', () => {
        test('sets up copy button delegation', () => {
            ui.setupCopyButtons();
            expect(ui._copyButtonsInitialized).toBe(true);
        });

        test('does not double-initialize', () => {
            ui.setupCopyButtons();
            ui.setupCopyButtons();
            expect(ui._copyButtonsInitialized).toBe(true);
        });
    });

    describe('removeDOMElement', () => {
        test('removes element from DOM', () => {
            const el = document.createElement('div');
            el.id = 'to-remove';
            document.body.appendChild(el);
            ui.removeDOMElement(el);
            expect(document.getElementById('to-remove')).toBeNull();
        });

        test('handles null element', () => {
            expect(() => ui.removeDOMElement(null)).not.toThrow();
        });

        test('handles element without parent', () => {
            const el = document.createElement('div');
            expect(() => ui.removeDOMElement(el)).not.toThrow();
        });
    });

    describe('getCachedElement', () => {
        test('returns element by id', () => {
            const el = document.createElement('div');
            el.id = 'cached-test';
            document.body.appendChild(el);
            const result = ui.getCachedElement('cached-test');
            expect(result).toBe(el);
        });

        test('returns null for missing element', () => {
            const result = ui.getCachedElement('missing');
            expect(result).toBeNull();
        });

        test('caches element for reuse', () => {
            const el = document.createElement('div');
            el.id = 'cache-me';
            document.body.appendChild(el);
            const first = ui.getCachedElement('cache-me');
            const second = ui.getCachedElement('cache-me');
            expect(first).toBe(second);
        });
    });
});
