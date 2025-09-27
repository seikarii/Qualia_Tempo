/**
 * QUALIA.CODE v1.1 - ConfigurationService
 * Service responsible for loading and managing game configuration from YAML files.
 *
 * Architecture:
 * - Loads configuration from multiple external YAML files
 * - Provides type-safe configuration access to all services
 * - Integrates with BackendSyncService for runtime updates
 * - Supports configuration validation and defaults
 * - Follows Configuration-First Mandate: NO HARDCODED VALUES
 * - InversifyJS dependency injection support
 */

import { injectable, inject } from "inversify";
import type { IConfigurationService } from "./interfaces/IConfigurationService";
import type { IHttpService } from "./interfaces/IHttpService";
import type { ILogger } from "./interfaces/ILogger";
import { TYPES } from "./inversify.types";
import * as yaml from "js-yaml";
import { logMethod, catchError } from "../utils/decorators";

// === CONFIGURATION INTERFACES ===

// CompositionRoot Configuration
export interface CompositionRootConfig {
  autoStart: boolean;
  enableBackendSync: boolean;
  enableHealthMonitoring: boolean;
  healthCheckIntervalMs: number;
  retryInitializationOnError: boolean;
  maxInitializationRetries: number;
  serviceInitializationTimeoutMs: number;
  serviceShutdownTimeoutMs: number;
  enableServiceLifecycleLogging: boolean;
  enablePerformanceMonitoring: boolean;
  http: {
    defaultTimeout: number;
    maxRetries: number;
    retryDelay: number;
  };
}

// ErrorReporting Configuration
export interface ErrorReportingConfig {
  rateLimitWindow: number;
  maxErrorsPerWindow: number;
  batchSize: number;
  batchTimeout: number;
  maxRetentionTime: number;
  externalServiceUrl: string;
  retryAttempts: number;
  enableCompression: boolean;
  maxBatchSizeBytes: number;
  enableErrorFiltering: boolean;
  filterSensitiveData: boolean;
  allowedDomains: string[];
  cleanupInterval: number; // CRISALIDA.CODE: Explicit cleanup timer interval
}

// AudioService Configuration
export interface AudioServiceConfig {
  rhythmicFeedback: {
    perfect: { frequency: number; gain: number; duration: number };
    good: { frequency: number; gain: number; duration: number };
    miss: { frequency: number; gain: number; duration: number };
  };
  metronome: {
    frequency: number;
    gain: number;
    duration: number;
  };
  audioEngine: {
    sampleRate: number;
    channels: number;
    bufferSize: number;
  };
  entityVoices: {
    player: { baseFrequency: number; modulationRange: number };
    boss: { baseFrequency: number; modulationRange: number };
    environment: { baseFrequency: number; modulationRange: number };
  };
  enableAudioPooling: boolean;
  maxConcurrentSounds: number;
  audioFadeTime: number;
  volume: number; // Master volume setting
  enableSubtitles: boolean; // Subtitle support for accessibility
  soundEnabled: boolean; // Global sound enable/disable toggle
  musicEnabled: boolean; // Music enable/disable toggle
  muteDuringDevelopment: boolean; // Development mute setting
}

// RhythmicMovement Configuration - PURE DI TARGET
export interface RhythmicMovementConfig {
  bpm: number;
  perfectTiming: number;
  goodTiming: number;
  gridSize: number;
  slowdownFactor: number;
  slowdownDuration: number;
  keyThrottleMs: number; // CRISALIDA.CODE: Configuration-driven throttling
}

