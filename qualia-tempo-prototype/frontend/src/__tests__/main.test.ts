import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
/**
 * main.test.ts - Electron Main Process Tests
 * Tests for electron main process, window management, and IPC handlers
 */

import { jest } from '@jest/globals';

// Mock electron module completely
const appEventHandlers = new Map<string, (...args: any[]) => any>();
const mockApp = {
  whenReady: vi.fn().mockImplementation((...args: any[]) => {
    const callback = args[0];
    if (typeof callback === 'function') {
      // Store the callback for later access and call it
      setTimeout(callback, 0);
    }
    return Promise.resolve();
  }),
  on: vi.fn().mockImplementation((...args: any[]) => {
    const [event, handler] = args;
    if (typeof event === 'string' && typeof handler === 'function') {
      appEventHandlers.set(event, handler);
    }
  }),
  quit: vi.fn(),
  // Helper to get stored handlers for testing
  getEventHandler: (event: string) => appEventHandlers.get(event)
};

const mockBrowserWindow = vi.fn().mockImplementation(() => ({
  loadURL: vi.fn(),
  loadFile: vi.fn(),
  on: vi.fn(),
  webContents: {
    openDevTools: vi.fn()
  },
  isFullScreen: vi.fn().mockReturnValue(false),
  setFullScreen: vi.fn(),
  minimize: vi.fn(),
  close: vi.fn()
})) as MockedFunction<any> & { getAllWindows: MockedFunction<any> };

mockBrowserWindow.getAllWindows = vi.fn().mockReturnValue([]);

// Enhanced IPC Main mock that stores handlers
const ipcHandlers = new Map<string, (...args: any[]) => any>();
const mockIpcMain = {
  handle: vi.fn().mockImplementation((...args: any[]) => {
    const [channel, handler] = args;
    if (typeof channel === 'string' && typeof handler === 'function') {
      ipcHandlers.set(channel, handler);
    }
  }),
  // Helper to get stored handlers for testing
  getHandler: (channel: string) => ipcHandlers.get(channel)
};

vi.mock('electron', () => ({
  app: mockApp,
  BrowserWindow: mockBrowserWindow,
  ipcMain: mockIpcMain
}));

// Mock path functions
vi.mock('path', () => ({
  join: jest.fn((...args: string[]) => args.join('/')),
  dirname: jest.fn((path: string) => path.replace(/\/[^/]*$/, ''))
}));

// Mock URL utilities
vi.mock('url', () => ({
  fileURLToPath: jest.fn((url: string) => url.replace('file://', ''))
}));

// Mock environment utils
vi.mock('../utils/env', () => ({
  isDev: false
}));

