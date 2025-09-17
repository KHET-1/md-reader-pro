// MD Reader Pro - UI Interactions and DOM Tests
const MDReaderDemo = require('../src/index.js');

describe('UI Interactions and DOM Manipulation', () => {
  let demo;

  beforeEach(() => {
    demo = new MDReaderDemo();
    
    // Clean up any existing DOM elements
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Clean up DOM after each test
    document.body.innerHTML = '';
  });

  describe('Interactive Feature Elements', () => {
    test('should add click handlers to feature elements', (done) => {
      // Create mock feature elements
      const feature1 = document.createElement('div');
      feature1.classList.add('feature');
      const h3_1 = document.createElement('h3');
      h3_1.textContent = 'Local AI Processing';
      feature1.appendChild(h3_1);

      const feature2 = document.createElement('div');
      feature2.classList.add('feature');
      const h3_2 = document.createElement('h3');
      h3_2.textContent = 'Complete Privacy';
      feature2.appendChild(h3_2);

      document.body.appendChild(feature1);
      document.body.appendChild(feature2);

      // Set up demo and add interactivity
      demo.addInteractivity();

      // Test clicking on feature elements
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const clickEvent = new Event('click');
      feature1.dispatchEvent(clickEvent);

      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith('🎯 Feature clicked:', 'Local AI Processing');
        
        // Test animation was applied
        expect(feature1.style.transform).toBe('scale(1.05)');
        
        // Wait for animation to reset
        setTimeout(() => {
          expect(feature1.style.transform).toBe('scale(1)');
          
          consoleSpy.mockRestore();
          done();
        }, 250);
      }, 10);
    });

    test('should handle multiple feature clicks', () => {
      // Create multiple features
      const features = [];
      for (let i = 0; i < 4; i++) {
        const feature = document.createElement('div');
        feature.classList.add('feature');
        const h3 = document.createElement('h3');
        h3.textContent = `Feature ${i + 1}`;
        feature.appendChild(h3);
        document.body.appendChild(feature);
        features.push(feature);
      }

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      demo.addInteractivity();

      // Click all features
      features.forEach((feature, index) => {
        const clickEvent = new Event('click');
        feature.dispatchEvent(clickEvent);
      });

      // Verify clicks were logged (account for addInteractivity messages too)
      expect(consoleSpy).toHaveBeenCalledWith('🎯 Feature clicked:', 'Feature 1');
      expect(consoleSpy).toHaveBeenCalledWith('🎯 Feature clicked:', 'Feature 4');
      
      // Verify that click logging works for all features
      const clickCalls = consoleSpy.mock.calls.filter(call => 
        call[0] === '🎯 Feature clicked:'
      );
      expect(clickCalls).toHaveLength(4);

      consoleSpy.mockRestore();
    });

    test('should handle features without h3 elements gracefully', () => {
      // Create feature element without h3
      const feature = document.createElement('div');
      feature.classList.add('feature');
      document.body.appendChild(feature);

      expect(() => {
        demo.addInteractivity();
        
        const clickEvent = new Event('click');
        feature.dispatchEvent(clickEvent);
      }).not.toThrow();
    });
  });

  describe('DOM Content Loading', () => {
    test('should set up interactivity when DOM is loaded', (done) => {
      const addInteractivitySpy = jest.spyOn(demo, 'addInteractivity');
      
      demo.setupDemo();

      // Simulate DOMContentLoaded event
      const domEvent = new Event('DOMContentLoaded');
      document.dispatchEvent(domEvent);

      setTimeout(() => {
        expect(addInteractivitySpy).toHaveBeenCalled();
        
        addInteractivitySpy.mockRestore();
        done();
      }, 10);
    });

    test('should handle DOMContentLoaded event multiple times', () => {
      const addInteractivitySpy = jest.spyOn(demo, 'addInteractivity');
      
      demo.setupDemo();

      // Dispatch multiple DOMContentLoaded events
      for (let i = 0; i < 3; i++) {
        const domEvent = new Event('DOMContentLoaded');
        document.dispatchEvent(domEvent);
      }

      // Should handle multiple events without breaking
      expect(addInteractivitySpy).toHaveBeenCalled();
      expect(addInteractivitySpy.mock.calls.length).toBeGreaterThanOrEqual(3);
      
      addInteractivitySpy.mockRestore();
    });
  });

  describe('Window Event Handling', () => {
    test('should track window load events for performance', (done) => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const performanceSpy = jest.spyOn(performance, 'now').mockReturnValue(1000);
      
      demo.trackPerformance();

      // Simulate window load event
      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Page load time:'));
        expect(performanceSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
        performanceSpy.mockRestore();
        done();
      }, 10);
    });

    test('should handle window events when performance API is unavailable', (done) => {
      const originalPerformance = global.performance;
      
      // Mock performance API unavailable
      global.performance = {
        now: undefined
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      expect(() => {
        demo.trackPerformance();
        
        const loadEvent = new Event('load');
        window.dispatchEvent(loadEvent);
      }).not.toThrow();

      setTimeout(() => {
        // Should still log performance info even without performance.now
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Performance metrics:'));
        
        // Restore original performance
        global.performance = originalPerformance;
        consoleSpy.mockRestore();
        done();
      }, 10);
    });
  });

  describe('Visual Feedback and Animations', () => {
    test('should apply and remove scale transformation on feature click', (done) => {
      const feature = document.createElement('div');
      feature.classList.add('feature');
      const h3 = document.createElement('h3');
      h3.textContent = 'Test Feature';
      feature.appendChild(h3);
      document.body.appendChild(feature);

      demo.addInteractivity();

      // Initial state
      expect(feature.style.transform).toBe('');

      // Click feature
      const clickEvent = new Event('click');
      feature.dispatchEvent(clickEvent);

      // Should immediately apply scale
      expect(feature.style.transform).toBe('scale(1.05)');

      // Should reset after animation
      setTimeout(() => {
        expect(feature.style.transform).toBe('scale(1)');
        done();
      }, 250);
    });

    test('should handle rapid clicks on same feature', () => {
      const feature = document.createElement('div');
      feature.classList.add('feature');
      const h3 = document.createElement('h3');
      h3.textContent = 'Test Feature';
      feature.appendChild(h3);
      document.body.appendChild(feature);

      demo.addInteractivity();

      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        const clickEvent = new Event('click');
        feature.dispatchEvent(clickEvent);
      }

      // Should handle without errors
      expect(feature.style.transform).toBe('scale(1.05)');
    });
  });

  describe('Accessibility and Error Handling', () => {
    test('should handle missing DOM elements gracefully', () => {
      // Test with no feature elements in DOM
      expect(() => {
        demo.addInteractivity();
      }).not.toThrow();
    });

    test('should handle malformed DOM structure', () => {
      // Create feature without proper structure
      const malformedFeature = document.createElement('div');
      malformedFeature.classList.add('feature');
      // No h3 element
      document.body.appendChild(malformedFeature);

      expect(() => {
        demo.addInteractivity();
        
        const clickEvent = new Event('click');
        malformedFeature.dispatchEvent(clickEvent);
      }).not.toThrow();
    });

    test('should maintain functionality with disabled styles', () => {
      const feature = document.createElement('div');
      feature.classList.add('feature');
      const h3 = document.createElement('h3');
      h3.textContent = 'Test Feature';
      feature.appendChild(h3);
      
      // Disable style modifications (simulate CSS disabled)
      Object.defineProperty(feature, 'style', {
        value: {},
        writable: false
      });
      
      document.body.appendChild(feature);

      expect(() => {
        demo.addInteractivity();
        
        const clickEvent = new Event('click');
        feature.dispatchEvent(clickEvent);
      }).not.toThrow();
    });
  });
});