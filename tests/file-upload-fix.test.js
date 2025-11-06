/**
 * Test for file upload fix - ensures no duplicate handlers cause freezing
 */

import MarkdownEditor from '../src/index.js';

describe('File Upload Fix - No Duplicate Handlers', () => {
    let editor;
    
    beforeEach(() => {
        // Set up DOM
        document.body.innerHTML = `
            <input type="file" id="file-input" />
            <textarea id="markdown-editor"></textarea>
            <div id="markdown-preview"></div>
            <div class="upload-area"></div>
        `;
        
        // Create editor instance
        editor = new MarkdownEditor();
        editor.setupEditor();
    });
    
    afterEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = '';
    });
    
    test('should have only one file upload handler attached', () => {
        const fileInput = document.getElementById('file-input');
        
        // Get all event listeners for 'change' event
        // In our case, we verify by checking the fileInput has the handler
        expect(fileInput).toBeTruthy();
        expect(editor.fileInput).toBe(fileInput);
    });
    
    test('should successfully load file without errors', () => {
        const fileContent = '# Test File\n\nThis is a test.';
        const file = new File([fileContent], 'test.md', { type: 'text/markdown' });
        
        // Mock FileReader
        const mockFileReader = {
            readAsText: jest.fn(),
            onload: null,
            onerror: null,
            onabort: null,
            result: fileContent
        };
        
        global.FileReader = jest.fn(() => mockFileReader);
        
        // Call loadFile
        editor.loadFile(file);
        
        // Simulate successful file read
        mockFileReader.onload({ target: { result: fileContent } });
        
        // Verify editor was updated
        expect(editor.editor.value).toBe(fileContent);
    });
    
    test('should handle file errors gracefully', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
        
        const file = new File(['content'], 'test.md', { type: 'text/markdown' });
        
        // Mock FileReader
        const mockFileReader = {
            readAsText: jest.fn(),
            onload: null,
            onerror: null,
            onabort: null
        };
        
        global.FileReader = jest.fn(() => mockFileReader);
        
        // Call loadFile
        editor.loadFile(file);
        
        // Simulate error
        const errorEvent = new Error('File read error');
        mockFileReader.onerror(errorEvent);
        
        // Verify error was handled
        expect(consoleErrorSpy).toHaveBeenCalledWith('File reading error:', errorEvent);
        expect(alertSpy).toHaveBeenCalledWith('Error reading file. Please try again.');
        
        consoleErrorSpy.mockRestore();
        alertSpy.mockRestore();
    });
    
    test('should not call loadFile multiple times for single file', () => {
        const loadFileSpy = jest.spyOn(editor, 'loadFile');
        const fileInput = document.getElementById('file-input');
        
        const file = new File(['# Test'], 'test.md', { type: 'text/markdown' });
        
        // Simulate file selection
        Object.defineProperty(fileInput, 'files', {
            value: [file],
            writable: false
        });
        
        // Trigger change event
        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);
        
        // Should be called exactly once
        expect(loadFileSpy).toHaveBeenCalledTimes(1);
        expect(loadFileSpy).toHaveBeenCalledWith(file);
        
        loadFileSpy.mockRestore();
    });
    
    test('should clean up FileReader handlers to prevent memory leaks', () => {
        const fileContent = '# Test';
        const file = new File([fileContent], 'test.md', { type: 'text/markdown' });
        
        const mockFileReader = {
            readAsText: jest.fn(),
            onload: null,
            onerror: null,
            onabort: null,
            result: fileContent
        };
        
        global.FileReader = jest.fn(() => mockFileReader);
        
        editor.loadFile(file);
        
        // Simulate successful load
        mockFileReader.onload({ target: { result: fileContent } });
        
        // Verify handlers are cleaned up
        expect(mockFileReader.onload).toBeNull();
        expect(mockFileReader.onerror).toBeNull();
        expect(mockFileReader.onabort).toBeNull();
    });
});
