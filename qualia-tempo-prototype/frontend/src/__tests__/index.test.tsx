import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';

// Mock logger service
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock the services
vi.mock('../services/inversify.container', () => ({
  container: {
    get: vi.fn((type: symbol) => {
      if (type.toString().includes('ILogger')) {
        return mockLogger;
      }
      if (type.toString().includes('IApplicationInitializerService')) {
        return {
          start: vi.fn().mockResolvedValue(undefined)
        };
      }
      return {};
    }),
    bind: vi.fn().mockReturnThis(),
    to: vi.fn().mockReturnThis(),
    toConstantValue: vi.fn().mockReturnThis(),
    inSingletonScope: vi.fn().mockReturnThis(),
  }
}));

vi.mock('../services/Logger', () => ({
  LoggerProvider: {
    register: vi.fn()
  },
  QualiaLogger: vi.fn()
}));

// Mock ReactDOM createRoot
const mockRender = vi.fn();
const mockCreateRoot = vi.fn().mockReturnValue({
  render: mockRender
});

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: mockCreateRoot
  }
}));

// Mock React
vi.mock('react', async () => ({
  ...(await vi.importActual<typeof React>('react')),
  StrictMode: ({ children }: any) => children
}));

// Mock App component
vi.mock('../App', () => {
  return {
    default: function MockApp() {
      return React.createElement('div', { 'data-testid': 'mock-app' }, 'Mock App');
    }
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
  // NUEVO: Test de inicialización asíncrono
  it('should run the full initialization script on import', async () => {
    // Configure los mocks globales aquí, justo antes de la importación
    (document.getElementById as any) = mockGetElementById;
    (document.addEventListener as any) = mockDocumentAddEventListener;
    (window.addEventListener as any) = mockWindowAddEventListener;
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    });

    // Importe dinámicamente el módulo para ejecutarlo
    await import('../index');

    // Now, make the assertions that were in the separate tests
    expect(mockLogger.info).toHaveBeenCalledWith('Application Bootstrap: Initializing services...');
    expect(mockLogger.info).toHaveBeenCalledWith('Application Bootstrap: Initialization complete. Rendering application.');
    expect(mockGetElementById).toHaveBeenCalledWith("root");
    expect(mockCreateRoot).toHaveBeenCalled();
    expect(mockRender).toHaveBeenCalled();
    expect(mockWindowAddEventListener).toHaveBeenCalledWith("error", expect.any(Function));
    expect(mockWindowAddEventListener).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
    expect(mockDocumentAddEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
  });
});
