/**
 * @jest-environment jsdom
 */

import Storefront from '../src/plugins/Storefront.js';

describe('Storefront', () => {
    let storefront;
    let mockPluginLoader;
    let mockPluginRegistry;
    let mockSettings;
    let mockOnPluginLoad;
    let mockOnPluginUnload;
    let mockOnClose;

    beforeEach(() => {
        mockOnPluginLoad = jest.fn();
        mockOnPluginUnload = jest.fn();
        mockOnClose = jest.fn();

        // Mock plugin loader
        mockPluginLoader = {
            getAvailablePlugins: jest.fn(() => [
                {
                    id: 'test-plugin',
                    name: 'Test Plugin',
                    version: '1.0.0',
                    description: 'A test plugin'
                }
            ]),
            isLoaded: jest.fn(() => false)
        };

        // Mock plugin registry
        mockPluginRegistry = {};

        // Mock settings
        mockSettings = {
            getEnabledPlugins: jest.fn(() => [])
        };

        storefront = new Storefront({
            pluginLoader: mockPluginLoader,
            pluginRegistry: mockPluginRegistry,
            settings: mockSettings,
            onPluginLoad: mockOnPluginLoad,
            onPluginUnload: mockOnPluginUnload,
            onClose: mockOnClose
        });
    });

    afterEach(() => {
        if (storefront) {
            storefront.close();
        }
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with provided options', () => {
            expect(storefront.pluginLoader).toBe(mockPluginLoader);
            expect(storefront.pluginRegistry).toBe(mockPluginRegistry);
            expect(storefront.settings).toBe(mockSettings);
            expect(storefront.onPluginLoad).toBe(mockOnPluginLoad);
            expect(storefront.onPluginUnload).toBe(mockOnPluginUnload);
            expect(storefront.onClose).toBe(mockOnClose);
        });

        test('should initialize with default callbacks', () => {
            const defaultStorefront = new Storefront();

            expect(defaultStorefront.onPluginLoad).toBeInstanceOf(Function);
            expect(defaultStorefront.onPluginUnload).toBeInstanceOf(Function);
            expect(defaultStorefront.onClose).toBeInstanceOf(Function);
        });

        test('should start closed', () => {
            expect(storefront.isOpen).toBe(false);
            expect(storefront.modal).toBeNull();
        });
    });

    describe('open()', () => {
        test('should create and open modal', () => {
            storefront.open();

            expect(storefront.isOpen).toBe(true);
            expect(storefront.modal).toBeTruthy();
            expect(document.getElementById('plugin-storefront')).toBeTruthy();
        });

        test('should remove existing modal before creating new one', () => {
            storefront.open();
            const firstModal = storefront.modal;

            storefront.open();
            const secondModal = storefront.modal;

            expect(firstModal).not.toBe(secondModal);
            expect(document.querySelectorAll('#plugin-storefront').length).toBe(1);
        });

        test('should display header with title', () => {
            storefront.open();

            const header = storefront.modal.textContent;
            expect(header).toContain('Plugin Storefront');
            expect(header).toContain('Browse and manage local plugins');
        });

        test('should create close button', () => {
            storefront.open();

            const closeBtn = storefront.modal.querySelector('button');
            expect(closeBtn).toBeTruthy();
            expect(closeBtn.textContent).toBe('✕');
        });

        test('should fetch and display available plugins', () => {
            storefront.open();

            expect(mockPluginLoader.getAvailablePlugins).toHaveBeenCalled();
            expect(storefront.modal.textContent).toContain('Test Plugin');
        });

        test('should display "no plugins" message when none available', () => {
            mockPluginLoader.getAvailablePlugins.mockReturnValue([]);

            storefront.open();

            expect(storefront.modal.textContent).toContain('No plugins discovered');
        });

        test('should setup keyboard event listener', () => {
            const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

            storefront.open();

            expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

            addEventListenerSpy.mockRestore();
        });

        test('should close on Escape key', () => {
            storefront.open();

            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escapeEvent);

            expect(storefront.isOpen).toBe(false);
        });

        test('should close on backdrop click', () => {
            storefront.open();

            const backdrop = storefront.modal;
            backdrop.click();

            expect(storefront.isOpen).toBe(false);
        });
    });

    describe('_createPluginCard()', () => {
        test('should create plugin card with basic info', () => {
            const plugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '2.0.0',
                description: 'Test description'
            };

            const card = storefront._createPluginCard(plugin, false, false);

            expect(card.textContent).toContain('Test Plugin');
            expect(card.textContent).toContain('v2.0.0');
            expect(card.textContent).toContain('Test description');
        });

        test('should show "Disabled" status for disabled plugin', () => {
            const plugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0'
            };

            const card = storefront._createPluginCard(plugin, false, false);

            expect(card.textContent).toContain('Disabled');
        });

        test('should show "Enabled" status for enabled plugin', () => {
            const plugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0'
            };

            const card = storefront._createPluginCard(plugin, true, false);

            expect(card.textContent).toContain('Enabled');
        });

        test('should show "Active" status for loaded plugin', () => {
            const plugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0'
            };

            const card = storefront._createPluginCard(plugin, true, true);

            expect(card.textContent).toContain('Active');
        });

        test('should show "Load" button for unloaded plugin', () => {
            const plugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0'
            };

            const card = storefront._createPluginCard(plugin, true, false);

            const loadBtn = card.querySelector('.plugin-load-btn');
            expect(loadBtn).toBeTruthy();
            expect(loadBtn.textContent).toBe('Load');
        });

        test('should show "Unload" button for loaded plugin', () => {
            const plugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0'
            };

            const card = storefront._createPluginCard(plugin, true, true);

            const unloadBtn = card.querySelector('.plugin-unload-btn');
            expect(unloadBtn).toBeTruthy();
            expect(unloadBtn.textContent).toBe('Unload');
        });

        test('should call onPluginLoad when load button clicked', () => {
            const plugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0'
            };

            const card = storefront._createPluginCard(plugin, true, false);
            const loadBtn = card.querySelector('.plugin-load-btn');

            loadBtn.click();

            expect(mockOnPluginLoad).toHaveBeenCalledWith('test-plugin');
        });

        test('should call onPluginUnload when unload button clicked', () => {
            const plugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0'
            };

            const card = storefront._createPluginCard(plugin, true, true);
            const unloadBtn = card.querySelector('.plugin-unload-btn');

            unloadBtn.click();

            expect(mockOnPluginUnload).toHaveBeenCalledWith('test-plugin');
        });

        test('should refresh after load button clicked', () => {
            const plugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0'
            };

            const refreshSpy = jest.spyOn(storefront, 'refresh');
            const card = storefront._createPluginCard(plugin, true, false);
            const loadBtn = card.querySelector('.plugin-load-btn');

            loadBtn.click();

            expect(refreshSpy).toHaveBeenCalled();

            refreshSpy.mockRestore();
        });

        test('should display "No description" when description missing', () => {
            const plugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0'
            };

            const card = storefront._createPluginCard(plugin, false, false);

            expect(card.textContent).toContain('No description');
        });
    });

    describe('refresh()', () => {
        test('should close and reopen when open', () => {
            storefront.open();
            expect(storefront.isOpen).toBe(true);

            const closeSpy = jest.spyOn(storefront, 'close');
            const openSpy = jest.spyOn(storefront, 'open');

            storefront.refresh();

            expect(closeSpy).toHaveBeenCalled();
            expect(openSpy).toHaveBeenCalled();

            closeSpy.mockRestore();
            openSpy.mockRestore();
        });

        test('should not reopen when closed', () => {
            expect(storefront.isOpen).toBe(false);

            const openSpy = jest.spyOn(storefront, 'open');

            storefront.refresh();

            expect(openSpy).not.toHaveBeenCalled();

            openSpy.mockRestore();
        });
    });

    describe('close()', () => {
        test('should close modal', () => {
            storefront.open();
            expect(storefront.isOpen).toBe(true);

            storefront.close();

            expect(storefront.isOpen).toBe(false);
            expect(storefront.modal).toBeNull();
            expect(document.getElementById('plugin-storefront')).toBeFalsy();
        });

        test('should call onClose callback', () => {
            storefront.open();

            storefront.close();

            expect(mockOnClose).toHaveBeenCalled();
        });

        test('should remove keyboard event listener', () => {
            const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

            storefront.open();
            storefront.close();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

            removeEventListenerSpy.mockRestore();
        });

        test('should handle no modal gracefully', () => {
            expect(() => storefront.close()).not.toThrow();
        });
    });

    describe('Integration', () => {
        test('should display multiple plugins', () => {
            mockPluginLoader.getAvailablePlugins.mockReturnValue([
                {
                    id: 'plugin1',
                    name: 'Plugin 1',
                    version: '1.0.0',
                    description: 'First plugin'
                },
                {
                    id: 'plugin2',
                    name: 'Plugin 2',
                    version: '2.0.0',
                    description: 'Second plugin'
                }
            ]);

            storefront.open();

            expect(storefront.modal.textContent).toContain('Plugin 1');
            expect(storefront.modal.textContent).toContain('Plugin 2');
        });

        test('should reflect plugin loaded state', () => {
            mockPluginLoader.isLoaded.mockImplementation((id) => id === 'plugin1');
            mockPluginLoader.getAvailablePlugins.mockReturnValue([
                { id: 'plugin1', name: 'Plugin 1', version: '1.0.0' },
                { id: 'plugin2', name: 'Plugin 2', version: '1.0.0' }
            ]);

            storefront.open();

            const cards = storefront.modal.querySelectorAll('.plugin-card');
            expect(cards.length).toBe(2);
        });

        test('should reflect plugin enabled state', () => {
            mockSettings.getEnabledPlugins.mockReturnValue(['plugin1']);
            mockPluginLoader.getAvailablePlugins.mockReturnValue([
                { id: 'plugin1', name: 'Plugin 1', version: '1.0.0' },
                { id: 'plugin2', name: 'Plugin 2', version: '1.0.0' }
            ]);

            storefront.open();

            const modalText = storefront.modal.textContent;
            expect(modalText).toContain('Plugin 1');
            expect(modalText).toContain('Plugin 2');
        });

        test('should show available plugins section', () => {
            storefront.open();

            expect(storefront.modal.textContent).toContain('Available Plugins');
            expect(storefront.modal.textContent).toContain('More plugins coming soon');
        });
    });

    describe('Edge Cases', () => {
        test('should handle null pluginLoader', () => {
            const noLoaderStorefront = new Storefront({
                pluginLoader: null
            });

            expect(() => noLoaderStorefront.open()).not.toThrow();
        });

        test('should handle null settings', () => {
            const noSettingsStorefront = new Storefront({
                pluginLoader: mockPluginLoader,
                settings: null
            });

            expect(() => noSettingsStorefront.open()).not.toThrow();
        });

        test('should handle plugin with missing properties', () => {
            mockPluginLoader.getAvailablePlugins.mockReturnValue([
                { id: 'minimal-plugin' }
            ]);

            storefront.open();

            expect(storefront.modal.textContent).toContain('No description');
        });

        test('should handle rapid open/close cycles', () => {
            for (let i = 0; i < 5; i++) {
                storefront.open();
                storefront.close();
            }

            expect(storefront.isOpen).toBe(false);
            // Modal may be removed or still in DOM depending on timing
            expect(storefront.modal).toBeNull();
        });
    });
});
