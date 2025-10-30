# 📋 MD Reader Pro - Product Backlog

> **Purpose**: Prioritized list of features, improvements, and fixes ready for implementation. Items here have been vetted, planned, and are ready for development.

---

## 🎯 Backlog Management

### Status Labels
- 🟢 **Ready** - Fully specified, ready to start
- 🟡 **In Progress** - Currently being worked on
- 🔵 **In Review** - Code review or testing phase
- ✅ **Done** - Completed and merged
- 🔴 **Blocked** - Waiting on dependency or decision

### Priority Levels
- **P0** - Critical (Security, data loss, broken core features)
- **P1** - High (Major features, significant improvements)
- **P2** - Medium (Nice-to-have features, minor improvements)
- **P3** - Low (Future enhancements, polish)

### Effort Estimation
- **XS** - 1-4 hours
- **S** - 4-8 hours (1 day)
- **M** - 1-3 days
- **L** - 3-7 days (1 week)
- **XL** - 1-2 weeks
- **XXL** - 2+ weeks

---

## 🚨 P0 - Critical Priority

### Security & Data Integrity

#### 🟢 Add CSP Headers for XSS Protection
- **Priority**: P0
- **Effort**: S
- **Status**: Ready
- **Description**: Implement Content Security Policy headers to prevent XSS attacks
- **Acceptance Criteria**:
  - CSP headers configured in webpack
  - No inline scripts/styles violations
  - Security audit passes
- **Related**: SECURITY.md

---

## 🔥 P1 - High Priority

### User Experience Improvements

#### 🟢 Auto-Save to LocalStorage
- **Priority**: P1
- **Effort**: M
- **Status**: Ready
- **Description**: Prevent data loss by auto-saving content every 30 seconds
- **Acceptance Criteria**:
  - Content saved to localStorage with debouncing
  - "Last saved at..." indicator in UI
  - Restore prompt on page load if unsaved content exists
  - Clear saved content option
- **Technical Details**:
  - Use `localStorage.setItem('mdreader-autosave', content)`
  - Add timestamp for last save
  - Implement 30-second debounce
  - Version the storage format
- **Tests Required**: Unit tests for save/restore logic
- **Moved from**: IDEAS.md (2025-10-28)

---

#### 🟢 Keyboard Shortcuts Helper (? key)
- **Priority**: P1
- **Effort**: S
- **Status**: Ready
- **Description**: Modal overlay showing all keyboard shortcuts
- **Acceptance Criteria**:
  - Press `?` or `Ctrl+/` to open
  - Shows all current shortcuts
  - Searchable/filterable
  - Dismissible with ESC
  - Mobile-friendly display
- **UI Mockup**: Modal with shortcuts grid
- **Tests Required**: E2E test for modal interaction
- **Moved from**: IDEAS.md (2025-10-28)

---

#### 🟢 Undo/Redo Functionality
- **Priority**: P1
- **Effort**: M
- **Status**: Ready
- **Description**: Custom undo/redo beyond browser default
- **Acceptance Criteria**:
  - Track content history (last 50 states)
  - Ctrl+Z for undo, Ctrl+Y for redo
  - Show undo/redo buttons in UI
  - Disable buttons when at history limits
- **Technical Details**:
  - Implement history stack (array of states)
  - Debounce history saves (500ms)
  - Clear history on file load
- **Tests Required**: Unit tests for history management

---

### Core Features

#### 🟢 Export to PDF
- **Priority**: P1
- **Effort**: L
- **Status**: Ready
- **Description**: Export rendered markdown to PDF with styling
- **Acceptance Criteria**:
  - "Export to PDF" button in UI
  - Preserves markdown formatting
  - Custom PDF metadata (title, author)
  - Page breaks handled correctly
  - Code blocks preserved
- **Library Options**:
  - Option 1: jsPDF + html2canvas
  - Option 2: Print CSS + browser print API
  - Option 3: Client-side PDF generation
- **Tests Required**: E2E test verifying PDF generation
- **Design Review**: Needed for export menu UI
- **Moved from**: FEATURES.md roadmap

---

#### 🟢 Export to HTML
- **Priority**: P1
- **Effort**: S
- **Status**: Ready
- **Description**: Export rendered HTML with embedded CSS
- **Acceptance Criteria**:
  - "Export to HTML" button
  - Self-contained HTML file
  - CSS inlined or embedded
  - Markdown source in comment (optional)
  - Clean, production-ready output
- **Technical Details**:
  - Use existing preview HTML
  - Embed CSS from styles
  - Create Blob and download
- **Tests Required**: Unit test for HTML generation

---

## 📊 P2 - Medium Priority

### Editor Enhancements

#### 🟢 Line Numbers in Editor
- **Priority**: P2
- **Effort**: M
- **Status**: Ready
- **Description**: Optional line numbers in editor gutter
- **Acceptance Criteria**:
  - Toggle line numbers on/off
  - Synced with editor scroll
  - Clickable to jump to line
  - Accessible (screen reader support)
  - Persistent setting (localStorage)
- **Technical Challenges**: 
  - Sync scrolling with textarea
  - Handle dynamic content
- **Tests Required**: E2E test for scroll sync

---

#### 🟢 Find and Replace
- **Priority**: P2
- **Effort**: M
- **Status**: Ready
- **Description**: Search within document with replace functionality
- **Acceptance Criteria**:
  - Ctrl+F opens find dialog
  - Case sensitive/insensitive toggle
  - Whole word matching option
  - Find next/previous
  - Replace and Replace All
  - Regex support (optional)
  - Highlight all matches
