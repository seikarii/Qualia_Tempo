/**
 * QUALIA.CODE v1.0 - ConfigurationService
 * Service responsible for loading and managing game configuration from YAML files.
 *
 * Architecture:
 * - Loads configuration from external YAML files
 * - Provides type-safe configuration access
 * - Integrates with BackendSyncService for runtime updates
 * - Supports configuration validation and defaults
 */

import * as yaml from 'js-yaml';
import { logMethod, catchError } from '../utils/decorators';
import { QualiaLogger, LoggerProvider } from './Logger';

// Configuration interfaces
export interface GameConfig {
  audio: {
    volume: number;
    enableSubtitles: boolean;
  };
  gameplay: {
    rhythmTolerance: number;
    comboResetTime: number;
    pauseCooldown: number;
  };
  visual: {
    updateFrequency: number;
    debugMode: boolean;
  };
}

export interface QualiaConfig {
  precision: {
    maxStreak: number;
    decayRate: number;
    pauseBonus: number;
  };
  flow: {
    rhythmWindow: number;
    maxFlow: number;
    decayRate: number;
    buildRate: number;
  };
  chaos: {
    missMultiplier: number;
    maxChaos: number;
    decayRate: number;
  };
  aggression: {
    comboThreshold: number;
    maxAggression: number;
    comboMultiplier: number;
  };
  recovery: {
    duration: number;
    maxRecovery: number;
    decayRate: number;
  };
  intensity: {
    baseMultiplier: number;
    precisionWeight: number;
    flowWeight: number;
    aggressionWeight: number;
    chaosWeight: number;
  };
}

export interface BackendConfig {
  throttleMs: number;
  maxBatchSize: number;
  baseUrl: string;
  endpoints: {
    qualiaState: string;
    gameState: string;
    health: string;
  };
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  logRequests: boolean;
  logResponses: boolean;
}

export interface ServicesConfig {
  errorReporting: {
    rateLimitWindow: number;
    maxErrorsPerWindow: number;
    batchSize: number;
    batchTimeout: number;
    maxRetentionTime: number;
    externalServiceUrl: string;
    retryAttempts: number;
    maxBatchSize: number;
    batchInterval: number;
    maxRetries: number;
    retryDelay: number;
    enableConsoleOutput: boolean;
  };
  debug: {
    enableProfiling: boolean;
    maxEventHistory: number;
    logLevel: string;
    performanceThreshold: number;
    performanceMonitoringInterval: number;
    aiAnalysisInterval: number;
    enableAIAnalysis: boolean;
    enablePerformanceMonitoring: boolean;
    enableGlobalInterface: boolean;
    sessionIdLength: number;
    recentEventsLimit: number;
    memoryCleanupInterval: number;
    defaultGameStateValue: string;
  };
  eventBus: {
    maxListeners: number;
    enablePerformanceMonitoring: boolean;
    eventTypes: {
      playerAction: string;
      qualiaStateUpdated: string;
      error: string;
      gameStateChanged: string;
      backendSync: string;
    };
  };
  gameController: {
    pauseCooldown: number;
  };
  backendSync: {
    healthCheckInterval: number;
    maxRetries: number;
    retryDelay: number;
    connectionTimeout: number;
  };
  rhythmicMovement: {
    bpm: number;
    perfectTiming: number;
    goodTiming: number;
    gridSize: number;
    slowdownFactor: number;
    slowdownDuration: number;
    keyThrottleMs: number;
  };
}

export interface LoggingConfig {
  messages: {
    debugService: {
      alreadyRunning: string;
      starting: string;
      started: string;
      failedToStart: string;
      notRunning: string;
      stopping: string;
      stopped: string;
      errorStopping: string;
      configUpdated: string;
      performingAI: string;
      aiAnalysisFailed: string;
      unsubscribed: string;
      initialized: string;
    };
    errorReporting: {
      initialized: string;
      started: string;
      stopped: string;
      configUpdated: string;
      subscribed: string;
      unsubscribed: string;
      receivedWhileStopped: string;
      malformedEvent: string;
      rateLimitExceeded: string;
      processingFailed: string;
      batchProcessingFailed: string;
      noStackTrace: string;
      unknownSource: string;
      requiresEventBus: string;
    };
    configurationService: {
      fileNotFound: string;
      parseError: string;
      loadSuccess: string;
      validationError: string;
    };
    notificationService: {
      initialized: string;
      alreadyStarted: string;
      startingListeners: string;
      listenersActive: string;
      notStarted: string;
      stoppingListeners: string;
      listenersStopped: string;
      processingErrorEvent: string;
      errorNotificationGenerated: string;
      processingBackendSyncEvent: string;
      configSyncNotificationGenerated: string;
    };
  };
}

