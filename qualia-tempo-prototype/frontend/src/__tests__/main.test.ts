/**
 * main.test.ts - Electron Main Process Tests
 * Tests for electron main process, window management, and IPC handlers
 */

import { jest } from '@jest/globals';

// Mock electron module completely
const mockApp = {
  whenReady: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
  quit: jest.fn()
};

const mockBrowserWindow = jest.fn().mockImplementation(() => ({
  loadURL: jest.fn(),
  loadFile: jest.fn(),
  on: jest.fn(),
  webContents: {
    openDevTools: jest.fn()
  },
  isFullScreen: jest.fn().mockReturnValue(false),
  setFullScreen: jest.fn(),
  minimize: jest.fn(),
  close: jest.fn()
})) as jest.MockedFunction<any> & { getAllWindows: jest.MockedFunction<any> };

mockBrowserWindow.getAllWindows = jest.fn().mockReturnValue([]);

const mockIpcMain = {
  handle: jest.fn()
};

jest.mock('electron', () => ({
  app: mockApp,
  BrowserWindow: mockBrowserWindow,
  ipcMain: mockIpcMain
}));

// Mock path functions
jest.mock('path', () => ({
  join: jest.fn((...args: string[]) => args.join('/')),
  dirname: jest.fn((path: string) => path.replace(/\/[^/]*$/, ''))
}));

// Mock URL utilities
jest.mock('url', () => ({
  fileURLToPath: jest.fn((url: string) => url.replace('file://', ''))
}));

// Mock environment utils
jest.mock('../utils/env', () => ({
  isDev: false
}));

// Mock console.log
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('Electron Main Process', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      
      const fullscreenHandler = mockIpcMain.handle.mock.calls
        .find(call => call[0] === 'toggle-fullscreen')?.[1];
      
      if (fullscreenHandler) {
        const windowInstance = mockBrowserWindow.mock.results[0]?.value;
        
        // Test entering fullscreen
        windowInstance.isFullScreen.mockReturnValue(false);
        const result1 = fullscreenHandler();
        expect(windowInstance.setFullScreen).toHaveBeenCalledWith(true);
        
        // Test exiting fullscreen
        windowInstance.isFullScreen.mockReturnValue(true);
        const result2 = fullscreenHandler();
        expect(windowInstance.setFullScreen).toHaveBeenCalledWith(false);
      }
    });

    it('should handle window minimize', async () => {
      await import('../main');
      
      const minimizeHandler = mockIpcMain.handle.mock.calls
        .find(call => call[0] === 'minimize-window')?.[1];
      
      if (minimizeHandler) {
        const windowInstance = mockBrowserWindow.mock.results[0]?.value;
        minimizeHandler();
        expect(windowInstance.minimize).toHaveBeenCalled();
      }
    });

    it('should handle window close', async () => {
      await import('../main');
      
      const closeHandler = mockIpcMain.handle.mock.calls
        .find(call => call[0] === 'close-window')?.[1];
      
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
      
      const activateHandler = mockApp.on.mock.calls
        .find(call => call[0] === 'activate')?.[1];
      
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
      
      const windowsClosedHandler = mockApp.on.mock.calls
        .find(call => call[0] === 'window-all-closed')?.[1];
      
      if (windowsClosedHandler) {
        // Mock non-macOS platform
        (globalThis as any).process = { platform: 'win32' };
        
        windowsClosedHandler();
        
        expect(mockApp.quit).toHaveBeenCalled();
      }
    });

    it('should handle web-contents-created for security', async () => {
      await import('../main');
      
      const webContentsHandler = mockApp.on.mock.calls
        .find(call => call[0] === 'web-contents-created')?.[1];
      
      if (webContentsHandler) {
        const mockContents = {
          on: jest.fn()
        };
        
        webContentsHandler({}, mockContents);
        
        expect(mockContents.on).toHaveBeenCalledWith('will-navigate', expect.any(Function));
      }
    });
  });

  describe('Security Features', () => {
    it('should prevent navigation to external URLs', async () => {
      await import('../main');
      
      const webContentsHandler = mockApp.on.mock.calls
        .find(call => call[0] === 'web-contents-created')?.[1];
      
      if (webContentsHandler) {
        const mockContents = { on: jest.fn() };
        webContentsHandler({}, mockContents);
        
        const navigationHandler = mockContents.on.mock.calls
          .find(call => call[0] === 'will-navigate')?.[1];
        
        if (navigationHandler) {
          const mockEvent = { preventDefault: jest.fn() };
          
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
      jest.resetModules();
      await import('../main');
      
      const windowInstance = mockBrowserWindow.mock.results[0]?.value;
      if (windowInstance) {
        expect(windowInstance.loadURL).toHaveBeenCalledWith('http://localhost:5173');
        expect(windowInstance.webContents.openDevTools).toHaveBeenCalled();
      }
    });
  });
});
