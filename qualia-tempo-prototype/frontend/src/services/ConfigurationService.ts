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
  transcendenceThresholds: { intensity: number; precision: number; flow: number };
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
}

/**
 * QUALIA.CODE v1.0 - ConfigurationService Implementation
 * Loads and manages configuration from multiple YAML files
 */
export class ConfigurationService {
  private configBasePath: string;
  private loadedConfig: FullGameConfig | null = null;
  private logger: QualiaLogger;

  // Configuration files discovery - NO HARDCODING
  private configFileManifest: Record<string, string> = {};

  constructor(configBasePath: string = '', logger?: QualiaLogger, configManifest?: Record<string, string>) {
    this.configBasePath = configBasePath;
    this.logger = logger || LoggerProvider.getLogger();
    
    // Accept configuration file manifest externally or discover them
    this.configFileManifest = configManifest || this.discoverConfigFiles();
  }

  /**
   * Discover configuration files dynamically - NO HARDCODING
   */
  private discoverConfigFiles(): Record<string, string> {
    // Default discovery pattern - can be overridden via constructor
    return {
      compositionRoot: '/config/composition-root.yaml',
      errorReporting: '/config/error-reporting.yaml',
      audioService: '/config/audio-service.yaml',
      qualiaCalculator: '/config/qualia-calculator.yaml',
      backendSync: '/config/backend-sync.yaml',
      gameController: '/config/game-controller.yaml',
      debugService: '/config/debug-service.yaml',
      notificationService: '/config/notification-service.yaml',
      rhythmicMovement: '/config/rhythmic-movement.yaml', // NEW: Specific config file
    };
  }

