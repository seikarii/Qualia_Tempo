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
import { IConfigurationService } from "../services/interfaces/IConfigurationService";
import { TYPES } from "../services/inversify.types";

// Mock js-yaml module
vi.mock("js-yaml", () => ({
  load: vi.fn(),
}));

const mockYamlLoad = yaml.load as Mock;

describe("ConfigurationService - QUALIA.CODE v1.1 COMPLIANT", () => {
  let container: Container;
  let sut: IConfigurationService; // Service Under Test
  let mocks: ReturnType<typeof getMocksFromContainer>;

  beforeEach(() => {
    container = createTestContainer();
    sut = container.get<IConfigurationService>(TYPES.IConfigurationService);
    mocks = getMocksFromContainer(container);
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe("Constructor", () => {
    test("should create ConfigurationService instance", () => {
      expect(sut).toBeDefined();
    });

    test("should accept custom configuration path", () => {
      // Test that the service is properly injected with dependencies
      expect(sut).toBeDefined();
    });
  });

  describe("loadConfig", () => {
    test("should successfully load and validate configuration", async () => {
      // Mock all config files that the service tries to load
      const mockConfigs = {
        "/config/game.yaml": { maxHealth: 100, initialScore: 0 },
        "/config/audio.yaml": { masterVolume: 0.7, enableSpatialAudio: true },
        "/config/backend.yaml": { url: "http://localhost:8000", timeout: 5000 },
        "/config/notifications.yaml": { enabled: true, maxConcurrent: 5 },
        "/config/debug.yaml": { logging: { enableConsoleOutput: true } },
        "/config/rhythmic-movement.yaml": { bpm: 120, perfectTiming: 50 },
        "/config/visual-effects.yaml": { particles: { count: 120 } },
        "/config/error-reporting.yaml": { enabled: true, batchSize: 5 },
        "/config/http.yaml": { baseUrl: "http://localhost:8000", timeout: 5000 },
        "/config/application-initializer.yaml": { enableHealthChecks: true }
      };

      // Mock HTTP service to return appropriate YAML for each file
      (mocks.mockHttpService.get as Mock).mockImplementation((url: string) => {
        const yamlContent = JSON.stringify(mockConfigs[url as keyof typeof mockConfigs] || {});
        return Promise.resolve(yamlContent);
      });

      // Mock yaml.load to return the parsed config
      mockYamlLoad.mockImplementation((yamlText: string) => JSON.parse(yamlText));

      const result = await sut.loadConfig();

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result.gameController).toEqual({ maxHealth: 100, initialScore: 0 });
      expect(result.audioService).toEqual({ masterVolume: 0.7, enableSpatialAudio: true });
      expect(mocks.mockLogger.info).toHaveBeenCalledWith(
        "Loading configuration from multiple YAML files...",
      );
      expect(mocks.mockLogger.info).toHaveBeenCalledWith(
        "All configurations loaded successfully",
      );
    });

    test("should handle http service failure", async () => {
      (mocks.mockHttpService.get as Mock).mockRejectedValue(new Error("Network error"));

      await expect(sut.loadConfig()).rejects.toThrow("Network error");
      expect(mocks.mockLogger.error).toHaveBeenCalled();
    });

    test("should handle YAML parsing errors", async () => {
      (mocks.mockHttpService.get as Mock).mockResolvedValue("invalid: yaml: content: [");
      mockYamlLoad.mockImplementation(() => {
        throw new Error("YAML parsing failed");
      });

      await expect(sut.loadConfig()).rejects.toThrow("YAML parsing failed");
      expect(mocks.mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("Configuration Access Methods", () => {
    beforeEach(async () => {
      // Load config before testing access methods
      const mockConfigs = {
        "/config/game.yaml": { maxHealth: 100, initialScore: 0 },
        "/config/audio.yaml": { masterVolume: 0.7, enableSpatialAudio: true },
        "/config/backend.yaml": { url: "http://localhost:8000", timeout: 5000 },
        "/config/notifications.yaml": { enabled: true, maxConcurrent: 5 },
        "/config/debug.yaml": { logging: { enableConsoleOutput: true } },
        "/config/rhythmic-movement.yaml": { bpm: 120, perfectTiming: 50 },
        "/config/visual-effects.yaml": { particles: { count: 120 } },
        "/config/error-reporting.yaml": { enabled: true, batchSize: 5 },
        "/config/http.yaml": { baseUrl: "http://localhost:8000", timeout: 5000 },
        "/config/application-initializer.yaml": { enableHealthChecks: true }
      };

      (mocks.mockHttpService.get as Mock).mockImplementation((url: string) => {
        const yamlContent = JSON.stringify(mockConfigs[url as keyof typeof mockConfigs] || {});
        return Promise.resolve(yamlContent);
      });

      mockYamlLoad.mockImplementation((yamlText: string) => JSON.parse(yamlText));
      await sut.loadConfig();
    });

    test("getConfig should return full configuration when loaded", () => {
      const result = sut.getConfig();
      expect(result).toBeDefined();
      expect(result.gameController).toBeDefined();
      expect(result.audioService).toBeDefined();
    });

    test("getConfig should throw error when configuration not loaded", () => {
      // Create a new service instance without loading config
      const newContainer = createTestContainer();
      const newService = newContainer.get<IConfigurationService>(TYPES.IConfigurationService);

      expect(() => newService.getConfig()).toThrow(
        "Configuration not loaded. Call loadConfig() first.",
      );
    });

    test("getConfigSection should return gameController configuration section", () => {
      const result = sut.getConfigSection("gameController");
      expect(result).toEqual({ maxHealth: 100, initialScore: 0 });
    });

    test("getConfigSection should return audioService configuration section", () => {
      const result = sut.getConfigSection("audioService");
      expect(result).toEqual({ masterVolume: 0.7, enableSpatialAudio: true });
    });

    test("getConfigSection should return backendSync configuration section", () => {
      const result = sut.getConfigSection("backendSync");
      expect(result).toEqual({ url: "http://localhost:8000", timeout: 5000 });
    });

    test("getConfigSection should return notificationService configuration section", () => {
      const result = sut.getConfigSection("notificationService");
      expect(result).toEqual({ enabled: true, maxConcurrent: 5 });
    });

    test("getConfigSection should return debugService configuration section", () => {
      const result = sut.getConfigSection("debugService");
      expect(result).toEqual({ logging: { enableConsoleOutput: true } });
    });

    test("getConfigSection should return rhythmicMovement configuration section", () => {
      const result = sut.getConfigSection("rhythmicMovement");
      expect(result).toEqual({ bpm: 120, perfectTiming: 50 });
    });

    test("getConfigSection should return visualEffects configuration section", () => {
      const result = sut.getConfigSection("visualEffects");
      expect(result).toEqual({ particles: { count: 120 } });
    });

    test("getConfigSection should return errorReporting configuration section", () => {
      const result = sut.getConfigSection("errorReporting");
      expect(result).toEqual({ enabled: true, batchSize: 5 });
    });

    test("getConfigSection should return http configuration section", () => {
      const result = sut.getConfigSection("http");
      expect(result).toEqual({ baseUrl: "http://localhost:8000", timeout: 5000 });
    });

    test("getConfigSection should return applicationInitializer configuration section", () => {
      const result = sut.getConfigSection("applicationInitializer");
      expect(result).toEqual({ enableHealthChecks: true });
    });
  });

  describe("isLoaded", () => {
    test("should return false when configuration not loaded", () => {
      expect(sut.isLoaded()).toBe(false);
    });

    test("should return true when configuration is loaded", async () => {
      const mockConfigs = {
        "/config/game.yaml": { maxHealth: 100 },
        "/config/audio.yaml": { masterVolume: 0.7 },
        "/config/backend.yaml": { url: "http://localhost:8000" },
        "/config/notifications.yaml": { enabled: true },
        "/config/debug.yaml": { logging: { enableConsoleOutput: true } },
        "/config/rhythmic-movement.yaml": { bpm: 120 },
        "/config/visual-effects.yaml": { particles: { count: 120 } },
        "/config/error-reporting.yaml": { enabled: true },
        "/config/http.yaml": { baseUrl: "http://localhost:8000" },
        "/config/application-initializer.yaml": { enableHealthChecks: true }
      };

      (mocks.mockHttpService.get as Mock).mockImplementation((url: string) => {
        const yamlContent = JSON.stringify(mockConfigs[url as keyof typeof mockConfigs] || {});
        return Promise.resolve(yamlContent);
      });

      mockYamlLoad.mockImplementation((yamlText: string) => JSON.parse(yamlText));
      await sut.loadConfig();

      expect(sut.isLoaded()).toBe(true);
    });
  });

  describe("Configuration Validation", () => {
    test("should pass validation with valid configuration", async () => {
      const mockConfigs = {
        "/config/game.yaml": { maxHealth: 100, initialScore: 0, tickRate: 60, gameLifecycle: { autoStart: false, enablePause: true, enableReset: true, saveStateOnExit: false }, performance: { updateIntervalMs: 16, maxFrameSkip: 5, enableFrameRateLimiting: true }, stateManagement: { enableStateValidation: true, enableStatePersistence: false, stateSaveInterval: 30000, maxSaveSlots: 3 }, inputHandling: { enableInputBuffering: true, inputBufferSize: 100, enableInputFiltering: true, inputDebounceMs: 50 }, scoring: { baseScorePerHit: 100, comboMultiplier: 1.5, maxComboMultiplier: 10, scoreDecayRate: 0.1 }, health: { maxHealth: 100, healthRegenRate: 0.5, damageOnMiss: 10, enableInvincibilityFrames: true, invincibilityDuration: 1000 }, difficulty: { adaptiveDifficulty: true, difficultyIncreaseRate: 0.1, maxDifficulty: 10, minDifficulty: 1 }, events: { enableEventBuffering: true, maxEventQueueSize: 1000, eventProcessingInterval: 16 }, maxPlayers: 1, enablePauseResume: true, enableGameStateValidation: true, enablePerformanceMonitoring: true, autoSaveEnabled: false, autoSaveIntervalMs: 30000 },
        "/config/audio.yaml": { masterVolume: 0.7, enableSpatialAudio: true, bufferSize: 2048, sampleRate: 44100, channels: 2, enableAudioPooling: true, maxConcurrentSounds: 32, audioFadeTime: 0.1, enableSubtitles: false, soundEnabled: true, musicEnabled: true, muteDuringDevelopment: false },
        "/config/backend.yaml": { url: "http://localhost:8000", timeout: 5000, retryAttempts: 3, logRequests: false, logResponses: false },
        "/config/notifications.yaml": { enabled: true, maxConcurrent: 5, defaultDuration: 3000, enableFiltering: true, enablePriorityQueue: true, enableThrottling: true, throttleTimeMs: 1000 },
        "/config/debug.yaml": { logging: { enableConsoleOutput: true, enableFileOutput: false, logLevel: "info", maxLogFiles: 10, maxLogSize: 1000000 }, eventMonitoring: { enableEventLogging: true, enableEventMetrics: true, maxEventHistory: 1000, eventLogThrottle: 100 }, performance: { enablePerformanceTracking: true, enableMemoryMonitoring: true, enableFrameRateTracking: true, metricsUpdateInterval: 5000 }, development: { enableDebugOverlay: false, enableCheats: false, enableHotReload: false, enableBreakpoints: false }, profiling: { enableProfiling: true, profileUpdateInterval: 1000, maxProfileSamples: 1000 }, errorTracking: { enableErrorStackTraces: true, enableErrorReporting: true, maxErrorHistory: 100 }, network: { enableNetworkLogging: false, enableRequestMetrics: false, logRequestHeaders: false, logRequestBodies: false } },
        "/config/rhythmic-movement.yaml": { bpm: 120, perfectTiming: 50, goodTiming: 100, gridSize: 64, slowdownFactor: 0.5, slowdownDuration: 1000, keyThrottleMs: 50 },
        "/config/visual-effects.yaml": { particles: { count: 120, minSize: 1, maxSize: 4, speed: 0.35, drift: 0.5 }, bloom: { intensity: 1.0, pulseSpeed: 6 }, gradients: { cycleDuration: 16, layers: ["radial-gradient(circle at 20% 30%, rgba(0,255,255,0.15), transparent 60%)"] }, noise: { enabled: true, opacity: 0.06, scale: 2, speed: 0.25 }, palette: ["#00ffff", "#ff00ff", "#ffff00", "#ff0080", "#00ff80"], aura: { rings: 4, rotationSpeed: 22, pulseDuration: 9 } },
        "/config/error-reporting.yaml": { enabled: true, batchSize: 5, batchTimeout: 1000, maxRetries: 3, rateLimitWindow: 60000, rateLimitMax: 100, enableCircuitBreaker: true, circuitBreakerThreshold: 5, circuitBreakerTimeout: 60000, enableFallbackMode: true },
        "/config/http.yaml": { baseUrl: "http://localhost:8000", timeout: 5000, retries: 3, headers: { "Content-Type": "application/json" }, enableCompression: true },
        "/config/application-initializer.yaml": { enableHealthChecks: true, healthCheckInterval: 30000, maxInitRetries: 3, initTimeout: 10000, enableServiceValidation: true, validationTimeout: 5000 }
      };

      (mocks.mockHttpService.get as Mock).mockImplementation((url: string) => {
        const yamlContent = JSON.stringify(mockConfigs[url as keyof typeof mockConfigs] || {});
        return Promise.resolve(yamlContent);
      });

      mockYamlLoad.mockImplementation((yamlText: string) => JSON.parse(yamlText));

      const result = await sut.loadConfig();
      expect(result).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    test("should handle network errors gracefully", async () => {
      (mocks.mockHttpService.get as Mock).mockRejectedValue(new Error("Network error"));

      await expect(sut.loadConfig()).rejects.toThrow("Network error");
    });

    test("should handle malformed YAML gracefully", async () => {
      (mocks.mockHttpService.get as Mock).mockResolvedValue("invalid yaml content");
      mockYamlLoad.mockImplementation(() => {
        throw new Error("Malformed YAML");
      });

      await expect(sut.loadConfig()).rejects.toThrow("Malformed YAML");
    });
  });
});
