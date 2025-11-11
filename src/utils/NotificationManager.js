/* global requestAnimationFrame, clearTimeout, setTimeout */
/**
 * NotificationManager - User-friendly notification system with actionable options
 * Replaces basic alerts with modern toast-style notifications
 */
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.initContainer();
    }

    static get CONSTANTS() {
        return {
            DURATION: {
                SHORT: 3000,
                MEDIUM: 5000,
                LONG: 8000,
                PERSISTENT: -1 // Don't auto-dismiss
            },
            TYPE: {
                SUCCESS: 'success',
                ERROR: 'error',
                WARNING: 'warning',
                INFO: 'info'
            },
            ANIMATION_DURATION: 300,
            MAX_NOTIFICATIONS: 5,
            Z_INDEX: 10000
        };
    }

    initContainer() {
        if (typeof document === 'undefined') return;

        // Check if container already exists
        this.container = document.getElementById('notification-container');
        
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.setAttribute('aria-live', 'polite');
            this.container.setAttribute('aria-atomic', 'true');
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: ${NotificationManager.CONSTANTS.Z_INDEX};
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-width: 400px;
                pointer-events: none;
            `;
            
            if (document.body) {
                document.body.appendChild(this.container);
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.body.appendChild(this.container);
                });
            }
        }
    }

    /**
     * Show a notification with optional actions
     * @param {Object} options - Notification options
     * @param {string} options.message - The message to display
     * @param {string} options.type - Type: success, error, warning, info
     * @param {number} options.duration - Duration in ms (-1 for persistent)
     * @param {Array} options.actions - Array of action objects with {label, onClick, primary}
     * @param {Function} options.onDismiss - Callback when notification is dismissed
     * @returns {Object} Notification object with dismiss method
     */
    show(options) {
        const {
            message,
            type = NotificationManager.CONSTANTS.TYPE.INFO,
            duration = NotificationManager.CONSTANTS.DURATION.MEDIUM,
            actions = [],
            onDismiss = null
        } = options;

        // Limit total notifications
        if (this.notifications.length >= NotificationManager.CONSTANTS.MAX_NOTIFICATIONS) {
            this.dismissOldest();
        }

        const notification = this.createNotification(message, type, duration, actions, onDismiss);
        this.notifications.push(notification);
        
        if (this.container) {
            this.container.appendChild(notification.element);
            
            // Trigger animation
            requestAnimationFrame(() => {
                notification.element.classList.add('show');
            });

            // Auto-dismiss if duration is set
            if (duration > 0) {
                notification.timeoutId = setTimeout(() => {
                    this.dismiss(notification);
                }, duration);
            }
        }

        return {
            dismiss: () => this.dismiss(notification),
            element: notification.element
        };
    }

    createNotification(message, type, duration, actions, onDismiss) {
        const element = document.createElement('div');
        element.className = `notification notification-${type}`;
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-live', 'assertive');
        element.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            gap: 12px;
            opacity: 0;
            transform: translateX(100%);
            transition: all ${NotificationManager.CONSTANTS.ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: auto;
            min-width: 300px;
            max-width: 400px;
        `;

        // Icon based on type
        const icon = this.getIcon(type);
        
        // Message container
        const messageContainer = document.createElement('div');
        messageContainer.style.cssText = `
            display: flex;
            align-items: flex-start;
            gap: 12px;
        `;

        const iconSpan = document.createElement('span');
        iconSpan.textContent = icon;
        iconSpan.style.cssText = `
            font-size: 20px;
            line-height: 1;
        `;

        const messageText = document.createElement('div');
        messageText.textContent = message;
        messageText.style.cssText = `
            flex: 1;
            font-size: 14px;
            line-height: 1.5;
            font-weight: 500;
        `;

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.setAttribute('aria-label', 'Dismiss notification');
        closeBtn.style.cssText = `
            background: transparent;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 18px;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: background 0.2s;
            opacity: 0.7;
        `;
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.opacity = '1';
            closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.opacity = '0.7';
            closeBtn.style.background = 'transparent';
        });

        messageContainer.appendChild(iconSpan);
        messageContainer.appendChild(messageText);
        messageContainer.appendChild(closeBtn);
        element.appendChild(messageContainer);

        // Actions
        if (actions && actions.length > 0) {
            const actionsContainer = document.createElement('div');
            actionsContainer.style.cssText = `
                display: flex;
                gap: 8px;
                margin-left: 32px;
            `;

            actions.forEach(action => {
                const btn = document.createElement('button');
                btn.textContent = action.label;
                btn.style.cssText = `
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    ${action.primary ? `
                        background: white;
                        color: ${this.getBackgroundColor(type)};
                        border: none;
                    ` : `
                        background: transparent;
                        color: white;
                        border: 1px solid rgba(255, 255, 255, 0.5);
                    `}
                `;
                
                btn.addEventListener('mouseenter', () => {
                    if (action.primary) {
                        btn.style.transform = 'translateY(-1px)';
                        btn.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                    } else {
                        btn.style.background = 'rgba(255, 255, 255, 0.1)';
                    }
                });
                
                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'translateY(0)';
                    btn.style.boxShadow = 'none';
                    if (!action.primary) {
                        btn.style.background = 'transparent';
                    }
                });

                btn.addEventListener('click', () => {
                    if (action.onClick) {
                        action.onClick();
                    }
                    // Auto-dismiss after action unless specified
                    if (action.dismissAfter !== false) {
                        this.dismiss(notification);
                    }
                });

                actionsContainer.appendChild(btn);
            });

            element.appendChild(actionsContainer);
        }

        const notification = {
            element,
            timeoutId: null,
            onDismiss
        };

        closeBtn.addEventListener('click', () => {
            this.dismiss(notification);
        });

        return notification;
    }

    dismiss(notification) {
        if (!notification || !notification.element) return;

        // Clear timeout if exists
        if (notification.timeoutId) {
            clearTimeout(notification.timeoutId);
        }

        // Animate out
        notification.element.classList.remove('show');
        notification.element.style.opacity = '0';
        notification.element.style.transform = 'translateX(100%)';

        // Remove from DOM after animation
        setTimeout(() => {
            if (notification.element && notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            
            // Remove from array
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }

            // Call onDismiss callback
            if (notification.onDismiss) {
                notification.onDismiss();
            }
        }, NotificationManager.CONSTANTS.ANIMATION_DURATION);
    }

    dismissOldest() {
        if (this.notifications.length > 0) {
            this.dismiss(this.notifications[0]);
        }
    }

    dismissAll() {
        [...this.notifications].forEach(notification => {
            this.dismiss(notification);
        });
    }

    getBackgroundColor(type) {
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };
        return colors[type] || colors.info;
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // Convenience methods
    success(message, options = {}) {
        return this.show({
            message,
            type: NotificationManager.CONSTANTS.TYPE.SUCCESS,
            ...options
        });
    }

    error(message, options = {}) {
        return this.show({
            message,
            type: NotificationManager.CONSTANTS.TYPE.ERROR,
            duration: NotificationManager.CONSTANTS.DURATION.LONG,
            ...options
        });
    }

    warning(message, options = {}) {
        return this.show({
            message,
            type: NotificationManager.CONSTANTS.TYPE.WARNING,
            ...options
        });
    }

    info(message, options = {}) {
        return this.show({
            message,
            type: NotificationManager.CONSTANTS.TYPE.INFO,
            ...options
        });
    }
}

export default NotificationManager;
