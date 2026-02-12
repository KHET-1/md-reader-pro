/**
 * Tests for PluginPanel module
 */
import PluginPanel from '../src/plugins/PluginPanel.js';

describe('PluginPanel', () => {
    let panel;

    beforeEach(() => {
        document.body.innerHTML = '';
        panel = new PluginPanel({
            width: 400,
            onClose: jest.fn(),
            onPluginAction: jest.fn()
        });
    });

    afterEach(() => {
        if (panel) {
            panel.destroy();
        }
    });

    describe('constructor', () => {
        test('creates with default options', () => {
            const defaultPanel = new PluginPanel();
            expect(defaultPanel.container).toBeNull();
            expect(defaultPanel.isOpen).toBe(false);
            expect(defaultPanel.currentPlugin).toBeNull();
            expect(defaultPanel.width).toBe(350);
        });

        test('accepts custom width', () => {
            expect(panel.width).toBe(400);
        });

        test('initializes analysis history', () => {
            expect(panel._analysisHistory).toEqual([]);
            expect(panel._maxHistory).toBe(50);
        });
    });

    describe('mount', () => {
        test('creates panel DOM elements', () => {
            panel.mount();
            expect(panel.container).not.toBeNull();
            expect(panel.contentArea).not.toBeNull();
            expect(document.getElementById('plugin-panel')).not.toBeNull();
        });

        test('does not re-mount if already mounted', () => {
            panel.mount();
            const firstContainer = panel.container;
            panel.mount();
            expect(panel.container).toBe(firstContainer);
        });

        test('has close button', () => {
            panel.mount();
            const closeBtn = panel.container.querySelector('button');
            expect(closeBtn).not.toBeNull();
            expect(closeBtn.innerHTML).toBe('✕');
        });

        test('close button triggers close', () => {
            panel.mount();
            const closeBtn = panel.container.querySelector('button');
            closeBtn.click();
            expect(panel.isOpen).toBe(false);
        });
    });

    describe('open', () => {
        test('opens the panel', () => {
            panel.open();
            expect(panel.isOpen).toBe(true);
            expect(panel.container.style.transform).toBe('translateX(0)');
        });

        test('auto-mounts if not mounted', () => {
            panel.open();
            expect(panel.container).not.toBeNull();
        });

        test('adjusts main content margin', () => {
            const mainContent = document.createElement('div');
            mainContent.className = 'content';
            document.body.appendChild(mainContent);

            panel.open();
            expect(mainContent.style.marginRight).toBe('400px');
        });
    });

    describe('close', () => {
        test('closes the panel', () => {
            panel.open();
            panel.close();
            expect(panel.isOpen).toBe(false);
            expect(panel.container.style.transform).toBe('translateX(100%)');
        });

        test('calls onClose callback', () => {
            panel.open();
            panel.close();
            expect(panel.onClose).toHaveBeenCalled();
        });

        test('resets main content margin', () => {
            const mainContent = document.createElement('div');
            mainContent.className = 'content';
            document.body.appendChild(mainContent);

            panel.open();
            panel.close();
            expect(mainContent.style.marginRight).toBe('0px');
        });

        test('does nothing if not mounted', () => {
            expect(() => panel.close()).not.toThrow();
        });
    });

    describe('toggle', () => {
        test('opens when closed', () => {
            panel.toggle();
            expect(panel.isOpen).toBe(true);
        });

        test('closes when open', () => {
            panel.open();
            panel.toggle();
            expect(panel.isOpen).toBe(false);
        });
    });

    describe('setTitle', () => {
        test('sets panel title with icon', () => {
            panel.mount();
            panel.setTitle('Diamond Drill', '💎');
            expect(panel.titleEl.innerHTML).toContain('Diamond Drill');
            expect(panel.titleEl.innerHTML).toContain('💎');
        });

        test('uses default icon', () => {
            panel.mount();
            panel.setTitle('Test Panel');
            expect(panel.titleEl.innerHTML).toContain('🔌');
        });

        test('no-op if not mounted', () => {
            expect(() => panel.setTitle('Test')).not.toThrow();
        });
    });

    describe('setContent', () => {
        test('sets HTML content', () => {
            panel.mount();
            panel.setContent('<p>Hello World</p>');
            expect(panel.contentArea.innerHTML).toBe('<p>Hello World</p>');
        });

        test('no-op if not mounted', () => {
            expect(() => panel.setContent('<p>Hello</p>')).not.toThrow();
        });
    });

    describe('appendContent', () => {
        test('appends HTML string', () => {
            panel.mount();
            panel.setContent('<p>First</p>');
            panel.appendContent('<p>Second</p>');
            expect(panel.contentArea.innerHTML).toContain('First');
            expect(panel.contentArea.innerHTML).toContain('Second');
        });

        test('appends DOM element', () => {
            panel.mount();
            const el = document.createElement('div');
            el.id = 'test-append';
            el.textContent = 'Appended';
            panel.appendContent(el);
            expect(panel.contentArea.querySelector('#test-append')).not.toBeNull();
        });

        test('no-op if not mounted', () => {
            expect(() => panel.appendContent('test')).not.toThrow();
        });
    });

    describe('clearContent', () => {
        test('clears content area', () => {
            panel.mount();
            panel.setContent('<p>Content</p>');
            panel.clearContent();
            expect(panel.contentArea.innerHTML).toBe('');
        });

        test('no-op if not mounted', () => {
            expect(() => panel.clearContent()).not.toThrow();
        });
    });

    describe('showLoading', () => {
        test('shows loading spinner with message', () => {
            panel.mount();
            panel.showLoading('Analyzing...');
            expect(panel.contentArea.innerHTML).toContain('Analyzing...');
            expect(panel.contentArea.innerHTML).toContain('spinner');
        });

        test('uses default message', () => {
            panel.mount();
            panel.showLoading();
            expect(panel.contentArea.innerHTML).toContain('Loading...');
        });
    });

    describe('showError', () => {
        test('shows error message', () => {
            panel.mount();
            panel.showError('Something went wrong');
            expect(panel.contentArea.innerHTML).toContain('Something went wrong');
            expect(panel.contentArea.innerHTML).toContain('⚠️');
        });
    });

    describe('showAnalysisResults', () => {
        test('displays analysis results', () => {
            panel.mount();
            panel.showAnalysisResults({
                files_analyzed: 2,
                analyses: [
                    { path: '/src/index.js', size: 2048, file_type: 'js', permissions: '644', is_binary: false },
                    { path: '/README.md', size: 512, file_type: 'md', permissions: '644', is_binary: false }
                ]
            });
            expect(panel.contentArea.innerHTML).toContain('Analysis Complete');
            expect(panel.contentArea.innerHTML).toContain('2 file(s)');
            expect(panel.contentArea.innerHTML).toContain('index.js');
            expect(panel.contentArea.innerHTML).toContain('README.md');
        });

        test('handles binary files', () => {
            panel.mount();
            panel.showAnalysisResults({
                files_analyzed: 1,
                analyses: [
                    { path: '/img/logo.png', size: 10240, file_type: 'png', is_binary: true }
                ]
            });
            expect(panel.contentArea.innerHTML).toContain('Binary file');
        });

        test('handles results with line/word counts', () => {
            panel.mount();
            panel.showAnalysisResults({
                files_analyzed: 1,
                analyses: [
                    { path: '/test.md', size: 100, file_type: 'md', line_count: 50, word_count: 200, is_binary: false }
                ]
            });
            expect(panel.contentArea.innerHTML).toContain('Lines: 50');
            expect(panel.contentArea.innerHTML).toContain('Words: 200');
        });

        test('adds to analysis history', () => {
            panel.mount();
            panel.showAnalysisResults({
                files_analyzed: 1,
                analyses: [{ path: '/test.md', size: 100, file_type: 'md', is_binary: false }]
            });
            expect(panel._analysisHistory).toHaveLength(1);
        });

        test('handles empty analyses', () => {
            panel.mount();
            panel.showAnalysisResults({
                files_analyzed: 0,
                analyses: []
            });
            expect(panel.contentArea.innerHTML).toContain('0 file(s)');
        });
    });

    describe('showDeepAnalysisResults', () => {
        test('displays deep analysis results', () => {
            panel.mount();
            panel.showDeepAnalysisResults({
                source_path: '/project',
                total_files: 15,
                total_size: 50000,
                file_types: { js: 8, md: 5, css: 2 },
                files: []
            });
            expect(panel.contentArea.innerHTML).toContain('Deep Analysis Report');
            expect(panel.contentArea.innerHTML).toContain('15');
            expect(panel.contentArea.innerHTML).toContain('.js (8)');
            expect(panel.contentArea.innerHTML).toContain('.md (5)');
        });

        test('shows export buttons', () => {
            panel.mount();
            panel.showDeepAnalysisResults({
                source_path: '/project',
                total_files: 5,
                total_size: 1000,
                file_types: {},
                files: []
            });
            expect(panel.contentArea.innerHTML).toContain('Export JSON');
            expect(panel.contentArea.innerHTML).toContain('Export MD');
        });

        test('handles missing file_types', () => {
            panel.mount();
            panel.showDeepAnalysisResults({
                source_path: '/project',
                total_files: 0,
                total_size: 0,
                files: []
            });
            expect(panel.contentArea.innerHTML).toContain('Deep Analysis Report');
        });
    });

    describe('showSettings', () => {
        test('shows settings UI', () => {
            panel.mount();
            panel.showSettings({ autoAnalyze: true, reportFormat: 'markdown', theme: 'dark' }, jest.fn());
            expect(panel.contentArea.innerHTML).toContain('Plugin Settings');
            expect(panel.contentArea.innerHTML).toContain('Auto-analyze');
            expect(panel.contentArea.innerHTML).toContain('Report Format');
        });

        test('handles null settings', () => {
            panel.mount();
            panel.showSettings(null, jest.fn());
            expect(panel.contentArea.innerHTML).toContain('Plugin Settings');
        });

        test('save button calls onSave', () => {
            panel.mount();
            const onSave = jest.fn();
            panel.showSettings({}, onSave);
            const saveBtn = document.getElementById('settings-save-btn');
            saveBtn.click();
            expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
                autoAnalyze: expect.any(Boolean),
                reportFormat: expect.any(String),
                theme: expect.any(String)
            }));
        });

        test('cancel button closes panel', () => {
            panel.mount();
            panel.open();
            panel.showSettings({}, jest.fn());
            const cancelBtn = document.getElementById('settings-cancel-btn');
            cancelBtn.click();
            expect(panel.isOpen).toBe(false);
        });
    });

    describe('exportReport', () => {
        test('exports JSON report', () => {
            panel.mount();
            panel._lastAnalysisResults = {
                files_analyzed: 1,
                analyses: [{ path: '/test.md', size: 100, file_type: 'md' }]
            };
            panel.exportReport('json');
            // Blob and URL.createObjectURL are mocked in setup
            expect(URL.createObjectURL).toHaveBeenCalled();
        });

        test('exports markdown report', () => {
            panel.mount();
            panel._lastAnalysisResults = {
                files_analyzed: 1,
                total_size: 1024,
                analyses: [{ path: '/test.md', size: 100, file_type: 'md', line_count: 10 }]
            };
            panel.exportReport('markdown');
            expect(URL.createObjectURL).toHaveBeenCalled();
        });

        test('exports HTML report', () => {
            panel.mount();
            panel._lastAnalysisResults = {
                files_analyzed: 1,
                total_size: 500,
                analyses: []
            };
            panel.exportReport('html');
            expect(URL.createObjectURL).toHaveBeenCalled();
        });

        test('warns when no results to export', () => {
            panel.mount();
            panel._lastAnalysisResults = null;
            panel.exportReport('json');
            // Should not throw
        });

        test('exports deep analysis results with source_path', () => {
            panel.mount();
            panel._lastAnalysisResults = {
                source_path: '/project',
                total_files: 5,
                total_size: 2048,
                file_types: { js: 3, md: 2 },
                files: [{ path: '/project/a.js', size: 500, file_type: 'js', word_count: 100 }]
            };
            panel.exportReport('markdown');
            expect(URL.createObjectURL).toHaveBeenCalled();
        });
    });

    describe('_formatSize', () => {
        test('formats bytes', () => {
            panel.mount();
            expect(panel._formatSize(500)).toBe('500 B');
        });

        test('formats kilobytes', () => {
            panel.mount();
            expect(panel._formatSize(2048)).toBe('2.0 KB');
        });

        test('formats megabytes', () => {
            panel.mount();
            expect(panel._formatSize(1048576)).toBe('1.0 MB');
        });
    });

    describe('batchExport', () => {
        beforeEach(() => {
            panel.mount();
            panel._analysisHistory = [
                { id: 1, timestamp: '2025-01-01T00:00:00.000Z', results: { files_analyzed: 1, total_size: 100, analyses: [{ path: 'a.md', size: 100, file_type: 'md' }] } },
                { id: 2, timestamp: '2025-01-02T00:00:00.000Z', results: { files_analyzed: 2, total_size: 200, analyses: [{ path: 'b.md', size: 200, file_type: 'md' }] } }
            ];
        });

        test('exports all history as JSON', () => {
            panel.batchExport('json');
            expect(URL.createObjectURL).toHaveBeenCalled();
        });

        test('exports all history as markdown', () => {
            panel.batchExport('markdown');
            expect(URL.createObjectURL).toHaveBeenCalled();
        });

        test('exports all history as HTML', () => {
            panel.batchExport('html');
            expect(URL.createObjectURL).toHaveBeenCalled();
        });

        test('exports specific indices', () => {
            panel.batchExport('json', [0]);
            expect(URL.createObjectURL).toHaveBeenCalled();
        });

        test('warns when no history to export', () => {
            panel._analysisHistory = [];
            panel.batchExport('json');
            // Should not throw or call createObjectURL
        });

        test('filters out invalid indices', () => {
            panel.batchExport('json', [99]);
            // Invalid index filtered out, resulting in empty - should not throw
        });
    });

    describe('analysis history', () => {
        test('getHistory returns copy of history', () => {
            panel._analysisHistory = [{ id: 1 }];
            const history = panel.getHistory();
            expect(history).toEqual([{ id: 1 }]);
            history.push({ id: 2 });
            expect(panel._analysisHistory).toHaveLength(1);
        });

        test('clearHistory empties history', () => {
            panel._analysisHistory = [{ id: 1 }, { id: 2 }];
            panel.clearHistory();
            expect(panel._analysisHistory).toHaveLength(0);
        });

        test('_addToHistory adds and trims', () => {
            panel._maxHistory = 3;
            panel._addToHistory({ test: 1 });
            panel._addToHistory({ test: 2 });
            panel._addToHistory({ test: 3 });
            panel._addToHistory({ test: 4 });
            expect(panel._analysisHistory).toHaveLength(3);
            expect(panel._analysisHistory[0].results.test).toBe(4);
        });
    });

    describe('showHistory', () => {
        test('shows empty state when no history', () => {
            panel.mount();
            panel._analysisHistory = [];
            panel.showHistory();
            expect(panel.contentArea.innerHTML).toContain('No analysis history yet');
        });

        test('shows history entries', () => {
            panel.mount();
            panel._analysisHistory = [
                { id: 1, timestamp: '2025-01-01T00:00:00.000Z', results: { files_analyzed: 3, total_size: 500 } },
                { id: 2, timestamp: '2025-01-02T00:00:00.000Z', results: { total_files: 5, total_size: 1000 } }
            ];
            panel.showHistory();
            expect(panel.contentArea.innerHTML).toContain('Analysis History');
            expect(panel.contentArea.innerHTML).toContain('2 entries');
            expect(panel.contentArea.innerHTML).toContain('Export All JSON');
        });

        test('view button shows analysis results', () => {
            panel.mount();
            panel._analysisHistory = [
                { id: 1, timestamp: '2025-01-01T00:00:00.000Z', results: { files_analyzed: 1, analyses: [{ path: '/test.md', size: 100, file_type: 'md', is_binary: false }] } }
            ];
            panel.showHistory();
            const viewBtn = document.querySelector('.history-view-btn');
            viewBtn.click();
            expect(panel.contentArea.innerHTML).toContain('Analysis Complete');
        });

        test('view button shows deep analysis for directory results', () => {
            panel.mount();
            panel._analysisHistory = [
                { id: 1, timestamp: '2025-01-01T00:00:00.000Z', results: { source_path: '/project', total_files: 5, total_size: 1000, file_types: {}, files: [] } }
            ];
            panel.showHistory();
            const viewBtn = document.querySelector('.history-view-btn');
            viewBtn.click();
            expect(panel.contentArea.innerHTML).toContain('Deep Analysis Report');
        });
    });

    describe('destroy', () => {
        test('removes container from DOM', () => {
            panel.mount();
            expect(document.getElementById('plugin-panel')).not.toBeNull();
            panel.destroy();
            expect(document.getElementById('plugin-panel')).toBeNull();
            expect(panel.container).toBeNull();
            expect(panel.contentArea).toBeNull();
        });

        test('no-op if not mounted', () => {
            expect(() => panel.destroy()).not.toThrow();
        });
    });
});