// QualiaCalculator Configuration
export interface QualiaCalculatorConfig {
  baseQualiaState: {
    intensity: number;
    precision: number;
    aggression: number;
    flow: number;
    chaos: number;
    recovery: number;
    transcendence: number;
  };
  performanceMultipliers: {
    perfectHit: number;
    goodHit: number;
    missHit: number;
    comboBonus: number;
  };
  decayRates: {
    intensity: number;
    precision: number;
    aggression: number;
    flow: number;
    chaos: number;
    recovery: number;
    transcendence: number;
  };
  thresholds: {
    highIntensity: number;
    lowPrecision: number;
    chaosThreshold: number;
    transcendenceThreshold: number;
  };
  comboSystem: {
    maxComboMultiplier: number;
    comboDecayTime: number;
    perfectComboBonus: number;
  };
  recoveryMechanics: {
    recoveryRate: number;
    maxRecovery: number;
    recoveryCooldown: number;
  };
  updateIntervalMs: number;
  historySize: number;
  // Additional properties used by QualiaStateCalculatorService
  hitNoteMultipliers: { intensity: number; precision: number; flow: number };
  missNoteMultipliers: { chaos: number; precision: number; flow: number };
  dashMultipliers: { aggression: number; intensity: number };
  fastForwardMultipliers: { aggression: number; intensity: number };
  rewindMultipliers: { recovery: number; precision: number };
  updateInterval: number; // Legacy property - mapped to updateIntervalMs
  intensityDecay: number;
  precisionDecay: number;
  aggressionDecay: number;
  flowDecay: number;
  chaosDecay: number;
  recoveryDecay: number;
  transcendenceDecay: number;
  transcendenceThresholds: {
    intensity: number;
    precision: number;
    flow: number;
  };
  minValue: number;
  maxValue: number;
}

// BackendSync Configuration
export interface BackendSyncConfig {
  api: {
    baseUrl: string;
    qualiaEndpoint: string;
    healthEndpoint: string;
    timeout: number;
  };
  streaming: {
    websocket: {
      url: string;
      maxReconnectAttempts: number;
      reconnectDelay: number;
      pingInterval: number;
      pingTimeout: number;
      connectionTimeout: number;
    };
  };
  sync: {
    throttleDelay: number;
    batchSize: number;
    maxRetries: number;
    retryDelay: number;
  };
  connection: {
    healthCheckInterval: number;
    connectionTimeout: number;
    maxFailedAttempts: number;
  };
  validation: {
    enableSchemaValidation: boolean;
    strictMode: boolean;
    logValidationErrors: boolean;
  };
  performance: {
    enableCompression: boolean;
    maxPayloadSize: number;
    enableBuffering: boolean;
    bufferFlushInterval: number;
  };
  errorHandling: {
    enableCircuitBreaker: boolean;
    circuitBreakerThreshold: number;
    circuitBreakerTimeout: number;
    enableFallbackMode: boolean;
  };
  messages: {
    backendNotConnected: string;
    serviceAlreadyRunning: string;
    serviceNotRunning: string;
    syncScheduled: string;
    sendingQualiaState: string;
    backendResponse: string;
    syncCompleted: string;
    syncFailed: string;
    healthCheck: string;
    backendHealthy: string;
    backendUnhealthy: string;
    healthCheckFailed: string;
    periodicHealthCheckFailed: string;
    serviceStarted: string;
    serviceStopped: string;
    startFailed: string;
    stopFailed: string;
    updateConfig: string;
    updateConfigFailed: string;
    forceSync: string;
    forceSyncCompleted: string;
    forceSyncFailed: string;
    circuitBreakerOpen: string;
    circuitBreakerClosed: string;
    fallbackMode: string;
    fallbackModeDisabled: string;
    connectionRestored: string;
    connectionLost: string;
    retryAttempt: string;
    maxRetriesExceeded: string;
    throttleActive: string;
    throttleInactive: string;
  };
}

// GameController Configuration
export interface GameControllerConfig {
  gameLifecycle: {
    autoStart: boolean;
    enablePause: boolean;
    enableReset: boolean;
    saveStateOnExit: boolean;
  };
  performance: {
    updateIntervalMs: number;
    maxFrameSkip: number;
    enableFrameRateLimiting: boolean;
  };
  stateManagement: {
    enableStateValidation: boolean;
    enableStatePersistence: boolean;
    stateSaveInterval: number;
    maxSaveSlots: number;
  };
  inputHandling: {
    enableInputBuffering: boolean;
    inputBufferSize: number;
    enableInputFiltering: boolean;
    inputDebounceMs: number;
  };
  scoring: {
    baseScorePerHit: number;
    comboMultiplier: number;
    maxComboMultiplier: number;
    scoreDecayRate: number;
  };
  health: {
    maxHealth: number;
    healthRegenRate: number;
    damageOnMiss: number;
    enableInvincibilityFrames: boolean;
    invincibilityDuration: number;
  };
  difficulty: {
    adaptiveDifficulty: boolean;
    difficultyIncreaseRate: number;
    maxDifficulty: number;
    minDifficulty: number;
  };
  events: {
    enableEventBuffering: boolean;
    maxEventQueueSize: number;
    eventProcessingInterval: number;
  };
  maxPlayers: number; // Maximum number of players supported
  enablePauseResume: boolean; // Enable pause/resume functionality
  enableGameStateValidation: boolean; // Enable game state validation
  enablePerformanceMonitoring: boolean; // Enable performance monitoring
  autoSaveEnabled: boolean; // Enable auto-save functionality
  autoSaveIntervalMs: number; // Auto-save interval
}

