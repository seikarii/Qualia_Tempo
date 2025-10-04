/**
 * QUALIA.CODE v1.1 - Audio System Bridge Interface
 * Bridge interface for audio session management in Electron.
 *
 * ARCHITECTURAL PURPOSE:
 * This service bridges the gap between the renderer process (React/TypeScript)
 * and the main process (Electron) for audio session configuration.
 *
 * PATTERN: Platform Abstraction Layer
 * - Encapsulates Electron IPC communication
 * - Allows testing without Electron environment
 * - Follows dependency injection principles
 *
 * USAGE:
 * Inject this service into components/services that need to configure
 * the audio session (typically GameControllerService on game start).
 */

/**
 * IAudioSystemBridge: Interface for managing Electron audio session configuration
 * 
 * This service is responsible for communicating with the Electron main process
 * to configure audio session properties on Windows.
 */
export interface IAudioSystemBridge {
  /**
   * Initialize the audio session with configured parameters.
   * 
   * This method sends the audio session configuration to the Electron main process
   * via IPC, which then applies the settings to the system audio session.
   * 
   * CRITICAL: This must be called after user interaction (click, keypress) to comply
   * with browser autoplay policies. Typically called from GameControllerService.startGame().
   * 
   * @returns Promise that resolves when audio session is configured
   * @throws Error if Electron IPC is not available or configuration fails
   * 
   * @example
   * ```typescript
   * // In GameControllerService
   * public async startGame(): Promise<void> {
   *   await this.audioSystemBridge.initializeAudioSession();
   *   // Continue with game initialization...
   * }
   * ```
   */
  initializeAudioSession(): Promise<void>;
}
