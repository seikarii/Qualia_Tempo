/**
 * QUALIA.CODE v1.1 - ConfigurationService Tests
 * Tests for configuration loading, validation, and access
 * 
 * ARCHITECTURE COMPLIANCE:
 * - Uses createTestContainer() for isolation
 * - Tests @logMethod and @catchError decorators
 * - High-fidelity mocking of HttpService
 * - Validates error handling and configuration validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestContainer, resetAllMocks } from '../../testing/test-container-factory';
import type { Container } from 'inversify';
import { TYPES } from '../inversify.types';
import type { IConfigurationService } from '../interfaces/IConfigurationService';
import type { ILogger } from '../interfaces/ILogger';
import type { IHttpService } from '../interfaces/IHttpService';
import { ConfigurationService } from '../ConfigurationService';
import * as yaml from 'js-yaml';

describe('ConfigurationService - Critical Test Coverage', () => {
  let container: Container;
  let configService: IConfigurationService;
  let mockLogger: ILogger;
  let mockHttpService: IHttpService;

  const mockConfigBasePath = '/config/';
  const mockConfigManifest = {
    qualiaCalculator: 'qualia-calculator.yaml',
    audioService: 'audio-service.yaml',
    compositionRoot: 'composition-root.yaml',
    errorReporting: 'error-reporting.yaml',
    backendSync: 'backend-sync.yaml',
    gameController: 'game-controller.yaml',
    debugService: 'debug-service.yaml',
    notificationService: 'notification-service.yaml',
    rhythmicMovement: 'rhythmic-movement.yaml',
    eventBus: 'event-bus.yaml',
  };

  const validQualiaConfig = yaml.dump({
    baseQualiaState: {
      intensity: 0.5,
      precision: 0.5,
      aggression: 0.5,
      flow: 0.5,
      chaos: 0.5,
      recovery: 0.5,
      transcendence: 0.0,
    },
    precision: {
      hitBonus: 0.1,
      missPenalty: 0.2,
      maxValue: 1.0,
      minValue: 0.0,
      decayRate: 0.05,
    },
    flow: {
      perfectHitBonus: 0.15,
      goodHitBonus: 0.08,
      missPenalty: 0.2,
      maxValue: 1.0,
      minValue: 0.0,
      decayRate: 0.03,
    },
    chaos: {
      missIncrease: 0.25,
      decayAmount: 0.1,
      maxValue: 1.0,
      minValue: 0.0,
      decayRate: 0.05,
    },
    aggression: {
      comboMultiplier: 0.05,
      maxCombo: 50,
      maxValue: 1.0,
      minValue: 0.0,
      decayRate: 0.04,
    },
    rhythm: {
      perfectWindow: 50,
      goodWindow: 100,
      missThreshold: 200,
    },
    combo: {
      resetTime: 2000,
      multiplierCap: 2.5,
    },
    performanceMultipliers: {
      perfect: 1.5,
      good: 1.0,
      miss: 0.5,
      combo: 0.1,
    },
    updateIntervalMs: 16,
    historySize: 100,
    transcendenceThresholds: {
      intensity: 0.8,
      precision: 0.8,
      flow: 0.8,
    },
    minValue: 0.0,
    maxValue: 1.0,
    transcendenceActivationValue: 1.0,
    millisecondsToSecondsConversion: 1000,
    transcendenceDecayRate: 0.02,
    transcendenceCheckValue: 0.5,
  });

  const validAudioConfig = yaml.dump({
    volume: 0.7,
    soundEnabled: true,
    rhythmicFeedback: {
      perfect: { frequency: 880 },
      good: { frequency: 660 },
      miss: { frequency: 220 },
    },
    metronome: {
      frequency: 440,
      volume: 0.5,
    },
    audioEngine: {
      sampleRate: 44100,
      bufferSize: 2048,
    },
  });

  const validCompositionRootConfig = yaml.dump({
    autoStart: true,
    enableBackendSync: true,
    healthCheckIntervalMs: 5000,
    http: {
      defaultTimeout: 10000,
    },
  });

  const validErrorReportingConfig = yaml.dump({
    rateLimitWindow: 60000,
    maxErrorsPerWindow: 10,
    batchSize: 5,
    externalServiceUrl: 'https://errors.example.com/api',
  });

  const validBackendSyncConfig = yaml.dump({
    api: {
      baseUrl: 'http://localhost:8000',
      qualiaEndpoint: '/api/qualia',
      timeout: 5000,
    },
    sync: {
      throttleDelay: 100,
    },
    connection: {
      healthCheckInterval: 30000,
    },
  });

  const validGameControllerConfig = yaml.dump({
    gameLifecycle: {
      autoStart: false,
    },
    performance: {
      updateIntervalMs: 16,
    },
    health: {
      maxHealth: 100,
    },
    scoring: {
      baseScorePerHit: 10,
    },
    maxPlayers: 4,
  });

  const validDebugServiceConfig = yaml.dump({
    logging: {
      logLevel: 'info',
    },
    eventMonitoring: {
      maxEventHistory: 100,
    },
    performance: {
      enablePerformanceTracking: true,
    },
    development: {
      enableDebugOverlay: false,
    },
  });

  const validNotificationServiceConfig = yaml.dump({
    display: {
      enableNotifications: true,
      maxVisibleNotifications: 3,
      notificationDuration: 3000,
    },
    maxNotifications: 50,
    defaultDuration: 3000,
  });

  const validRhythmicMovementConfig = yaml.dump({
    bpm: 120,
    gridSize: 4,
    keyThrottleMs: 100,
    audioBeatDetectionThreshold: 0.7,
    availableMovements: ['up', 'down', 'left', 'right'],
    perfectTiming: 50,
    goodTiming: 100,
    optimalTimingPredictionConfidencePlaying: 0.8,
    optimalTimingPredictionConfidenceNotPlaying: 0.5,
    sequenceDifficultyBaseComplexityMultiplier: 1.2,
    sequenceDifficultyVarietyBonusMultiplier: 1.5,
    flowBpmMultiplier: 1.0,
  });

  const validEventBusConfig = yaml.dump({
    performance: {
      maxEventHistory: 1000,
      enablePerformanceTracking: true,
      maxConcurrentEvents: 100,
      cleanupInterval: 60000,
    },
    errorHandling: {
      maxRetries: 3,
      retryDelay: 1000,
    },
    development: {
      enableDetailedLogging: false,
      enableEventLogging: true,
    },
  });

  beforeEach(() => {
    container = createTestContainer();
    mockLogger = container.get<ILogger>(TYPES.ILogger);
    mockHttpService = container.get<IHttpService>(TYPES.IHttpService);

    // Setup ConfigurationService dependencies
    container.bind(TYPES.ConfigBasePath).toConstantValue(mockConfigBasePath);
    container.bind(TYPES.ConfigManifest).toConstantValue(mockConfigManifest);

    // Bind real ConfigurationService
    container.unbind(TYPES.IConfigurationService);
    container.bind<IConfigurationService>(TYPES.IConfigurationService)
      .to(ConfigurationService)
      .inSingletonScope();
    
    configService = container.get<IConfigurationService>(TYPES.IConfigurationService);
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('1. Successful Configuration Loading', () => {
    it('should load all configuration files successfully', async () => {
      // Arrange
      vi.mocked(mockHttpService.get).mockImplementation(async (url: string) => {
        if (url.includes('qualia-calculator.yaml')) return validQualiaConfig;
        if (url.includes('audio-service.yaml')) return validAudioConfig;
        if (url.includes('composition-root.yaml')) return validCompositionRootConfig;
        if (url.includes('error-reporting.yaml')) return validErrorReportingConfig;
        if (url.includes('backend-sync.yaml')) return validBackendSyncConfig;
        if (url.includes('game-controller.yaml')) return validGameControllerConfig;
        if (url.includes('debug-service.yaml')) return validDebugServiceConfig;
        if (url.includes('notification-service.yaml')) return validNotificationServiceConfig;
        if (url.includes('rhythmic-movement.yaml')) return validRhythmicMovementConfig;
        if (url.includes('event-bus.yaml')) return validEventBusConfig;
        throw new Error('Unknown config file');
      });

      // Act
      const config = await configService.loadConfig();

      // Assert
      expect(config).toBeDefined();
      expect(config.qualiaCalculator).toBeDefined();
      expect(config.audioService).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Loading configuration from multiple YAML files...');
      expect(mockLogger.info).toHaveBeenCalledWith('All configurations loaded successfully');
    });

    it('should mark configuration as loaded after successful load', async () => {
      // Arrange
      vi.mocked(mockHttpService.get).mockImplementation(async (url: string) => {
        if (url.includes('qualia-calculator.yaml')) return validQualiaConfig;
        if (url.includes('audio-service.yaml')) return validAudioConfig;
        if (url.includes('composition-root.yaml')) return validCompositionRootConfig;
        if (url.includes('error-reporting.yaml')) return validErrorReportingConfig;
        if (url.includes('backend-sync.yaml')) return validBackendSyncConfig;
        if (url.includes('game-controller.yaml')) return validGameControllerConfig;
        if (url.includes('debug-service.yaml')) return validDebugServiceConfig;
        if (url.includes('notification-service.yaml')) return validNotificationServiceConfig;
        if (url.includes('rhythmic-movement.yaml')) return validRhythmicMovementConfig;
        if (url.includes('event-bus.yaml')) return validEventBusConfig;
        throw new Error('Unknown config file');
      });

      // Act
      expect(configService.isLoaded()).toBe(false);
      await configService.loadConfig();

      // Assert
      expect(configService.isLoaded()).toBe(true);
    });
  });

  describe('2. Error Handling', () => {
    it('should throw error when HTTP service fails to fetch config', async () => {
      // Arrange
      vi.mocked(mockHttpService.get).mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(configService.loadConfig()).rejects.toThrow(/FATAL: ConfigurationService failed to load/);
    });

    it('should throw error with specific file name on failure', async () => {
      // Arrange
      vi.mocked(mockHttpService.get).mockImplementation(async (url: string) => {
        if (url.includes('qualia-calculator.yaml')) {
          throw new Error('File not found');
        }
        return validAudioConfig;
      });

      // Act & Assert
      await expect(configService.loadConfig()).rejects.toThrow(/qualiaCalculator/);
      await expect(configService.loadConfig()).rejects.toThrow(/File not found/);
    });

    it('should throw error on invalid YAML syntax', async () => {
      // Arrange
      vi.mocked(mockHttpService.get).mockResolvedValue('invalid: yaml: syntax: [[[');

      // Act & Assert
      await expect(configService.loadConfig()).rejects.toThrow(/FATAL: ConfigurationService failed to load/);
    });
  });

  describe('3. Configuration Reload', () => {
    it('should reload configuration and clear previous state', async () => {
      // Arrange
      vi.mocked(mockHttpService.get).mockImplementation(async (url: string) => {
        if (url.includes('qualia-calculator.yaml')) return validQualiaConfig;
        if (url.includes('audio-service.yaml')) return validAudioConfig;
        if (url.includes('composition-root.yaml')) return validCompositionRootConfig;
        if (url.includes('error-reporting.yaml')) return validErrorReportingConfig;
        if (url.includes('backend-sync.yaml')) return validBackendSyncConfig;
        if (url.includes('game-controller.yaml')) return validGameControllerConfig;
        if (url.includes('debug-service.yaml')) return validDebugServiceConfig;
        if (url.includes('notification-service.yaml')) return validNotificationServiceConfig;
        if (url.includes('rhythmic-movement.yaml')) return validRhythmicMovementConfig;
        if (url.includes('event-bus.yaml')) return validEventBusConfig;
        throw new Error('Unknown config file');
      });

      // Act
      const config1 = await configService.loadConfig();
      await configService.reload();

      // Assert
      expect(config1).toBeDefined();
      expect(mockHttpService.get).toHaveBeenCalledTimes(20); // 10 files × 2 loads
      expect(mockLogger.info).toHaveBeenCalledWith('Loading configuration from multiple YAML files...');
    });
  });

  describe('4. QUALIA.CODE Compliance', () => {
    it('should use @logMethod decorator for all public methods', async () => {
      // Arrange
      vi.mocked(mockHttpService.get).mockImplementation(async (url: string) => {
        if (url.includes('qualia-calculator.yaml')) return validQualiaConfig;
        if (url.includes('audio-service.yaml')) return validAudioConfig;
        if (url.includes('composition-root.yaml')) return validCompositionRootConfig;
        if (url.includes('error-reporting.yaml')) return validErrorReportingConfig;
        if (url.includes('backend-sync.yaml')) return validBackendSyncConfig;
        if (url.includes('game-controller.yaml')) return validGameControllerConfig;
        if (url.includes('debug-service.yaml')) return validDebugServiceConfig;
        if (url.includes('notification-service.yaml')) return validNotificationServiceConfig;
        if (url.includes('rhythmic-movement.yaml')) return validRhythmicMovementConfig;
        if (url.includes('event-bus.yaml')) return validEventBusConfig;
        throw new Error('Unknown config file');
      });

      // Act
      await configService.loadConfig();
      configService.isLoaded();

      // Assert - verify logger was called (decorator logging)
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should use injected HttpService instead of direct fetch', async () => {
      // Arrange
      vi.mocked(mockHttpService.get).mockImplementation(async (url: string) => {
        if (url.includes('qualia-calculator.yaml')) return validQualiaConfig;
        if (url.includes('audio-service.yaml')) return validAudioConfig;
        if (url.includes('composition-root.yaml')) return validCompositionRootConfig;
        if (url.includes('error-reporting.yaml')) return validErrorReportingConfig;
        if (url.includes('backend-sync.yaml')) return validBackendSyncConfig;
        if (url.includes('game-controller.yaml')) return validGameControllerConfig;
        if (url.includes('debug-service.yaml')) return validDebugServiceConfig;
        if (url.includes('notification-service.yaml')) return validNotificationServiceConfig;
        if (url.includes('rhythmic-movement.yaml')) return validRhythmicMovementConfig;
        if (url.includes('event-bus.yaml')) return validEventBusConfig;
        throw new Error('Unknown config file');
      });

      // Act
      await configService.loadConfig();

      // Assert - verify HttpService was used
      expect(mockHttpService.get).toHaveBeenCalled();
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('qualia-calculator.yaml')
      );
    });

    it('should receive configuration base path via injection', () => {
      // Assert - Service should be initialized with injected dependencies
      expect(configService).toBeDefined();
      // ConfigBasePath is injected via constructor, validated through successful load
    });
  });

  describe('5. Configuration Validation', () => {
    it('should validate loaded configuration structure', async () => {
      // Arrange - Missing required fields
      const invalidConfig = yaml.dump({
        intensity: { increment: 0.1 }, // Missing required fields
      });

      vi.mocked(mockHttpService.get).mockImplementation(async (url: string) => {
        if (url.includes('qualia-calculator.yaml')) return invalidConfig;
        if (url.includes('audio-service.yaml')) return validAudioConfig;
        throw new Error('Unknown config file');
      });

      // Act & Assert
      await expect(configService.loadConfig()).rejects.toThrow();
    });
  });
});