- **UI Design**: Floating search bar like VS Code
- **Tests Required**: E2E tests for all search modes

---

#### 🟢 Word Count & Statistics
- **Priority**: P2
- **Effort**: S
- **Status**: Ready
- **Description**: Live statistics panel
- **Acceptance Criteria**:
  - Word count
  - Character count (with/without spaces)
  - Reading time estimate
  - Paragraph count
  - Sentence count (optional)
  - Toggle visibility
- **Technical Details**:
  - Real-time calculation (debounced)
  - Reading speed: ~200 words/minute
  - Display in footer or sidebar
- **Tests Required**: Unit tests for calculation accuracy

---

### UI/UX Improvements

#### 🟢 Theme Selector
- **Priority**: P2
- **Effort**: M
- **Status**: Ready
- **Description**: Multiple color themes beyond current dark theme
- **Acceptance Criteria**:
  - At least 3 themes: Dark, Light, Solarized
  - Theme switcher in settings
  - Persistent preference (localStorage)
  - Smooth theme transitions
  - Accessible contrast ratios
- **Theme Options**:
  - Current Dark (default)
  - Light theme
  - Solarized Dark
  - Solarized Light
  - Dracula
- **Tests Required**: E2E test for theme switching

---

#### 🟢 Distraction-Free Mode
- **Priority**: P2
- **Effort**: S
- **Status**: Ready
- **Description**: Zen mode for focused writing
- **Acceptance Criteria**:
  - Toggle with F11 or button
  - Hides preview pane
  - Centers editor with max width
  - Fades out UI chrome
  - ESC to exit
  - Typewriter scrolling (optional)
- **UI Changes**: Fullscreen editor, minimal UI
- **Tests Required**: E2E test for mode toggle

---

## 🔮 P3 - Low Priority

### Advanced Features

#### 🟢 Markdown Templates
- **Priority**: P3
- **Effort**: M
- **Status**: Ready
- **Description**: Pre-built document templates
- **Templates**:
  - Meeting notes
  - Project README
  - Technical documentation
  - Blog post
  - Research paper
  - Resume/CV
- **Implementation**: JSON config with template content
- **UI**: Template picker on new document
- **Tests Required**: Unit test for template loading

---

#### 🟢 Table of Contents Generator
- **Priority**: P3
- **Effort**: M
- **Status**: Ready
- **Description**: Auto-generate TOC from headings
- **Acceptance Criteria**:
  - Parses H1-H6 headings
  - Generates nested list with links
  - Updates on content change
  - "Insert TOC" button
  - Customizable depth (H1-H3 vs H1-H6)
- **Technical Details**:
  - Use heading IDs from marked
  - Insert markdown list at cursor
- **Tests Required**: Unit test for TOC generation

---

#### 🟢 Split View Orientation Toggle
- **Priority**: P3
- **Effort**: S
- **Status**: Ready
- **Description**: Vertical vs horizontal split
- **Acceptance Criteria**:
  - Toggle button for orientation
  - Smooth transition animation
  - Responsive on mobile
  - Persistent preference
- **UI Changes**: Flexbox direction toggle
- **Tests Required**: E2E test for layout change

---

## 🚧 In Progress

*No items currently in progress*

---

## 🔴 Blocked Items

### Research Required

#### 🔴 WASM Markdown Parser
- **Priority**: P3
- **Effort**: XL
- **Status**: Blocked - Research needed
- **Blocker**: Need to evaluate performance benefit vs complexity
- **Description**: Use WebAssembly for faster markdown parsing
- **Questions**:
  - Is current performance already sufficient?
  - What's the bundle size impact?
  - Maintenance burden?
  - Cross-browser support?
- **Next Steps**: Create performance benchmark comparison

---

## ✅ Recently Completed

### Version 3.4.0
- ✅ Comprehensive test coverage (94.7%)
- ✅ Performance benchmarking framework
- ✅ CI/CD pipeline with GitHub Actions
- ✅ Security hardening (XSS prevention)
- ✅ Accessibility improvements (ARIA labels)
- ✅ Interactive help system
- ✅ Error handling and edge cases

---

## 📝 Backlog Notes

### Adding New Items
1. Start in IDEAS.md for brainstorming
2. When ready, move here with full specification
3. Assign priority, effort, and status
4. Get team/stakeholder approval for P0/P1 items
5. Create GitHub issue and link here

### Estimation Guide
- Include: Development + Testing + Documentation
- Buffer: Add 20% for unknowns
- Review: Technical complexity and dependencies

### Definition of Ready
- [ ] Clear description and acceptance criteria
- [ ] Priority and effort estimated
- [ ] Technical approach outlined
- [ ] Dependencies identified
- [ ] Tests specified
- [ ] Stakeholder approval (for P0/P1)

### Definition of Done
- [ ] Code complete and reviewed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Performance impact assessed
- [ ] Accessibility verified
- [ ] Deployed to production

---

## 🔄 Backlog Refinement

**Schedule**: Review every 2 weeks  
**Participants**: Maintainers and contributors  
**Activities**:
- Re-prioritize items
- Move completed items to Done
- Refine upcoming items
- Add new items from IDEAS.md
- Remove obsolete items

**Next Review**: TBD

---

## 📊 Metrics

### Velocity Tracking
*Track completed story points per sprint/month*

### Backlog Health
- Total items: *To be counted*
- P0 items: *To be counted*
- P1 items: *To be counted*
- P2 items: *To be counted*
- P3 items: *To be counted*
- Blocked items: *To be counted*

---

**Last Updated**: 2025-10-28  
**Maintained by**: Project maintainers  
**Questions?**: Open a GitHub Discussion
