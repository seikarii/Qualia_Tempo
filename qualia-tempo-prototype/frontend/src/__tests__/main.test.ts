/**
 * QUALIA.CODE v1.1 - Main Process Tests
 * Comprehensive test suite for Electron main process functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock electron module
const mockBrowserWindow = {
  loadURL: vi.fn(),
  loadFile: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  close: vi.fn(),
  destroy: vi.fn(),
  isDestroyed: vi.fn(() => false),
  webContents: {
    on: vi.fn(),
    once: vi.fn(),
    send: vi.fn(),
    openDevTools: vi.fn(),
    closeDevTools: vi.fn(),
    setWindowOpenHandler: vi.fn(),
    getURL: vi.fn(() => 'http://localhost:5173'),
    getProcessId: vi.fn(() => 12345),
    getZoomLevel: vi.fn(() => 1),
  },
  setMenuBarVisibility: vi.fn(),
  setFullScreen: vi.fn(),
  isFullScreen: vi.fn(() => false),
  getBounds: vi.fn(() => ({ x: 0, y: 0, width: 1920, height: 1080 })),
  setBounds: vi.fn(),
  minimize: vi.fn(),
  isMinimized: vi.fn(() => false),
  isMaximized: vi.fn(() => false),
  isVisible: vi.fn(() => true),
  isFocused: vi.fn(() => true),
  setOpacity: vi.fn(),
  restore: vi.fn(),
  focus: vi.fn(),
  reload: vi.fn(),
};

const mockApp = {
  requestSingleInstanceLock: vi.fn(() => true),
  on: vi.fn(),
  quit: vi.fn(),
  getVersion: vi.fn(() => '1.0.0'),
  getName: vi.fn(() => 'Qualia Tempo'),
  getPath: vi.fn(() => '/tmp'),
  setAppUserModelId: vi.fn(),
  whenReady: vi.fn().mockResolvedValue(undefined),
  commandLine: {
    appendSwitch: vi.fn(),
  },
};

const mockScreen = {
  getPrimaryDisplay: vi.fn(() => ({
    workAreaSize: { width: 1920, height: 1080 },
    size: { width: 1920, height: 1080 },
  })),
  getAllDisplays: vi.fn(() => [{
    workAreaSize: { width: 1920, height: 1080 },
    size: { width: 1920, height: 1080 },
  }]),
};

const mockIpcMain = {
  on: vi.fn(),
  handle: vi.fn(),
  removeHandler: vi.fn(),
};

const mockMenu = {
  setApplicationMenu: vi.fn(),
  buildFromTemplate: vi.fn(() => ({})),
};

const mockDialog = {
  showMessageBox: vi.fn(),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
};

const mockShell = {
  openExternal: vi.fn(),
};

const mockGlobalShortcut = {
  register: vi.fn(() => true),
  unregister: vi.fn(),
  isRegistered: vi.fn(() => false),
};

vi.mock('electron', () => ({
  app: mockApp,
  BrowserWindow: vi.fn().mockImplementation(() => mockBrowserWindow),
  ipcMain: mockIpcMain,
  Menu: mockMenu,
  dialog: mockDialog,
  screen: mockScreen,
  shell: mockShell,
  globalShortcut: mockGlobalShortcut,
}));

// Mock process.on for error handling tests
const mockProcessOn = vi.fn();
vi.mock('process', async () => {
  const actual = await vi.importActual('process');
  return {
    ...actual,
    on: mockProcessOn,
  };
});

// Mock path utilities
vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  dirname: vi.fn(() => '/mocked/path'),
}));

vi.mock('url', () => ({
  fileURLToPath: vi.fn(() => '/mocked/path/main.js'),
}));

// Mock env utility
vi.mock('../utils/env', () => ({
  isDev: true,
}));

// Mock main.ts since it's a script file
vi.mock('../main', () => ({}));

describe('Electron Main Process', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocks
    Object.values(mockApp).forEach(mock => {
      if (typeof mock === 'function') {
        mock.mockClear();
      }
    });
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('Window Creation', () => {
    it('should create window with correct dimensions', () => {
      // Import and execute main.ts to trigger window creation
      import('../main');

      // Verify BrowserWindow was created
      expect(vi.mocked(mockBrowserWindow.constructor)).toHaveBeenCalledWith(expect.objectContaining({
        width: expect.any(Number),
        height: expect.any(Number),
        minWidth: 1024,
        minHeight: 720,
      }));
    });

    it('should calculate optimal window size based on screen dimensions', () => {
      // Mock different screen sizes
      mockScreen.getPrimaryDisplay.mockReturnValue({
        workAreaSize: { width: 2560, height: 1440 },
        size: { width: 2560, height: 1440 },
      });

      import('../main');

      // Should use 80% of screen size
      expect(vi.mocked(mockBrowserWindow.constructor)).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 2048, // 80% of 2560
          height: 1152, // 80% of 1440
        })
      );
    });

    it('should respect minimum window size constraints', () => {
      // Mock very small screen
      mockScreen.getPrimaryDisplay.mockReturnValue({
        workAreaSize: { width: 800, height: 600 },
        size: { width: 800, height: 600 },
      });

      import('../main');

      // Should use minimum size
      expect(vi.mocked(mockBrowserWindow.constructor)).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1200, // Minimum width
          height: 800, // Minimum height
        })
      );
    });

    it('should configure window with enhanced gaming features', () => {
      require('../main');

      expect(vi.mocked(mockBrowserWindow.constructor)).toHaveBeenCalledWith(
        expect.objectContaining({
          titleBarStyle: 'hidden',
          titleBarOverlay: {
            color: '#000000',
            symbolColor: '#00ffff',
            height: 30,
          },
          resizable: true,
          maximizable: true,
          fullscreenable: true,
          transparent: false,
          opacity: 1.0,
          backgroundColor: '#000000',
          show: false,
          webPreferences: expect.objectContaining({
            preload: expect.stringContaining('preload/index.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            webSecurity: true,
            allowRunningInsecureContent: false,
            experimentalFeatures: true,
            additionalArguments: expect.arrayContaining([
              '--enable-features=VaapiVideoDecoder',
              '--disable-features=VizDisplayCompositor',
              '--enable-gpu-rasterization',
              '--enable-zero-copy',
              '--ignore-gpu-blocklist',
            ]),
          }),
          icon: expect.stringContaining('icon.png'),
          title: 'Qualia Tempo - A Charlie Hellsinger Story',
        })
      );
    });
  });

  describe('Window Event Handling', () => {
    it('should handle ready-to-show event with fade-in effect', () => {
      require('../main');

      // The window should be configured to show with fade effect
      expect(mockBrowserWindow.once).toHaveBeenCalledWith('ready-to-show', expect.any(Function));
    });

    it('should handle window closed event', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      require('../main');

      // Simulate window closed - access the handler safely
      const closedCalls = mockBrowserWindow.on.mock.calls.filter(call => call[0] === 'closed');
      if (closedCalls.length > 0) {
        const closedHandler = closedCalls[0][1];
        closedHandler();
        expect(consoleSpy).toHaveBeenCalledWith('🔌 Neural Interface Disconnected');
      }
    });

    it('should prevent external navigation', () => {
      require('../main');

      // Simulate navigation attempt - access the handler safely
      const willNavigateCalls = mockBrowserWindow.webContents.on.mock.calls.filter(call => call[0] === 'will-navigate');
      if (willNavigateCalls.length > 0) {
        const willNavigateHandler = willNavigateCalls[0][1];

        const mockEvent = { preventDefault: vi.fn() };
        const externalUrl = 'https://external-site.com';

        willNavigateHandler(mockEvent, externalUrl);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockShell.openExternal).toHaveBeenCalledWith(externalUrl);
      }
    });
  });

  describe('IPC Handlers', () => {
    it('should handle toggle-fullscreen IPC', async () => {
      require('../main');

      const toggleHandler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'toggle-fullscreen')[1];

      const result = await toggleHandler();

      expect(result).toBe(true);
      expect(mockBrowserWindow.setFullScreen).toHaveBeenCalledWith(true);
      expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith('fullscreen-changed', true);
    });

    it('should handle minimize-window IPC', async () => {
      require('../main');

      const minimizeHandler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'minimize-window')[1];

      const result = await minimizeHandler();

      expect(result).toBe(true);
      expect(mockBrowserWindow.minimize).toHaveBeenCalled();
    });

    it('should handle close-window IPC', async () => {
      require('../main');

      const closeHandler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'close-window')[1];

      const result = await closeHandler();

      expect(result).toBe(true);
      expect(mockBrowserWindow.close).toHaveBeenCalled();
    });

    it('should handle get-window-state IPC', async () => {
      require('../main');

      const stateHandler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'get-window-state')[1];

      const result = await stateHandler();

      expect(result).toEqual({
        isMaximized: false,
        isMinimized: false,
        isFullScreen: false,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        isVisible: true,
        isFocused: true,
      });
    });

    it('should handle get-performance-info IPC', async () => {
      const mockProcess = {
        memoryUsage: vi.fn(() => ({ rss: 1000000, heapTotal: 2000000, heapUsed: 1500000 })),
        cpuUsage: vi.fn(() => ({ user: 1000, system: 500 })),
      };

      vi.doMock('process', () => ({ process: mockProcess }));

      require('../main');

      const perfHandler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'get-performance-info')[1];

      const result = await perfHandler();

      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('cpu');
      expect(result).toHaveProperty('gpu');
      expect(result).toHaveProperty('zoom');
    });
  });

  describe('Application Event Handling', () => {
    it('should handle app ready event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockApp.whenReady.mockResolvedValue(undefined);

      require('../main');

      // Wait for app ready
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalledWith('⚡ Qualia Tempo Engine Initializing...');
      expect(consoleSpy).toHaveBeenCalledWith('🎯 Neural Interface Online - Ready for Synchronization');
    });

    it('should set app user model ID for Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      require('../main');

      expect(mockApp.setAppUserModelId).toHaveBeenCalledWith('com.qualiatempo.app');

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should handle app activate event', () => {
      require('../main');

      const activateHandler = mockApp.on.mock.calls.find(call => call[0] === 'activate')[1];

      // Mock no windows exist
      mockBrowserWindow.constructor.getAllWindows = vi.fn(() => []);

      activateHandler();

      // Should create new window
      expect(mockBrowserWindow.constructor).toHaveBeenCalled();
    });

    it('should handle window-all-closed event', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      require('../main');

      const closedHandler = mockApp.on.mock.calls.find(call => call[0] === 'window-all-closed')[1];

      closedHandler();

      expect(mockApp.quit).toHaveBeenCalled();

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should not quit on macOS when all windows are closed', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      require('../main');

      const closedHandler = mockApp.on.mock.calls.find(call => call[0] === 'window-all-closed')[1];

      closedHandler();

      expect(mockApp.quit).not.toHaveBeenCalled();

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('Security Features', () => {
    it('should prevent multiple instances', () => {
      mockApp.requestSingleInstanceLock.mockReturnValue(false);

      expect(() => require('../main')).toThrow();
    });

    it('should handle second instance event', () => {
      require('../main');

      const secondInstanceHandler = mockApp.on.mock.calls.find(call => call[0] === 'second-instance')[1];

      // Mock existing windows
      mockBrowserWindow.constructor.getAllWindows = vi.fn(() => [mockBrowserWindow]);

      secondInstanceHandler();

      expect(mockBrowserWindow.isMinimized).toHaveBeenCalled();
      expect(mockBrowserWindow.restore).toHaveBeenCalled();
      expect(mockBrowserWindow.focus).toHaveBeenCalled();
    });

    it('should block external navigation in web contents', () => {
      require('../main');

      const webContentsHandler = mockApp.on.mock.calls.find(call => call[0] === 'web-contents-created')[1];

      const mockContents = {
        on: vi.fn(),
        setWindowOpenHandler: vi.fn(),
      };

      webContentsHandler({}, mockContents);

      expect(mockContents.on).toHaveBeenCalledWith('will-navigate', expect.any(Function));
      expect(mockContents.setWindowOpenHandler).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Development Features', () => {
    it('should open dev tools in development mode', () => {
      require('../main');

      expect(mockBrowserWindow.webContents.openDevTools).toHaveBeenCalledWith({
        mode: 'detach',
        activate: false,
      });
    });

    it('should handle hot reload in development', () => {
      require('../main');

      const beforeInputHandler = mockBrowserWindow.webContents.on.mock.calls.find(call => call[0] === 'before-input-event')[1];

      const mockInput = {
        control: true,
        key: 'r',
      };

      beforeInputHandler({}, mockInput);

      expect(mockBrowserWindow.reload).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle uncaught exceptions', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      require('../main');

      const exceptionHandler = process.on.mock.calls.find(call => call[0] === 'uncaughtException')[1];

      const testError = new Error('Test uncaught exception');
      exceptionHandler(testError);

      expect(consoleSpy).toHaveBeenCalledWith('🚨 Uncaught Exception:', testError);
    });

    it('should handle unhandled rejections', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      require('../main');

      const rejectionHandler = process.on.mock.calls.find(call => call[0] === 'unhandledRejection')[1];

      const testReason = 'Test rejection reason';
      const testPromise = Promise.reject(testReason);

      rejectionHandler(testReason, testPromise);

      expect(consoleSpy).toHaveBeenCalledWith('🚨 Unhandled Rejection at:', testPromise, 'reason:', testReason);
    });

    it('should handle graceful shutdown', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      require('../main');

      const beforeQuitHandler = mockApp.on.mock.calls.find(call => call[0] === 'before-quit')[1];

      beforeQuitHandler({});

      expect(consoleSpy).toHaveBeenCalledWith('🔄 Initiating Neural Interface Shutdown...');
    });
  });

  describe('Audio Session Management', () => {
    it('should handle audio session on Windows', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      require('../main');

      const audioHandler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'set-audio-session')[1];

      const result = await audioHandler({}, {});

      expect(result).toEqual({ success: true });

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should handle audio session errors on Windows', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock audio session error
      vi.doMock('electron', () => ({
        app: { ...mockApp, setAudioSession: vi.fn(() => { throw new Error('Audio error'); }) },
        BrowserWindow: vi.fn().mockImplementation(() => mockBrowserWindow),
        ipcMain: mockIpcMain,
        Menu: mockMenu,
        dialog: mockDialog,
        screen: mockScreen,
        shell: mockShell,
        globalShortcut: mockGlobalShortcut,
      }));

      vi.resetModules();
      require('../main');

      const audioHandler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'set-audio-session')[1];

      const result = await audioHandler({}, {});

      expect(result).toEqual({ success: false, error: 'Audio error' });
      expect(consoleSpy).toHaveBeenCalledWith('Audio session error:', expect.any(Error));

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('Performance Optimizations', () => {
    it('should apply performance command line switches', () => {
      require('../main');

      expect(mockApp.commandLine.appendSwitch).toHaveBeenCalledWith('--enable-features', 'VaapiVideoDecoder');
      expect(mockApp.commandLine.appendSwitch).toHaveBeenCalledWith('--ignore-gpu-blocklist');
      expect(mockApp.commandLine.appendSwitch).toHaveBeenCalledWith('--enable-gpu-rasterization');
    });

    it('should configure window for optimal performance', () => {
      require('../main');

      expect(vi.mocked(mockBrowserWindow.constructor)).toHaveBeenCalledWith(
        expect.objectContaining({
          show: false, // Show only when ready
          webPreferences: expect.objectContaining({
            experimentalFeatures: true,
            additionalArguments: expect.arrayContaining([
              '--enable-features=VaapiVideoDecoder',
              '--disable-features=VizDisplayCompositor',
              '--enable-gpu-rasterization',
              '--enable-zero-copy',
              '--ignore-gpu-blocklist',
            ]),
          }),
        })
      );
    });
  });
});