export interface ErrorPatternsConfig {
  critical: string[];
  high: string[];
  medium: string[];
  low: string[];
}

export interface TestConfig {
  mockServices: boolean;
  enableDebugOutput: boolean;
  timeoutMs: number;
}

export interface FullGameConfig {
  audio: GameConfig['audio'];
  gameplay: GameConfig['gameplay'];
  visual: GameConfig['visual'];
  qualia: QualiaConfig;
  backend: BackendConfig;
  services: ServicesConfig;
  test: TestConfig;
  logging: LoggingConfig;
  errorPatterns: ErrorPatternsConfig;
}

/**
 * Service for loading and managing game configuration.
 */
export class ConfigurationService {
  private config: FullGameConfig | null = null;
  private configPath: string;
  private logger: QualiaLogger;

  constructor(configPath: string = '/config/game-config.yaml', logger?: QualiaLogger) {
    this.configPath = configPath;
    this.logger = logger || LoggerProvider.getLogger();
  }

  /**
   * Load configuration from YAML file.
   */
  @logMethod()
  @catchError()
  public async loadConfig(): Promise<FullGameConfig> {
    try {
      this.logger.info('📄 [Config] Loading configuration from:', { configPath: this.configPath });

      const response = await fetch(this.configPath);
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`);
      }

      const yamlText = await response.text();
      const loadedConfig = yaml.load(yamlText) as FullGameConfig;

      // Validate configuration
      this.validateConfig(loadedConfig);

      this.config = loadedConfig;
      this.logger.info('✅ [Config] Configuration loaded successfully');

      return this.config;
    } catch (error) {
      this.logger.error('❌ [Config] Failed to load configuration:', { error });
      throw error;
    }
  }

  /**
   * Get the current configuration.
   */
  @logMethod()
  @catchError()
  public getConfig(): FullGameConfig {
    this.logger.debug("🔍 [ConfigurationService] getConfig() called - config loaded:", { configLoaded: !!this.config });
    
    if (!this.config) {
      this.logger.error("❌ [ConfigurationService] Configuration not loaded! Call loadConfig() first.", {
        configLoaded: !!this.config,
        configPath: this.configPath,
        timestamp: new Date().toISOString()
      });
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Get game configuration section.
   */
  @logMethod()
  @catchError()
  public getGameConfig(): GameConfig {
    const config = this.getConfig();
    return {
      audio: config.audio,
      gameplay: config.gameplay,
      visual: config.visual,
    };
  }

  /**
   * Get qualia configuration section.
   */
  @logMethod()
  @catchError()
  public getQualiaConfig(): QualiaConfig {
    return this.getConfig().qualia;
  }

  /**
   * Get backend configuration section.
   */
  @logMethod()
  @catchError()
  public getBackendConfig(): BackendConfig {
    return this.getConfig().backend;
  }

  /**
   * Get services configuration section.
   */
  @logMethod()
  @catchError()
  public getServicesConfig(): ServicesConfig {
    return this.getConfig().services;
  }

  /**
   * Get test configuration section.
   */
  @logMethod()
  @catchError()
  public getTestConfig(): TestConfig {
    return this.getConfig().test;
  }

  /**
   * Get logging configuration section.
   */
  @logMethod()
  @catchError()
  public getLoggingConfig(): LoggingConfig {
    return this.getConfig().logging;
  }

  /**
   * Get error patterns configuration section.
   */
  @logMethod()
  @catchError()
  public getErrorPatternsConfig(): ErrorPatternsConfig {
    return this.getConfig().errorPatterns;
  }

  /**
   * Validate configuration structure and values.
   */
  private validateConfig(config: FullGameConfig): void {
    // Basic validation - add more comprehensive validation as needed
    if (!config.audio || typeof config.audio.volume !== 'number') {
      throw new Error('Invalid audio configuration');
    }

    if (!config.qualia || !config.qualia.precision) {
      throw new Error('Invalid qualia configuration');
    }

    if (!config.backend || !config.backend.baseUrl) {
      throw new Error('Invalid backend configuration');
    }

    this.logger.info('✅ [Config] Configuration validation passed');
  }

  /**
   * Check if configuration is loaded.
   */
  @logMethod()
  @catchError()
  public isLoaded(): boolean {
    return this.config !== null;
  }
}
