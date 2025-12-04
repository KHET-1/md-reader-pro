import MarkdownEditor from '../src/index.js';

describe('Debug setupCopyButtons', () => {
    let editor;

    beforeEach(() => {
        document.body.innerHTML = `
            <textarea id="markdown-editor"></textarea>
            <div id="markdown-preview"></div>
            <input type="file" id="file-input" />
            <div class="upload-area"></div>
        `;
        editor = new MarkdownEditor();
        // Don't call setupEditor - we'll manually set things up
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('minimal test - spy before setup, button before click', () => {
        // Set required properties
        editor.editor = document.getElementById('markdown-editor');
        editor.preview = document.getElementById('markdown-preview');
        
        // Spy FIRST
        const copySpy = jest.spyOn(editor, 'copyToEditor').mockImplementation((text) => {
            console.log('SPY was called with:', text);
        });
        
        // Create button 
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.setAttribute('data-copy-text', '# Test');
        document.body.appendChild(btn);
        
        // Now call setupCopyButtons from the actual editor
        editor.setupCopyButtons();
        
        // Click
        btn.click();
        
        console.log('Spy calls:', copySpy.mock.calls);
        
        expect(copySpy).toHaveBeenCalledWith('# Test');
    });
    
    test('actual failing test pattern - setupEditor first', () => {
        // Call setupEditor like the actual test does
        editor.setupEditor();
        
        // THEN call setupCopyButtons again (as the original test does)
        editor.setupCopyButtons();
        
        // Create button
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.setAttribute('data-copy-text', '# Test');
        document.body.appendChild(btn);
        
        // Spy AFTER everything
        const copySpy = jest.spyOn(editor, 'copyToEditor').mockImplementation((text) => {
            console.log('SPY was called with:', text);
        });
        
        // Click
        btn.click();
        
        console.log('Spy calls:', copySpy.mock.calls);
        
        expect(copySpy).toHaveBeenCalledWith('# Test');
    });
});
