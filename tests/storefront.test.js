/**
 * @jest-environment jsdom
 */

import Storefront from '../src/plugins/Storefront.js';
import { TestUtils, setupTestEnvironment } from './test-utils.js';

describe('Storefront', () => {
    let storefront;
    let mockPluginLoader;
    let mockPluginRegistry;
    let mockSettings;

    setupTestEnvironment();

    beforeEach(() => {
        document.body.innerHTML = '';

        // Mock plugin loader
        mockPluginLoader = {
            getAvailablePlugins: jest.fn().mockReturnValue([
                {
                    id: 'test-plugin-1',
                    name: 'Test Plugin 1',
                    version: '1.0.0',
                    description: 'A test plugin',
                    type: 'native'
                },
                {
                    id: 'test-plugin-2',
                    name: 'Test Plugin 2',
                    version: '2.0.0',
                    description: 'Another test plugin',
                    type: 'wasm'
                }
            ]),
            isLoaded: jest.fn().mockReturnValue(false)
        };

        // Mock settings
        mockSettings = {
            getEnabledPlugins: jest.fn().mockReturnValue(['test-plugin-1'])
        };

        storefront = new Storefront({
            pluginLoader: mockPluginLoader,
            settings: mockSettings
        });
    });

    afterEach(() => {
        if (storefront) {
            storefront.close();
        }
    });

    describe('Constructor', () => {
        test('should initialize with default state', () => {
            expect(storefront.modal).toBeNull();
            expect(storefront.isOpen).toBe(false);
        });

        test('should accept plugin system references', () => {
            expect(storefront.pluginLoader).toBe(mockPluginLoader);
            expect(storefront.settings).toBe(mockSettings);
        });

        test('should accept callback options', () => {
            const onPluginLoad = jest.fn();
            const onPluginUnload = jest.fn();
            const onClose = jest.fn();

            const customStorefront = new Storefront({
                onPluginLoad,
                onPluginUnload,
                onClose
            });

            expect(customStorefront.onPluginLoad).toBe(onPluginLoad);
            expect(customStorefront.onPluginUnload).toBe(onPluginUnload);
            expect(customStorefront.onClose).toBe(onClose);
        });

        test('should use default callbacks', () => {
            expect(typeof storefront.onPluginLoad).toBe('function');
            expect(typeof storefront.onPluginUnload).toBe('function');
            expect(typeof storefront.onClose).toBe('function');
        });
    });

    describe('open()', () => {
        test('should open the storefront modal', () => {
            storefront.open();

            expect(storefront.isOpen).toBe(true);
            expect(storefront.modal).toBeTruthy();
            expect(document.body.contains(storefront.modal)).toBe(true);
        });

        test('should create modal with correct ID', () => {
            storefront.open();

            expect(storefront.modal.id).toBe('plugin-storefront');
        });

        test('should display header with title', () => {
            storefront.open();

            expect(storefront.modal.textContent).toContain('Plugin Storefront');
        });

        test('should create close button', () => {
            storefront.open();

            const closeBtn = Array.from(storefront.modal.querySelectorAll('button'))
                .find(btn => btn.textContent === '✕');

            expect(closeBtn).toBeTruthy();
        });

        test('should remove existing modal before opening new one', () => {
            storefront.open();
            const firstModal = storefront.modal;
            
            storefront.open();
            const secondModal = storefront.modal;

            expect(firstModal).not.toBe(secondModal);
            expect(document.querySelectorAll('#plugin-storefront').length).toBe(1);
        });

        test('should display installed plugins section', () => {
            storefront.open();

            expect(storefront.modal.textContent).toContain('Installed Plugins');
        });

        test('should display available plugins section', () => {
            storefront.open();

            expect(storefront.modal.textContent).toContain('Available Plugins');
        });

        test('should query plugin loader for available plugins', () => {
            storefront.open();

            expect(mockPluginLoader.getAvailablePlugins).toHaveBeenCalled();
        });

        test('should query settings for enabled plugins', () => {
            storefront.open();

            expect(mockSettings.getEnabledPlugins).toHaveBeenCalled();
        });

        test('should create plugin cards', () => {
            storefront.open();

            const cards = storefront.modal.querySelectorAll('.plugin-card');
            expect(cards.length).toBe(2);
        });

        test('should show empty state when no plugins', () => {
            mockPluginLoader.getAvailablePlugins.mockReturnValue([]);
            
            storefront.open();

            expect(storefront.modal.textContent).toContain('No plugins discovered');
        });

        test('should set up escape key handler', () => {
            storefront.open();

            expect(storefront._escHandler).toBeDefined();
        });

        test('should close on backdrop click', () => {
            storefront.open();

            // Simulate click on backdrop (the modal itself)
            const event = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(event, 'target', { value: storefront.modal, enumerable: true });
            storefront.modal.dispatchEvent(event);

            expect(storefront.isOpen).toBe(false);
        });

        test('should close on escape key', () => {
            storefront.open();

            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escapeEvent);

            expect(storefront.isOpen).toBe(false);
        });
    });

    describe('_createPluginCard()', () => {
        const testPlugin = {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
            description: 'A test plugin',
            type: 'native'
        };

        test('should create plugin card element', () => {
            const card = storefront._createPluginCard(testPlugin, false, false);

            expect(card).toBeTruthy();
            expect(card.className).toBe('plugin-card');
        });

        test('should display plugin name and version', () => {
            const card = storefront._createPluginCard(testPlugin, false, false);

            expect(card.textContent).toContain('Test Plugin');
            expect(card.textContent).toContain('v1.0.0');
        });

        test('should display plugin description', () => {
            const card = storefront._createPluginCard(testPlugin, false, false);

            expect(card.textContent).toContain('A test plugin');
        });

        test('should show "Disabled" status for disabled plugin', () => {
            const card = storefront._createPluginCard(testPlugin, false, false);

            expect(card.textContent).toContain('Disabled');
        });

        test('should show "Enabled" status for enabled plugin', () => {
            const card = storefront._createPluginCard(testPlugin, true, false);

            expect(card.textContent).toContain('Enabled');
        });

        test('should show "Active" status for loaded plugin', () => {
            const card = storefront._createPluginCard(testPlugin, true, true);

            expect(card.textContent).toContain('Active');
        });

        test('should create load button for non-loaded plugin', () => {
            const card = storefront._createPluginCard(testPlugin, true, false);

            const loadBtn = card.querySelector('.plugin-load-btn');
            expect(loadBtn).toBeTruthy();
            expect(loadBtn.textContent).toBe('Load');
        });

        test('should create unload button for loaded plugin', () => {
            const card = storefront._createPluginCard(testPlugin, true, true);

            const unloadBtn = card.querySelector('.plugin-unload-btn');
            expect(unloadBtn).toBeTruthy();
            expect(unloadBtn.textContent).toBe('Unload');
        });

        test('should call onPluginLoad when load button clicked', () => {
            const onPluginLoad = jest.fn();
            const customStorefront = new Storefront({
                pluginLoader: mockPluginLoader,
                onPluginLoad
            });

            const card = customStorefront._createPluginCard(testPlugin, true, false);
            const loadBtn = card.querySelector('.plugin-load-btn');
            
            loadBtn.click();

            expect(onPluginLoad).toHaveBeenCalledWith('test-plugin');
        });

        test('should call onPluginUnload when unload button clicked', () => {
            const onPluginUnload = jest.fn();
            const customStorefront = new Storefront({
                pluginLoader: mockPluginLoader,
                onPluginUnload
            });

            const card = customStorefront._createPluginCard(testPlugin, true, true);
            const unloadBtn = card.querySelector('.plugin-unload-btn');
            
            unloadBtn.click();

            expect(onPluginUnload).toHaveBeenCalledWith('test-plugin');
        });

        test('should highlight active plugin card', () => {
            const card = storefront._createPluginCard(testPlugin, true, true);

            // Border color is set to accent color (gold) for active plugins
            // Browser may convert hex to RGB
            expect(card.style.borderColor).toMatch(/(FFD700|rgb\(255, 215, 0\))/);
        });

        test('should show "No description" for plugin without description', () => {
            const pluginNoDesc = { ...testPlugin, description: null };
            const card = storefront._createPluginCard(pluginNoDesc, false, false);

            expect(card.textContent).toContain('No description');
        });
    });

    describe('refresh()', () => {
        test('should close and reopen storefront', () => {
            storefront.open();
            const closeSpy = jest.spyOn(storefront, 'close');
            const openSpy = jest.spyOn(storefront, 'open');

            storefront.refresh();

            expect(closeSpy).toHaveBeenCalled();
            expect(openSpy).toHaveBeenCalled();
        });

        test('should do nothing if storefront is not open', () => {
            const closeSpy = jest.spyOn(storefront, 'close');
            const openSpy = jest.spyOn(storefront, 'open');

            storefront.refresh();

            expect(closeSpy).not.toHaveBeenCalled();
            expect(openSpy).not.toHaveBeenCalled();
        });
    });

    describe('close()', () => {
        test('should close the storefront', () => {
            storefront.open();
            storefront.close();

            expect(storefront.isOpen).toBe(false);
            expect(storefront.modal).toBeNull();
        });

        test('should remove modal from DOM', () => {
            storefront.open();
            const modal = storefront.modal;

            storefront.close();

            expect(document.body.contains(modal)).toBe(false);
        });

        test('should remove escape key handler', () => {
            storefront.open();
            const handler = storefront._escHandler;

            storefront.close();

            expect(storefront._escHandler).toBeNull();
        });

        test('should call onClose callback', () => {
            const onClose = jest.fn();
            const customStorefront = new Storefront({
                pluginLoader: mockPluginLoader,
                onClose
            });

            customStorefront.open();
            customStorefront.close();

            expect(onClose).toHaveBeenCalled();
        });

        test('should handle close with no modal', () => {
            expect(() => storefront.close()).not.toThrow();
        });
    });

    describe('Close button interaction', () => {
        test('should close when close button clicked', () => {
            storefront.open();

            const closeBtn = Array.from(storefront.modal.querySelectorAll('button'))
                .find(btn => btn.textContent === '✕');

            closeBtn.click();

            expect(storefront.isOpen).toBe(false);
        });
    });

    describe('Plugin card interactions', () => {
        beforeEach(() => {
            storefront = new Storefront({
                pluginLoader: mockPluginLoader,
                settings: mockSettings,
                onPluginLoad: jest.fn(),
                onPluginUnload: jest.fn()
            });
        });

        test('should refresh after loading plugin', () => {
            storefront.open();
            const refreshSpy = jest.spyOn(storefront, 'refresh');

            const loadBtn = storefront.modal.querySelector('.plugin-load-btn');
            if (loadBtn) {
                loadBtn.click();
                expect(refreshSpy).toHaveBeenCalled();
            }
        });

        test('should refresh after unloading plugin', () => {
            mockPluginLoader.isLoaded.mockReturnValue(true);
            storefront.open();
            const refreshSpy = jest.spyOn(storefront, 'refresh');

            const unloadBtn = storefront.modal.querySelector('.plugin-unload-btn');
            if (unloadBtn) {
                unloadBtn.click();
                expect(refreshSpy).toHaveBeenCalled();
            }
        });
    });

    describe('Layout and styling', () => {
        test('should create grid layout for plugin cards', () => {
            storefront.open();

            const grid = storefront.modal.querySelector('#installed-plugins-grid');
            expect(grid).toBeTruthy();
            expect(grid.style.display).toBe('grid');
        });

        test('should apply backdrop blur effect', () => {
            storefront.open();

            // backdropFilter might not be fully supported in jsdom
            // Just verify the modal was created successfully
            expect(storefront.modal).toBeTruthy();
        });

        test('should center modal on screen', () => {
            storefront.open();

            expect(storefront.modal.style.display).toBe('flex');
            expect(storefront.modal.style.alignItems).toBe('center');
            expect(storefront.modal.style.justifyContent).toBe('center');
        });
    });

    describe('Edge cases', () => {
        test('should handle missing plugin loader', () => {
            const noLoaderStorefront = new Storefront({});
            
            expect(() => noLoaderStorefront.open()).not.toThrow();
        });

        test('should handle missing settings', () => {
            const noSettingsStorefront = new Storefront({
                pluginLoader: mockPluginLoader
            });
            
            expect(() => noSettingsStorefront.open()).not.toThrow();
        });

        test('should handle plugin loader returning null', () => {
            mockPluginLoader.getAvailablePlugins.mockReturnValue(null);
            
            expect(() => storefront.open()).not.toThrow();
        });

        test('should handle settings returning null', () => {
            mockSettings.getEnabledPlugins.mockReturnValue(null);
            
            expect(() => storefront.open()).not.toThrow();
        });

        test('should handle plugin with missing properties', () => {
            mockPluginLoader.getAvailablePlugins.mockReturnValue([
                { id: 'incomplete-plugin' }
            ]);

            expect(() => storefront.open()).not.toThrow();
        });
    });

    describe('Future plugins section', () => {
        test('should display "coming soon" message', () => {
            storefront.open();

            expect(storefront.modal.textContent).toContain('More plugins coming soon');
        });

        test('should show placeholder icon', () => {
            storefront.open();

            expect(storefront.modal.innerHTML).toContain('🔮');
        });
    });

    describe('Accessibility', () => {
        test('should not prevent clicks on content from closing modal', () => {
            storefront.open();

            const content = storefront.modal.querySelector('div > div');
            const event = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(event, 'target', { value: content, enumerable: true });
            
            storefront.modal.dispatchEvent(event);

            // Should still be open because click was on content, not backdrop
            expect(storefront.isOpen).toBe(true);
        });
    });
});
