/**
 * QUALIA.CODE v1.1 - Electron Preload Script
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

import { contextBridge, ipcRenderer } from 'electron';
import type { AudioSessionConfig } from '../src/services/contracts/IAudioSystemBridge.contracts';

/**
 * Window API Interface
 * Defines the shape of the API exposed to the renderer process.
 * This interface MUST match the declaration in AudioSystemBridge.ts
 */
interface WindowAPI {
  /**
   * Configure audio session in the main process
   * @param options - Audio session configuration
   * @returns Promise with success status and optional error message
   */
  setAudioSession: (options: AudioSessionConfig) => Promise<{ success: boolean; error?: string }>;

  /**
   * Toggle fullscreen mode
   * @returns Promise<boolean> - New fullscreen state
   */
  toggleFullscreen: () => Promise<boolean>;

  /**
   * Minimize the application window
   * @returns Promise<boolean> - Success status
   */
  minimizeWindow: () => Promise<boolean>;

  /**
   * Close the application window
   * @returns Promise<boolean> - Success status
   */
  closeWindow: () => Promise<boolean>;

  /**
   * Get current window state
   * @returns Promise with window state information
   */
  getWindowState: () => Promise<{
    isMaximized: boolean;
    isMinimized: boolean;
    isFullScreen: boolean;
    bounds: { x: number; y: number; width: number; height: number };
    isVisible: boolean;
    isFocused: boolean;
  }>;

  /**
   * Get performance information
   * @returns Promise with performance metrics
   */
  getPerformanceInfo: () => Promise<{
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
    gpu: number;
    zoom: number;
  }>;
}

/**
 * Expose secure API to renderer process via contextBridge
 *
 * QUALIA.CODE COMPLIANCE:
 * - Type-safe API definition (WindowAPI interface)
 * - No raw IPC exposure
 * - Minimal surface area (only necessary methods)
 * - Documented purpose for each method
 */
contextBridge.exposeInMainWorld('api', {
  // Audio Session Management
  setAudioSession: (options: AudioSessionConfig) => 
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
} as WindowAPI);

/**
 * Type augmentation for global Window object
 * This allows TypeScript to recognize window.api in the renderer process
 */
declare global {
  interface Window {
    api: WindowAPI;
  }
}
