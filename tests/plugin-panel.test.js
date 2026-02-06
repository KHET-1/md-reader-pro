/**
 * @jest-environment jsdom
 */

import PluginPanel from '../src/plugins/PluginPanel.js';

describe('PluginPanel', () => {
    let panel;
    let mockOnClose;
    let mockOnPluginAction;

    beforeEach(() => {
        mockOnClose = jest.fn();
        mockOnPluginAction = jest.fn();

        // Clear any existing panels
        const existing = document.getElementById('plugin-panel');
        if (existing) {
            existing.remove();
        }

        panel = new PluginPanel({
            width: 400,
            onClose: mockOnClose,
            onPluginAction: mockOnPluginAction
        });
    });

    afterEach(() => {
        if (panel) {
            panel.destroy();
        }
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with provided options', () => {
            expect(panel.width).toBe(400);
            expect(panel.onClose).toBe(mockOnClose);
            expect(panel.onPluginAction).toBe(mockOnPluginAction);
        });

        test('should initialize with default options', () => {
            const defaultPanel = new PluginPanel();

            expect(defaultPanel.width).toBe(350);
            expect(defaultPanel.isOpen).toBe(false);
            expect(defaultPanel.currentPlugin).toBeNull();
        });

        test('should initialize analysis history', () => {
            expect(panel._analysisHistory).toEqual([]);
            expect(panel._maxHistory).toBe(50);
        });
    });

    describe('mount()', () => {
        test('should create panel container', () => {
            panel.mount();

            const container = document.getElementById('plugin-panel');
            expect(container).toBeTruthy();
            expect(container.classList.contains('plugin-panel')).toBe(true);
        });

        test('should not recreate if already mounted', () => {
            panel.mount();
            const firstContainer = document.getElementById('plugin-panel');

            panel.mount();
            const secondContainer = document.getElementById('plugin-panel');

            expect(firstContainer).toBe(secondContainer);
        });

        test('should create header with title', () => {
            panel.mount();

            expect(panel.titleEl).toBeTruthy();
            expect(panel.titleEl.textContent).toContain('Plugin Panel');
        });

        test('should create content area', () => {
            panel.mount();

            expect(panel.contentArea).toBeTruthy();
            expect(panel.contentArea.classList.contains('plugin-panel-content')).toBe(true);
        });

        test('should create close button', () => {
            panel.mount();

            const closeBtn = panel.container.querySelector('button');
            expect(closeBtn).toBeTruthy();
            expect(closeBtn.textContent).toBe('✕');
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
            expect(panel.container).toBeTruthy();
        });

        test('should mount if not already mounted', () => {
            panel.open();

            const container = document.getElementById('plugin-panel');
            expect(container).toBeTruthy();
        });

        test('should adjust main content margin', () => {
            // Create mock main content
            const mainContent = document.createElement('div');
            mainContent.className = 'content';
            document.body.appendChild(mainContent);

            panel.open();

            expect(mainContent.style.marginRight).toBe('400px');

            mainContent.remove();
        });
    });

    describe('close()', () => {
        test('should close the panel', () => {
            panel.open();
            expect(panel.isOpen).toBe(true);

            panel.close();

            expect(panel.isOpen).toBe(false);
        });

        test('should call onClose callback', () => {
            panel.open();
            panel.close();

            expect(mockOnClose).toHaveBeenCalled();
        });

        test('should reset main content margin', () => {
            const mainContent = document.createElement('div');
            mainContent.className = 'content';
            document.body.appendChild(mainContent);

            panel.open();
            panel.close();

            // marginRight could be '0' or '0px' depending on browser
            expect(mainContent.style.marginRight === '0' || mainContent.style.marginRight === '0px').toBe(true);

            mainContent.remove();
        });

        test('should handle no container gracefully', () => {
            expect(() => panel.close()).not.toThrow();
        });
    });

    describe('toggle()', () => {
        test('should open when closed', () => {
            expect(panel.isOpen).toBe(false);

            panel.toggle();

            expect(panel.isOpen).toBe(true);
        });

        test('should close when open', () => {
            panel.open();
            expect(panel.isOpen).toBe(true);

            panel.toggle();

            expect(panel.isOpen).toBe(false);
        });
    });

    describe('setTitle()', () => {
        test('should set panel title with icon', () => {
            panel.mount();

            panel.setTitle('Test Plugin', '🔥');

            expect(panel.titleEl.textContent).toBe('🔥 Test Plugin');
        });

        test('should use default icon', () => {
            panel.mount();

            panel.setTitle('Test Plugin');

            expect(panel.titleEl.textContent).toBe('🔌 Test Plugin');
        });
    });

    describe('setContent()', () => {
        test('should set content HTML', () => {
            panel.mount();

            panel.setContent('<p>Test content</p>');

            expect(panel.contentArea.innerHTML).toBe('<p>Test content</p>');
        });
    });

    describe('appendContent()', () => {
        test('should append HTML string', () => {
            panel.mount();
            panel.setContent('<p>First</p>');

            panel.appendContent('<p>Second</p>');

            expect(panel.contentArea.innerHTML).toContain('First');
            expect(panel.contentArea.innerHTML).toContain('Second');
        });

        test('should append DOM element', () => {
            panel.mount();
            const element = document.createElement('div');
            element.textContent = 'Test';

            panel.appendContent(element);

            expect(panel.contentArea.contains(element)).toBe(true);
        });
    });

    describe('clearContent()', () => {
        test('should clear all content', () => {
            panel.mount();
            panel.setContent('<p>Test content</p>');

            panel.clearContent();

            expect(panel.contentArea.innerHTML).toBe('');
        });
    });

    describe('showLoading()', () => {
        test('should display loading state', () => {
            panel.mount();

            panel.showLoading('Processing...');

            expect(panel.contentArea.textContent).toContain('Processing...');
            expect(panel.contentArea.querySelector('.spinner')).toBeTruthy();
        });

        test('should use default message', () => {
            panel.mount();

            panel.showLoading();

            expect(panel.contentArea.textContent).toContain('Loading...');
        });
    });

    describe('showError()', () => {
        test('should display error state', () => {
            panel.mount();

            panel.showError('Something went wrong');

            expect(panel.contentArea.textContent).toContain('Something went wrong');
            expect(panel.contentArea.textContent).toContain('⚠️');
        });
    });

    describe('showAnalysisResults()', () => {
        test('should display analysis results', () => {
            panel.mount();

            const results = {
                files_analyzed: 2,
                analyses: [
                    {
                        path: '/test/file1.md',
                        size: 1024,
                        file_type: 'md',
                        line_count: 50,
                        word_count: 200
                    }
                ]
            };

            panel.showAnalysisResults(results);

            expect(panel.contentArea.textContent).toContain('Analysis Complete');
            expect(panel.contentArea.textContent).toContain('2 file(s)');
            expect(panel.contentArea.textContent).toContain('file1.md');
        });

        test('should add results to history', () => {
            panel.mount();

            const results = {
                files_analyzed: 1,
                analyses: []
            };

            panel.showAnalysisResults(results);

            expect(panel._analysisHistory.length).toBe(1);
            expect(panel._lastAnalysisResults).toBe(results);
        });
    });

    describe('showDeepAnalysisResults()', () => {
        test('should display deep analysis results', () => {
            panel.mount();

            const results = {
                source_path: '/test/project',
                total_files: 10,
                total_size: 51200,
                file_types: {
                    md: 5,
                    txt: 3,
                    js: 2
                },
                files: []
            };

            panel.showDeepAnalysisResults(results);

            expect(panel.contentArea.textContent).toContain('Deep Analysis Report');
            expect(panel.contentArea.textContent).toContain('10');
            expect(panel.contentArea.textContent).toContain('Files');
        });

        test('should display file types breakdown', () => {
            panel.mount();

            const results = {
                total_files: 10,
                total_size: 51200,
                file_types: {
                    md: 5,
                    txt: 3,
                    js: 2
                }
            };

            panel.showDeepAnalysisResults(results);

            expect(panel.contentArea.textContent).toContain('.md (5)');
            expect(panel.contentArea.textContent).toContain('.txt (3)');
            expect(panel.contentArea.textContent).toContain('.js (2)');
        });

        test('should create export buttons', () => {
            panel.mount();

            const results = {
                total_files: 5,
                total_size: 10240,
                file_types: {}
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
            expect(panel._formatSize(500)).toBe('500 B');
        });

        test('should format kilobytes', () => {
            expect(panel._formatSize(1536)).toBe('1.5 KB');
        });

        test('should format megabytes', () => {
            expect(panel._formatSize(1572864)).toBe('1.5 MB');
        });
    });

    describe('exportReport()', () => {
        beforeEach(() => {
            panel.mount();
            panel._lastAnalysisResults = {
                files_analyzed: 2,
                total_files: 2,
                total_size: 2048,
                analyses: []
            };

            // Mock URL.createObjectURL and revokeObjectURL
            global.URL.createObjectURL = jest.fn(() => 'mock-url');
            global.URL.revokeObjectURL = jest.fn();
        });

        afterEach(() => {
            delete global.URL.createObjectURL;
            delete global.URL.revokeObjectURL;
        });

        test('should export as JSON', () => {
            panel.exportReport('json');

            expect(global.URL.createObjectURL).toHaveBeenCalled();
            expect(global.URL.revokeObjectURL).toHaveBeenCalled();
        });

        test('should export as Markdown', () => {
            panel.exportReport('markdown');

            expect(global.URL.createObjectURL).toHaveBeenCalled();
        });

        test('should export as HTML', () => {
            panel.exportReport('html');

            expect(global.URL.createObjectURL).toHaveBeenCalled();
        });

        test('should handle no results gracefully', () => {
            panel._lastAnalysisResults = null;
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            panel.exportReport('json');

            expect(consoleWarnSpy).toHaveBeenCalledWith('No analysis results to export');

            consoleWarnSpy.mockRestore();
        });
    });

    describe('Analysis History', () => {
        test('should add to history', () => {
            panel.mount();

            const results1 = { files_analyzed: 1, analyses: [] };
            const results2 = { files_analyzed: 2, analyses: [] };

            panel.showAnalysisResults(results1);
            panel.showAnalysisResults(results2);

            expect(panel._analysisHistory.length).toBe(2);
        });

        test('should limit history size', () => {
            panel.mount();
            panel._maxHistory = 5;

            for (let i = 0; i < 10; i++) {
                panel.showAnalysisResults({ files_analyzed: i, analyses: [] });
            }

            expect(panel._analysisHistory.length).toBe(5);
        });

        test('should get history', () => {
            panel.mount();

            panel.showAnalysisResults({ files_analyzed: 1, analyses: [] });

            const history = panel.getHistory();

            expect(history.length).toBe(1);
            expect(history[0]).toHaveProperty('id');
            expect(history[0]).toHaveProperty('timestamp');
            expect(history[0]).toHaveProperty('results');
        });

        test('should clear history', () => {
            panel.mount();

            panel.showAnalysisResults({ files_analyzed: 1, analyses: [] });
            expect(panel._analysisHistory.length).toBe(1);

            panel.clearHistory();

            expect(panel._analysisHistory.length).toBe(0);
        });

        test('should show history UI', () => {
            panel.mount();

            panel.showAnalysisResults({ files_analyzed: 1, analyses: [] });
            panel.showAnalysisResults({ files_analyzed: 2, analyses: [] });

            panel.showHistory();

            expect(panel.contentArea.textContent).toContain('Analysis History');
            expect(panel.contentArea.textContent).toContain('2 entries');
        });

        test('should show empty history message', () => {
            panel.mount();

            panel.showHistory();

            expect(panel.contentArea.textContent).toContain('No analysis history yet');
        });
    });

    describe('batchExport()', () => {
        beforeEach(() => {
            global.URL.createObjectURL = jest.fn(() => 'mock-url');
            global.URL.revokeObjectURL = jest.fn();
        });

        afterEach(() => {
            delete global.URL.createObjectURL;
            delete global.URL.revokeObjectURL;
        });

        test('should export all analyses', () => {
            panel.mount();

            panel.showAnalysisResults({ files_analyzed: 1, analyses: [] });
            panel.showAnalysisResults({ files_analyzed: 2, analyses: [] });

            panel.batchExport('json');

            expect(global.URL.createObjectURL).toHaveBeenCalled();
        });

        test('should export selected analyses', () => {
            panel.mount();

            panel.showAnalysisResults({ files_analyzed: 1, analyses: [] });
            panel.showAnalysisResults({ files_analyzed: 2, analyses: [] });
            panel.showAnalysisResults({ files_analyzed: 3, analyses: [] });

            panel.batchExport('json', [0, 2]);

            expect(global.URL.createObjectURL).toHaveBeenCalled();
        });

        test('should handle empty history', () => {
            panel.mount();
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            panel.batchExport('json');

            expect(consoleWarnSpy).toHaveBeenCalledWith('No analysis history to export');

            consoleWarnSpy.mockRestore();
        });
    });

    describe('showSettings()', () => {
        test('should display settings UI', () => {
            panel.mount();

            const settings = {
                autoAnalyze: true,
                reportFormat: 'markdown',
                theme: 'dark'
            };

            panel.showSettings(settings, jest.fn());

            expect(panel.contentArea.textContent).toContain('Plugin Settings');
            expect(panel.contentArea.querySelector('#setting-auto-analyze')).toBeTruthy();
            expect(panel.contentArea.querySelector('#setting-report-format')).toBeTruthy();
            expect(panel.contentArea.querySelector('#setting-theme')).toBeTruthy();
        });

        test('should call onSave with updated settings', () => {
            panel.mount();

            const onSave = jest.fn();
            const settings = {
                autoAnalyze: false,
                reportFormat: 'json',
                theme: 'auto'
            };

            panel.showSettings(settings, onSave);

            // Simulate form changes
            const checkbox = panel.contentArea.querySelector('#setting-auto-analyze');
            checkbox.checked = true;

            const saveBtn = document.getElementById('settings-save-btn');
            saveBtn.click();

            expect(onSave).toHaveBeenCalledWith({
                autoAnalyze: true,
                reportFormat: 'json',
                theme: 'auto'
            });
        });

        test('should close on cancel', () => {
            panel.mount();
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
            expect(document.getElementById('plugin-panel')).toBeTruthy();

            panel.destroy();

            expect(document.getElementById('plugin-panel')).toBeFalsy();
            expect(panel.container).toBeNull();
            expect(panel.contentArea).toBeNull();
        });

        test('should handle no container gracefully', () => {
            expect(() => panel.destroy()).not.toThrow();
        });
    });
});
