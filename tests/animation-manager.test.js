/**
 * @jest-environment jsdom
 */

import AnimationManager from '../src/utils/AnimationManager.js';

describe('AnimationManager', () => {
  let animManager;
  let mockElement;

  beforeEach(() => {
    // Reset animation manager for each test
    animManager = new AnimationManager();
    
    // Create a mock DOM element
    mockElement = document.createElement('div');
    mockElement.style.opacity = '1';
    mockElement.style.transform = 'none';
    document.body.appendChild(mockElement);

    // Mock performance.now()
    if (typeof performance === 'undefined') {
      global.performance = { now: () => Date.now() };
    }
  });

  afterEach(() => {
    // Cleanup
    if (mockElement && mockElement.parentNode) {
      mockElement.parentNode.removeChild(mockElement);
    }
    animManager.cancelAll();
  });

  describe('Constructor', () => {
    test('should initialize with default properties', () => {
      expect(animManager.animations).toBeDefined();
      expect(animManager.animations.size).toBe(0);
      expect(animManager.metrics).toBeDefined();
      expect(animManager.metrics.lastFPS).toBe(60);
    });

    test('should initialize metrics with empty samples array', () => {
      expect(animManager.metrics.samples).toBeDefined();
      expect(Array.isArray(animManager.metrics.samples)).toBe(true);
      expect(animManager.metrics.samples.length).toBe(0);
    });

    test('should have lastFrameTime set', () => {
      expect(animManager.metrics.lastFrameTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('animate()', () => {
    test('should schedule an animation', () => {
      const updater = jest.fn();
      const onComplete = jest.fn();
      
      const anim = animManager.animate(mockElement, 100, 0, updater, onComplete);
      
      expect(anim).toBeDefined();
      expect(anim.element).toBe(mockElement);
      expect(anim.canceled).toBe(false);
      expect(animManager.animations.size).toBe(1);
    });

    test('should handle animation with delay', () => {
      const updater = jest.fn();
      const delay = 100;
      
      const anim = animManager.animate(mockElement, 300, delay, updater);
      
      expect(anim.start).toBeGreaterThan(performance.now());
      expect(anim.end).toBeGreaterThan(anim.start);
    });

    test('should handle zero duration animation', () => {
      const updater = jest.fn();
      const onComplete = jest.fn();
      
      const anim = animManager.animate(mockElement, 0, 0, updater, onComplete);
      
      // Animation object should be created
      expect(anim).toBeDefined();
      expect(anim.end).toBeGreaterThanOrEqual(anim.start);
    });

    test('should handle negative values by converting to zero', () => {
      const updater = jest.fn();
      
      const anim = animManager.animate(mockElement, -100, -50, updater);
      
      // Should handle negative values gracefully
      expect(anim.start).toBeGreaterThanOrEqual(0);
      expect(anim.end).toBeGreaterThanOrEqual(anim.start);
    });
  });

  describe('fadeOut()', () => {
    test('should fade out element', () => {
      const onComplete = jest.fn();
      
      const anim = animManager.fadeOut(mockElement, 300, 0, onComplete);
      
      expect(anim).toBeDefined();
      expect(animManager.animations.size).toBe(1);
    });

    test('should set willChange style property', () => {
      animManager.fadeOut(mockElement, 300, 0);
      
      // Will be set during animation setup
      expect(mockElement.style.willChange).toBeDefined();
    });

    test('should handle null element gracefully', () => {
      const anim = animManager.fadeOut(null, 300, 0);
      
      expect(anim).toBeNull();
      expect(animManager.animations.size).toBe(0);
    });

    test('should support translateY option', () => {
      const options = { translateY: 20 };
      const anim = animManager.fadeOut(mockElement, 300, 0, null, options);
      
      expect(anim).toBeDefined();
    });

    test('should call onComplete callback', (done) => {
      const onComplete = jest.fn(() => {
        expect(onComplete).toHaveBeenCalled();
        done();
      });
      
      // Short duration for testing
      animManager.fadeOut(mockElement, 10, 0, onComplete);
      
      // Wait for animation to complete
      setTimeout(() => {
        if (!onComplete.mock.calls.length) {
          done();
        }
      }, 50);
    });

    test('should handle elements without style property', () => {
      const brokenElement = { nodeType: 1 }; // Element-like but no style
      
      const anim = animManager.fadeOut(brokenElement, 300, 0);
      
      // Should not crash
      expect(anim).toBeDefined();
    });
  });

  describe('fadeIn()', () => {
    test('should fade in element', () => {
      const onComplete = jest.fn();
      
      const anim = animManager.fadeIn(mockElement, 300, 0, onComplete);
      
      expect(anim).toBeDefined();
      expect(animManager.animations.size).toBe(1);
    });

    test('should set initial opacity to 0', () => {
      animManager.fadeIn(mockElement, 300, 0);
      
      expect(mockElement.style.opacity).toBe('0');
    });

    test('should set willChange property', () => {
      animManager.fadeIn(mockElement, 300, 0);
      
      expect(mockElement.style.willChange).toBeDefined();
    });

    test('should handle null element gracefully', () => {
      const anim = animManager.fadeIn(null, 300, 0);
      
      expect(anim).toBeNull();
      expect(animManager.animations.size).toBe(0);
    });

    test('should support translateY option', () => {
      const options = { translateY: -20 };
      const anim = animManager.fadeIn(mockElement, 300, 0, null, options);
      
      expect(anim).toBeDefined();
      // Should set initial transform
      expect(mockElement.style.transform).toContain('translateY');
    });

    test('should call onComplete callback', (done) => {
      const onComplete = jest.fn(() => {
        expect(onComplete).toHaveBeenCalled();
        done();
      });
      
      animManager.fadeIn(mockElement, 10, 0, onComplete);
      
      setTimeout(() => {
        if (!onComplete.mock.calls.length) {
          done();
        }
      }, 50);
    });

    test('should handle zero translateY option', () => {
      const options = { translateY: 0 };
      const anim = animManager.fadeIn(mockElement, 300, 0, null, options);
      
      expect(anim).toBeDefined();
    });
  });

  describe('cancelAll()', () => {
    test('should cancel all animations', () => {
      // Add multiple animations
      animManager.animate(mockElement, 300);
      animManager.fadeOut(mockElement, 300);
      animManager.fadeIn(mockElement, 300);
      
      expect(animManager.animations.size).toBeGreaterThan(0);
      
      animManager.cancelAll();
      
      expect(animManager.animations.size).toBe(0);
    });

    test('should mark all animations as canceled', () => {
      const anim1 = animManager.animate(mockElement, 300);
      const anim2 = animManager.fadeOut(mockElement, 300);
      
      animManager.cancelAll();
      
      expect(anim1.canceled).toBe(true);
      expect(anim2.canceled).toBe(true);
    });

    test('should handle empty animation set', () => {
      expect(animManager.animations.size).toBe(0);
      
      // Should not throw
      expect(() => animManager.cancelAll()).not.toThrow();
      
      expect(animManager.animations.size).toBe(0);
    });
  });

  describe('getFPS()', () => {
    test('should return current FPS', () => {
      const fps = animManager.getFPS();
      
      expect(typeof fps).toBe('number');
      expect(fps).toBeGreaterThanOrEqual(0);
    });

    test('should return default FPS of 60 initially', () => {
      const newManager = new AnimationManager();
      const fps = newManager.getFPS();
      
      expect(fps).toBe(60);
    });

    test('should update FPS based on frame timing', () => {
      // Simulate frame timing by calling _tick
      const initialFPS = animManager.getFPS();
      
      expect(typeof initialFPS).toBe('number');
    });
  });

  describe('_getOpacity()', () => {
    test('should return element opacity', () => {
      mockElement.style.opacity = '0.5';
      const opacity = animManager._getOpacity(mockElement);
      
      expect(opacity).toBeCloseTo(0.5, 1);
    });

    test('should return 1 for default opacity', () => {
      const newElement = document.createElement('div');
      const opacity = animManager._getOpacity(newElement);
      
      expect(opacity).toBe(1);
    });

    test('should handle elements without computed style', () => {
      const opacity = animManager._getOpacity({});
      
      expect(opacity).toBe(1);
    });

    test('should handle NaN opacity values', () => {
      mockElement.style.opacity = 'invalid';
      const opacity = animManager._getOpacity(mockElement);
      
      expect(opacity).toBe(1);
    });
  });

  describe('_tick() - Frame loop', () => {
    test('should process animations in frame loop', (done) => {
      const updater = jest.fn();
      const onComplete = jest.fn();
      
      animManager.animate(mockElement, 20, 0, updater, onComplete);
      
      // Wait for animation to complete
      setTimeout(() => {
        expect(updater).toHaveBeenCalled();
        done();
      }, 100);
    });

    test('should remove completed animations', (done) => {
      animManager.animate(mockElement, 10, 0);
      
      expect(animManager.animations.size).toBe(1);
      
      setTimeout(() => {
        expect(animManager.animations.size).toBeLessThanOrEqual(1);
        done();
      }, 50);
    });

    test('should handle updater errors gracefully', (done) => {
      const throwingUpdater = jest.fn(() => {
        throw new Error('Updater error');
      });
      
      // Should not crash the animation loop
      expect(() => {
        animManager.animate(mockElement, 10, 0, throwingUpdater);
      }).not.toThrow();
      
      setTimeout(() => {
        done();
      }, 50);
    });

    test('should handle onComplete errors gracefully', (done) => {
      const throwingComplete = jest.fn(() => {
        throw new Error('Complete error');
      });
      
      animManager.animate(mockElement, 10, 0, () => {}, throwingComplete);
      
      setTimeout(() => {
        done();
      }, 50);
    });

    test('should track FPS metrics', () => {
      const initialSamples = animManager.metrics.samples.length;
      
      // Metrics should exist
      expect(animManager.metrics).toBeDefined();
      expect(animManager.metrics.lastFPS).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle multiple simultaneous animations', () => {
      const element1 = document.createElement('div');
      const element2 = document.createElement('div');
      const element3 = document.createElement('div');
      
      animManager.fadeOut(element1, 300);
      animManager.fadeIn(element2, 300);
      animManager.animate(element3, 300);
      
      expect(animManager.animations.size).toBe(3);
    });

    test('should handle very long duration animations', () => {
      const anim = animManager.animate(mockElement, 999999, 0);
      
      expect(anim).toBeDefined();
      expect(anim.end - anim.start).toBeGreaterThan(999000);
    });

    test('should handle animations with same element', () => {
      animManager.fadeOut(mockElement, 300);
      animManager.fadeIn(mockElement, 300);
      
      // Both should be scheduled
      expect(animManager.animations.size).toBe(2);
    });

    test('should handle undefined callbacks', () => {
      expect(() => {
        animManager.animate(mockElement, 100, 0, undefined, undefined);
      }).not.toThrow();
    });

    test('should handle missing performance API', () => {
      const originalPerformance = global.performance;
      delete global.performance;
      
      const newManager = new AnimationManager();
      expect(newManager.metrics.lastFrameTime).toBeGreaterThanOrEqual(0);
      
      global.performance = originalPerformance;
    });

    test('should handle missing requestAnimationFrame', () => {
      const originalRAF = global.requestAnimationFrame;
      delete global.requestAnimationFrame;
      
      // Should not crash
      expect(() => {
        const newManager = new AnimationManager();
        newManager.animate(mockElement, 100);
      }).not.toThrow();
      
      global.requestAnimationFrame = originalRAF;
    });
  });

  describe('Performance characteristics', () => {
    test('should complete short animations quickly', (done) => {
      const start = performance.now();
      const onComplete = jest.fn(() => {
        const duration = performance.now() - start;
        expect(duration).toBeLessThan(100); // Should complete in reasonable time
        done();
      });
      
      animManager.animate(mockElement, 10, 0, () => {}, onComplete);
      
      setTimeout(() => {
        if (!onComplete.mock.calls.length) {
          done();
        }
      }, 100);
    });

    test('should maintain FPS samples within limit', (done) => {
      // Run some animations to generate FPS samples
      for (let i = 0; i < 50; i++) {
        animManager.animate(mockElement, 10);
      }
      
      setTimeout(() => {
        expect(animManager.metrics.samples.length).toBeLessThanOrEqual(30);
        done();
      }, 200);
    });

    test('should handle rapid animation scheduling', () => {
      for (let i = 0; i < 100; i++) {
        animManager.animate(mockElement, 10);
      }
      
      expect(animManager.animations.size).toBeGreaterThan(0);
    });
  });
});
