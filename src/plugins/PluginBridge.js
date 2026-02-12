/**
 * PluginBridge - Communication bridge between MD Reader Pro and plugins
 *
 * For native plugins: Uses child_process spawn with stdin/stdout JSON IPC
 * For browser-only: Falls back to mock/simulation mode
 *
 * @module PluginBridge
 * @version 1.0.0
 */

/**
 * Generate unique message ID
 * @returns {string}
 */
function generateMessageId() {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * PluginBridge handles IPC with a single plugin instance
 */
class PluginBridge {
    constructor(options = {}) {
        this.pluginId = options.pluginId || 'unknown';
        this.type = options.type || 'native';
        this.binary = options.binary;
        this.args = options.args || [];

        // Callbacks
        this.onMessage = options.onMessage || (() => {});
        this.onError = options.onError || console.error;
        this.onReady = options.onReady || (() => {});
        this.onExit = options.onExit || (() => {});

        // State
        this.process = null;
        this.ready = false;
        this.pendingRequests = new Map(); // messageId -> { resolve, reject, timeout }
        this.buffer = '';

        // Detect environment
        this.isNode = typeof process !== 'undefined' && process.versions?.node;
    }

    /**
     * Start the plugin process
     * @returns {Promise<void>}
     */
    async start() {
        if (this.type === 'native') {
            if (this.isNode) {
                await this._startNativeNode();
            } else {
                await this._startNativeBrowser();
            }
        }
    }

    /**
     * Start native plugin in Node.js environment
     * @private
     */
    async _startNativeNode() {
        const { spawn } = await import(/* webpackIgnore: true */ 'child_process');

        return new Promise((resolve, reject) => {
            try {
                this.process = spawn(this.binary, this.args, {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                // Handle stdout (plugin responses)
                this.process.stdout.on('data', (data) => {
                    this._handleData(data.toString());
                });

                // Handle stderr (plugin errors/logs)
                this.process.stderr.on('data', (data) => {
                    console.error(`[${this.pluginId}] stderr:`, data.toString());
                });

                // Handle process exit
                this.process.on('exit', (code) => {
                    this.ready = false;
                    this.onExit(code);
                    this._rejectPendingRequests('Plugin process exited');
                });

                // Handle spawn errors
                this.process.on('error', (err) => {
                    this.onError(err);
                    reject(err);
                });

                // Wait for ready signal
                const readyTimeout = setTimeout(() => {
                    reject(new Error('Plugin startup timeout'));
                }, 5000);

                const originalOnMessage = this.onMessage;
                this.onMessage = (msg) => {
                    if (msg.id === 'init' && msg.success && msg.data?.status === 'ready') {
                        clearTimeout(readyTimeout);
                        this.ready = true;
                        this.onMessage = originalOnMessage;
                        this.onReady();
                        resolve();
                    } else {
                        originalOnMessage(msg);
                    }
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Start native plugin in browser (mock/simulation)
     * @private
     */
    async _startNativeBrowser() {
        // In browser, native plugins can't run directly
        // This provides a mock implementation for testing
        console.warn(`[${this.pluginId}] Running in browser mock mode`);

        this.ready = true;
        this.mockMode = true;
        this.onReady();
    }

    /**
     * Handle incoming data from plugin
     * @private
     */
    _handleData(data) {
        this.buffer += data;

        // Process complete JSON lines
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
            if (line.trim()) {
                try {
                    const msg = JSON.parse(line);
                    this._handleMessage(msg);
                } catch (err) {
                    console.error(`[${this.pluginId}] Invalid JSON:`, line);
                }
            }
        }
    }

    /**
     * Handle parsed message from plugin
     * @private
     */
    _handleMessage(msg) {
        // Check if this is a response to a pending request
        const pending = this.pendingRequests.get(msg.id);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(msg.id);

            if (msg.success) {
                pending.resolve(msg.data);
            } else {
                pending.reject(new Error(msg.error || 'Unknown error'));
            }
        } else {
            // Unsolicited message (event from plugin)
            this.onMessage(msg);
        }
    }

    /**
     * Send a message to the plugin and wait for response
     * @param {string} action - Action to perform
     * @param {Object} payload - Action payload
     * @param {number} timeout - Timeout in ms (default: 30000)
     * @returns {Promise<any>}
     */
    async send(action, payload = {}, timeout = 30000) {
        if (!this.ready) {
            throw new Error('Plugin not ready');
        }

        const id = generateMessageId();
        const message = { id, action, payload };

        return new Promise((resolve, reject) => {
            // Set timeout
            const timeoutId = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Request timeout: ${action}`));
            }, timeout);

            // Store pending request
            this.pendingRequests.set(id, { resolve, reject, timeout: timeoutId });

            // Send message
            if (this.mockMode) {
                this._sendMock(message);
            } else if (this.process) {
                this.process.stdin.write(JSON.stringify(message) + '\n');
            } else {
                reject(new Error('No plugin process'));
            }
        });
    }

    /**
     * Mock send for browser testing
     * @private
     */
    _sendMock(message) {
        // Simulate plugin responses
        setTimeout(() => {
            let response;
            switch (message.action) {
                case 'ping':
                    response = { id: message.id, success: true, data: { pong: true } };
                    break;
                case 'get_capabilities':
                    response = {
                        id: message.id,
                        success: true,
                        data: {
                            actions: ['ping', 'analyze', 'deep_analyze', 'report', 'browse', 'shutdown'],
                            version: '0.1.0',
                            features: { tui: true, gui: false }
                        }
                    };
                    break;
                case 'browse':
                    response = {
                        id: message.id,
                        success: true,
                        data: {
                            path: message.payload.path || '.',
                            entries: [
                                { name: 'example.md', path: './example.md', type: 'file' },
                                { name: 'docs', path: './docs', type: 'directory' }
                            ]
                        }
                    };
                    break;
                case 'analyze':
                    response = {
                        id: message.id,
                        success: true,
                        data: {
                            files_analyzed: message.payload.files?.length || 0,
                            analyses: (message.payload.files || []).map(f => ({
                                path: f,
                                size: 1024,
                                file_type: 'md',
                                permissions: '644',
                                is_binary: false
                            }))
                        }
                    };
                    break;
                default:
                    response = {
                        id: message.id,
                        success: false,
                        error: `Mock: Unknown action ${message.action}`
                    };
            }
            this._handleMessage(response);
        }, 50);
    }

    /**
     * Reject all pending requests
     * @private
     */
    _rejectPendingRequests(reason) {
        for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error(reason));
        }
        this.pendingRequests.clear();
    }

    /**
     * Stop the plugin
     */
    stop() {
        this.ready = false;

        if (this.process) {
            // Send shutdown command
            try {
                this.process.stdin.write(JSON.stringify({
                    id: 'shutdown',
                    action: 'shutdown',
                    payload: {}
                }) + '\n');
            } catch (_err) {
                // Ignore write errors during shutdown
            }

            // Give it a moment to clean up, then force kill
            setTimeout(() => {
                if (this.process) {
                    this.process.kill();
                    this.process = null;
                }
            }, 1000);
        }

        this._rejectPendingRequests('Plugin stopped');
    }

    /**
     * Check if plugin is ready
     * @returns {boolean}
     */
    isReady() {
        return this.ready;
    }
}

export default PluginBridge;