// DebugService Configuration
export interface DebugServiceConfig {
  logging: {
    enableConsoleOutput: boolean;
    enableFileOutput: boolean;
    logLevel: string;
    maxLogFiles: number;
    maxLogSize: number;
  };
  eventMonitoring: {
    enableEventLogging: boolean;
    enableEventMetrics: boolean;
    maxEventHistory: number;
    eventLogThrottle: number;
  };
  performance: {
    enablePerformanceTracking: boolean;
    enableMemoryMonitoring: boolean;
    enableFrameRateTracking: boolean;
    metricsUpdateInterval: number;
  };
  development: {
    enableDebugOverlay: boolean;
    enableCheats: boolean;
    enableHotReload: boolean;
    enableBreakpoints: boolean;
  };
  profiling: {
    enableProfiling: boolean;
    profileUpdateInterval: number;
    maxProfileSamples: number;
  };
  errorTracking: {
    enableErrorStackTraces: boolean;
    enableErrorReporting: boolean;
    maxErrorHistory: number;
  };
  network: {
    enableNetworkLogging: boolean;
    enableRequestMetrics: boolean;
    logRequestHeaders: boolean;
    logRequestBodies: boolean;
  };
  // QUALIA.CODE: Additional DebugService configuration properties
  maxSessionHistory?: number;
  maxEventHistory?: number;
  performanceMonitoringInterval?: number;
  aiAnalysisInterval?: number;
  enableAIAnalysis?: boolean;
  memoryCleanupThreshold?: number;
}

// NotificationService Configuration
export interface NotificationServiceConfig {
  display: {
    enableNotifications: boolean;
    maxVisibleNotifications: number;
    notificationDuration: number;
    enableAnimations: boolean;
    animationDuration: number;
  };
  positioning: {
    position: string;
    offsetX: number;
    offsetY: number;
    zIndex: number;
  };
  styling: {
    enableThemes: boolean;
    defaultTheme: string;
    enableCustomStyling: boolean;
    borderRadius: number;
    shadowEnabled: boolean;
  };
  sound: {
    enableNotificationSounds: boolean;
    defaultSoundVolume: number;
    enableSoundVariations: boolean;
  };
  types: {
    success: { duration: number; soundEnabled: boolean; color: string };
    error: { duration: number; soundEnabled: boolean; color: string };
    warning: { duration: number; soundEnabled: boolean; color: string };
    info: { duration: number; soundEnabled: boolean; color: string };
  };
  queue: {
    enableQueueing: boolean;
    maxQueueSize: number;
    queueProcessingInterval: number;
  };
  accessibility: {
    enableScreenReader: boolean;
    enableHighContrast: boolean;
    enableReducedMotion: boolean;
    enableKeyboardNavigation: boolean;
  };
  performance: {
    enablePooling: boolean;
    maxPoolSize: number;
    enableGarbageCollection: boolean;
    gcInterval: number;
  };
  maxNotifications: number; // Maximum concurrent notifications
  defaultDuration: number; // Default notification display duration
}

// Complete Configuration Interface
export interface FullGameConfig {
  compositionRoot: CompositionRootConfig;
  errorReporting: ErrorReportingConfig;
  audioService: AudioServiceConfig;
  qualiaCalculator: QualiaCalculatorConfig;
  backendSync: BackendSyncConfig;
  gameController: GameControllerConfig;
  debugService: DebugServiceConfig;
  notificationService: NotificationServiceConfig;
  rhythmicMovement: RhythmicMovementConfig;
  visualEffects?: VisualEffectsConfig; // NEW: Optional visual effects config (loaded if provided)
}

