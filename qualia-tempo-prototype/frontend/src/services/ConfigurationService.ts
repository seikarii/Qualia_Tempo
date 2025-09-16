/**
 * QUALIA.CODE v1.0 - ConfigurationService
 * Service responsible for loading and managing game configuration from YAML files.
 *
 * Architecture:
 * - Loads configuration from multiple external YAML files
 * - Provides type-safe configuration access to all services
 * - Integrates with BackendSyncService for runtime updates
 * - Supports configuration validation and defaults
 * - Follows Configuration-First Mandate: NO HARDCODED VALUES
 */

import * as yaml from 'js-yaml';
import { logMethod, catchError } from '../utils/decorators';
import { QualiaLogger, LoggerProvider } from './Logger';

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
}

// BackendSync Configuration
export interface BackendSyncConfig {
  api: {
    baseUrl: string;
    qualiaEndpoint: string;
    healthEndpoint: string;
    timeout: number;
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
}

/**
 * QUALIA.CODE v1.0 - ConfigurationService Implementation
 * Loads and manages configuration from multiple YAML files
 */
export class ConfigurationService {
  private config: FullGameConfig | null = null;
  private configBasePath: string;
  private logger: QualiaLogger;

  // Configuration file paths
  private configFiles = {
    compositionRoot: '/config/composition-root.yaml',
    errorReporting: '/config/error-reporting.yaml',
    audioService: '/config/audio-service.yaml',
    qualiaCalculator: '/config/qualia-calculator.yaml',
    backendSync: '/config/backend-sync.yaml',
    gameController: '/config/game-controller.yaml',
    debugService: '/config/debug-service.yaml',
    notificationService: '/config/notification-service.yaml',
  };

  constructor(configBasePath: string = '', logger?: QualiaLogger) {
    this.configBasePath = configBasePath;
    this.logger = logger || LoggerProvider.getLogger();
  }

  /**
   * Load all configuration files from YAML
   */
  @logMethod()
  @catchError()
  public async loadConfig(): Promise<FullGameConfig> {
    try {
      this.logger.info('📄 [Config] Loading configuration from multiple YAML files...');

      // Load all configuration files in parallel
      const configPromises = Object.entries(this.configFiles).map(async ([key, path]) => {
        const fullPath = this.configBasePath + path;
        this.logger.debug(`📄 [Config] Loading ${key} from ${fullPath}`);

        const response = await fetch(fullPath);
        if (!response.ok) {
          throw new Error(`Failed to load ${key} config: ${response.statusText}`);
        }

        const yamlText = await response.text();
        return { key, config: yaml.load(yamlText) };
      });

      const loadedConfigs = await Promise.all(configPromises);

      // Merge all configurations
      const mergedConfig: any = {};
      loadedConfigs.forEach(({ key, config }) => {
        mergedConfig[key] = config;
      });

      // Validate configuration
      this.validateConfig(mergedConfig as FullGameConfig);

      this.config = mergedConfig as FullGameConfig;
      this.logger.info('✅ [Config] All configurations loaded successfully');

      return this.config;
    } catch (error) {
      this.logger.error('❌ [Config] Failed to load configuration:', { error });
      throw error;
    }
  }

  /**
   * Get the complete configuration
   */
  @logMethod()
  @catchError()
  public getConfig(): FullGameConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Get CompositionRoot configuration
   */
  @logMethod()
  @catchError()
  public getCompositionRootConfig(): CompositionRootConfig {
    return this.getConfig().compositionRoot;
  }

  /**
   * Get ErrorReporting configuration
   */
  @logMethod()
  @catchError()
  public getErrorReportingConfig(): ErrorReportingConfig {
    return this.getConfig().errorReporting;
  }

  /**
   * Get AudioService configuration
   */
  @logMethod()
  @catchError()
  public getAudioServiceConfig(): AudioServiceConfig {
    return this.getConfig().audioService;
  }

  /**
   * Get QualiaCalculator configuration
   */
  @logMethod()
  @catchError()
  public getQualiaCalculatorConfig(): QualiaCalculatorConfig {
    return this.getConfig().qualiaCalculator;
  }

  /**
   * Get BackendSync configuration
   */
  @logMethod()
  @catchError()
  public getBackendSyncConfig(): BackendSyncConfig {
    return this.getConfig().backendSync;
  }

  /**
   * Get GameController configuration
   */
  @logMethod()
  @catchError()
  public getGameControllerConfig(): GameControllerConfig {
    return this.getConfig().gameController;
  }

  /**
   * Get DebugService configuration
   */
  @logMethod()
  @catchError()
  public getDebugServiceConfig(): DebugServiceConfig {
    return this.getConfig().debugService;
  }

  /**
   * Get NotificationService configuration
   */
  @logMethod()
  @catchError()
  public getNotificationServiceConfig(): NotificationServiceConfig {
    return this.getConfig().notificationService;
  }

  /**
   * Validate configuration structure and values
   */
  private validateConfig(config: FullGameConfig): void {
    // Validate CompositionRoot config
    if (typeof config.compositionRoot?.autoStart !== 'boolean') {
      throw new Error('Invalid compositionRoot.autoStart configuration');
    }

    // Validate ErrorReporting config
    if (typeof config.errorReporting?.rateLimitWindow !== 'number') {
      throw new Error('Invalid errorReporting.rateLimitWindow configuration');
    }

    // Validate AudioService config
    if (!config.audioService?.rhythmicFeedback?.perfect?.frequency) {
      throw new Error('Invalid audioService.rhythmicFeedback configuration');
    }

    // Validate QualiaCalculator config
    if (!config.qualiaCalculator?.baseQualiaState) {
      throw new Error('Invalid qualiaCalculator.baseQualiaState configuration');
    }

    // Validate BackendSync config
    if (!config.backendSync?.api?.baseUrl) {
      throw new Error('Invalid backendSync.api.baseUrl configuration');
    }

    // Validate GameController config
    if (typeof config.gameController?.gameLifecycle?.autoStart !== 'boolean') {
      throw new Error('Invalid gameController.gameLifecycle configuration');
    }

    // Validate DebugService config
    if (!config.debugService?.logging?.logLevel) {
      throw new Error('Invalid debugService.logging configuration');
    }

    // Validate NotificationService config
    if (typeof config.notificationService?.display?.enableNotifications !== 'boolean') {
      throw new Error('Invalid notificationService.display configuration');
    }

    this.logger.info('✅ [Config] Configuration validation passed');
  }

  /**
   * Check if configuration is loaded
   */
  @logMethod()
  @catchError()
  public isLoaded(): boolean {
    return this.config !== null;
  }

  /**
   * Reload configuration (useful for runtime updates)
   */
  @logMethod()
  @catchError()
  public async reloadConfig(): Promise<FullGameConfig> {
    this.config = null;
    return this.loadConfig();
  }
}
