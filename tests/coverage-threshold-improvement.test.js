/**
 * Coverage Threshold Improvement Tests
 * Targeted tests to meet branch (64%) and function (76%) coverage thresholds
 */

import MarkdownEditor from '../src/index.js';
import AnimationManager from '../src/utils/AnimationManager.js';
import NotificationManager from '../src/utils/NotificationManager.js';

describe('Coverage Threshold Improvement - MarkdownEditor', () => {
    let editor;

    beforeEach(() => {
        // Setup minimal DOM
        document.body.innerHTML = `
            <textarea id="markdown-editor"></textarea>
            <div id="markdown-preview"></div>
            <input type="file" id="file-input" />
            <div class="upload-area"></div>
            <div id="editor-container">
                <div class="editor-pane"></div>
                <div class="preview-pane"></div>
            </div>
            <div id="status-indicator">
                <div class="status-dot"></div>
                <span></span>
            </div>
            <div class="tab" data-tab="editor"></div>
            <div class="tab" data-tab="preview"></div>
            <div class="tab" data-tab="split"></div>
        `;
        editor = new MarkdownEditor();
        editor.setupEditor();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('removeDOMElement', () => {
        test('should handle element with parent', () => {
            const div = document.createElement('div');
            const child = document.createElement('span');
            div.appendChild(child);
            document.body.appendChild(div);

            editor.removeDOMElement(child);
            expect(div.contains(child)).toBe(false);
        });

        test('should handle element without parent gracefully', () => {
            const orphan = document.createElement('div');
            expect(() => editor.removeDOMElement(orphan)).not.toThrow();
        });

        test('should handle null element gracefully', () => {
            expect(() => editor.removeDOMElement(null)).not.toThrow();
        });
    });

    describe('showNotification with callback', () => {
        test('should call fadeOut with callback', () => {
            const fadeOutSpy = jest.spyOn(editor.anim, 'fadeOut');
            
            editor.showNotification('Test', 'success', 100);
            
            expect(fadeOutSpy).toHaveBeenCalled();
            const callback = fadeOutSpy.mock.calls[0][3]; // 4th argument is the callback
            expect(typeof callback).toBe('function');
        });

        test('should position error notifications differently', () => {
            editor.showNotification('Error test', 'error');
            const notifications = document.querySelectorAll('div');
            const errorNotif = Array.from(notifications).find(n => n.textContent === 'Error test');
            expect(errorNotif).toBeTruthy();
            // Browser converts #ff6b6b to rgb(255, 107, 107)
            expect(errorNotif.style.background).toMatch(/rgb\(255,\s*107,\s*107\)|#ff6b6b/);
        });
    });

    describe('File validation - size error path', () => {
        test('should show error for file exceeding size limit', () => {
            const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.md', { type: 'text/markdown' });
            Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

            const notifySpy = jest.spyOn(editor.notify, 'error');
            editor.loadFile(largeFile);

            expect(notifySpy).toHaveBeenCalled();
            expect(notifySpy.mock.calls[0][0]).toContain('too large');
        });

        test('should provide action to choose another file on size error', () => {
            const largeFile = new File(['x'], 'large.md');
            Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

            let actionCalled = false;
            jest.spyOn(editor.notify, 'error').mockImplementation((msg, opts) => {
                if (opts && opts.actions && opts.actions[0]) {
                    opts.actions[0].onClick();
                    actionCalled = true;
                }
            });

            const clickSpy = jest.spyOn(editor.fileInput, 'click').mockImplementation(() => {});
            editor.loadFile(largeFile);

            expect(actionCalled).toBe(true);
            expect(clickSpy).toHaveBeenCalled();
        });
    });

    describe('File validation - extension warning path', () => {
        test('should show warning for unsupported file extension', () => {
            const unsupportedFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            const notifySpy = jest.spyOn(editor.notify, 'warning');
            
            editor.loadFile(unsupportedFile);

            expect(notifySpy).toHaveBeenCalled();
            expect(notifySpy.mock.calls[0][0]).toContain('Unsupported file type');
        });

        test('should provide "Load Anyway" action for unsupported extension', () => {
            const unsupportedFile = new File(['# Test'], 'test.pdf');
            
            let loadAnywayAction = null;
            jest.spyOn(editor.notify, 'warning').mockImplementation((msg, opts) => {
                loadAnywayAction = opts.actions.find(a => a.label === 'Load Anyway');
            });

            editor.loadFile(unsupportedFile);
            expect(loadAnywayAction).toBeTruthy();
            expect(loadAnywayAction.primary).toBe(true);
        });

        test('should provide "Choose Another" action for unsupported extension', () => {
            const unsupportedFile = new File(['test'], 'test.xyz');
            
            let chooseAnotherAction = null;
            jest.spyOn(editor.notify, 'warning').mockImplementation((msg, opts) => {
                chooseAnotherAction = opts.actions.find(a => a.label === 'Choose Another');
            });

            const clickSpy = jest.spyOn(editor.fileInput, 'click').mockImplementation(() => {});
            editor.loadFile(unsupportedFile);
            
            expect(chooseAnotherAction).toBeTruthy();
            if (chooseAnotherAction) {
                chooseAnotherAction.onClick();
                expect(clickSpy).toHaveBeenCalled();
            }
        });
    });

    describe('File reader error handlers', () => {
        test('should handle file reader error', (done) => {
            const file = new File(['test'], 'test.md');
            const notifySpy = jest.spyOn(editor.notify, 'error');

            // Mock FileReader to trigger error
            const originalFileReader = global.FileReader;
            global.FileReader = class {
                readAsText() {
                    setTimeout(() => {
                        if (this.onerror) {
                            this.onerror(new Error('Read error'));
                        }
                    }, 10);
                }
            };

            editor.readFile(file);

            setTimeout(() => {
                expect(notifySpy).toHaveBeenCalled();
                global.FileReader = originalFileReader;
                done();
            }, 50);
        });

        test('should handle file reader abort', (done) => {
            const file = new File(['test'], 'test.md');
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

            const originalFileReader = global.FileReader;
            global.FileReader = class {
                readAsText() {
                    setTimeout(() => {
                        if (this.onabort) {
                            this.onabort();
                        }
                    }, 10);
                }
            };

            editor.readFile(file);

            setTimeout(() => {
                expect(consoleSpy).toHaveBeenCalledWith('File reading was aborted');
                global.FileReader = originalFileReader;
                consoleSpy.mockRestore();
                done();
            }, 50);
        });
    });

    describe('Keyboard shortcuts - Ctrl/Cmd+1-5', () => {
        test('should switch to editor mode with Ctrl+1', () => {
            const setModeSpy = jest.spyOn(editor, 'setMode');
            const event = new KeyboardEvent('keydown', { key: '1', ctrlKey: true });
            Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
            
            editor.handleKeyboardShortcuts(event);
            
            expect(event.preventDefault).toHaveBeenCalled();
            expect(setModeSpy).toHaveBeenCalledWith('editor');
        });

        test('should switch to preview mode with Ctrl+2', () => {
            const setModeSpy = jest.spyOn(editor, 'setMode');
            const event = new KeyboardEvent('keydown', { key: '2', ctrlKey: true });
            Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
            
            editor.handleKeyboardShortcuts(event);
            
            expect(setModeSpy).toHaveBeenCalledWith('preview');
        });

        test('should switch to split mode with Ctrl+3', () => {
            const setModeSpy = jest.spyOn(editor, 'setMode');
            const event = new KeyboardEvent('keydown', { key: '3', ctrlKey: true });
            Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
            
            editor.handleKeyboardShortcuts(event);
            
            expect(setModeSpy).toHaveBeenCalledWith('split');
        });

        test('should switch to annotation mode with Ctrl+4', () => {
            const setModeSpy = jest.spyOn(editor, 'setMode');
            const event = new KeyboardEvent('keydown', { key: '4', ctrlKey: true });
            Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
            
            editor.handleKeyboardShortcuts(event);
            
            expect(setModeSpy).toHaveBeenCalledWith('annotation');
        });

        test('should switch to reader mode with Ctrl+5', () => {
            const setModeSpy = jest.spyOn(editor, 'setMode');
            const event = new KeyboardEvent('keydown', { key: '5', ctrlKey: true });
            Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
            
            editor.handleKeyboardShortcuts(event);
            
            expect(setModeSpy).toHaveBeenCalledWith('reader');
        });

        test('should work with metaKey (Cmd) instead of ctrlKey', () => {
            const setModeSpy = jest.spyOn(editor, 'setMode');
            const event = new KeyboardEvent('keydown', { key: '2', metaKey: true });
            Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
            
            editor.handleKeyboardShortcuts(event);
            
            expect(setModeSpy).toHaveBeenCalledWith('preview');
        });
    });

    describe('setupTabs and setMode', () => {
        test('should setup tab click listeners', () => {
            editor.setupTabs();
            
            const tab = document.querySelector('[data-tab="preview"]');
            const setModeSpy = jest.spyOn(editor, 'setMode');
            
            tab.click();
            
            expect(setModeSpy).toHaveBeenCalledWith('preview');
        });

        test('should set active tab and aria-selected', () => {
            editor.setMode('preview');
            
            const tabs = document.querySelectorAll('.tab');
            const previewTab = document.querySelector('[data-tab="preview"]');
            const editorTab = document.querySelector('[data-tab="editor"]');
            
            expect(previewTab.classList.contains('active')).toBe(true);
            expect(previewTab.getAttribute('aria-selected')).toBe('true');
            expect(editorTab.classList.contains('active')).toBe(false);
        });

        test('should update status for each mode', () => {
            const modes = ['editor', 'preview', 'split', 'annotation', 'reader'];
            
            modes.forEach(mode => {
                editor.updateStatus(mode);
                const statusText = document.querySelector('#status-indicator span');
                expect(statusText.textContent).toBeTruthy();
            });
        });

        test('should show/hide panes for annotation mode', () => {
            editor.setMode('annotation');
            
            const editorPane = document.querySelector('.editor-pane');
            const previewPane = document.querySelector('.preview-pane');
            
            expect(editorPane.style.display).toBe('flex');
            expect(previewPane.style.display).toBe('none');
        });

        test('should show/hide panes for reader mode', () => {
            editor.setMode('reader');
            
            const editorPane = document.querySelector('.editor-pane');
            const previewPane = document.querySelector('.preview-pane');
            
            expect(editorPane.style.display).toBe('none');
            expect(previewPane.style.display).toBe('flex');
        });
    });

    describe('saveMarkdown - empty document', () => {
        test('should warn when trying to save empty document', () => {
            editor.editor.value = '';
            const notifySpy = jest.spyOn(editor.notify, 'warning');
            
            editor.saveMarkdown();
            
            expect(notifySpy).toHaveBeenCalled();
            expect(notifySpy.mock.calls[0][0]).toContain('empty');
        });

        test('should provide "Start Writing" action for empty document', () => {
            editor.editor.value = '   '; // whitespace only
            
            let startWritingAction = null;
            jest.spyOn(editor.notify, 'warning').mockImplementation((msg, opts) => {
                startWritingAction = opts.actions.find(a => a.label === 'Start Writing');
            });

            const focusSpy = jest.spyOn(editor.editor, 'focus').mockImplementation(() => {});
            editor.saveMarkdown();
            
            expect(startWritingAction).toBeTruthy();
            if (startWritingAction) {
                startWritingAction.onClick();
                expect(focusSpy).toHaveBeenCalled();
            }
        });
    });

    describe('setupCopyButtons', () => {
        test('should allow setupCopyButtons to be called without errors', () => {
            // Test that setupCopyButtons can be called without throwing
            const freshEditor = new MarkdownEditor();
            expect(() => freshEditor.setupCopyButtons()).not.toThrow();
        });

        test('copyToEditor should insert text at cursor position', () => {
            // Set up the editor with a value
            editor.editor = document.getElementById('markdown-editor');
            editor.editor.value = 'existing content';
            editor.editor.selectionStart = 8;
            editor.editor.selectionEnd = 8;

            editor.copyToEditor('# New Text');

            expect(editor.editor.value).toContain('# New Text');
        });
    });

    describe('showCopyFeedback', () => {
        test('should show success notification', () => {
            const showNotifSpy = jest.spyOn(editor, 'showNotification');
            
            editor.showCopyFeedback();
            
            expect(showNotifSpy).toHaveBeenCalledWith('✅ Example copied!', 'success');
        });
    });

    describe('Drag and drop handlers', () => {
        test('should add drag-over class on dragenter', () => {
            editor.setupDragAndDrop();
            
            const uploadArea = document.querySelector('.upload-area');
            const event = new Event('dragenter', { bubbles: true });
            Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
            Object.defineProperty(event, 'stopPropagation', { value: jest.fn() });
            
            uploadArea.dispatchEvent(event);
            
            expect(uploadArea.classList.contains('drag-over')).toBe(true);
        });

        test('should remove drag-over class on dragleave', () => {
            editor.setupDragAndDrop();
            
            const uploadArea = document.querySelector('.upload-area');
            uploadArea.classList.add('drag-over');
            
            const event = new Event('dragleave', { bubbles: true });
            Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
            Object.defineProperty(event, 'stopPropagation', { value: jest.fn() });
            
            uploadArea.dispatchEvent(event);
            
            expect(uploadArea.classList.contains('drag-over')).toBe(false);
        });
    });
});

describe('Coverage Threshold Improvement - AnimationManager', () => {
    let animManager;

    beforeEach(() => {
        animManager = new AnimationManager();
    });

    afterEach(() => {
        // Clear animations manually
        animManager.animations.clear();
        document.body.innerHTML = '';
    });

    describe('fadeOut with translateY', () => {
        test('should apply translateY transform during fadeOut', (done) => {
            const element = document.createElement('div');
            element.style.opacity = '1';
            document.body.appendChild(element);

            animManager.fadeOut(element, 100, 0, () => {
                document.body.removeChild(element);
                done();
            }, { translateY: -10 });

            setTimeout(() => {
                expect(element.style.transform).toContain('translateY');
            }, 50);
        });
    });

    describe('fadeIn with translateY', () => {
        test('should apply translateY transform during fadeIn', (done) => {
            const element = document.createElement('div');
            document.body.appendChild(element);

            animManager.fadeIn(element, 100, 0, () => {
                document.body.removeChild(element);
                done();
            }, { translateY: 10 });

            setTimeout(() => {
                expect(element.style.transform).toContain('translateY');
            }, 50);
        });
    });

    describe('Animation cancellation', () => {
        test('should remove canceled animations from set', (done) => {
            const element = document.createElement('div');
            document.body.appendChild(element);

            const anim = animManager.fadeIn(element, 200, 0);
            anim.canceled = true;

            setTimeout(() => {
                expect(animManager.animations.has(anim)).toBe(false);
                document.body.removeChild(element);
                done();
            }, 100);
        });
    });
});

describe('Coverage Threshold Improvement - NotificationManager', () => {
    let notifyManager;

    beforeEach(() => {
        document.body.innerHTML = '';
        notifyManager = new NotificationManager();
    });

    afterEach(() => {
        // Remove notification container
        if (notifyManager.container && notifyManager.container.parentNode) {
            notifyManager.container.parentNode.removeChild(notifyManager.container);
        }
        document.body.innerHTML = '';
    });

    describe('DOMContentLoaded fallback', () => {
        test('should handle body not ready', () => {
            // Remove body temporarily
            const originalBody = document.body;
            Object.defineProperty(document, 'body', {
                get: () => null,
                configurable: true
            });

            const nm = new NotificationManager();
            
            // Restore body
            Object.defineProperty(document, 'body', {
                get: () => originalBody,
                configurable: true
            });

            expect(nm.container).toBeTruthy();
        });
    });

    describe('Button hover interactions', () => {
        test('should handle close button hover', (done) => {
            notifyManager.info('Test message');
            
            setTimeout(() => {
                const closeBtn = document.querySelector('[aria-label="Dismiss notification"]');
                expect(closeBtn).toBeTruthy();
                
                if (closeBtn) {
                    // Trigger mouseenter
                    const enterEvent = new Event('mouseenter');
                    closeBtn.dispatchEvent(enterEvent);
                    expect(closeBtn.style.opacity).toBe('1');
                    
                    // Trigger mouseleave
                    const leaveEvent = new Event('mouseleave');
                    closeBtn.dispatchEvent(leaveEvent);
                    expect(closeBtn.style.opacity).toBe('0.7');
                }
                
                done();
            }, 100);
        });

        test('should handle action button hover - primary', (done) => {
            notifyManager.success('Test', {
                actions: [{
                    label: 'Primary Action',
                    primary: true,
                    onClick: () => {}
                }]
            });

            setTimeout(() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Primary Action');
                expect(btn).toBeTruthy();
                
                if (btn) {
                    const enterEvent = new Event('mouseenter');
                    btn.dispatchEvent(enterEvent);
                    expect(btn.style.transform).toBe('translateY(-1px)');
                    
                    const leaveEvent = new Event('mouseleave');
                    btn.dispatchEvent(leaveEvent);
                    expect(btn.style.transform).toBe('translateY(0)');
                }
                
                done();
            }, 100);
        });

        test('should handle action button hover - secondary', (done) => {
            notifyManager.warning('Test', {
                actions: [{
                    label: 'Secondary Action',
                    primary: false,
                    onClick: () => {}
                }]
            });

            setTimeout(() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Secondary Action');
                expect(btn).toBeTruthy();
                
                if (btn) {
                    const enterEvent = new Event('mouseenter');
                    btn.dispatchEvent(enterEvent);
                    expect(btn.style.background).toBe('rgba(255, 255, 255, 0.1)');
                    
                    const leaveEvent = new Event('mouseleave');
                    btn.dispatchEvent(leaveEvent);
                    expect(btn.style.background).toBe('transparent');
                }
                
                done();
            }, 100);
        });
    });
});
