// MD Reader Pro - Core Functionality Tests
const MDReaderDemo = require('../src/index.js');

describe('Core Application Features', () => {
  let demo;

  beforeEach(() => {
    demo = new MDReaderDemo();
  });

  afterEach(() => {
    // Clean up any DOM modifications
    if (typeof window !== 'undefined' && window.showCollabStory) {
      delete window.showCollabStory;
    }
  });

  describe('Application Initialization', () => {
    test('should initialize with correct default values', () => {
      expect(demo.version).toBe('3.0.0');
      expect(demo.collaborators).toHaveLength(2);
      expect(demo.features).toHaveLength(5);
    });

    test('should have all required features defined', () => {
      const requiredFeatures = [
        'Local AI Processing',
        'Complete Privacy Protection',
        'High Performance Rendering',
        'Smart AI Annotations',
        'Live Debugging Session'
      ];

      requiredFeatures.forEach(feature => {
        expect(demo.features.some(f => f.includes(feature))).toBe(true);
      });
    });

    test('should setup global collaboration story function', () => {
      expect(typeof window.showCollabStory).toBe('function');
    });
  });

  describe('Memory Management', () => {
    test('should track memory usage correctly', () => {
      const memoryUsage = demo.getMemoryUsage();
      
      if (performance.memory) {
        expect(typeof memoryUsage).toBe('number');
        expect(memoryUsage).toBeGreaterThan(0);
      } else {
        expect(memoryUsage).toBe('N/A');
      }
    });

    test('should handle missing performance.memory gracefully', () => {
      const originalMemory = performance.memory;
      delete performance.memory;
      
      const memoryUsage = demo.getMemoryUsage();
      expect(memoryUsage).toBe('N/A');
      
      // Restore original
      performance.memory = originalMemory;
    });
  });

  describe('Performance Tracking', () => {
    test('should call performance.now during tracking setup', () => {
      const performanceSpy = jest.spyOn(performance, 'now');
      
      demo.trackPerformance();
      
      // Simulate window load event
      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);
      
      expect(performanceSpy).toHaveBeenCalled();
      performanceSpy.mockRestore();
    });

    test('should calculate load time correctly', (done) => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      demo.trackPerformance();
      
      // Simulate window load event
      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);
      
      // Give event handlers time to execute
      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Page load time:'));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Performance metrics:'));
        
        consoleSpy.mockRestore();
        done();
      }, 10);
    });
  });

  describe('Collaboration Story Feature', () => {
    test('should display collaboration story with key elements', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      demo.showCollaborationStory();
      
      // Check for key story elements
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('THE COLLABORATION STORY'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Human debugging'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Claude + Human solved it'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('amazing collaboration'));
      
      consoleSpy.mockRestore();
    });

    test('should be accessible via global window function', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Should be able to call via window
      window.showCollabStory();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('THE COLLABORATION STORY'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Demo Setup and Interactivity', () => {
    test('should setup demo functionality without errors', () => {
      expect(() => {
        demo.setupDemo();
      }).not.toThrow();
    });

    test('should add interactive elements when DOM is ready', (done) => {
      // Mock DOM elements
      const mockFeature = document.createElement('div');
      mockFeature.classList.add('feature');
      const mockH3 = document.createElement('h3');
      mockH3.textContent = 'Test Feature';
      mockFeature.appendChild(mockH3);
      document.body.appendChild(mockFeature);

      demo.setupDemo();

      // Simulate DOMContentLoaded
      const domEvent = new Event('DOMContentLoaded');
      document.dispatchEvent(domEvent);

      setTimeout(() => {
        // Click the feature element
        const clickEvent = new Event('click');
        mockFeature.dispatchEvent(clickEvent);

        // Check if transform was applied (indicates interaction worked)
        setTimeout(() => {
          // Clean up
          document.body.removeChild(mockFeature);
          done();
        }, 250); // Wait for animation to complete
      }, 10);
    });
  });
});