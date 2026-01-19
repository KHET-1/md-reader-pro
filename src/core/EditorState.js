/**
 * EditorState - Pure state management for editor history
 * No DOM dependencies - communicates via callbacks
 */
class EditorState {
    constructor(options = {}) {
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = options.maxHistory || 50;
        this.historyDebounce = null;

        // Callbacks for UI updates
        this.onHistoryChange = options.onHistoryChange || (() => {});
    }

    /**
     * Save content to history
     * @param {string} content - The content to save
     * @returns {boolean} - Whether save occurred
     */
    saveToHistory(content) {
        // Don't save if it's the same as current
        if (this.history[this.historyIndex] === content) return false;

        // Remove everything after current index (discard redo stack)
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Add new state
        this.history.push(content);
        this.historyIndex = this.history.length - 1;

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            // Prevent negative index when at position 0 during history overflow
            this.historyIndex = Math.max(0, this.historyIndex - 1);
        }

        this.onHistoryChange();
        return true;
    }

    /**
     * Debounced save - useful for input events
     * @param {string} content - The content to save
     * @param {number} delay - Debounce delay in ms
     */
    debouncedSave(content, delay = 500) {
        if (this.historyDebounce) {
            clearTimeout(this.historyDebounce);
        }

        this.historyDebounce = setTimeout(() => {
            this.saveToHistory(content);
        }, delay);
    }

    /**
     * Check if undo is available
     * @returns {boolean}
     */
    canUndo() {
        return this.historyIndex > 0;
    }

    /**
     * Check if redo is available
     * @returns {boolean}
     */
    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }

    /**
     * Undo - returns previous content or null if can't undo
     * @returns {string|null}
     */
    undo() {
        if (!this.canUndo()) return null;

        this.historyIndex--;
        this.onHistoryChange();
        return this.history[this.historyIndex];
    }

    /**
     * Redo - returns next content or null if can't redo
     * @returns {string|null}
     */
    redo() {
        if (!this.canRedo()) return null;

        this.historyIndex++;
        this.onHistoryChange();
        return this.history[this.historyIndex];
    }

    /**
     * Get current content from history
     * @returns {string|null}
     */
    getCurrentContent() {
        return this.history[this.historyIndex] || null;
    }

    /**
     * Clear all history
     */
    clear() {
        this.history = [];
        this.historyIndex = -1;
        this.onHistoryChange();
    }
}

export default EditorState;
