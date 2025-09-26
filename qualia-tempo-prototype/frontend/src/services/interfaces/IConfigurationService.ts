/**
 * QUALIA.CODE v1.1 - IConfigurationService Interface
 * External configuration management and loading interface.
 */

import type {
  QualiaCalculatorConfig,
  BackendSyncConfig,
  AudioServiceConfig,
  ErrorReportingConfig,
  RhythmicMovementConfig,
  NotificationServiceConfig,
} from "../ConfigurationService";

export interface IConfigurationService {
  /**
   * Load configuration from external YAML files.
   * @returns Promise that resolves when configuration is loaded
   */
  loadConfig(): Promise<void>;

  /**
   * Get the complete configuration object.
   * @returns The full configuration object
   */
  getConfig(): any;

  /**
   * Get game-specific configuration section.
   * @returns Game configuration object
   */
  getGameConfig(): any;

  /**
   * Get qualia calculation configuration.
   * @returns Qualia calculator configuration
   */
  getQualiaConfig(): QualiaCalculatorConfig;

  /**
   * Get backend synchronization configuration.
   * @returns Backend sync configuration
   */
  getBackendConfig(): BackendSyncConfig;

  /**
   * Get audio service configuration.
   * @returns Audio service configuration
   */
  getAudioConfig(): AudioServiceConfig;

  /**
   * Get error reporting configuration.
   * @returns Error reporting configuration
   */
  getErrorReportingConfig(): ErrorReportingConfig;

  /**
   * Get rhythmic movement configuration.
   * @returns Rhythmic movement configuration
   */
  getRhythmicMovementConfig(): RhythmicMovementConfig;

  /**
   * Get notification service configuration.
   * @returns Notification service configuration
   */
  getNotificationConfig(): NotificationServiceConfig;

  /**
   * Get HTTP service configuration.
   * @returns HTTP service configuration
   */
  getHttpConfig(): {
    defaultTimeout: number;
    maxRetries: number;
    retryDelay: number;
  };

  /**
   * Get visual effects configuration (qualia landing background, particles, bloom, etc.).
   * @returns Visual effects configuration
   */
  getVisualEffectsConfig(): any; // Use any here to avoid circular import; concrete typing done in implementation

  /**
   * Get a specific configuration section by name.
   * @param section The name of the configuration section
   * @returns The configuration section
   */
  getConfigSection<T>(section: string): T;

  /**
   * Check if configuration has been loaded.
   * @returns True if configuration is loaded and ready
   */
  isLoaded(): boolean;

  /**
   * Reload configuration from external sources.
   * @returns Promise that resolves when configuration is reloaded
   */
  reload(): Promise<void>;
}
