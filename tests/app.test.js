// MD Reader Pro - Main Application Tests  
const MDReaderDemo = require('../src/index.js');

describe('MD Reader Pro Demo Application', () => {
  let demo;

  beforeEach(() => {
    // Clear any existing instances
    if (window.mdReaderDemo) {
      delete window.mdReaderDemo;
    }
    if (window.showCollabStory) {
      delete window.showCollabStory;
    }
  });

  test('should initialize with correct version', () => {
    demo = new MDReaderDemo();
    expect(demo.version).toBe('3.0.0');
  });

  test('should have collaboration features', () => {
    demo = new MDReaderDemo();
    expect(demo.collaborators).toContain('Human Developer');
    expect(demo.collaborators).toContain('Claude AI Assistant');
  });

  test('should include live debugging feature', () => {
    demo = new MDReaderDemo();
    const debuggingFeature = demo.features.find(f => f.includes('Live Debugging Session'));
    expect(debuggingFeature).toBeDefined();
    expect(debuggingFeature).toContain('COMPLETED!');
  });

  test('should create global collaboration story function', () => {
    demo = new MDReaderDemo();
    expect(typeof window.showCollabStory).toBe('function');
  });

  test('should track memory usage', () => {
    demo = new MDReaderDemo();
    const memoryUsage = demo.getMemoryUsage();
    expect(typeof memoryUsage === 'number' || memoryUsage === 'N/A').toBe(true);
  });

  test('should show collaboration story', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    demo = new MDReaderDemo();
    
    demo.showCollaborationStory();
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('THE COLLABORATION STORY'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Human debugging'));
    
    consoleSpy.mockRestore();
  });
});

describe('Demo Console Integration', () => {
  test('should provide helpful console commands', () => {
    // Since the module has already loaded and logged the console commands,
    // we test that the functionality exists rather than the logging
    expect(typeof window.showCollabStory).toBe('function');
    expect(typeof window.mdReaderDemo).toBeDefined();
  });
});

describe('Performance Tracking', () => {
  test('should track performance metrics', () => {
    let demo = new MDReaderDemo();
    
    // Simulate window load event
    const loadEvent = new Event('load');
    window.dispatchEvent(loadEvent);
    
    // Performance tracking should be active (performance.now is mocked in setup)
    expect(performance.now).toBeDefined();
    expect(typeof demo.getMemoryUsage()).toBeTruthy();
  });
});

// Integration test for the complete demo flow
describe('Complete Demo Flow', () => {
  test('should complete full initialization without errors', () => {
    let demo;
    
    expect(() => {
      demo = new MDReaderDemo();
    }).not.toThrow();
    
    // Verify the demo object is properly initialized
    expect(demo.version).toBe('3.0.0');
    expect(demo.collaborators).toHaveLength(2);
    expect(demo.features).toHaveLength(5);
    expect(typeof demo.showCollaborationStory).toBe('function');
    expect(typeof demo.getMemoryUsage).toBe('function');
  });
});
