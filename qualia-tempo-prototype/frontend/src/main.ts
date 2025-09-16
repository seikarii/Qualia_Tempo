/// <reference types="node" />
import { app, BrowserWindow, ipcMain } from "electron";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { isDev } from "./utils/env";

const __dirname = dirname(fileURLToPath(import.meta.url));

const createWindow = (): void => {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    height: 900,
    width: 1600,
    minHeight: 600,
    minWidth: 800,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: "hidden",
    title: "Qualia Tempo - A Charlie Hellsinger Story",
    icon: join(__dirname, "../assets/icon.png"), // Optional: Add icon later
  });

  // Load the app
  if (isDev && (globalThis as any).process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(
      (globalThis as any).process.env["ELECTRON_RENDERER_URL"],
    );
  } else {
    mainWindow.loadFile(join(__dirname, "../index.html"));
  }

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window events
  mainWindow.on("closed", () => {
    // Dereference the window object
  });

  // Handle fullscreen toggle
  ipcMain.handle("toggle-fullscreen", () => {
    if (mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
    } else {
      mainWindow.setFullScreen(true);
    }
    return mainWindow.isFullScreen();
  });

  // Handle window minimize
  ipcMain.handle("minimize-window", () => {
    mainWindow.minimize();
  });

  // Handle window close
  ipcMain.handle("close-window", () => {
    mainWindow.close();
  });
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    // On macOS, re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if ((globalThis as any).process.platform !== "darwin") app.quit();
});

// Security: Prevent navigation to external websites
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (
      parsedUrl.origin !== "http://localhost:5173" &&
      parsedUrl.origin !== "http://localhost:8000"
    ) {
      event.preventDefault();
    }
  });
});

console.log("🚀 Qualia Tempo Electron Main Process Started");
