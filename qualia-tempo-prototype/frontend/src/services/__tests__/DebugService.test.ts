import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mocked,
} from "vitest";
/**
 * Tests for DebugService - GOLD.CODE IoC Compliance
 * AI-powered debugging with session management and performance monitoring
 */

import {
  createTestContainer,
  getMocksFromContainer,
  resetAllMocks,
} from "../../testing/test-container-factory";
import { DebugService } from "../DebugService";
import { IDebugService } from "../interfaces/IDebugService";
import { IEventBus } from "../interfaces/IEventBus";
import { IConfigurationService } from "../interfaces/IConfigurationService";
import { QualiaLogger } from "../Logger";
import { Container } from "inversify";
import { TYPES } from "../inversify.types";

describe("DebugService - GOLD.CODE IoC Testing", () => {
  let debugService: IDebugService;
  let container: Container;
  let mockEventBus: Mocked<IEventBus>;
  let mockConfigService: Mocked<IConfigurationService>;
  let mockLogger: Mocked<QualiaLogger>;

  beforeEach(() => {
    // Reset all mocks to clean state
    resetAllMocks();

    // Create fresh test container with proper IoC bindings
    container = createTestContainer();

    // Get mock instances for assertions
    const mocks = getMocksFromContainer(container);
    mockEventBus = mocks.mockEventBus as Mocked<IEventBus>;
    mockConfigService =
      mocks.mockConfigurationService as Mocked<IConfigurationService>;
    mockLogger = mocks.mockLogger as Mocked<QualiaLogger>;

    // GOLD.CODE COMPLIANCE: Resolve service from IoC container
    debugService = container.get<IDebugService>(TYPES.IDebugService);
  });

  afterEach(() => {
    // Clean up global debug interface if it exists
    if ((global as any).window?.QA_DEBUG) {
      delete (global as any).window.QA_DEBUG;
    }
  });

  describe("Service Initialization", () => {
    it("should initialize with proper IoC dependencies", () => {
      expect(debugService).toBeDefined();
      expect(debugService).toBeInstanceOf(DebugService);
    });

    it("should start successfully and register event listeners", async () => {
      await debugService.start();

      // Verify logger was called for initialization
      expect(mockLogger.info).toHaveBeenCalledWith(
        "🚀 [DebugService] Service started - AI debugging active",
      );

      // Verify event subscriptions were registered
      expect(mockEventBus.subscribe).toHaveBeenCalled();
    });

    it("should stop successfully and cleanup resources", async () => {
      await debugService.start();
      await debugService.stop();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "🛑 [DebugService] Service stopped",
      );
      expect(mockEventBus.unsubscribe).toHaveBeenCalled();
    });
  });

  describe("AI Analysis Features", () => {
    beforeEach(async () => {
      debugService.start();
    });

    it("should perform AI analysis of debug data", () => {
      const analysis = debugService.performAIAnalysis();

      expect(Array.isArray(analysis)).toBe(true);
      analysis.forEach((result) => {
        expect(result).toHaveProperty("type");
        expect(result).toHaveProperty("severity");
        expect(result).toHaveProperty("message");
        expect(["error_pattern", "state_anomaly", "recommendation"]).toContain(
          result.type,
        );
        expect(["low", "medium", "high"]).toContain(result.severity);
      });
    });

    it("should export debug data for analysis", () => {
      const exportData = debugService.exportDebugData();

      expect(exportData).toBeDefined();
      expect(typeof exportData).toBe("object");
    });

    it("should get system snapshot", () => {
      const snapshot = debugService.getSystemSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot).toHaveProperty("timestamp");
      expect(snapshot).toHaveProperty("services");
      expect(snapshot).toHaveProperty("performance");
      expect(snapshot).toHaveProperty("eventHistory");
    });
  });

  describe("Configuration Management", () => {
    beforeEach(() => {
      debugService.start();
    });

    it("should update debug configuration", () => {
      const newConfig = {
        maxEventHistory: 1000,
        enableGlobalInterface: true,
        profilingEnabled: true,
      };

      debugService.updateConfig(newConfig);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "⚙️ [DebugService] Configuration updated",
      );
    });

    it("should enable and disable profiling", () => {
      debugService.enableProfiling();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("profiling enabled"),
      );

      debugService.disableProfiling();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("profiling disabled"),
      );
    });

    it("should set debug level", () => {
      debugService.setDebugLevel("verbose");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Debug level set to: verbose",
      );
    });
  });

  describe("Global Debug Interface", () => {
    beforeEach(() => {
      // Mock global window object
      (global as any).window = { location: { href: "http://localhost" } };
      debugService.start();
    });

    it("should check if debugging is enabled", () => {
      const isEnabled = debugService.isEnabled();
      expect(typeof isEnabled).toBe("boolean");
    });

    it("should get debug statistics", () => {
      const stats = debugService.getDebugStats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("isRunning");
      expect(stats).toHaveProperty("eventsLogged");
      expect(stats).toHaveProperty("memoryUsage");
      expect(stats).toHaveProperty("uptime");
    });
  });

  describe("Performance Monitoring", () => {
    beforeEach(() => {
      debugService.start();
    });

    it("should track performance metrics", () => {
      const metrics = debugService.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty("isRunning");
      expect(metrics).toHaveProperty("eventsLogged");
      expect(metrics).toHaveProperty("memoryUsage");
      expect(metrics).toHaveProperty("uptime");
    });

    it("should update metrics over time", async () => {
      const initialMetrics = debugService.getMetrics();

      // Simulate some time passing and activity
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedMetrics = debugService.getMetrics();
      expect(updatedMetrics).toBeDefined();
    });
  });

  describe("Event Monitoring", () => {
    beforeEach(() => {
      debugService.start();
    });

    it("should monitor EventBus activity", () => {
      // Verify that debug service subscribed to events
      expect(mockEventBus.subscribe).toHaveBeenCalled();

      // The debug service should be listening for all events
      const subscribeCall = (mockEventBus.subscribe as Mock).mock.calls[0];
      expect(subscribeCall).toBeDefined();
    });

    it("should log events to debug service", () => {
      const mockEvent = {
        type: "PlayerAction",
        action: "dash",
        timestamp: new Date(),
      };

      // Start the service to enable event processing
      debugService.start();

      // Clear previous logger calls
      (mockLogger.debug as Mock).mockClear();

      debugService.logEvent(mockEvent);

      // Verify the event was processed by checking the debug stats
      const stats = debugService.getDebugStats();
      expect(stats.eventsLogged).toBe(1);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      debugService.start();
    });

    it("should handle configuration errors gracefully", () => {
      // Mock configuration service to throw error
      mockConfigService.getConfig.mockImplementation(() => {
        throw new Error("Config load failed");
      });

      // Service should handle this gracefully
      expect(() => debugService.getMetrics()).not.toThrow();
    });

    it("should handle EventBus errors gracefully", () => {
      // Mock EventBus to throw error
      mockEventBus.emit.mockImplementation(() => {
        throw new Error("EventBus error");
      });

      // Service should handle this gracefully
      expect(() => debugService.getMetrics()).not.toThrow();
    });
  });
});