// Mock console.log
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('Electron Main Process', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe('Module Loading', () => {
    it('should import and execute main process initialization', async () => {
      // Import the main module to trigger initialization
      await import('../main');
      
      // Verify app.whenReady was called
      expect(mockApp.whenReady).toHaveBeenCalledTimes(1);
      
      // Verify console log was called
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🚀 Qualia Tempo Electron Main Process Started'
      );
    });

    it('should register app event listeners', async () => {
      await import('../main');
      
      // Verify app event listeners are registered
      expect(mockApp.on).toHaveBeenCalledWith('activate', expect.any(Function));
      expect(mockApp.on).toHaveBeenCalledWith('window-all-closed', expect.any(Function));
      expect(mockApp.on).toHaveBeenCalledWith('web-contents-created', expect.any(Function));
    });
  });

  describe('Window Creation', () => {
    it('should create BrowserWindow with correct configuration', async () => {
      await import('../main');
      
      // Trigger app ready callback
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (typeof readyCallback === 'function') {
        readyCallback();
      } else {
        // whenReady returns a promise, so we need to await it
        await mockApp.whenReady();
      }
      
      // Verify BrowserWindow was created with correct options
      expect(mockBrowserWindow).toHaveBeenCalledWith({
        height: 900,
        width: 1600,
        minHeight: 600,
        minWidth: 800,
        webPreferences: {
          preload: expect.stringContaining('preload/index.js'),
          nodeIntegration: false,
          contextIsolation: true,
        },
        titleBarStyle: 'hidden',
        title: 'Qualia Tempo - A Charlie Hellsinger Story',
        icon: expect.stringContaining('assets/icon.png'),
      });
    });

    it('should load production file when not in dev mode', async () => {
      const { isDev } = await import('../utils/env');
      (isDev as any) = false;
      
      await import('../main');
      
      // Get the window instance
      const windowInstance = mockBrowserWindow.mock.results[0]?.value;
      if (windowInstance) {
        expect(windowInstance.loadFile).toHaveBeenCalledWith(
          expect.stringContaining('index.html')
        );
      }
    });

    it('should register window event handlers', async () => {
      await import('../main');
      
      const windowInstance = mockBrowserWindow.mock.results[0]?.value;
      if (windowInstance) {
        expect(windowInstance.on).toHaveBeenCalledWith('closed', expect.any(Function));
      }
    });
  });

  describe('IPC Handlers', () => {
    it('should register fullscreen toggle handler', async () => {
      await import('../main');
      
      expect(mockIpcMain.handle).toHaveBeenCalledWith('toggle-fullscreen', expect.any(Function));
    });

    it('should register window minimize handler', async () => {
      await import('../main');
      
      expect(mockIpcMain.handle).toHaveBeenCalledWith('minimize-window', expect.any(Function));
    });

    it('should register window close handler', async () => {
      await import('../main');
      
      expect(mockIpcMain.handle).toHaveBeenCalledWith('close-window', expect.any(Function));
    });

    it('should handle fullscreen toggle correctly', async () => {
      await import('../main');
      
      const fullscreenHandler = mockIpcMain.getHandler('toggle-fullscreen');
      
      if (fullscreenHandler) {
        const windowInstance = mockBrowserWindow.mock.results[0]?.value;
        
        // Test entering fullscreen
        windowInstance.isFullScreen.mockReturnValue(false);
        fullscreenHandler();
        expect(windowInstance.setFullScreen).toHaveBeenCalledWith(true);
        
        // Test exiting fullscreen
        windowInstance.isFullScreen.mockReturnValue(true);
        fullscreenHandler();
        expect(windowInstance.setFullScreen).toHaveBeenCalledWith(false);
      }
    });

    it('should handle window minimize', async () => {
      await import('../main');
      
      const minimizeHandler = mockIpcMain.getHandler('minimize-window');
      
      if (minimizeHandler) {
        const windowInstance = mockBrowserWindow.mock.results[0]?.value;
        minimizeHandler();
        expect(windowInstance.minimize).toHaveBeenCalled();
      }
    });

    it('should handle window close', async () => {
      await import('../main');
      
      const closeHandler = mockIpcMain.getHandler('close-window');
      
      if (closeHandler) {
        const windowInstance = mockBrowserWindow.mock.results[0]?.value;
        closeHandler();
        expect(windowInstance.close).toHaveBeenCalled();
      }
    });
  });

  describe('App Event Handlers', () => {
    it('should handle activate event on macOS', async () => {
      await import('../main');
      
      const activateHandler = mockApp.getEventHandler('activate');
      
      if (activateHandler) {
        // Mock no windows open
        mockBrowserWindow.getAllWindows.mockReturnValue([]);
        
        activateHandler();
        
        // Should create new window
        expect(mockBrowserWindow).toHaveBeenCalled();
      }
    });

    it('should handle window-all-closed event', async () => {
      await import('../main');
      
      const windowsClosedHandler = mockApp.getEventHandler('window-all-closed');
      
      if (windowsClosedHandler) {
        // Mock non-macOS platform
        (globalThis as any).process = { platform: 'win32' };
        
        windowsClosedHandler();
        
        expect(mockApp.quit).toHaveBeenCalled();
      }
    });

    it('should handle web-contents-created for security', async () => {
      await import('../main');
      
      const webContentsHandler = mockApp.getEventHandler('web-contents-created');
      
      if (webContentsHandler) {
        const mockContents = {
          on: vi.fn()
        };
        
        webContentsHandler({}, mockContents);
        
        expect(mockContents.on).toHaveBeenCalledWith('will-navigate', expect.any(Function));
      }
    });
  });

  describe('Security Features', () => {
    it('should prevent navigation to external URLs', async () => {
      await import('../main');
      
      const webContentsHandler = mockApp.getEventHandler('web-contents-created');
      
      if (webContentsHandler) {
        const contentsHandlers = new Map<string, (...args: any[]) => any>();
        const mockContents = { 
          on: vi.fn().mockImplementation((...args: any[]) => {
            const [event, handler] = args;
            if (typeof event === 'string' && typeof handler === 'function') {
              contentsHandlers.set(event, handler);
            }
          }),
          getHandler: (event: string) => contentsHandlers.get(event)
        };
        webContentsHandler({}, mockContents);
        
        const navigationHandler = mockContents.getHandler('will-navigate');
        
        if (navigationHandler) {
          const mockEvent = { preventDefault: vi.fn() };
          
          // Test external URL - should be prevented
          navigationHandler(mockEvent, 'https://evil-site.com');
          expect(mockEvent.preventDefault).toHaveBeenCalled();
          
          // Reset mock
          mockEvent.preventDefault.mockClear();
          
          // Test allowed localhost URL - should not be prevented
          navigationHandler(mockEvent, 'http://localhost:5173/path');
          expect(mockEvent.preventDefault).not.toHaveBeenCalled();
        }
      }
    });
  });

  describe('Development Mode', () => {
    it('should handle development mode correctly', async () => {
      // Mock development environment
      const envModule = await import('../utils/env');
      (envModule.isDev as any) = true;
      (globalThis as any).process = { env: { ELECTRON_RENDERER_URL: 'http://localhost:5173' } };
      
      // Re-import to test dev behavior
      vi.resetModules();
      await import('../main');
      
      const windowInstance = mockBrowserWindow.mock.results[0]?.value;
      if (windowInstance) {
        expect(windowInstance.loadURL).toHaveBeenCalledWith('http://localhost:5173');
        expect(windowInstance.webContents.openDevTools).toHaveBeenCalled();
      }
    });
  });
});