// === VISUAL EFFECTS CONFIGURATION (NEW) ===
export interface VisualEffectsConfig {
  particles: {
    count: number;
    minSize: number;
    maxSize: number;
    speed: number; // base speed magnitude
    drift: number; // directional drift factor
  };
  bloom: {
    intensity: number; // overall additive blending multiplier
    pulseSpeed: number; // seconds per bloom pulse cycle
  };
  gradients: {
    cycleDuration: number; // seconds for full gradient cycle
    layers: string[]; // CSS gradient definitions
  };
  noise: {
    enabled: boolean;
    opacity: number; // overlay opacity
    scale: number; // noise pattern scale
    speed: number; // animation speed
  };
  palette: string[]; // Qualia color palette
  aura: {
    rings: number; // number of concentric reactive rings
    rotationSpeed: number; // seconds per full rotation
    pulseDuration: number; // seconds per pulse
  };
}

/**
 * QUALIA.CODE v1.1 - ConfigurationService Implementation
 * Loads and manages configuration from multiple YAML files
 */
@injectable()
export class ConfigurationService implements IConfigurationService {
  private configBasePath: string;
  private loadedConfig: FullGameConfig | null = null;
  private logger: ILogger;
  private httpService: IHttpService;

  // Configuration files discovery - NO HARDCODING
  private configFileManifest: Record<string, string> = {};

