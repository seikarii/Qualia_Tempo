/// <reference types="node" />
import { app, BrowserWindow, ipcMain, screen, shell } from "electron";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { env } from "./utils/env";
import log from "electron-log";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Calculate optimal window dimensions based on screen size
 * QUALIA.CODE COMPLIANT: Extracted method pattern
 */
const calculateWindowDimensions = (): { width: number; height: number } => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } =
    primaryDisplay.workAreaSize;

  return {
    width: Math.max(Math.floor(screenWidth * 0.8), 1200),
    height: Math.max(Math.floor(screenHeight * 0.8), 800),
  };
};

/**
 * Create BrowserWindow configuration object
 * QUALIA.CODE COMPLIANT: Extracted method pattern
 */
const createBrowserWindowConfig = (
  windowWidth: number,
  windowHeight: number
): Electron.BrowserWindowConstructorOptions => {
  return {
    width: windowWidth,
    height: windowHeight,
    minWidth: 1024,
    minHeight: 720,
    center: true,

    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#000000",
      symbolColor: "#00ffff",
      height: 30,
    },

    resizable: true,
    maximizable: true,
    fullscreenable: true,

    transparent: false,
    opacity: 1.0,
    backgroundColor: "#000000",
    show: false,

    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: true,
      additionalArguments: [
        "--enable-features=VaapiVideoDecoder",
        "--disable-features=VizDisplayCompositor",
        "--enable-gpu-rasterization",
        "--enable-zero-copy",
        "--ignore-gpu-blocklist",
      ],
    },

    icon: join(__dirname, "../assets/icon.png"),
    title: "Qualia Tempo - A Charlie Hellsinger Story",
    vibrancy: "fullscreen-ui" as const,
    visualEffectState: "active",
  };
};

/**
 * Setup window fade-in animation
 * QUALIA.CODE COMPLIANT: Extracted method pattern
 */
const setupWindowFadeIn = (window: BrowserWindow): void => {
  window.setOpacity(0);
  let opacity = 0;
  
  const fadeIn = setInterval(() => {
    opacity += 0.05;
    if (opacity >= 1) {
      opacity = 1;
      clearInterval(fadeIn);
    }
    window.setOpacity(opacity);
  }, 16);
};

/**
 * Setup window event handlers
 * QUALIA.CODE COMPLIANT: Extracted method pattern
 */
const setupWindowEventHandlers = (window: BrowserWindow): void => {
  window.on("closed", () => {
    log.info("🔌 Neural Interface Disconnected");
  });

  window.webContents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const currentUrl = new URL(window.webContents.getURL());

    if (parsedUrl.origin !== currentUrl.origin) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
};

/**
 * Setup IPC handlers for window control
 * QUALIA.CODE COMPLIANT: Extracted method pattern
 */
const setupWindowIPCHandlers = (window: BrowserWindow): void => {
  ipcMain.handle("toggle-fullscreen", () => {
    const isFullScreen = window.isFullScreen();
    window.setFullScreen(!isFullScreen);
    window.webContents.send("fullscreen-changed", !isFullScreen);
    return !isFullScreen;
  });

  ipcMain.handle("minimize-window", () => {
    window.minimize();
    return true;
  });

  ipcMain.handle("close-window", () => {
    window.close();
    return true;
  });

  ipcMain.handle("get-window-state", () => ({
    isMaximized: window.isMaximized(),
    isMinimized: window.isMinimized(),
    isFullScreen: window.isFullScreen(),
    bounds: window.getBounds(),
    isVisible: window.isVisible(),
    isFocused: window.isFocused(),
  }));

  ipcMain.handle("get-performance-info", () => ({
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    gpu: window.webContents.getProcessId(),
    zoom: window.webContents.getZoomLevel(),
  }));

  if (process.platform === "win32") {
    ipcMain.handle("set-audio-session", (_, _options) => {
      try {
        if (_options) {
          // Placeholder for future audio session configuration
        }
        return { success: true };
      } catch (error) {
        log.error("Failed to set audio session:", error);
        return { success: false, error: (error as Error).message };
      }
    });
  }
};

/**
 * Load application URL based on environment
 * QUALIA.CODE COMPLIANT: Extracted method pattern
 */
const loadApplicationURL = (window: BrowserWindow): void => {
  interface GlobalWithProcess {
    process?: { env?: Record<string, string | undefined> };
  }
  const globalWithProcess = globalThis as unknown as GlobalWithProcess;
  
  if (env.isDev && globalWithProcess.process?.env?.["ELECTRON_RENDERER_URL"]) {
    window.loadURL(
      globalWithProcess.process.env["ELECTRON_RENDERER_URL"] as string,
    );
  } else {
    window.loadFile(join(__dirname, "../index.html"));
  }

  if (env.isDev) {
    window.webContents.openDevTools({
      mode: "detach",
      activate: false,
    });

    window.webContents.on("before-input-event", (_, input) => {
      if (input.control && input.key === "r") {
        window.reload();
      }
    });
  }
};

/**
 * Enhanced window configuration for modern gaming experience
 * QUALIA.CODE COMPLIANT: Orchestrator pattern with extracted methods
 */
const createWindow = (): BrowserWindow => {
  const { width, height } = calculateWindowDimensions();
  const config = createBrowserWindowConfig(width, height);
  const mainWindow = new BrowserWindow(config);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    setupWindowFadeIn(mainWindow);
    log.info("🎮 Qualia Tempo Window Ready - Neural Interface Activated");
  });

  loadApplicationURL(mainWindow);
  setupWindowEventHandlers(mainWindow);
  setupWindowIPCHandlers(mainWindow);

  return mainWindow;
};

// Application event handlers
app.whenReady().then(() => {
  log.info("⚡ Qualia Tempo Engine Initializing...");

  // Set app user model ID (Windows)
  if (process.platform === "win32") {
    app.setAppUserModelId("com.qualiatempo.app");
  }

  // Enhanced security settings
  app.on("web-contents-created", (_, contents) => {
    // Block navigation to external URLs
    contents.on("will-navigate", (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);

      if (
        parsedUrl.origin !== "http://localhost:5173" &&
        parsedUrl.origin !== "http://localhost:8000" &&
        !navigationUrl.startsWith("file://")
      ) {
        event.preventDefault();
        log.warn(`🚫 Blocked navigation to: ${navigationUrl}`);
      }
    });

    // Block new window creation
    contents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });
  });

  const mainWindow = createWindow();

  // macOS specific behavior
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Performance optimizations
  app.commandLine.appendSwitch("--enable-features", "VaapiVideoDecoder");
  app.commandLine.appendSwitch("--ignore-gpu-blocklist");
  app.commandLine.appendSwitch("--enable-gpu-rasterization");

  log.info("🎯 Neural Interface Online - Ready for Synchronization");
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Someone tried to run a second instance, focus our window instead
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const mainWindow = windows[0];
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Enhanced error handling
process.on("uncaughtException", (error) => {
  log.error("🚨 Uncaught Exception:", error);
  // Don't exit in development
  if (!env.isDev) {
    app.quit();
  }
});

process.on("unhandledRejection", (reason, promise) => {
  log.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
});

// Graceful shutdown
app.on("before-quit", (_) => {
  log.info("🔄 Initiating Neural Interface Shutdown...");
  // Perform cleanup operations here
});

log.info(
  "🚀 Qualia Tempo Electron Main Process Started - Neural Core Active",
);
