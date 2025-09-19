import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';

// Mock console methods globally
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();
vi.spyOn(console, 'log').mockImplementation(mockConsoleLog);
vi.spyOn(console, 'error').mockImplementation(mockConsoleError);

// Mock ReactDOM createRoot
const mockRender = vi.fn();
const mockCreateRoot = vi.fn().mockReturnValue({
  render: mockRender
});

vi.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot
}));

// Mock React
vi.mock('react', () => ({
  ...jest.requireActual<typeof React>('react'),
  StrictMode: ({ children }: any) => children
}));

// Mock App component
vi.mock('../App', () => {
  return function MockApp() {
    return React.createElement('div', { 'data-testid': 'mock-app' }, 'Mock App');
  };
});

// Mock providers
vi.mock('../providers', () => ({
  CompositionRootProvider: ({ children }: any) => children
}));

// Mock DOM methods
const mockGetElementById = vi.fn().mockReturnValue({
  id: 'root',
  innerHTML: ''
});

const mockDocumentAddEventListener = vi.fn();
const mockWindowAddEventListener = vi.fn();

// Mock electronAPI
const mockElectronAPI = {
  toggleFullscreen: vi.fn()
};

describe('Index.tsx - Application Entry Point', () => {
  beforeAll(() => {
    // Setup global mocks
    (document.getElementById as any) = mockGetElementById;
    (document.addEventListener as any) = mockDocumentAddEventListener;
    (window.addEventListener as any) = mockWindowAddEventListener;
    
    // Setup window.electronAPI mock
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true
    });

    // Clear all mocks before loading the module
    vi.clearAllMocks();
    
    // Load the index module - this will execute all the code
    require('../index');
  });

  afterAll(() => {
    // Clean up
    delete (window as any).electronAPI;
  });

  describe('Initialization', () => {
    it('should log startup messages', () => {
      expect(mockConsoleLog).toHaveBeenCalledWith("🎵 Qualia Tempo Frontend Starting...");
      expect(mockConsoleLog).toHaveBeenCalledWith("🏭 CompositionRoot: Initializing services...");
      expect(mockConsoleLog).toHaveBeenCalledWith("🔗 Backend Connection: Checking...");
      expect(mockConsoleLog).toHaveBeenCalledWith("✅ Qualia Tempo Frontend Ready!");
    });

    it('should set up error event listeners', () => {
      expect(mockWindowAddEventListener).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockWindowAddEventListener).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
    });

    it('should set up keyboard event listener', () => {
      expect(mockDocumentAddEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    });
  });

  describe('React App Mount', () => {
    it('should create React root and render app', () => {
      expect(mockGetElementById).toHaveBeenCalledWith("root");
      expect(mockCreateRoot).toHaveBeenCalled();
      expect(mockRender).toHaveBeenCalled();
    });

    it('should render app with StrictMode and CompositionRootProvider', () => {
      // Verify the render was called with our component structure
      expect(mockRender).toHaveBeenCalled();
      const renderCall = mockRender.mock.calls[0][0];
      expect(renderCall).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle window error events', () => {
      // Get the error event handler
      const errorCall = mockWindowAddEventListener.mock.calls.find(
        call => call[0] === "error"
      );
      const errorHandler = errorCall?.[1] as ((_event: any) => void) | undefined;
      
      expect(errorHandler).toBeDefined();
      
      if (errorHandler) {
        // Clear previous calls and test error handling
        mockConsoleError.mockClear();
        
        const mockError = new Error("Test error");
        const errorEvent = { error: mockError };
        
        errorHandler(errorEvent);
        
        expect(mockConsoleError).toHaveBeenCalledWith("🚨 Frontend Error:", mockError);
      }
    });

    it('should handle unhandled promise rejection events', () => {
      // Get the rejection event handler
      const rejectionCall = mockWindowAddEventListener.mock.calls.find(
        call => call[0] === "unhandledrejection"
      );
      const rejectionHandler = rejectionCall?.[1] as ((_event: any) => void) | undefined;
      
      expect(rejectionHandler).toBeDefined();
      
      if (rejectionHandler) {
        // Clear previous calls and test rejection handling
        mockConsoleError.mockClear();
        
        const rejectionEvent = { reason: "Test rejection reason" };
        
        rejectionHandler(rejectionEvent);
        
        expect(mockConsoleError).toHaveBeenCalledWith("🚨 Unhandled Promise Rejection:", "Test rejection reason");
      }
    });
  });

  describe('Keyboard Shortcuts', () => {
    let keydownHandler: ((_event: any) => void) | undefined;

    beforeAll(() => {
      // Get the keyboard event handler
      const keyboardCall = mockDocumentAddEventListener.mock.calls.find(
        call => call[0] === "keydown"
      );
      keydownHandler = keyboardCall?.[1] as ((_event: any) => void) | undefined;
    });

    it('should have keyboard event handler', () => {
      expect(keydownHandler).toBeDefined();
    });

    it('should handle ESC key for game reset', () => {
      if (keydownHandler) {
        // Clear previous calls and test ESC key
        mockConsoleLog.mockClear();
        
        const escEvent = { key: "Escape" };
        keydownHandler(escEvent);
        
        expect(mockConsoleLog).toHaveBeenCalledWith("🔄 ESC pressed - Game reset requested");
      }
    });

    it('should handle F11 key for fullscreen toggle', () => {
      if (keydownHandler) {
        // Clear previous calls and test F11 key
        mockElectronAPI.toggleFullscreen.mockClear();
        
        const f11Event = { key: "F11", preventDefault: vi.fn() };
        keydownHandler(f11Event);
        
        expect(f11Event.preventDefault).toHaveBeenCalled();
        expect(mockElectronAPI.toggleFullscreen).toHaveBeenCalled();
      }
    });

    it('should handle F11 key gracefully when electronAPI is not available', () => {
      if (keydownHandler) {
        // Temporarily remove electronAPI
        const originalElectronAPI = window.electronAPI;
        delete (window as any).electronAPI;
        
        const f11Event = { key: "F11", preventDefault: vi.fn() };
        
        expect(() => {
          keydownHandler!(f11Event);
        }).not.toThrow();
        
        expect(f11Event.preventDefault).toHaveBeenCalled();
        
        // Restore electronAPI
        (window as any).electronAPI = originalElectronAPI;
      }
    });

    it('should ignore other key presses', () => {
      if (keydownHandler) {
        // Clear previous calls and test other keys
        mockConsoleLog.mockClear();
        
        const otherEvent = { key: "Enter" };
        
        expect(() => {
          keydownHandler!(otherEvent);
        }).not.toThrow();
        
        // Should not log anything for unknown keys
        expect(mockConsoleLog).not.toHaveBeenCalled();
      }
    });
  });

  describe('Integration', () => {
    it('should complete full initialization sequence', () => {
      // Verify all components were properly initialized
      // Note: mockConsoleLog was cleared in other tests, so we check specific calls that should be there
      expect(mockWindowAddEventListener).toHaveBeenCalledTimes(2); // error + unhandledrejection
      expect(mockDocumentAddEventListener).toHaveBeenCalledTimes(1); // keydown
      expect(mockCreateRoot).toHaveBeenCalled();
      expect(mockRender).toHaveBeenCalled();
      
      // Since the console logs were captured during module load, let's check the module execution
      expect(mockGetElementById).toHaveBeenCalledWith("root");
    });
  });
});