  constructor(
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IHttpService) httpService: IHttpService,
    @inject(TYPES.ConfigBasePath) configBasePath: string,
    @inject(TYPES.ConfigManifest) configManifest: Record<string, string>,
  ) {
    this.logger = logger;
    this.httpService = httpService;
    this.configBasePath = configBasePath;

    // Accept configuration file manifest externally
    this.configFileManifest = configManifest;
  }



  /**
   * Load all configuration files from YAML
   * @returns Promise that resolves with the loaded configuration
   */


  @logMethod()
  @catchError()
  public async loadConfig(): Promise<FullGameConfig> {
    try {
      this.logger.info("Loading configuration from multiple YAML files...");

      // Load all configuration files in parallel
      const configPromises = Object.entries(this.configFileManifest).map(
        async ([key, path]) => {
          const fullPath = this.configBasePath + path;
          this.logger.debug(`Loading ${key} from ${fullPath}`);

          const yamlText = await this.httpService.get<string>(fullPath);
          return { key, config: yaml.load(yamlText) };
        },
      );

      const loadedConfigs = await Promise.all(configPromises);

      // Merge all configurations
      const mergedConfig: any = {};
      loadedConfigs.forEach(({ key, config }) => {
        mergedConfig[key] = config;
      });

      // Validate configuration
      this.validateConfig(mergedConfig as FullGameConfig);

      this.loadedConfig = mergedConfig as FullGameConfig;
      this.logger.info("All configurations loaded successfully");

      return this.loadedConfig;
    } catch (error) {
      this.logger.error("Failed to load configuration:", { error });
      throw error;
    }
  }

  /**
   * Get the complete configuration
   */
  @logMethod()
  public getConfig(): FullGameConfig {
    if (!this.loadedConfig) {
      throw new Error("Configuration not loaded. Call loadConfig() first.");
    }
    return this.loadedConfig;
  }

  /**
   * PURE DI: Get specific configuration section by key
   * Replaces all getRhythmicMovementConfig, getQualiaConfig, etc.
   */
  @logMethod()
  public getConfigSection<T>(sectionKey: keyof FullGameConfig): T {
    if (!this.loadedConfig) {
      throw new Error("Configuration not loaded. Call loadConfig() first.");
    }

    const section = this.loadedConfig[sectionKey];
    if (!section) {
      throw new Error(`Configuration section '${sectionKey}' not found.`);
    }

    return section as T;
  }

  /**
   * Validate configuration structure and values
   */
  private validateConfig(config: FullGameConfig): void {
    // Validate CompositionRoot config
    if (typeof config.compositionRoot?.autoStart !== "boolean") {
      throw new Error("Invalid compositionRoot.autoStart configuration");
    }

    // Validate ErrorReporting config
    if (typeof config.errorReporting?.rateLimitWindow !== "number") {
      throw new Error("Invalid errorReporting.rateLimitWindow configuration");
    }

    // Validate AudioService config
    if (!config.audioService?.rhythmicFeedback?.perfect?.frequency) {
      throw new Error("Invalid audioService.rhythmicFeedback configuration");
    }

    // Validate QualiaCalculator config
    if (!config.qualiaCalculator?.baseQualiaState) {
      throw new Error("Invalid qualiaCalculator.baseQualiaState configuration");
    }

    // Validate BackendSync config
    if (!config.backendSync?.api?.baseUrl) {
      throw new Error("Invalid backendSync.api.baseUrl configuration");
    }

    // Validate GameController config
    if (typeof config.gameController?.gameLifecycle?.autoStart !== "boolean") {
      throw new Error("Invalid gameController.gameLifecycle configuration");
    }

    // Validate DebugService config
    if (!config.debugService?.logging?.logLevel) {
      throw new Error("Invalid debugService.logging configuration");
    }

    // Validate NotificationService config
    if (
      typeof config.notificationService?.display?.enableNotifications !==
      "boolean"
    ) {
      throw new Error("Invalid notificationService.display configuration");
    }

    this.logger.info("✅ [Config] Configuration validation passed");
  }

  /**
   * Get game-specific configuration section.
   * @returns Game configuration object
   */
  @logMethod()
  public getGameConfig(): any {
    return this.getConfigSection("gameController");
  }

  /**
   * Get qualia calculation configuration.
   * @returns Qualia calculator configuration
   */
  @logMethod()
  public getQualiaConfig(): QualiaCalculatorConfig {
    return this.getConfigSection<QualiaCalculatorConfig>("qualiaCalculator");
  }

  /**
   * Get backend synchronization configuration.
   * @returns Backend sync configuration
   */
  @logMethod()
  public getBackendConfig(): BackendSyncConfig {
    return this.getConfigSection<BackendSyncConfig>("backendSync");
  }

  /**
   * Get audio service configuration.
   * @returns Audio service configuration
   */
  @logMethod()
  public getAudioConfig(): AudioServiceConfig {
    return this.getConfigSection<AudioServiceConfig>("audioService");
  }

  /**
   * Get error reporting configuration.
   * @returns Error reporting configuration
   */
  @logMethod()
  public getErrorReportingConfig(): ErrorReportingConfig {
    return this.getConfigSection<ErrorReportingConfig>("errorReporting");
  }

  /**
   * Get rhythmic movement configuration.
   * @returns Rhythmic movement configuration
   */
  @logMethod()
  public getRhythmicMovementConfig(): RhythmicMovementConfig {
    return this.getConfigSection<RhythmicMovementConfig>("rhythmicMovement");
  }

  /**
   * Get notification service configuration.
   * @returns Notification service configuration
   */
  @logMethod()
  public getNotificationConfig(): NotificationServiceConfig {
    return this.getConfigSection<NotificationServiceConfig>(
      "notificationService",
    );
  }

  /**
   * Get HTTP service configuration
   */
  @logMethod()
  public getHttpConfig(): {
    defaultTimeout: number;
    maxRetries: number;
    retryDelay: number;
  } {
    return this.getConfigSection<CompositionRootConfig>("compositionRoot").http;
  }

  /**
   * Get visual effects configuration (qualia background & landing visuals).
   * @returns Visual effects configuration or default fallback if not defined
   */
  @logMethod()
  public getVisualEffectsConfig(): VisualEffectsConfig {
    // QUALIA.CODE: Configuration externalized - load from YAML, minimal fallback only
    try {
      return this.getConfigSection<VisualEffectsConfig>("visualEffects");
    } catch (configError) {
      this.logger.warn("Visual effects configuration not found, using minimal fallback", { configError });
      // Minimal fallback - should not happen in production with proper YAML setup
      return {
        particles: { count: 100, minSize: 1, maxSize: 4, speed: 0.5, drift: 0.5 },
        bloom: { intensity: 1.0, pulseSpeed: 0.5 },
        gradients: { cycleDuration: 10, layers: [] },
        noise: { enabled: false, opacity: 0, scale: 1, speed: 0 },
        palette: ["#ffffff"],
        aura: { rings: 1, rotationSpeed: 10, pulseDuration: 5 },
      };
    }
  }

  /**
   * Check if configuration is loaded
   */
  @logMethod()
  public isLoaded(): boolean {
    return this.loadedConfig !== null;
  }

  /**
   * Reload configuration from external sources
   */
  @logMethod()
  @catchError()
  public async reload(): Promise<void> {
    this.loadedConfig = null;
    await this.loadConfig();
  }
}
