/**
 * Tests for Storefront module
 */
import Storefront from '../src/plugins/Storefront.js';

describe('Storefront', () => {
    let storefront;
    let mockPluginLoader;
    let mockSettings;

    beforeEach(() => {
        document.body.innerHTML = '';

        mockPluginLoader = {
            getAvailablePlugins: jest.fn().mockReturnValue([
                {
                    id: 'diamond-drill',
                    name: 'Diamond Drill',
                    version: '0.1.0',
                    description: 'File analyzer'
                },
                {
                    id: 'test-plugin',
                    name: 'Test Plugin',
                    version: '1.0.0',
                    description: ''
                }
            ]),
            isLoaded: jest.fn().mockReturnValue(false)
        };

        mockSettings = {
            getEnabledPlugins: jest.fn().mockReturnValue(['diamond-drill'])
        };

        storefront = new Storefront({
            pluginLoader: mockPluginLoader,
            pluginRegistry: {},
            settings: mockSettings,
            onPluginLoad: jest.fn(),
            onPluginUnload: jest.fn(),
            onClose: jest.fn()
        });
    });

    afterEach(() => {
        if (storefront && storefront.isOpen) {
            storefront.close();
        }
    });

    describe('constructor', () => {
        test('creates with default options', () => {
            const sf = new Storefront();
            expect(sf.modal).toBeNull();
            expect(sf.isOpen).toBe(false);
        });

        test('accepts custom options', () => {
            expect(storefront.pluginLoader).toBe(mockPluginLoader);
            expect(storefront.settings).toBe(mockSettings);
        });
    });

    describe('open', () => {
        test('creates modal and adds to DOM', () => {
            storefront.open();
            expect(storefront.isOpen).toBe(true);
            expect(document.getElementById('plugin-storefront')).not.toBeNull();
        });

        test('shows plugin cards', () => {
            storefront.open();
            const cards = document.querySelectorAll('.plugin-card');
            expect(cards).toHaveLength(2);
        });

        test('shows enabled status for enabled plugins', () => {
            storefront.open();
            const modal = document.getElementById('plugin-storefront');
            expect(modal.innerHTML).toContain('Diamond Drill');
            expect(modal.innerHTML).toContain('Enabled');
        });

        test('shows active status for loaded plugins', () => {
            mockPluginLoader.isLoaded.mockReturnValue(true);
            storefront.open();
            const modal = document.getElementById('plugin-storefront');
            expect(modal.innerHTML).toContain('Active');
        });

        test('shows disabled status for disabled plugins', () => {
            mockSettings.getEnabledPlugins.mockReturnValue([]);
            storefront.open();
            const modal = document.getElementById('plugin-storefront');
            expect(modal.innerHTML).toContain('Disabled');
        });

        test('removes old modal before creating new one', () => {
            storefront.open();
            storefront.open();
            const modals = document.querySelectorAll('#plugin-storefront');
            expect(modals).toHaveLength(1);
        });

        test('shows empty state when no plugins', () => {
            mockPluginLoader.getAvailablePlugins.mockReturnValue([]);
            storefront.open();
            const modal = document.getElementById('plugin-storefront');
            expect(modal.innerHTML).toContain('No plugins discovered');
        });

        test('close button works', () => {
            storefront.open();
            const modal = document.getElementById('plugin-storefront');
            const closeBtn = modal.querySelector('button');
            closeBtn.click();
            expect(storefront.isOpen).toBe(false);
        });

        test('backdrop click closes modal', () => {
            storefront.open();
            const modal = document.getElementById('plugin-storefront');
            modal.dispatchEvent(new Event('click', { bubbles: true }));
            expect(storefront.isOpen).toBe(false);
        });

        test('escape key closes modal', () => {
            storefront.open();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            expect(storefront.isOpen).toBe(false);
        });

        test('load button calls onPluginLoad', () => {
            storefront.open();
            const loadBtn = document.querySelector('.plugin-load-btn');
            if (loadBtn) {
                loadBtn.click();
                expect(storefront.onPluginLoad).toHaveBeenCalled();
            }
        });

        test('unload button calls onPluginUnload', () => {
            mockPluginLoader.isLoaded.mockReturnValue(true);
            storefront.open();
            const unloadBtn = document.querySelector('.plugin-unload-btn');
            if (unloadBtn) {
                unloadBtn.click();
                expect(storefront.onPluginUnload).toHaveBeenCalled();
            }
        });

        test('handles missing description gracefully', () => {
            storefront.open();
            const modal = document.getElementById('plugin-storefront');
            expect(modal.innerHTML).toContain('No description');
        });
    });

    describe('close', () => {
        test('removes modal from DOM', () => {
            storefront.open();
            storefront.close();
            expect(document.getElementById('plugin-storefront')).toBeNull();
            expect(storefront.modal).toBeNull();
            expect(storefront.isOpen).toBe(false);
        });

        test('calls onClose callback', () => {
            storefront.open();
            storefront.close();
            expect(storefront.onClose).toHaveBeenCalled();
        });

        test('removes escape handler', () => {
            storefront.open();
            storefront.close();
            expect(storefront._escHandler).toBeNull();
        });

        test('handles close when not open', () => {
            expect(() => storefront.close()).not.toThrow();
        });
    });

    describe('refresh', () => {
        test('re-opens when open', () => {
            storefront.open();
            storefront.refresh();
            expect(storefront.isOpen).toBe(true);
            expect(document.getElementById('plugin-storefront')).not.toBeNull();
        });

        test('does nothing when not open', () => {
            storefront.refresh();
            expect(storefront.isOpen).toBe(false);
        });
    });

    describe('_createPluginCard', () => {
        test('creates card with load button for unloaded plugin', () => {
            storefront.open();
            const card = storefront._createPluginCard(
                { id: 'test', name: 'Test', version: '1.0', description: 'A test' },
                false, false
            );
            expect(card.querySelector('.plugin-load-btn')).not.toBeNull();
        });

        test('creates card with unload button for loaded plugin', () => {
            storefront.open();
            const card = storefront._createPluginCard(
                { id: 'test', name: 'Test', version: '1.0', description: 'A test' },
                true, true
            );
            expect(card.querySelector('.plugin-unload-btn')).not.toBeNull();
        });
    });

    describe('without dependencies', () => {
        test('handles null pluginLoader', () => {
            const sf = new Storefront({ pluginLoader: null, settings: null });
            sf.open();
            expect(sf.isOpen).toBe(true);
            const modal = document.getElementById('plugin-storefront');
            expect(modal.innerHTML).toContain('No plugins discovered');
            sf.close();
        });
    });
});
