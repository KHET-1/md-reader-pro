/**
 * Security tests for PluginPanel
 * Tests XSS prevention in plugin-provided content
 */

describe('PluginPanel Security', () => {
    let PluginPanel;
    
    beforeEach(async () => {
        // Import PluginPanel class
        const module = await import('../src/plugins/PluginPanel.js');
        PluginPanel = module.default;
        
        // Setup DOM
        document.body.innerHTML = '<div id="test-container"></div>';
    });
    
    afterEach(() => {
        document.body.innerHTML = '';
    });
    
    test('should escape HTML in error messages', () => {
        const panel = new PluginPanel();
        panel.mount();
        
        // Try XSS attack via error message
        const maliciousMessage = '<img src=x onerror=alert("XSS")>';
        panel.showError(maliciousMessage);
        
        // The content should be escaped - no actual HTML tags or event handlers
        expect(panel.contentArea.innerHTML).not.toContain('<img src=x');
        expect(panel.contentArea.innerHTML).toContain('&lt;img');
        expect(panel.contentArea.innerHTML).toContain('&gt;');
    });
    
    test('should escape HTML in loading messages', () => {
        const panel = new PluginPanel();
        panel.mount();
        
        // Try XSS attack via loading message
        const maliciousMessage = '<script>alert("XSS")</script>Loading...';
        panel.showLoading(maliciousMessage);
        
        // The content should be escaped
        expect(panel.contentArea.innerHTML).not.toContain('<script>');
        expect(panel.contentArea.innerHTML).toContain('&lt;script&gt;');
    });
    
    test('should escape file names in analysis results', () => {
        const panel = new PluginPanel();
        panel.mount();
        
        // Try XSS attack via file path
        const maliciousResults = {
            files_analyzed: 1,
            analyses: [
                {
                    path: '/path/to/<img src=x onerror=alert("XSS")>.md',
                    file_type: 'markdown<script>alert("XSS")</script>',
                    size: 1024,
                    line_count: 10,
                    word_count: 100,
                    is_binary: false
                }
            ]
        };
        
        panel.showAnalysisResults(maliciousResults);
        
        // The content should be escaped - no actual HTML tags
        expect(panel.contentArea.innerHTML).not.toContain('<img src=x');
        expect(panel.contentArea.innerHTML).not.toContain('<script>alert');
        expect(panel.contentArea.innerHTML).toContain('&lt;img');
        expect(panel.contentArea.innerHTML).toContain('&lt;script&gt;');
    });
    
    test('should escape file types in deep analysis', () => {
        const panel = new PluginPanel();
        panel.mount();
        
        // Try XSS attack via file types
        const maliciousResults = {
            source_path: '/path/<script>alert("XSS")</script>',
            total_files: 5,
            total_size: 5120,
            file_types: {
                'md<img src=x onerror=alert("XSS")>': 3,
                'txt': 2
            }
        };
        
        panel.showDeepAnalysisResults(maliciousResults);
        
        // The content should be escaped - no actual HTML tags
        expect(panel.contentArea.innerHTML).not.toContain('<script>alert');
        expect(panel.contentArea.innerHTML).not.toContain('<img src=x');
        expect(panel.contentArea.innerHTML).toContain('&lt;script&gt;');
        expect(panel.contentArea.innerHTML).toContain('&lt;img');
    });
    
    test('should escape panel titles', () => {
        const panel = new PluginPanel();
        panel.mount();
        
        // Try XSS attack via title
        const maliciousTitle = '<img src=x onerror=alert("XSS")>';
        const maliciousIcon = '<script>alert("XSS")</script>';
        panel.setTitle(maliciousTitle, maliciousIcon);
        
        // The content should be escaped - no actual HTML tags
        expect(panel.titleEl.innerHTML).not.toContain('<img src=x');
        expect(panel.titleEl.innerHTML).not.toContain('<script>alert');
        expect(panel.titleEl.innerHTML).toContain('&lt;');
        expect(panel.titleEl.innerHTML).toContain('&gt;');
    });
    
    test('should sanitize HTML in setContent method', () => {
        const panel = new PluginPanel();
        panel.mount();
        
        // Try XSS attack via setContent
        const maliciousHtml = '<div onclick="alert(\'XSS\')">Click me</div><script>alert("XSS")</script>';
        panel.setContent(maliciousHtml);
        
        // Scripts should be removed by DOMPurify
        expect(panel.contentArea.innerHTML).not.toContain('<script>');
        // onclick should be removed by DOMPurify (not in ALLOWED_ATTR)
        expect(panel.contentArea.innerHTML).not.toContain('onclick=');
    });
    
    test('should sanitize HTML in appendContent method', () => {
        const panel = new PluginPanel();
        panel.mount();
        
        // Clear initial content
        panel.clearContent();
        
        // Try XSS attack via appendContent
        const maliciousHtml = '<div onclick="alert(\'XSS\')">Appended content</div>';
        panel.appendContent(maliciousHtml);
        
        // onclick should be removed
        expect(panel.contentArea.innerHTML).not.toContain('onclick=');
        expect(panel.contentArea.innerHTML).toContain('Appended content');
    });
    
    test('_escapeHtml helper should properly escape HTML entities', () => {
        const panel = new PluginPanel();
        
        // Test various HTML entities
        expect(panel._escapeHtml('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
        expect(panel._escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
        expect(panel._escapeHtml('Normal text')).toBe('Normal text');
        expect(panel._escapeHtml('')).toBe('');
        expect(panel._escapeHtml(null)).toBe('');
        expect(panel._escapeHtml(undefined)).toBe('');
    });
});
