// E2E Test Configuration
const config = {
  // Test URLs
  baseURL: 'http://localhost:3017',
  
  // Test timeouts
  timeouts: {
    default: 30000,
    navigation: 10000,
    action: 5000,
    assertion: 10000
  },
  
  // Test data
  testData: {
    sampleMarkdown: `# Test Document

## Introduction
This is a **test document** for MD Reader Pro.

### Features
- *Italic text*
- \`Code snippets\`
- [Links](https://example.com)
- ![Images](https://via.placeholder.com/150)

> This is a blockquote

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

### Lists
1. First item
2. Second item
3. Third item

- Bullet point 1
- Bullet point 2
- Bullet point 3

---

**End of document**`,

    largeDocument: `# Large Document

This is a comprehensive test document with multiple sections and content.

## Section 1: Introduction
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Section 2: Features
- Feature 1: Advanced markdown support
- Feature 2: Real-time preview
- Feature 3: Export functionality
- Feature 4: Keyboard shortcuts

## Section 3: Code Examples
\`\`\`javascript
class MarkdownEditor {
  constructor() {
    this.content = '';
  }
  
  updateContent(newContent) {
    this.content = newContent;
    this.render();
  }
}
\`\`\`

## Section 4: Tables
| Feature | Status | Priority |
|---------|--------|----------|
| Markdown | ✅ | High |
| Preview | ✅ | High |
| Export | ✅ | Medium |
| Shortcuts | ✅ | Medium |

## Section 5: Conclusion
This document demonstrates the various markdown features supported by MD Reader Pro.`,

    performanceTestContent: `# Performance Test Document

This document is designed to test the performance of MD Reader Pro with a large amount of content.

## Content Generation
${Array.from({ length: 100 }, (_, i) => `
### Section ${i + 1}
This is section ${i + 1} with multiple paragraphs and content.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

- List item 1 in section ${i + 1}
- List item 2 in section ${i + 1}
- List item 3 in section ${i + 1}

**Bold text** and *italic text* and \`code text\` in section ${i + 1}.

> This is a blockquote in section ${i + 1}.

[Link ${i + 1}](https://example.com/section-${i + 1})
`).join('')}

## End of Performance Test
This concludes the performance test document.`
  },
  
  // Expected results
  expectedResults: {
    wordCount: {
      sampleMarkdown: 45,
      largeDocument: 120,
      performanceTestContent: 2000
    },
    readingTime: {
      sampleMarkdown: 1,
      largeDocument: 1,
      performanceTestContent: 10
    }
  },
  
  // Test selectors
  selectors: {
    // Tabs
    editorTab: '[data-tab="editor"]',
    previewTab: '[data-tab="preview"]',
    splitTab: '[data-tab="split"]',
    annotationTab: '[data-tab="annotation"]',
    readerTab: '[data-tab="reader"]',
    
    // Editor
    editor: '#markdown-editor',
    editorHeader: '.editor-header',
    wordCount: '#word-count',
    readingTime: '#reading-time',
    lineCount: '#line-count',
    charCount: '#char-count',
    
    // Controls
    findBtn: '#find-btn',
    replaceBtn: '#replace-btn',
    shortcutsBtn: '#shortcuts-btn',
    exportBtn: '#export-btn',
    
    // Modals
    findModal: '#find-replace-modal',
    shortcutsModal: '#shortcuts-modal',
    commandPalette: '#command-palette',
    
    // Auto-complete
    autocomplete: '#autocomplete-dropdown',
    autocompleteItem: '.autocomplete-item',
    
    // Export
    exportOptions: '#export-options',
    htmlExport: '[data-format="html"]',
    txtExport: '[data-format="txt"]',
    pdfExport: '[data-format="pdf"]',
    
    // Notifications
    toast: '.toast',
    successToast: '.toast.success',
    errorToast: '.toast.error',
    warningToast: '.toast.warning',
    infoToast: '.toast.info'
  },
  
  // Keyboard shortcuts
  shortcuts: {
    commandPalette: 'Control+k',
    find: 'Control+f',
    replace: 'Control+h',
    shortcuts: 'Control+Shift+?',
    escape: 'Escape',
    tab: 'Tab'
  },
  
  // Performance thresholds
  performance: {
    pageLoad: 3000, // 3 seconds
    animation: 2000, // 2 seconds
    export: 10000, // 10 seconds
    largeDocument: 5000, // 5 seconds
    concurrent: 3000 // 3 seconds
  }
};

export default config;
