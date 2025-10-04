/**
 * QUALIA.CODE v1.1 - Electron Preload Script (JavaScript)
 * Security-conscious bridge between renderer and main process.
 *
 * SECURITY MODEL:
 * - contextIsolation: true (sandboxed renderer)
 * - nodeIntegration: false (no Node.js in renderer)
 * - Selective IPC exposure via contextBridge
 *
 * ARCHITECTURAL PURPOSE:
 * This preload script exposes a minimal, type-safe API to the renderer process
 * for communication with the Electron main process. It follows the principle
 * of least privilege by only exposing necessary functionality.
 *
 * CRITICAL: This file runs in a privileged context with access to Node.js APIs.
 * Never expose raw ipcRenderer or other powerful APIs to the renderer.
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose secure API to renderer process via contextBridge
 *
 * QUALIA.CODE COMPLIANCE:
 * - Type-safe API definition (WindowAPI interface in TypeScript)
 * - No raw IPC exposure
 * - Minimal surface area (only necessary methods)
 * - Documented purpose for each method
 */
contextBridge.exposeInMainWorld('api', {
  // Audio Session Management
  setAudioSession: (options) => 
    ipcRenderer.invoke('set-audio-session', options),

  // Window Control
  toggleFullscreen: () => 
    ipcRenderer.invoke('toggle-fullscreen'),
  
  minimizeWindow: () => 
    ipcRenderer.invoke('minimize-window'),
  
  closeWindow: () => 
    ipcRenderer.invoke('close-window'),
  
  getWindowState: () => 
    ipcRenderer.invoke('get-window-state'),
  
  // Performance Monitoring
  getPerformanceInfo: () => 
    ipcRenderer.invoke('get-performance-info'),
});
