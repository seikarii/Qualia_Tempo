/**
 * QUALIA.CODE v1.1 - Audio System Bridge Implementation
 * Concrete implementation of audio session management for Electron.
 *
 * ARCHITECTURAL COMPLIANCE:
 * ✅ Direct Configuration Injection (AudioSessionConfig injected in constructor)
 * ✅ Platform Abstraction (@BrowserOnly decorator for Electron APIs)
 * ✅ Error Handling (@catchError decorator)
 * ✅ Logging (@logMethod decorator)
 * ✅ Dependency Injection (@injectable and @inject decorators)
 *
 * CRITICAL DEPENDENCIES:
 * - AudioSessionConfig: Direct configuration injection (NO IConfigurationService)
 * - ILogger: For structured logging
 * - window.api: Exposed by Electron preload script
 *
 * EXECUTION FLOW:
 * 1. Service instantiated by IoC container with config injected
 * 2. GameControllerService calls initializeAudioSession() on game start
 * 3. Config is sent to Electron main process via IPC
 * 4. Main process applies audio session settings
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IAudioSystemBridge } from './interfaces/IAudioSystemBridge';
import type { AudioSessionConfig } from './contracts/IAudioSystemBridge.contracts';
import type { ILogger } from './interfaces/ILogger';
import { logMethod, catchError, BrowserOnly } from '../utils/decorators';

/**
 * Augment Window interface to include Electron IPC API
 * This is set by the preload script in Electron apps.
 */
declare global {
  interface Window {
    api?: {
      setAudioSession: (_options: AudioSessionConfig) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

/**
 * AudioSystemBridge: Bridges renderer process to Electron main process for audio configuration
 *
 * DESIGN PATTERN: Bridge + Adapter
 * - Abstracts Electron IPC communication
 * - Adapts AudioSessionConfig to Electron API
 * - Provides testing seam through interface
 */
@injectable()
export class AudioSystemBridge implements IAudioSystemBridge {
  private readonly config: AudioSessionConfig;
  private readonly logger: ILogger;

  /**
   * Constructor with Direct Configuration Injection
   *
   * QUALIA.CODE COMPLIANCE: This constructor follows the Direct Configuration
   * Injection pattern. The config is injected directly as a typed object,
   * NOT via IConfigurationService (Service Locator anti-pattern).
   *
   * @param config - Audio session configuration (injected from YAML via IoC)
   * @param logger - Logger for structured logging
   */
  constructor(
    @inject(TYPES.AudioSessionConfig) _config: AudioSessionConfig,
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.config = _config;
    this.logger = logger;
    this.logger.info('🔊 [AudioSystemBridge] Initialized with audio session config', {
      category: this.config.category,
      mode: this.config.mode,
      priority: this.config.priority,
      enabled: this.config.enabled
    });
  }

  /**
   * Initialize audio session with Electron main process
   *
   * CRITICAL EXECUTION CONSTRAINTS:
   * 1. Must be called AFTER user gesture (autoplay policy compliance)
   * 2. Only executes in Electron environment (window.api must exist)
   * 3. Respects config.enabled flag (allows disabling via YAML)
   *
   * ERROR HANDLING:
   * - Missing window.api: Logs warning, does not throw (allows non-Electron testing)
   * - Disabled config: Logs info, skips execution
   * - IPC failure: Logs error with details, throws for caller to handle
   *
   * @returns Promise<void> - Resolves when audio session is configured
   * @throws Error if IPC call fails or returns error
   */
  @logMethod
  @catchError
  @BrowserOnly
  public async initializeAudioSession(): Promise<void> {
    // Check if audio session configuration is enabled
    if (!this.config.enabled) {
      this.logger.info('🔇 [AudioSystemBridge] Audio session configuration is disabled in config');
      return;
    }

    // Check if we're in an Electron environment
    if (!window?.api?.setAudioSession) {
      this.logger.warn('⚠️ [AudioSystemBridge] Electron IPC not available - skipping audio session configuration');
      return;
    }

    this.logger.info('🔊 [AudioSystemBridge] Initializing audio session...', {
      category: this.config.category,
      mode: this.config.mode,
      priority: this.config.priority
    });

    try {
      // Send configuration to Electron main process
      const result = await window.api.setAudioSession(this.config);

      if (!result.success) {
        const errorMessage = result.error ?? 'Unknown error';
        this.logger.error('❌ [AudioSystemBridge] Failed to set audio session', {
          error: errorMessage
        });
        throw new Error(`Audio session configuration failed: ${errorMessage}`);
      }

      this.logger.info('✅ [AudioSystemBridge] Audio session configured successfully');
    } catch (error) {
      this.logger.error('❌ [AudioSystemBridge] Exception during audio session initialization', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