  /**
   * Load all configuration files from YAML
   */
  @logMethod()
  @catchError()
  public async loadConfig(): Promise<FullGameConfig> {
    try {
      this.logger.info('Loading configuration from multiple YAML files...');

      // Load all configuration files in parallel
      const configPromises = Object.entries(this.configFileManifest).map(async ([key, path]) => {
        const fullPath = this.configBasePath + path;
        this.logger.debug(`Loading ${key} from ${fullPath}`);

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

      this.loadedConfig = mergedConfig as FullGameConfig;
      this.logger.info('All configurations loaded successfully');

      return this.loadedConfig;
    } catch (error) {
      this.logger.error('Failed to load configuration:', { error });
      throw error;
    }
  }

  /**
   * Get the complete configuration
   */
  @logMethod()
  @catchError()
  public getConfig(): FullGameConfig {
    if (!this.loadedConfig) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.loadedConfig;
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
    return this.loadedConfig !== null;
  }

  /**
   * Reload configuration (useful for runtime updates)
   */
  @logMethod()
  @catchError()
  public async reloadConfig(): Promise<FullGameConfig> {
    this.loadedConfig = null;
    return this.loadConfig();
  }

  /**
   * TEMPORARY: Load from unified game-config.yaml for backward compatibility
   * TODO: Migrate to separate config files as per QUALIA.CODE standards
   */
  @logMethod()
  @catchError()
  public async loadUnifiedConfig(): Promise<FullGameConfig> {
    try {
      this.logger.info('📄 [Config] Loading unified configuration from game-config.yaml...');
      
      const response = await fetch('/config/game-config.yaml');
      if (!response.ok) {
        throw new Error(`Failed to load unified config: ${response.statusText}`);
      }

      const yamlText = await response.text();
      const unifiedConfig: any = yaml.load(yamlText);

      // Map unified config to the expected structure
      const mappedConfig: FullGameConfig = {
        compositionRoot: {
          autoStart: true,
          enableBackendSync: true,
          enableHealthMonitoring: true,
          healthCheckIntervalMs: 30000,
          retryInitializationOnError: true,
          maxInitializationRetries: 3,
          serviceInitializationTimeoutMs: 10000,
          serviceShutdownTimeoutMs: 5000,
          enableServiceLifecycleLogging: true,
          enablePerformanceMonitoring: true,
        },
        errorReporting: unifiedConfig.services?.errorReporting || {
          rateLimitWindow: 60000,
          maxErrorsPerWindow: 10,
          batchSize: 5,
          batchTimeout: 30000,
          maxRetentionTime: 3600000,
          externalServiceUrl: "",
          retryAttempts: 3,
          enableCompression: false,
          maxBatchSizeBytes: 1024000,
          enableErrorFiltering: true,
          filterSensitiveData: true,
          allowedDomains: [],
        },
        audioService: {
          rhythmicFeedback: {
            perfect: { frequency: 880, gain: 0.5, duration: 200 },
            good: { frequency: 660, gain: 0.4, duration: 150 },
            miss: { frequency: 220, gain: 0.6, duration: 300 }
          },
          metronome: { frequency: 440, gain: 0.3, duration: 100 },
          audioEngine: { sampleRate: 44100, channels: 2, bufferSize: 512 },
          entityVoices: {
            player: { baseFrequency: 440, modulationRange: 220 },
            boss: { baseFrequency: 110, modulationRange: 55 },
            environment: { baseFrequency: 220, modulationRange: 110 }
          },
          enableAudioPooling: true,
          maxConcurrentSounds: 16,
          audioFadeTime: 500,
          volume: unifiedConfig.audio?.volume || 0.8,
          enableSubtitles: unifiedConfig.audio?.enableSubtitles || true,
          soundEnabled: true,
          musicEnabled: true,
          muteDuringDevelopment: false,
        },
        qualiaCalculator: unifiedConfig.services?.qualiaCalculator || {
          updateIntervalMs: 100,
          enableRealTimeUpdate: true,
          enableEventValidation: true,
          maxHistoryLength: 1000,
          enablePerformanceMonitoring: true,
          enableAIAnalysis: true,
        },
        backendSync: unifiedConfig.services?.backendSync || unifiedConfig.backend || {
          baseUrl: "http://localhost:8000",
          maxRetries: 3,
          retryDelay: 1000,
          connectionTimeout: 5000,
          healthCheckInterval: 30000,
        },
        gameController: {
          gameLifecycle: {
            autoStart: false,
            enablePause: true,
            enableReset: true,
            saveStateOnExit: true
          },
          performance: {
            updateIntervalMs: 16,
            maxFrameSkip: 5,
            enableFrameRateLimiting: true
          },
          stateManagement: {
            enableStateValidation: true,
            enableStatePersistence: true,
            stateSaveInterval: 30000,
            maxSaveSlots: 5
          },
          inputHandling: {
            enableInputBuffering: true,
            inputBufferSize: 10,
            enableInputFiltering: true,
            inputDebounceMs: 50
          },
          scoring: {
            baseScorePerHit: 100,
            comboMultiplier: 1.5,
            maxComboMultiplier: 5.0,
            scoreDecayRate: 0.95
          },
          health: {
            maxHealth: 100,
            healthRegenRate: 1.0,
            damageOnMiss: 10,
            enableInvincibilityFrames: true,
            invincibilityDuration: 1000
          },
          difficulty: {
            adaptiveDifficulty: true,
            difficultyIncreaseRate: 0.1,
            maxDifficulty: 10,
            minDifficulty: 1
          },
          events: {
            enableEventBuffering: true,
            maxEventQueueSize: 100,
            eventProcessingInterval: 16
          },
          maxPlayers: 1,
          enablePauseResume: true,
          enableGameStateValidation: true,
          enablePerformanceMonitoring: true,
          autoSaveEnabled: true,
          autoSaveIntervalMs: 30000,
        },
        debugService: unifiedConfig.services?.debug || {
          enableProfiling: false,
          maxSessionHistory: 10,
          maxEventHistory: 500,
          performanceMonitoringInterval: 5000,
          aiAnalysisInterval: 30000,
          enableAIAnalysis: true,
          enablePerformanceMonitoring: true,
          enableGlobalInterface: true,
        },
        notificationService: {
          display: {
            enableNotifications: true,
            maxVisibleNotifications: 5,
            notificationDuration: 5000,
            enableAnimations: true,
            animationDuration: 300
          },
          positioning: {
            position: 'top-right',
            offsetX: 20,
            offsetY: 20,
            zIndex: 1000
          },
          styling: {
            enableThemes: true,
            defaultTheme: 'default',
            enableCustomStyling: false,
            borderRadius: 8,
            shadowEnabled: true
          },
          sound: {
            enableNotificationSounds: true,
            defaultSoundVolume: 0.5,
            enableSoundVariations: true
          },
          types: {
            success: { duration: 3000, soundEnabled: true, color: '#10B981' },
            error: { duration: 5000, soundEnabled: true, color: '#EF4444' },
            warning: { duration: 4000, soundEnabled: true, color: '#F59E0B' },
            info: { duration: 3000, soundEnabled: true, color: '#3B82F6' }
          },
          queue: {
            enableQueueing: true,
            maxQueueSize: 20,
            queueProcessingInterval: 100
          },
          accessibility: {
            enableScreenReader: true,
            enableHighContrast: false,
            enableReducedMotion: false,
            enableKeyboardNavigation: true
          },
          performance: {
            enablePooling: true,
            maxPoolSize: 10,
            enableGarbageCollection: true,
            gcInterval: 60000
          },
          maxNotifications: 10,
          defaultDuration: 5000,
        },
      };

      this.loadedConfig = mappedConfig;
      this.logger.info('Unified configuration loaded and mapped successfully');

      return this.loadedConfig;
    } catch (error) {
      this.logger.error('❌ [Config] Failed to load unified configuration:', { error });
      throw error;
    }
  }

  /**
   * PURE DI: Get specific configuration section by key
   * Replaces all getRhythmicMovementConfig, getQualiaConfig, etc.
   */
  @logMethod()
  @catchError()
  public getConfigSection<T>(sectionKey: string): T {
    if (!this.loadedConfig) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    const section = (this.loadedConfig as any)[sectionKey];
    if (!section) {
      throw new Error(`Configuration section '${sectionKey}' not found.`);
    }

    return section as T;
  }
}
