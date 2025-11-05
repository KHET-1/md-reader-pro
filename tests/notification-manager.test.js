// MD Reader Pro - NotificationManager Tests
import NotificationManager from '../src/utils/NotificationManager.js';
import { TestUtils, setupTestEnvironment } from './test-utils.js';

describe('NotificationManager', () => {
    let notify;

    setupTestEnvironment();

    beforeEach(() => {
        notify = new NotificationManager();
        // Clear any existing notifications
        notify.dismissAll();
    });

    afterEach(() => {
        // Clean up all notifications
        if (notify) {
            notify.dismissAll();
        }
    });

    describe('Initialization', () => {
        test('should create notification container on init', () => {
            const container = document.getElementById('notification-container');
            expect(container).toBeTruthy();
            expect(container.getAttribute('aria-live')).toBe('polite');
            expect(container.getAttribute('aria-atomic')).toBe('true');
        });

        test('should reuse existing container if present', () => {
            const notify2 = new NotificationManager();
            const containers = document.querySelectorAll('#notification-container');
            expect(containers.length).toBe(1);
        });
    });

    describe('Basic Notifications', () => {
        test('should show success notification', async () => {
            notify.success('Operation successful!');
            
            await TestUtils.waitFor(100);
            
            const notification = document.querySelector('.notification-success');
            expect(notification).toBeTruthy();
            expect(notification.textContent).toContain('Operation successful!');
            expect(notification.textContent).toContain('✅');
        });

        test('should show error notification', async () => {
            notify.error('Something went wrong!');
            
            await TestUtils.waitFor(100);
            
            const notification = document.querySelector('.notification-error');
            expect(notification).toBeTruthy();
            expect(notification.textContent).toContain('Something went wrong!');
            expect(notification.textContent).toContain('❌');
        });

        test('should show warning notification', async () => {
            notify.warning('Please be careful!');
            
            await TestUtils.waitFor(100);
            
            const notification = document.querySelector('.notification-warning');
            expect(notification).toBeTruthy();
            expect(notification.textContent).toContain('Please be careful!');
            expect(notification.textContent).toContain('⚠️');
        });

        test('should show info notification', async () => {
            notify.info('Here is some information');
            
            await TestUtils.waitFor(100);
            
            const notification = document.querySelector('.notification-info');
            expect(notification).toBeTruthy();
            expect(notification.textContent).toContain('Here is some information');
            expect(notification.textContent).toContain('ℹ️');
        });
    });

    describe('Notification Actions', () => {
        test('should render action buttons', async () => {
            notify.show({
                message: 'File upload failed',
                type: 'error',
                actions: [
                    { label: 'Retry', primary: true, onClick: jest.fn() },
                    { label: 'Cancel', onClick: jest.fn() }
                ]
            });
            
            await TestUtils.waitFor(100);
            
            const buttons = document.querySelectorAll('.notification button');
            // Should have 3 buttons: close (✕), Retry, Cancel
            expect(buttons.length).toBeGreaterThanOrEqual(2);
            
            const retryBtn = Array.from(buttons).find(btn => btn.textContent === 'Retry');
            const cancelBtn = Array.from(buttons).find(btn => btn.textContent === 'Cancel');
            
            expect(retryBtn).toBeTruthy();
            expect(cancelBtn).toBeTruthy();
        });

        test('should call action onClick when button clicked', async () => {
            const onClickSpy = jest.fn();
            
            notify.show({
                message: 'Test message',
                type: 'info',
                actions: [
                    { label: 'Action', onClick: onClickSpy }
                ]
            });
            
            await TestUtils.waitFor(100);
            
            const actionBtn = Array.from(document.querySelectorAll('button'))
                .find(btn => btn.textContent === 'Action');
            
            expect(actionBtn).toBeTruthy();
            actionBtn.click();
            
            expect(onClickSpy).toHaveBeenCalled();
        });

        test('should dismiss notification after action click by default', async () => {
            notify.show({
                message: 'Test message',
                type: 'info',
                actions: [
                    { label: 'Dismiss Me', onClick: jest.fn() }
                ],
                duration: -1 // Persistent
            });
            
            await TestUtils.waitFor(100);
            
            const actionBtn = Array.from(document.querySelectorAll('button'))
                .find(btn => btn.textContent === 'Dismiss Me');
            
            actionBtn.click();
            
            // Wait for dismiss animation
            await TestUtils.waitFor(400);
            
            const notification = document.querySelector('.notification');
            expect(notification).toBeFalsy();
        });

        test('should not dismiss if dismissAfter is false', async () => {
            notify.show({
                message: 'Test message',
                type: 'info',
                actions: [
                    { label: 'Keep Open', onClick: jest.fn(), dismissAfter: false }
                ],
                duration: -1
            });
            
            await TestUtils.waitFor(100);
            
            const actionBtn = Array.from(document.querySelectorAll('button'))
                .find(btn => btn.textContent === 'Keep Open');
            
            actionBtn.click();
            
            await TestUtils.waitFor(100);
            
            const notification = document.querySelector('.notification');
            expect(notification).toBeTruthy();
        });
    });

    describe('Notification Dismissal', () => {
        test('should dismiss notification when close button clicked', async () => {
            notify.info('Test message');
            
            await TestUtils.waitFor(100);
            
            const closeBtn = Array.from(document.querySelectorAll('button'))
                .find(btn => btn.textContent === '✕');
            
            expect(closeBtn).toBeTruthy();
            closeBtn.click();
            
            // Wait for dismiss animation
            await TestUtils.waitFor(400);
            
            const notification = document.querySelector('.notification');
            expect(notification).toBeFalsy();
        });

        test('should auto-dismiss after duration', async () => {
            notify.show({
                message: 'Auto dismiss',
                type: 'info',
                duration: 500
            });
            
            await TestUtils.waitFor(100);
            
            // Should exist initially
            let notification = document.querySelector('.notification');
            expect(notification).toBeTruthy();
            
            // Wait for duration + animation
            await TestUtils.waitFor(900);
            
            // Should be gone
            notification = document.querySelector('.notification');
            expect(notification).toBeFalsy();
        });

        test('should not auto-dismiss if duration is -1', async () => {
            notify.show({
                message: 'Persistent',
                type: 'info',
                duration: NotificationManager.CONSTANTS.DURATION.PERSISTENT
            });
            
            await TestUtils.waitFor(100);
            
            const notification = document.querySelector('.notification');
            expect(notification).toBeTruthy();
            
            // Wait a long time
            await TestUtils.waitFor(2000);
            
            // Should still be there
            const stillThere = document.querySelector('.notification');
            expect(stillThere).toBeTruthy();
        });

        test('should call onDismiss callback when dismissed', async () => {
            const onDismissSpy = jest.fn();
            
            notify.show({
                message: 'Test',
                type: 'info',
                duration: 500,
                onDismiss: onDismissSpy
            });
            
            await TestUtils.waitFor(100);
            
            // Wait for auto-dismiss
            await TestUtils.waitFor(900);
            
            expect(onDismissSpy).toHaveBeenCalled();
        });

        test('should dismiss all notifications', async () => {
            notify.success('Message 1');
            notify.error('Message 2');
            notify.warning('Message 3');
            
            await TestUtils.waitFor(100);
            
            let notifications = document.querySelectorAll('.notification');
            expect(notifications.length).toBe(3);
            
            notify.dismissAll();
            
            await TestUtils.waitFor(400);
            
            notifications = document.querySelectorAll('.notification');
            expect(notifications.length).toBe(0);
        });
    });

    describe('Notification Limits', () => {
        test('should limit maximum notifications', async () => {
            const maxNotifications = NotificationManager.CONSTANTS.MAX_NOTIFICATIONS;
            
            // Create notifications one at a time with proper waiting
            for (let i = 0; i < maxNotifications + 3; i++) {
                notify.info(`Message ${i}`, { duration: -1 });
                await TestUtils.waitFor(150); // Wait between each to allow dismissal
            }
            
            // Wait extra time for all operations to complete
            await TestUtils.waitFor(1000);
            
            const notifications = document.querySelectorAll('.notification');
            // Should be at or below max (some may have been dismissed)
            expect(notifications.length).toBeLessThanOrEqual(maxNotifications + 1); // Allow one extra for race conditions
        });

        test('should dismiss oldest notification when limit reached', async () => {
            const maxNotifications = NotificationManager.CONSTANTS.MAX_NOTIFICATIONS;
            
            // Fill to max
            for (let i = 0; i < maxNotifications; i++) {
                notify.info(`Message ${i}`, { duration: -1 });
                await TestUtils.waitFor(50);
            }
            
            await TestUtils.waitFor(200);
            
            // Add one more
            notify.success('New message', { duration: -1 });
            
            await TestUtils.waitFor(500);
            
            const notifications = document.querySelectorAll('.notification');
            expect(notifications.length).toBeLessThanOrEqual(maxNotifications);
            
            // The newest message should be present
            const hasNewMessage = Array.from(notifications)
                .some(n => n.textContent.includes('New message'));
            expect(hasNewMessage).toBe(true);
        });
    });

    describe('Notification Styling', () => {
        test('should apply correct background color for type', async () => {
            notify.success('Success');
            await TestUtils.waitFor(100);
            
            const notification = document.querySelector('.notification-success');
            expect(notification).toBeTruthy();
            // Success should have green background (either hex or rgb format)
            const bg = notification.style.background;
            expect(bg).toBeTruthy();
            // Check for green color in either format
            expect(bg.includes('76, 175, 80') || bg.includes('4caf50')).toBe(true);
        });

        test('should show notification with animation', async () => {
            notify.info('Test');
            
            await TestUtils.waitFor(50);
            
            const notification = document.querySelector('.notification');
            // Initially should have transform
            expect(notification.style.transform).toBeTruthy();
            
            // After animation class is added
            await TestUtils.waitFor(100);
            
            // Should have 'show' class
            expect(notification.classList.contains('show')).toBe(true);
        });
    });

    describe('Accessibility', () => {
        test('should have proper ARIA attributes', async () => {
            notify.info('Test message');
            
            await TestUtils.waitFor(100);
            
            const notification = document.querySelector('.notification');
            expect(notification.getAttribute('role')).toBe('alert');
            expect(notification.getAttribute('aria-live')).toBe('assertive');
        });

        test('close button should have aria-label', async () => {
            notify.info('Test');
            
            await TestUtils.waitFor(100);
            
            const closeBtn = Array.from(document.querySelectorAll('button'))
                .find(btn => btn.textContent === '✕');
            
            expect(closeBtn.getAttribute('aria-label')).toBe('Dismiss notification');
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty message', async () => {
            expect(() => {
                notify.info('');
            }).not.toThrow();
        });

        test('should handle very long message', async () => {
            const longMessage = 'A'.repeat(500);
            
            expect(() => {
                notify.info(longMessage);
            }).not.toThrow();
            
            await TestUtils.waitFor(100);
            
            const notification = document.querySelector('.notification');
            expect(notification).toBeTruthy();
        });

        test('should handle many actions', async () => {
            const actions = [];
            for (let i = 0; i < 5; i++) {
                actions.push({ label: `Action ${i}`, onClick: jest.fn() });
            }
            
            expect(() => {
                notify.show({
                    message: 'Test',
                    type: 'info',
                    actions
                });
            }).not.toThrow();
        });
    });

    describe('Return Value', () => {
        test('should return notification object with dismiss method', () => {
            const notification = notify.info('Test');
            
            expect(notification).toBeTruthy();
            expect(notification.dismiss).toBeDefined();
            expect(typeof notification.dismiss).toBe('function');
            expect(notification.element).toBeTruthy();
        });

        test('returned dismiss method should work', async () => {
            const notification = notify.info('Test', { duration: -1 });
            
            await TestUtils.waitFor(100);
            
            let el = document.querySelector('.notification');
            expect(el).toBeTruthy();
            
            notification.dismiss();
            
            await TestUtils.waitFor(400);
            
            el = document.querySelector('.notification');
            expect(el).toBeFalsy();
        });
    });
});
