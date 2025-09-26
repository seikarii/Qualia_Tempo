import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from "vitest";
/**
 * QUALIA.CODE v1.1 - ConfigurationService Tests - IOC COMPLIANT
 * Tests for YAML configuration loading, validation, and management
 * Uses test-container-factory for proper IoC compliance.
 */

import * as yaml from "js-yaml";
import {
  createTestContainer,
  getMocksFromContainer,
  resetAllMocks,
} from "../testing/test-container-factory";
import { Container } from "inversify";
import { ConfigurationService } from "../services/ConfigurationService";
import { TYPES } from "../services/inversify.types";

// Mock js-yaml module
vi.mock("js-yaml", () => ({
  load: vi.fn(),
}));

const mockYamlLoad = yaml.load as Mock;

describe("ConfigurationService - QUALIA.CODE v1.1 COMPLIANT", () => {
  let container: Container;
  let sut: ConfigurationService; // Service Under Test
  let mocks: ReturnType<typeof getMocksFromContainer>;
  let mockConfig: any;

  beforeEach(() => {
    container = createTestContainer();
    // Bind the SUT to its concrete implementation
    container
      .bind<ConfigurationService>(ConfigurationService)
      .toSelf()
      .inSingletonScope();

    sut = container.get(ConfigurationService);
    mocks = getMocksFromContainer(container);

    // Create a valid mock configuration
    mockConfig = {
      // Top-level properties for validation
      autoStart: true,
      rateLimitWindow: 60000,
      rhythmicFeedback: {
        perfect: {
          frequency: 440,
        },
      },
      baseQualiaState: {
        consciousness: 0,
        attention: 0,
        clarity: 0,
        flow: 0,
        intensity: 0,
        precision: 0,
        aggression: 0,
        recovery: 0,
        chaos: 0,
      },
      api: {
        baseUrl: "http://localhost:8000",
      },
      gameLifecycle: {
        autoStart: true,
      },
      display: {
        enableNotifications: true,
      },
      // Nested configuration structure
      audio: {
        volume: 0.8,
        enableSubtitles: true,
      },
      gameplay: {
        rhythmTolerance: 0.2,
        comboResetTime: 2000,
        pauseCooldown: 1000,
      },
      visual: {
        updateFrequency: 60,
        debugMode: false,
      },
      qualia: {
        precision: {
          maxStreak: 50,
          decayRate: 0.95,
          pauseBonus: 0.1,
        },
        flow: {
          rhythmWindow: 200,
          maxFlow: 1.0,
          decayRate: 0.99,
          buildRate: 0.02,
        },
        chaos: {
          missMultiplier: 2.0,
          maxChaos: 1.0,
          decayRate: 0.98,
        },
        aggression: {
          comboThreshold: 10,
          maxAggression: 1.0,
          comboMultiplier: 1.5,
        },
        recovery: {
          duration: 1000,
          maxRecovery: 1.0,
          decayRate: 0.95,
        },
        intensity: {
          baseMultiplier: 1.0,
          precisionWeight: 0.3,
          flowWeight: 0.3,
          aggressionWeight: 0.2,
          chaosWeight: 0.2,
        },
      },
      backend: {
        throttleMs: 250,
        maxBatchSize: 10,
        baseUrl: "http://localhost:8000",
        endpoints: {
          qualiaState: "/update_qualia",
          gameState: "/game_state",
          health: "/health",
        },
        maxRetries: 3,
        retryDelayMs: 1000,
        timeoutMs: 5000,
        logRequests: false,
        logResponses: false,
      },
      services: {
        errorReporting: {
          rateLimitWindow: 60000,
          maxErrorsPerWindow: 10,
          batchSize: 5,
          batchTimeout: 2000,
          maxRetentionTime: 300000,
          externalServiceUrl: "",
          retryAttempts: 3,
          maxBatchSize: 50,
          batchInterval: 5000,
          maxRetries: 3,
          retryDelay: 1000,
          enableConsoleOutput: true,
        },
        debug: {
          enableProfiling: false,
          maxEventHistory: 1000,
          logLevel: "info",
          performanceThreshold: 100,
          performanceMonitoringInterval: 10000,
          aiAnalysisInterval: 30000,
          enableAIAnalysis: false,
          enablePerformanceMonitoring: true,
          enableGlobalInterface: false,
          sessionIdLength: 16,
          recentEventsLimit: 100,
          memoryCleanupInterval: 60000,
          defaultGameStateValue: "default",
        },
        eventBus: {
          maxListeners: 100,
          enablePerformanceMonitoring: true,
          eventTypes: {
            playerAction: "PlayerAction",
            qualiaStateUpdated: "QualiaStateUpdated",
            error: "Error",
            gameStateChanged: "GameStateChanged",
            backendSync: "BackendSync",
          },
        },
        gameController: {
          pauseCooldown: 1000,
        },
        backendSync: {
          healthCheckInterval: 30000,
        },
        rhythmicMovement: {
          bpm: 120,
          perfectTiming: 100,
          goodTiming: 200,
          gridSize: 8,
          slowdownFactor: 0.5,
          slowdownDuration: 2000,
          keyThrottleMs: 100,
        },
      },
      test: {
        mockServices: false,
        enableDebugOutput: false,
        timeoutMs: 5000,
      },
      logging: {
        logLevel: "info",
        messages: {
          debugService: {
            alreadyRunning: "Debug service already running",
            starting: "Starting debug service",
            started: "Debug service started",
            failedToStart: "Failed to start debug service",
            notRunning: "Debug service not running",
            stopping: "Stopping debug service",
            stopped: "Debug service stopped",
            errorStopping: "Error stopping debug service",
            configUpdated: "Debug config updated",
            performingAI: "Performing AI analysis",
            aiAnalysisFailed: "AI analysis failed",
            unsubscribed: "Unsubscribed from events",
            initialized: "Debug service initialized",
          },
          errorReporting: {
            initialized: "Error reporting initialized",
            started: "Error reporting started",
            stopped: "Error reporting stopped",
            configUpdated: "Error reporting config updated",
            subscribed: "Subscribed to error events",
            unsubscribed: "Unsubscribed from error events",
            receivedWhileStopped: "Received error while stopped",
            malformedEvent: "Malformed error event",
            rateLimitExceeded: "Rate limit exceeded",
            processingFailed: "Error processing failed",
            batchProcessingFailed: "Batch processing failed",
            noStackTrace: "No stack trace available",
            unknownSource: "Unknown error source",
            requiresEventBus: "EventBus required for error reporting",
          },
          configurationService: {
            fileNotFound: "Configuration file not found",
            parseError: "Configuration parse error",
            loadSuccess: "Configuration loaded successfully",
            validationError: "Configuration validation error",
          },
        },
      },
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
        http: {
          timeout: 5000,
          retries: 3,
          retryDelay: 1000,
        },
      },
      errorPatterns: {
        critical: ["TypeError", "ReferenceError"],
        high: ["Network", "Timeout"],
        medium: ["Validation", "Parse"],
        low: ["Warning", "Info"],
      },
    };

    // Configure mocks
    (mocks.mockHttpService.get as Mock).mockResolvedValue(
      "audio:\n  volume: 0.8",
    );
    mockYamlLoad.mockReturnValue(mockConfig);
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe("Constructor", () => {
    it("should create ConfigurationService instance", () => {
      expect(sut).toBeInstanceOf(ConfigurationService);
    });

    it("should accept custom configuration path", () => {
      const customService = new ConfigurationService(
        mocks.mockLogger,
        mocks.mockHttpService,
        "/custom/config.yaml",
      );
      expect(customService).toBeInstanceOf(ConfigurationService);
    });
  });

  describe("loadConfig", () => {
    it("should successfully load and validate configuration", async () => {
      const mockYamlText = "audio:\n  volume: 0.8";

      (mocks.mockHttpService.get as Mock).mockResolvedValue(mockYamlText);
      mockYamlLoad.mockReturnValue(mockConfig);

      const result = await sut.loadConfig();

      expect(mocks.mockHttpService.get).toHaveBeenCalledWith(
        "/config/composition-root.yaml",
      );
      expect(mockYamlLoad).toHaveBeenCalledWith(mockYamlText);
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result.compositionRoot).toEqual(mockConfig);
      expect(mocks.mockLogger.info).toHaveBeenCalledWith(
        "Loading configuration from multiple YAML files...",
      );
      expect(mocks.mockLogger.info).toHaveBeenCalledWith(
        "All configurations loaded successfully",
      );
    });

    it("should handle http service failure", async () => {
      (mocks.mockHttpService.get as Mock).mockRejectedValue(
        new Error("Network error"),
      );

      await expect(sut.loadConfig()).rejects.toThrow("Network error");
      expect(mocks.mockLogger.error).toHaveBeenCalledWith(
        "Failed to load configuration:",
        { error: expect.any(Error) },
      );
    });

    it("should handle YAML parsing errors", async () => {
      (mocks.mockHttpService.get as Mock).mockResolvedValue(
        "invalid yaml content",
      );

      mockYamlLoad.mockImplementation(() => {
        throw new Error("YAML parsing failed");
      });

      await expect(sut.loadConfig()).rejects.toThrow("YAML parsing failed");
      expect(mocks.mockLogger.error).toHaveBeenCalledWith(
        "Failed to load configuration:",
        { error: expect.any(Error) },
      );
    });
  });

  describe("Configuration Access Methods", () => {
    beforeEach(async () => {
      (mocks.mockHttpService.get as Mock).mockResolvedValue("config: data");
      mockYamlLoad.mockReturnValue(mockConfig);
      await sut.loadConfig();
    });

    it("getConfig should return full configuration when loaded", () => {
      const result = sut.getConfig();
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result.compositionRoot).toEqual(mockConfig);
      expect(result.errorReporting).toEqual(mockConfig);
    });

    it("getConfig should throw error when configuration not loaded", () => {
      const newService = new ConfigurationService(
        mocks.mockLogger,
        mocks.mockHttpService,
      );
      expect(() => newService.getConfig()).toThrow(
        "Configuration not loaded. Call loadConfig() first.",
      );
    });

    it("getGameConfig should return game configuration section", () => {
      const result = sut.getGameConfig();
      expect(result).toEqual(mockConfig);
    });

    it("getQualiaConfig should return qualia configuration section", () => {
      const result = sut.getQualiaConfig();
      expect(result).toEqual(mockConfig);
    });

    it("getBackendConfig should return backend configuration section", () => {
      const result = sut.getBackendConfig();
      expect(result).toEqual(mockConfig);
    });

    it("getAudioConfig should return audio configuration section", () => {
      const result = sut.getAudioConfig();
      expect(result).toEqual(mockConfig);
    });

    it("getErrorReportingConfig should return error reporting configuration section", () => {
      const result = sut.getErrorReportingConfig();
      expect(result).toEqual(mockConfig);
    });

    it("getRhythmicMovementConfig should return rhythmic movement configuration section", () => {
      const result = sut.getRhythmicMovementConfig();
      expect(result).toEqual(mockConfig);
    });

    it("getNotificationConfig should return notification configuration section", () => {
      const result = sut.getNotificationConfig();
      expect(result).toEqual(mockConfig);
    });

    it("getHttpConfig should return http configuration section", () => {
      const result = sut.getHttpConfig();
      expect(result).toEqual(mockConfig.http);
    });

    it("getVisualEffectsConfig should return visual effects configuration section", () => {
      const result = sut.getVisualEffectsConfig();
      expect(result).toBeDefined();
      expect(result).toHaveProperty("particles");
      expect(result).toHaveProperty("bloom");
      expect(result).toHaveProperty("gradients");
      expect(result).toHaveProperty("noise");
      expect(result).toHaveProperty("palette");
      expect(result).toHaveProperty("aura");
    });
  });

  describe("isLoaded", () => {
    it("should return false when configuration not loaded", () => {
      expect(sut.isLoaded()).toBe(false);
    });

    it("should return true when configuration is loaded", async () => {
      (mocks.mockHttpService.get as Mock).mockResolvedValue("config: data");
      mockYamlLoad.mockReturnValue(mockConfig);

      await sut.loadConfig();
      expect(sut.isLoaded()).toBe(true);
    });
  });

  describe("Configuration Validation", () => {
    it("should pass validation with valid configuration", async () => {
      (mocks.mockHttpService.get as Mock).mockResolvedValue("config: data");
      mockYamlLoad.mockReturnValue(mockConfig);

      const result = await sut.loadConfig();
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(mocks.mockLogger.info).toHaveBeenCalledWith(
        "All configurations loaded successfully",
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      (mocks.mockHttpService.get as Mock).mockRejectedValue(
        new Error("Network error"),
      );

      await expect(sut.loadConfig()).rejects.toThrow("Network error");
      expect(mocks.mockLogger.error).toHaveBeenCalledWith(
        "Failed to load configuration:",
        { error: expect.any(Error) },
      );
    });

    it("should handle malformed YAML gracefully", async () => {
      (mocks.mockHttpService.get as Mock).mockResolvedValue(
        "invalid yaml content",
      );

      mockYamlLoad.mockImplementation(() => {
        throw new Error("Malformed YAML");
      });

      await expect(sut.loadConfig()).rejects.toThrow("Malformed YAML");
    });
  });
});
