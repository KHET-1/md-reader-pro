# MD Reader Pro – Features & Wiring

Features are enabled in **waves** so each batch is testable and stays functional.

---

## Wave 1 – Core (always on)

| Feature | Wired in | How to use |
|--------|----------|------------|
| **Editor + live preview** | `EditorUI.setupDOM`, `setupEventListeners` | Type in textarea; preview updates (debounced). |
| **Tabs** (Editor / Preview / Split / Annotation / Reader) | `EditorUI.setupTabs`, `setMode` | Click tabs or Ctrl+1..5. |
| **Save** | `EditorUI.setupSaveButton` + `onSave` | Toolbar “💾 Save” or Ctrl+S. |
| **Status** | `EditorUI.updateStatus` | Shows mode (Editing, Previewing, etc.). |

---

## Wave 2 – File

| Feature | Wired in | How to use |
|--------|----------|------------|
| **Open file** | `EditorUI.setupDOM` (single `#file-input`), header “📁 Open” | Click Open or use command palette “Open File”. |
| **Upload area** | Same `#file-input` + `setupDragAndDrop` | Click drop zone or drag a file. |
| **File input** | One element only (in header); upload area calls `file-input.click()`. | Prevents duplicate IDs and broken change handler. |

---

## Wave 3 – History

| Feature | Wired in | How to use |
|--------|----------|------------|
| **Undo / Redo** | `EditorUI.addUndoRedoButtons`, `EditorState` | Toolbar “↩️ Undo” / “↪️ Redo” or Ctrl+Z / Ctrl+Y. |
| **History state** | `EditorState.saveToHistory`, `debouncedSave` | Typing pushes history; undo/redo restores. |

---

## Wave 4 – Copy & Export

| Feature | Wired in | How to use |
|--------|----------|------------|
| **Copy dropdown** | `EditorUI.setupToolbarCopyDropdown` | Toolbar “📋 Copy ▼” → Copy Markdown or Copy HTML. |
| **Export** | `EditorUI.setupExportButton` | Toolbar “📤 Export” → download HTML file. |

---

## Wave 5 – Command palette

| Feature | Wired in | How to use |
|--------|----------|------------|
| **Open/close** | Inline script in `index.html` (DOMContentLoaded) | Ctrl+K or “⌘ Command”. |
| **Save file** | Same script → `window.markdownEditor.saveMarkdown()` | Run “Save File” from palette. |
| **Other commands** | Same script | New file, Open file, Toggle preview/split, Help, Settings, Focus editor. |

---

## Wave 6 – Help bar

| Feature | Wired in | How to use |
|--------|----------|------------|
| **Toggle** | `EditorUI.setupHelpBar` | Header “📚 Help” or command “Toggle Help”. |
| **Copy to editor** | `EditorUI.setupCopyButtons` | “Paste Example” on help blocks. |

---

## Wave 7 – Settings

| Feature | Wired in | How to use |
|--------|----------|------------|
| **Panel toggle** | Inline script in `index.html` | Header “⚙️ Settings” or command “Toggle Settings”. |
| **Accent colors** | Same script; uses `--accent-color`, `--accent-glow` | Pick color; stored in `localStorage`. |

---

## Wave 8 – Find & Replace

| Feature | Wired in | How to use |
|--------|----------|------------|
| **Find** | Inline `FindReplaceManager` in `index.html` | Toolbar “🔍 Find” or Ctrl+F. |
| **Replace** | Same class | Toolbar “🔄 Replace” or Ctrl+H; Replace / Replace all in modal. |

---

## Adding features in rotation

1. **Pick a wave** (e.g. next: “Export as PDF” under Wave 4).
2. **Wire in one place** – either `EditorUI` (and call from `initCathedralFeatures`) or a single inline block in HTML, and call `window.markdownEditor` for app actions.
3. **Update this doc** with the new item and how it’s triggered.
4. **Test** that existing waves still work (Save, Open, Undo, Copy, etc.).

This keeps the UI **functional** and avoids scattered or duplicate wiring.
