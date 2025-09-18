/**
 * QUALIA.CODE v1.1 - BackendSyncService Tests - IOC COMPLIANT
 * Comprehensive test suite for backend synchronization service.
 * Uses InversifyJS container for dependency injection.
 */

import { container } from '../services/inversify.config';
import { TYPES } from '../services/inversify.types';
import type { IBackendSyncService } from '../services/interfaces/IBackendSyncService';
import type { IEventBus } from '../services/interfaces/IEventBus';
import type { IConfigurationService } from '../services/interfaces/IConfigurationService';
import { QualiaLogger, LogLevel } from "../services/Logger";

describe("BackendSyncService - IOC COMPLIANT", () => {
  let backendSync: IBackendSyncService;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockConfigService: jest.Mocked<IConfigurationService>;

  beforeEach(() => {
    // Create mocks for EventBus interface
    mockEventBus = {
      emit: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      clear: jest.fn(),
      destroy: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        totalListeners: 0,
        eventTypes: [],
        historySize: 0,
        isDestroyed: false
      })
    };

    // Create mocks for ConfigurationService interface
    mockConfigService = {
      loadConfig: jest.fn(),
      getConfig: jest.fn(),
      getGameConfig: jest.fn(),
      getQualiaConfig: jest.fn(),
      getBackendConfig: jest.fn().mockReturnValue({
        baseUrl: 'http://localhost:8000',
        timeout: 5000,
        retryAttempts: 3,
        retryDelay: 1000,
        throttleMs: 250,
        healthCheckInterval: 30000,
        endpoints: {
          qualiaState: '/api/qualia-state',
          health: '/api/health'
        }
      }),
      getAudioConfig: jest.fn(),
      getErrorReportingConfig: jest.fn(),
      getRhythmicMovementConfig: jest.fn(),
      getNotificationConfig: jest.fn(),
      getConfigSection: jest.fn(),
      isLoaded: jest.fn().mockReturnValue(true),
      reload: jest.fn()
    };

    // Inject mocks into IoC container using QUALIA.CODE LAW
    container.unbind(TYPES.IEventBus);
    container.bind<IEventBus>(TYPES.IEventBus).toConstantValue(mockEventBus);
    
    container.unbind(TYPES.IConfigurationService);
    container.bind<IConfigurationService>(TYPES.IConfigurationService).toConstantValue(mockConfigService);
    
    container.unbind(TYPES.ILogger);
    container.bind<QualiaLogger>(TYPES.ILogger).toConstantValue(new QualiaLogger('Test', LogLevel.INFO));

    // Get service instance from container - NO MANUAL INSTANTIATION
    backendSync = container.get<IBackendSyncService>(TYPES.IBackendSyncService);
  });

  afterEach(async () => {
    if (backendSync) {
      await backendSync.stop();
    }
  });

  describe("QUALIA.CODE Compliance", () => {
    test("should initialize with event-driven architecture", () => {
      expect(backendSync).toBeDefined();
    });

    test("should start and stop service idempotently", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await backendSync.start();
      await backendSync.start(); // Should be idempotent
      await backendSync.stop();
      await backendSync.stop(); // Should be idempotent

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test("should provide connection status", async () => {
      await backendSync.start();

      // Initially should be disconnected
      expect(backendSync.isBackendConnected()).toBe(false);
    });
  });

  describe("Event Handling", () => {
    beforeEach(async () => {
      await backendSync.start();
    });

    test("should subscribe to QualiaStateUpdated events on start", async () => {
      const subscribeSpy = jest.spyOn(eventBus, "subscribe");

      await backendSync.stop();
      await backendSync.start();

      expect(subscribeSpy).toHaveBeenCalledWith(
        "QualiaStateUpdated",
        expect.any(Function),
        expect.any(Object),
      );
    });

    test("should unsubscribe from events on stop", async () => {
      const unsubscribeSpy = jest.spyOn(eventBus, "unsubscribe");

      await backendSync.stop();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });

  describe("Health Checking", () => {
    test("should perform health checks when started", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await backendSync.start();

      // Wait for health check
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[BackendSync] Health check"),
      );

      consoleSpy.mockRestore();
    });

    test("should stop health checking when stopped", async () => {
      await backendSync.start();
      await backendSync.stop();

      // Connection should be false after stop
      expect(backendSync.isBackendConnected()).toBe(false);
    });
  });

  describe("QualiaState Synchronization", () => {
    beforeEach(async () => {
      await backendSync.start();
    });

    test("should handle QualiaStateUpdated events", async () => {
      const mockQualiaState = {
        intensity: 0.8,
        focus_level: 0.7,
        aggression: 0.5,
        flow: 0.9,
        chaos: 0.2,
        recovery: 0.3,
        transcendence: 0.1,
      };

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      mockEventBus.emit({
        type: "QualiaStateUpdated",
        qualiaState: mockQualiaState,
        timestamp: new Date(),
        source: "Test",
      } as any);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[BackendSync] Received QualiaState update"),
      );

      consoleSpy.mockRestore();
    });

    test("should throttle rapid QualiaState updates", async () => {
      const mockQualiaState = {
        intensity: 0.8,
        focus_level: 0.7,
        aggression: 0.5,
        flow: 0.9,
        chaos: 0.2,
        recovery: 0.3,
        transcendence: 0.1,
      };

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Emit multiple rapid updates
      for (let i = 0; i < 5; i++) {
        mockEventBus.emit({
          type: "QualiaStateUpdated",
          qualiaState: { ...mockQualiaState, intensity: i * 0.1 },
          timestamp: new Date(),
          source: "Test",
        } as any);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have throttled the updates
      const logCalls = consoleSpy.mock.calls.filter((call) =>
        call[0].includes("Received QualiaState update"),
      );

      expect(logCalls.length).toBeLessThan(5); // Should be throttled

      consoleSpy.mockRestore();
    });
  });

  describe("Configuration", () => {
    test("should provide configuration access", () => {
      const config = backendSync.getConfig();

      expect(config).toHaveProperty("throttleMs");
      expect(config).toHaveProperty("maxBatchSize");
      expect(config).toHaveProperty("baseUrl");
      expect(typeof config.throttleMs).toBe("number");
    });
  });

  describe("Error Handling", () => {
    test("should handle sync failures gracefully", async () => {
      await backendSync.start();

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Force a sync failure by mocking
      const originalSync = (backendSync as any).syncQualiaState;
      (backendSync as any).syncQualiaState = jest.fn(() => {
        throw new Error("Sync failed");
      });

      mockEventBus.emit({
        type: "QualiaStateUpdated",
        qualiaState: {
          intensity: 0.5,
          focus_level: 0.5,
          aggression: 0.5,
          flow: 0.5,
          chaos: 0.5,
          recovery: 0.5,
          transcendence: 0.5,
        },
        timestamp: new Date(),
        source: "Test",
      } as any);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Sync failed"),
      );

      consoleSpy.mockRestore();
      (backendSync as any).syncQualiaState = originalSync;
    });
  });
});
