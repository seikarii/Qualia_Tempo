/// <reference types="node" />
import { app, BrowserWindow, ipcMain, screen, shell } from "electron";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { env } from "./utils/env";
import log from "electron-log";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Enhanced window configuration for modern gaming experience
const createWindow = (): BrowserWindow => {
  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } =
    primaryDisplay.workAreaSize;

  // Calculate optimal window size (80% of screen, minimum 1200x800)
  const windowWidth = Math.max(Math.floor(screenWidth * 0.8), 1200);
  const windowHeight = Math.max(Math.floor(screenHeight * 0.8), 800);

  // Create the main browser window with enhanced gaming features
  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 1024,
    minHeight: 720,
    center: true,

    // Enhanced visual settings
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#000000",
      symbolColor: "#00ffff",
      height: 30,
    },

    // Window behavior
    resizable: true,
    maximizable: true,
    fullscreenable: true,

    // Visual enhancements
    transparent: false,
    opacity: 1.0,
    backgroundColor: "#000000",

    // Performance optimizations
    show: false, // Show only when ready to prevent flash

    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,

      // Enhanced security and performance
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,

      // Graphics acceleration
      experimentalFeatures: true,

      // Audio enhancements - removed deprecated enableRemoteModule
      // enableRemoteModule: false, // DEPRECATED in newer Electron versions

      // Additional flags for better performance
      additionalArguments: [
        "--enable-features=VaapiVideoDecoder",
        "--disable-features=VizDisplayCompositor",
        "--enable-gpu-rasterization",
        "--enable-zero-copy",
        "--ignore-gpu-blocklist",
      ],
    },

    // Window styling
    icon: join(__dirname, "../assets/icon.png"),
    title: "Qualia Tempo - A Charlie Hellsinger Story",

    // macOS specific - use valid vibrancy value
    vibrancy: "fullscreen-ui" as const, // Type assertion for compatibility
    visualEffectState: "active",
  });

  // Enhanced window loading with splash effect
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    // Smooth fade-in effect
    mainWindow.setOpacity(0);

    let opacity = 0;
    const fadeIn = setInterval(() => {
      opacity += 0.05;
      if (opacity >= 1) {
        opacity = 1;
        clearInterval(fadeIn);
      }
      mainWindow.setOpacity(opacity);
    }, 16); // ~60fps

    log.info("🎮 Qualia Tempo Window Ready - Neural Interface Activated");
  });

  // Load the application
  if (env.isDev && (globalThis as Record<string, unknown>).process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(
      (globalThis as Record<string, unknown>).process.env["ELECTRON_RENDERER_URL"] as string,
    );
  } else {
    mainWindow.loadFile(join(__dirname, "../index.html"));
  }

  // Enhanced development tools
  if (env.isDev) {
    mainWindow.webContents.openDevTools({
      mode: "detach",
      activate: false,
    });

    // Hot reload support
    mainWindow.webContents.on("before-input-event", (_, input) => {
      if (input.control && input.key === "r") {
        mainWindow.reload();
      }
    });
  }

  // Window event handlers
  mainWindow.on("closed", () => {
    log.info("🔌 Neural Interface Disconnected");
  });

  // Prevent navigation to external sites (security)
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const currentUrl = new URL(mainWindow.webContents.getURL());

    if (parsedUrl.origin !== currentUrl.origin) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // Enhanced fullscreen handling with smooth transitions
  ipcMain.handle("toggle-fullscreen", () => {
    const isFullScreen = mainWindow.isFullScreen();

    if (isFullScreen) {
      // Exit fullscreen with fade effect
      mainWindow.setFullScreen(false);
    } else {
      // Enter fullscreen with preparation
      mainWindow.setFullScreen(true);
    }

    // Notify renderer of fullscreen state change
    mainWindow.webContents.send("fullscreen-changed", !isFullScreen);

    return !isFullScreen;
  });

  // Window control handlers
  ipcMain.handle("minimize-window", () => {
    mainWindow.minimize();
    return true;
  });

  ipcMain.handle("close-window", () => {
    mainWindow.close();
    return true;
  });

  // Enhanced window state management
  ipcMain.handle("get-window-state", () => {
    return {
      isMaximized: mainWindow.isMaximized(),
      isMinimized: mainWindow.isMinimized(),
      isFullScreen: mainWindow.isFullScreen(),
      bounds: mainWindow.getBounds(),
      isVisible: mainWindow.isVisible(),
      isFocused: mainWindow.isFocused(),
    };
  });

  // Performance monitoring
  ipcMain.handle("get-performance-info", () => {
    const webContents = mainWindow.webContents;
    return {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      gpu: webContents.getProcessId(),
      zoom: webContents.getZoomLevel(),
    };
  });

  // Audio session management (Windows)
  if (process.platform === "win32") {
    ipcMain.handle("set-audio-session", (_, _options) => {
      // Enhanced audio session handling for Windows
      try {
        // TODO: Implement Windows-specific audio session configuration
        // For now, return success as this is a placeholder
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
