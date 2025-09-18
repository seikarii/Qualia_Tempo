/**
 * QUALIA.CODE v1.0 - BackendSyncService Tests
 * Comprehensive test suite for backend synchronization service.
 */

import { BackendSyncService } from "../services/BackendSyncService";
import { EventBus } from "../services/EventBus";
import { QualiaLogger, LogLevel } from "../services/Logger";

// Mock logger for tests
const mockLogger: QualiaLogger = new QualiaLogger('Test', LogLevel.INFO);

describe("BackendSyncService", () => {
  let eventBus: EventBus;
  let backendSync: BackendSyncService;

  beforeEach(() => {
    eventBus = new EventBus(mockLogger);
    backendSync = new BackendSyncService(eventBus, mockLogger);
  });

  afterEach(async () => {
    if (backendSync) {
      await backendSync.stop();
    }
    if (eventBus) {
      eventBus.destroy();
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

      eventBus.emit({
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
        eventBus.emit({
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

      eventBus.emit({
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
