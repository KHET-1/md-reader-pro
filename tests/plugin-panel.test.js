/**
 * @jest-environment jsdom
 */

import PluginPanel from '../src/plugins/PluginPanel.js';
import { TestUtils, setupTestEnvironment } from './test-utils.js';

describe('PluginPanel', () => {
    let panel;

    setupTestEnvironment();

    beforeEach(() => {
        document.body.innerHTML = '';
        panel = new PluginPanel({ width: 400 });
    });

    afterEach(() => {
        if (panel) {
            panel.destroy();
        }
    });

    describe('Constructor', () => {
        test('should initialize with default options', () => {
            expect(panel.container).toBeNull();
            expect(panel.contentArea).toBeNull();
            expect(panel.isOpen).toBe(false);
            expect(panel.currentPlugin).toBeNull();
        });

        test('should use provided width', () => {
            expect(panel.width).toBe(400);
        });

        test('should use default width if not provided', () => {
            const defaultPanel = new PluginPanel();
            expect(defaultPanel.width).toBe(350);
        });

        test('should accept callback options', () => {
            const onClose = jest.fn();
            const onPluginAction = jest.fn();
            
            const customPanel = new PluginPanel({ onClose, onPluginAction });
            
            expect(customPanel.onClose).toBe(onClose);
            expect(customPanel.onPluginAction).toBe(onPluginAction);
        });
    });

    describe('mount()', () => {
        test('should create and mount panel container', () => {
            panel.mount();

            expect(panel.container).toBeDefined();
            expect(panel.container.id).toBe('plugin-panel');
            expect(document.body.contains(panel.container)).toBe(true);
        });

        test('should create header element', () => {
            panel.mount();

            const header = panel.container.querySelector('.plugin-panel-header');
            expect(header).toBeTruthy();
        });

        test('should create content area', () => {
            panel.mount();

            expect(panel.contentArea).toBeTruthy();
            expect(panel.contentArea.className).toBe('plugin-panel-content');
        });

        test('should create close button', () => {
            panel.mount();

            const closeBtn = panel.container.querySelector('button');
            expect(closeBtn).toBeTruthy();
            expect(closeBtn.innerHTML).toBe('✕');
        });

        test('should not create duplicate panels', () => {
            panel.mount();
            panel.mount();

            const panels = document.querySelectorAll('#plugin-panel');
            expect(panels.length).toBe(1);
        });

        test('should display default content', () => {
            panel.mount();

            expect(panel.contentArea.textContent).toContain('No plugin active');
        });
    });

    describe('open()', () => {
        test('should open the panel', () => {
            panel.open();

            expect(panel.isOpen).toBe(true);
            expect(panel.container.style.transform).toBe('translateX(0)');
        });

        test('should mount panel if not already mounted', () => {
            expect(panel.container).toBeNull();

            panel.open();

            expect(panel.container).toBeTruthy();
        });

        test('should adjust main content margin', () => {
            // Create main content element
            const mainContent = document.createElement('div');
            mainContent.className = 'content';
            document.body.appendChild(mainContent);

            panel.open();

            expect(mainContent.style.marginRight).toBe('400px');
        });
    });

    describe('close()', () => {
        beforeEach(() => {
            panel.open();
        });

        test('should close the panel', () => {
            panel.close();

            expect(panel.isOpen).toBe(false);
            expect(panel.container.style.transform).toBe('translateX(100%)');
        });

        test('should reset main content margin', () => {
            const mainContent = document.createElement('div');
            mainContent.className = 'content';
            mainContent.style.marginRight = '400px';
            document.body.appendChild(mainContent);

            panel.close();

            // Browser may add 'px' suffix
            expect(mainContent.style.marginRight).toMatch(/^0(px)?$/);
        });

        test('should call onClose callback', () => {
            const onClose = jest.fn();
            const customPanel = new PluginPanel({ onClose });
            
            customPanel.open();
            customPanel.close();

            expect(onClose).toHaveBeenCalled();
        });

        test('should handle close with no container', () => {
            panel.container = null;
            
            expect(() => panel.close()).not.toThrow();
        });
    });

    describe('toggle()', () => {
        test('should toggle from closed to open', () => {
            panel.toggle();

            expect(panel.isOpen).toBe(true);
        });

        test('should toggle from open to closed', () => {
            panel.open();
            panel.toggle();

            expect(panel.isOpen).toBe(false);
        });
    });

    describe('setTitle()', () => {
        beforeEach(() => {
            panel.mount();
        });

        test('should set panel title', () => {
            panel.setTitle('Test Plugin', '🔧');

            expect(panel.titleEl.innerHTML).toBe('🔧 Test Plugin');
        });

        test('should use default icon if not provided', () => {
            panel.setTitle('Test Plugin');

            expect(panel.titleEl.innerHTML).toBe('🔌 Test Plugin');
        });
    });

    describe('setContent()', () => {
        beforeEach(() => {
            panel.mount();
        });

        test('should set content HTML', () => {
            panel.setContent('<p>Test content</p>');

            expect(panel.contentArea.innerHTML).toBe('<p>Test content</p>');
        });

        test('should replace existing content', () => {
            panel.setContent('<p>First</p>');
            panel.setContent('<p>Second</p>');

            expect(panel.contentArea.innerHTML).toBe('<p>Second</p>');
        });
    });

    describe('appendContent()', () => {
        beforeEach(() => {
            panel.mount();
            panel.clearContent();
        });

        test('should append HTML string', () => {
            panel.appendContent('<p>First</p>');
            panel.appendContent('<p>Second</p>');

            expect(panel.contentArea.innerHTML).toContain('First');
            expect(panel.contentArea.innerHTML).toContain('Second');
        });

        test('should append DOM element', () => {
            const element = document.createElement('div');
            element.textContent = 'Test';
            
            panel.appendContent(element);

            expect(panel.contentArea.contains(element)).toBe(true);
        });
    });

    describe('clearContent()', () => {
        beforeEach(() => {
            panel.mount();
        });

        test('should clear content', () => {
            panel.setContent('<p>Test content</p>');
            panel.clearContent();

            expect(panel.contentArea.innerHTML).toBe('');
        });
    });

    describe('showLoading()', () => {
        beforeEach(() => {
            panel.mount();
        });

        test('should display loading message', () => {
            panel.showLoading('Processing...');

            expect(panel.contentArea.textContent).toContain('Processing...');
        });

        test('should use default loading message', () => {
            panel.showLoading();

            expect(panel.contentArea.textContent).toContain('Loading...');
        });

        test('should display spinner', () => {
            panel.showLoading();

            const spinner = panel.contentArea.querySelector('.spinner');
            expect(spinner).toBeTruthy();
        });
    });

    describe('showError()', () => {
        beforeEach(() => {
            panel.mount();
        });

        test('should display error message', () => {
            panel.showError('Something went wrong');

            expect(panel.contentArea.textContent).toContain('Something went wrong');
        });

        test('should display error icon', () => {
            panel.showError('Error');

            expect(panel.contentArea.innerHTML).toContain('⚠️');
        });
    });

    describe('showAnalysisResults()', () => {
        beforeEach(() => {
            panel.mount();
        });

        test('should display analysis results', () => {
            const results = {
                files_analyzed: 2,
                analyses: [
                    { path: '/test/file1.md', size: 1024, file_type: 'md' },
                    { path: '/test/file2.md', size: 2048, file_type: 'md' }
                ]
            };

            panel.showAnalysisResults(results);

            expect(panel.contentArea.textContent).toContain('Analysis Complete');
            expect(panel.contentArea.textContent).toContain('2 file(s)');
            expect(panel.contentArea.textContent).toContain('file1.md');
            expect(panel.contentArea.textContent).toContain('file2.md');
        });

        test('should format file sizes', () => {
            const results = {
                files_analyzed: 1,
                analyses: [
                    { path: '/test/file.md', size: 1024 * 100, file_type: 'md' }
                ]
            };

            panel.showAnalysisResults(results);

            expect(panel.contentArea.textContent).toContain('KB');
        });

        test('should add results to history', () => {
            const results = {
                files_analyzed: 1,
                analyses: [{ path: '/test/file.md', size: 1024, file_type: 'md' }]
            };

            panel.showAnalysisResults(results);

            const history = panel.getHistory();
            expect(history.length).toBe(1);
            expect(history[0].results).toEqual(results);
        });
    });

    describe('showDeepAnalysisResults()', () => {
        beforeEach(() => {
            panel.mount();
        });

        test('should display deep analysis results', () => {
            const results = {
                source_path: '/test/project',
                total_files: 10,
                total_size: 1024 * 1024,
                file_types: { md: 5, js: 3, json: 2 },
                files: []
            };

            panel.showDeepAnalysisResults(results);

            expect(panel.contentArea.textContent).toContain('Deep Analysis Report');
            expect(panel.contentArea.textContent).toContain('10');
            expect(panel.contentArea.textContent).toContain('Files');
        });

        test('should display file type breakdown', () => {
            const results = {
                source_path: '/test',
                total_files: 5,
                total_size: 1024,
                file_types: { md: 3, txt: 2 }
            };

            panel.showDeepAnalysisResults(results);

            expect(panel.contentArea.textContent).toContain('.md (3)');
            expect(panel.contentArea.textContent).toContain('.txt (2)');
        });

        test('should create export buttons', () => {
            const results = {
                source_path: '/test',
                total_files: 1,
                total_size: 1024
            };

            panel.showDeepAnalysisResults(results);

            const jsonBtn = document.getElementById('export-json-btn');
            const mdBtn = document.getElementById('export-md-btn');

            expect(jsonBtn).toBeTruthy();
            expect(mdBtn).toBeTruthy();
        });
    });

    describe('_formatSize()', () => {
        test('should format bytes', () => {
            expect(panel._formatSize(512)).toBe('512 B');
        });

        test('should format kilobytes', () => {
            expect(panel._formatSize(1024)).toBe('1.0 KB');
            expect(panel._formatSize(1536)).toBe('1.5 KB');
        });

        test('should format megabytes', () => {
            expect(panel._formatSize(1024 * 1024)).toBe('1.0 MB');
            expect(panel._formatSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
        });
    });

    describe('History management', () => {
        beforeEach(() => {
            panel.mount();
        });

        test('should add analysis to history', () => {
            panel._addToHistory({ test: 'data' });

            const history = panel.getHistory();
            expect(history.length).toBe(1);
            expect(history[0].results).toEqual({ test: 'data' });
        });

        test('should limit history size', () => {
            panel._maxHistory = 3;

            for (let i = 0; i < 5; i++) {
                panel._addToHistory({ index: i });
            }

            const history = panel.getHistory();
            expect(history.length).toBe(3);
            expect(history[0].results.index).toBe(4); // Most recent
            expect(history[2].results.index).toBe(2); // Oldest kept
        });

        test('should get analysis history', () => {
            panel._addToHistory({ a: 1 });
            panel._addToHistory({ b: 2 });

            const history = panel.getHistory();
            expect(history.length).toBe(2);
        });

        test('should clear analysis history', () => {
            panel._addToHistory({ test: 'data' });
            panel.clearHistory();

            expect(panel.getHistory().length).toBe(0);
        });

        test('should return copy of history, not reference', () => {
            panel._addToHistory({ test: 'data' });
            
            const history1 = panel.getHistory();
            const history2 = panel.getHistory();
            
            expect(history1).not.toBe(history2);
        });
    });

    describe('showHistory()', () => {
        beforeEach(() => {
            panel.mount();
        });

        test('should show empty state when no history', () => {
            panel.showHistory();

            expect(panel.contentArea.textContent).toContain('No analysis history yet');
        });

        test('should display history entries', () => {
            panel._addToHistory({
                files_analyzed: 2,
                analyses: [{ path: 'test.md' }]
            });

            panel.showHistory();

            expect(panel.contentArea.textContent).toContain('Analysis History');
            expect(panel.contentArea.textContent).toContain('1 entries');
        });

        test('should create export buttons for batch export', () => {
            panel._addToHistory({ test: 'data' });
            panel.showHistory();

            const jsonBtn = document.getElementById('batch-export-json');
            const mdBtn = document.getElementById('batch-export-md');
            const clearBtn = document.getElementById('clear-history');

            expect(jsonBtn).toBeTruthy();
            expect(mdBtn).toBeTruthy();
            expect(clearBtn).toBeTruthy();
        });
    });

    describe('showSettings()', () => {
        beforeEach(() => {
            panel.mount();
        });

        test('should display settings UI', () => {
            panel.showSettings({}, jest.fn());

            expect(panel.contentArea.textContent).toContain('Plugin Settings');
        });

        test('should populate current settings', () => {
            const settings = {
                autoAnalyze: true,
                reportFormat: 'markdown',
                theme: 'dark'
            };

            panel.showSettings(settings, jest.fn());

            const autoAnalyzeCheckbox = document.getElementById('setting-auto-analyze');
            const reportFormatSelect = document.getElementById('setting-report-format');
            const themeSelect = document.getElementById('setting-theme');

            expect(autoAnalyzeCheckbox.checked).toBe(true);
            expect(reportFormatSelect.value).toBe('markdown');
            expect(themeSelect.value).toBe('dark');
        });

        test('should create save and cancel buttons', () => {
            panel.showSettings({}, jest.fn());

            const saveBtn = document.getElementById('settings-save-btn');
            const cancelBtn = document.getElementById('settings-cancel-btn');

            expect(saveBtn).toBeTruthy();
            expect(cancelBtn).toBeTruthy();
        });

        test('should call onSave when save button clicked', () => {
            const onSave = jest.fn();
            panel.showSettings({ autoAnalyze: false }, onSave);

            const saveBtn = document.getElementById('settings-save-btn');
            saveBtn.click();

            expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
                autoAnalyze: expect.any(Boolean),
                reportFormat: expect.any(String),
                theme: expect.any(String)
            }));
        });

        test('should close panel when cancel button clicked', () => {
            panel.open();
            panel.showSettings({}, jest.fn());

            const cancelBtn = document.getElementById('settings-cancel-btn');
            cancelBtn.click();

            expect(panel.isOpen).toBe(false);
        });
    });

    describe('destroy()', () => {
        test('should remove container from DOM', () => {
            panel.mount();
            expect(document.body.contains(panel.container)).toBe(true);

            panel.destroy();

            expect(panel.container).toBeNull();
            expect(document.querySelectorAll('#plugin-panel').length).toBe(0);
        });

        test('should handle destroy with no container', () => {
            expect(() => panel.destroy()).not.toThrow();
        });
    });

    describe('Close button interaction', () => {
        test('should close panel when close button clicked', () => {
            panel.mount();
            panel.open();

            const closeBtn = panel.container.querySelector('button');
            closeBtn.click();

            expect(panel.isOpen).toBe(false);
        });
    });

    describe('Report generation', () => {
        beforeEach(() => {
            panel.mount();
        });

        test('should generate markdown report', () => {
            const results = {
                total_files: 2,
                total_size: 2048,
                file_types: { md: 2 },
                source_path: '/test'
            };

            const md = panel._generateMarkdownReport(results);

            expect(md).toContain('# Analysis Report');
            expect(md).toContain('Files Analyzed');
            expect(md).toContain('Total Size');
            expect(md).toContain('/test');
        });

        test('should generate HTML report', () => {
            const results = {
                total_files: 2,
                total_size: 2048
            };

            const html = panel._generateHtmlReport(results);

            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('Analysis Report');
            expect(html).toContain('Files Analyzed');
        });

        test('should generate batch markdown report', () => {
            const batchReport = {
                batch_export: true,
                exported_at: new Date().toISOString(),
                total_analyses: 2,
                analyses: [
                    { timestamp: new Date().toISOString(), results: { files_analyzed: 1 } },
                    { timestamp: new Date().toISOString(), results: { files_analyzed: 2 } }
                ]
            };

            const md = panel._generateBatchMarkdown(batchReport);

            expect(md).toContain('# Batch Analysis Report');
            expect(md).toContain('**Total Analyses:** 2');
            expect(md).toContain('## Analysis #1');
            expect(md).toContain('## Analysis #2');
        });

        test('should generate batch HTML report', () => {
            const batchReport = {
                batch_export: true,
                exported_at: new Date().toISOString(),
                total_analyses: 1,
                analyses: [
                    { timestamp: new Date().toISOString(), results: { files_analyzed: 1 } }
                ]
            };

            const html = panel._generateBatchHtml(batchReport);

            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('Batch Analysis Report');
            expect(html).toContain('Total Analyses: 1');
        });
    });
});
