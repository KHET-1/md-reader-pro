/**
 * ErrorManager - Graceful error handling with intelligent caching
 *
 * Features:
 * - Stores errors in localStorage with timestamps
 * - Auto-cleans oldest 25% when cap reached
 * - Daily cleanup of old errors
 * - Prevents duplicate consecutive errors
 * - Silent mode for non-critical errors
 */
class ErrorManager {
    static STORAGE_KEY = 'md-reader-pro-errors';
    static MAX_ERRORS = 100;
    static CLEANUP_PERCENT = 0.25;
    static MAX_AGE_DAYS = 7;

    constructor(options = {}) {
        this.maxErrors = options.maxErrors || ErrorManager.MAX_ERRORS;
        this.cleanupPercent = options.cleanupPercent || ErrorManager.CLEANUP_PERCENT;
        this.maxAgeDays = options.maxAgeDays || ErrorManager.MAX_AGE_DAYS;
        this.lastError = null;
        this.lastErrorTime = 0;
        this.dedupeWindow = options.dedupeWindow || 1000; // 1 second

        // UI callbacks
        this.onError = options.onError || null;
        this.onErrorCleared = options.onErrorCleared || null;

        // Initialize and run daily cleanup
        this._runDailyCleanup();
    }

    /**
     * Capture and store an error gracefully
     * @param {Error|string} error - The error to capture
     * @param {Object} context - Additional context (component, action, etc.)
     * @param {boolean} silent - If true, don't trigger UI notification
     * @returns {Object} The stored error entry
     */
    capture(error, context = {}, silent = false) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : null;

        // Dedupe rapid consecutive identical errors
        const now = Date.now();
        if (this._isDuplicate(errorMessage, now)) {
            return null;
        }

        this.lastError = errorMessage;
        this.lastErrorTime = now;

        const entry = {
            id: this._generateId(),
            message: errorMessage,
            stack: errorStack,
            context: {
                component: context.component || 'unknown',
                action: context.action || 'unknown',
                url: typeof window !== 'undefined' ? window.location.href : null,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                ...context
            },
            timestamp: new Date().toISOString(),
            epochMs: now,
            sessionId: this._getSessionId()
        };

        this._store(entry);

        // Trigger UI callback if not silent
        if (!silent && this.onError) {
            this.onError(entry);
        }

        // Log to console in dev (check for Node.js process object)
        if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
            console.error('[ErrorManager]', entry);
        }

        return entry;
    }

    /**
     * Wrap a function with error handling
     * @param {Function} fn - Function to wrap
     * @param {Object} context - Error context
     * @param {boolean} silent - Silent mode
     * @returns {Function} Wrapped function
     */
    wrap(fn, context = {}, silent = false) {
        return (...args) => {
            try {
                const result = fn(...args);
                // Handle promises
                if (result instanceof Promise) {
                    return result.catch(err => {
                        this.capture(err, context, silent);
                        return null;
                    });
                }
                return result;
            } catch (err) {
                this.capture(err, context, silent);
                return null;
            }
        };
    }

    /**
     * Get all stored errors
     * @param {Object} filters - Optional filters (component, sessionId, since)
     * @returns {Array} Array of error entries
     */
    getAll(filters = {}) {
        const errors = this._load();

        return errors.filter(entry => {
            if (filters.component && entry.context?.component !== filters.component) {
                return false;
            }
            if (filters.sessionId && entry.sessionId !== filters.sessionId) {
                return false;
            }
            if (filters.since && new Date(entry.timestamp) < new Date(filters.since)) {
                return false;
            }
            return true;
        });
    }

    /**
     * Get recent errors (last N or last session)
     * @param {number} count - Number of errors to return
     * @returns {Array} Recent errors
     */
    getRecent(count = 10) {
        const errors = this._load();
        return errors.slice(-count);
    }

    /**
     * Get errors from current session only
     * @returns {Array} Current session errors
     */
    getCurrentSession() {
        return this.getAll({ sessionId: this._getSessionId() });
    }

    /**
     * Clear all errors
     */
    clearAll() {
        this._save([]);
        if (this.onErrorCleared) {
            this.onErrorCleared();
        }
    }

    /**
     * Clear errors older than specified days
     * @param {number} days - Max age in days
     */
    clearOlderThan(days = this.maxAgeDays) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        const errors = this._load();
        const filtered = errors.filter(e => e.epochMs > cutoff);
        this._save(filtered);
    }

    /**
     * Get error statistics
     * @returns {Object} Stats about stored errors
     */
    getStats() {
        const errors = this._load();
        const sessionErrors = this.getCurrentSession();

        const byComponent = {};
        errors.forEach(e => {
            const comp = e.context?.component || 'unknown';
            byComponent[comp] = (byComponent[comp] || 0) + 1;
        });

        return {
            total: errors.length,
            currentSession: sessionErrors.length,
            byComponent,
            oldestError: errors[0]?.timestamp || null,
            newestError: errors[errors.length - 1]?.timestamp || null,
            capacityUsed: `${Math.round((errors.length / this.maxErrors) * 100)}%`
        };
    }

    // === Private Methods ===

    _isDuplicate(message, now) {
        return this.lastError === message &&
               (now - this.lastErrorTime) < this.dedupeWindow;
    }

    _generateId() {
        return `err_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }

    _getSessionId() {
        if (typeof window === 'undefined' || !window.sessionStorage) return 'server';

        try {
            let sessionId = window.sessionStorage.getItem('md-reader-session-id');
            if (!sessionId) {
                sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
                window.sessionStorage.setItem('md-reader-session-id', sessionId);
            }
            return sessionId;
        } catch (e) {
            if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
                console.warn('[ErrorManager] Could not access sessionStorage:', e);
            }
            return 'server';
        }
    }

    _load() {
        if (typeof localStorage === 'undefined') return [];

        try {
            const data = localStorage.getItem(ErrorManager.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    _save(errors) {
        if (typeof localStorage === 'undefined') return;

        try {
            localStorage.setItem(ErrorManager.STORAGE_KEY, JSON.stringify(errors));
        } catch (e) {
            // Storage full - force aggressive cleanup
            this._forceCleanup();
        }
    }

    _store(entry) {
        const errors = this._load();
        errors.push(entry);

        // Check if cleanup needed
        if (errors.length > this.maxErrors) {
            this._cleanup(errors);
        } else {
            this._save(errors);
        }
    }

    _cleanup(errors) {
        // Remove oldest 25%
        const removeCount = Math.ceil(errors.length * this.cleanupPercent);
        const cleaned = errors.slice(removeCount);
        this._save(cleaned);
    }

    _forceCleanup() {
        // Aggressive cleanup - keep only last 50%
        const errors = this._load();
        const half = Math.ceil(errors.length / 2);
        this._save(errors.slice(half));
    }

    _runDailyCleanup() {
        if (typeof localStorage === 'undefined') return;

        const lastCleanup = localStorage.getItem('md-reader-error-cleanup');
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        if (!lastCleanup || (now - parseInt(lastCleanup)) > dayMs) {
            this.clearOlderThan(this.maxAgeDays);
            localStorage.setItem('md-reader-error-cleanup', now.toString());
        }
    }
}

export default ErrorManager;
