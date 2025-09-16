/**
 * QUALIA.CODE v1.0 - DebugService Tests
 * Comprehensive test suite for AI-powered debugging service.
 */

import { DebugService, DebugConfig } from "../services/DebugService";
import { EventBus, createQualiaEvents } from "../services/EventBus";
import { QualiaState } from "../types/contracts";
import { QualiaLogger, LogLevel } from "../services/Logger";

// Mock logger for tests
const mockLogger: QualiaLogger = new QualiaLogger('Test', LogLevel.INFO);

describe("DebugService - QUALIA.CODE v1.0", () => {
  let debugService: DebugService;
  let eventBus: EventBus;
  let QualiaEvents: ReturnType<typeof createQualiaEvents>;

  beforeEach(() => {
    eventBus = new EventBus(mockLogger);
    QualiaEvents = createQualiaEvents(eventBus);
    debugService = new DebugService(eventBus, mockLogger);
  });

  afterEach(() => {
    try {
      // Stop service if it's running
      if (
        debugService &&
        debugService.getDebugStats &&
        debugService.getDebugStats().isRunning
      ) {
        debugService.stop();
      }
    } catch (error) {
      // Ignore errors during cleanup
    }

    try {
      if (eventBus) {
        eventBus.destroy();
      }
    } catch (error) {
      // Ignore errors during cleanup
    }

    // Clean up global interface
    if ((window as any).QA_DEBUG) {
      delete (window as any).QA_DEBUG;
    }
  });

  describe("QUALIA.CODE Compliance", () => {
    test("should use dependency injection (EventBus via constructor)", () => {
      expect(() => {
        new DebugService(eventBus, mockLogger);
      }).not.toThrow();
    });

    test("should throw error when EventBus is not provided", () => {
      expect(() => {
        new DebugService(null as any, mockLogger);
      }).toThrow(
        "🚨 [DebugService] EventBus is required for QUALIA.CODE v1.0 compliance",
      );
    });

    test("should follow single responsibility (only handle debugging and analysis)", () => {
      const service = new DebugService(eventBus, mockLogger);

      // Service should only have debugging-related methods
      expect(typeof service.start).toBe("function");
      expect(typeof service.stop).toBe("function");
      expect(typeof service.getDebugStats).toBe("function");
      expect(typeof service.performAIAnalysis).toBe("function");
      expect(typeof service.getSystemSnapshot).toBe("function");
      expect(typeof service.exportDebugData).toBe("function");
    });

    test("should have no UI coupling", () => {
      const service = new DebugService(eventBus, mockLogger);
      const serviceString = service.toString();

      // Should not reference UI frameworks
      expect(serviceString).not.toMatch(/react|vue|angular|dom/i);
    });
  });

  describe("Service Lifecycle", () => {
    test("should start and stop correctly", () => {
      expect(debugService.getDebugStats().isRunning).toBe(false);

      debugService.start();
      expect(debugService.getDebugStats().isRunning).toBe(true);

      debugService.stop();
      expect(debugService.getDebugStats().isRunning).toBe(false);
    });

    test("should handle multiple start/stop calls gracefully", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      // Multiple starts
      debugService.start();
      debugService.start();
      expect(consoleSpy).toHaveBeenCalledWith(
        "⚠️ [DebugService] Service already running",
      );

      // Multiple stops
      debugService.stop();
      debugService.stop();
      expect(consoleSpy).toHaveBeenCalledWith(
        "⚠️ [DebugService] Service not running",
      );

      consoleSpy.mockRestore();
    });

    test("should provide initial statistics", () => {
      const stats = debugService.getDebugStats();

      expect(stats.isRunning).toBe(false);
      expect(stats.currentSession).toBeNull();
      expect(stats.totalEvents).toBe(0);
      expect(stats.totalErrors).toBe(0);
      expect(stats.aiAnalysisCount).toBe(0);
      expect(stats.performanceMetrics).toBeDefined();
      expect(stats.memoryUsage).toBe(0);
    });
  });

  describe("Event Monitoring", () => {
    test("should monitor PlayerAction events", async () => {
      debugService.start();

      await QualiaEvents.playerAction("HitNote", { combo: 5 });
      await QualiaEvents.playerAction("Dash");

      const stats = debugService.getDebugStats();
      expect(stats.totalEvents).toBe(2);

      const snapshot = debugService.getSystemSnapshot();
      expect(snapshot.recentEvents).toHaveLength(2);
      expect(snapshot.recentEvents[0].type).toBe("PlayerAction");
      expect(snapshot.recentEvents[1].type).toBe("PlayerAction");
    });

    test("should monitor QualiaStateUpdated events", async () => {
      debugService.start();

      const testQualiaState: QualiaState = {
        intensity: 0.8,
        precision: 0.5,
        aggression: 0.3,
        flow: 0.9,
        chaos: 0.1,
        recovery: 0.0,
        transcendence: 0.0,
      };

      await QualiaEvents.qualiaStateUpdated(testQualiaState);

      const snapshot = debugService.getSystemSnapshot();
      expect(snapshot.qualiaState).toEqual(testQualiaState);
      expect(snapshot.recentEvents).toHaveLength(1);
    });

    test("should monitor Error events", async () => {
      debugService.start();

      const testError = new Error("Test error");
      await QualiaEvents.error(testError, "high", "TestService");

      const stats = debugService.getDebugStats();
      expect(stats.totalErrors).toBe(1);

      const snapshot = debugService.getSystemSnapshot();
      expect(snapshot.recentErrors).toHaveLength(1);
      expect(snapshot.recentErrors[0].error).toBe(testError);
      expect(snapshot.recentErrors[0].severity).toBe("high");
    });

    test("should monitor GameStateChanged events", async () => {
      debugService.start();

      await QualiaEvents.gameStateChanged("Playing", "Menu");
      await QualiaEvents.gameStateChanged("Paused", "Playing");

      const snapshot = debugService.getSystemSnapshot();
      expect(snapshot.gameState).toBe("Paused");
      expect(snapshot.recentEvents).toHaveLength(2);
    });

    test("should not monitor events when stopped", async () => {
      debugService.start();
      debugService.stop();

      await QualiaEvents.playerAction("HitNote");

      const stats = debugService.getDebugStats();
      expect(stats.totalEvents).toBe(0);
    });
  });

  describe("Debug Sessions", () => {
    test("should create and manage debug sessions", () => {
      debugService.start();

      const stats = debugService.getDebugStats();
      expect(stats.currentSession).not.toBeNull();
      expect(stats.currentSession?.id).toMatch(/^debug_session_/);
      expect(stats.currentSession?.startTime).toBeInstanceOf(Date);
    });

    test("should track events in current session", async () => {
      debugService.start();

      await QualiaEvents.playerAction("HitNote");
      await QualiaEvents.playerAction("Dash");

      const stats = debugService.getDebugStats();
      expect(stats.currentSession?.events).toHaveLength(2);
    });

    test("should track errors in current session", async () => {
      debugService.start();

      const testError = new Error("Session error");
      await QualiaEvents.error(testError, "medium");

      const stats = debugService.getDebugStats();
      expect(stats.currentSession?.errors).toHaveLength(1);
      expect(stats.currentSession?.errors[0].error).toBe(testError);
    });
  });

  describe("AI Analysis", () => {
    test("should perform AI analysis on demand", () => {
      debugService.start();

      const analysis = debugService.performAIAnalysis();
      expect(Array.isArray(analysis)).toBe(true);
    });

    test("should detect error patterns", async () => {
      debugService.start();

      // Create recurring error pattern
      const sameError = new Error("Recurring error");
      for (let i = 0; i < 5; i++) {
        await QualiaEvents.error(sameError, "medium");
      }

      const analysis = debugService.performAIAnalysis();
      const errorPatterns = analysis.filter((a) => a.type === "error_pattern");
      expect(errorPatterns.length).toBeGreaterThan(0);
      expect(errorPatterns[0].description).toContain("Recurring error pattern");
    });

    test("should analyze QualiaState anomalies", async () => {
      debugService.start();

      // Create anomalous QualiaState
      const anomalousState: QualiaState = {
        intensity: 1.5, // Out of bounds
        precision: -0.1, // Out of bounds
        aggression: 0.5,
        flow: 0.5,
        chaos: 0.5,
        recovery: 0.5,
        transcendence: 0.5,
      };

      await QualiaEvents.qualiaStateUpdated(anomalousState);

      const analysis = debugService.performAIAnalysis();
      const anomalies = analysis.filter((a) => a.type === "state_anomaly");
      expect(anomalies.length).toBeGreaterThan(0);
    });

    test("should generate recommendations", async () => {
      debugService.start();

      // Generate high error rate
      for (let i = 0; i < 10; i++) {
        await QualiaEvents.error(new Error(`Error ${i}`), "medium");
        await QualiaEvents.playerAction("HitNote"); // Add normal events too
      }

      const analysis = debugService.performAIAnalysis();
      const recommendations = analysis.filter(
        (a) => a.type === "recommendation",
      );
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].description).toContain("error rate");
    });
  });

  describe("Performance Monitoring", () => {
    test("should track performance metrics", async () => {
      debugService.start();

      await QualiaEvents.playerAction("HitNote");
      await QualiaEvents.qualiaStateUpdated({
        intensity: 0.5,
        precision: 0.5,
        aggression: 0.5,
        flow: 0.5,
        chaos: 0.5,
        recovery: 0.5,
        transcendence: 0.5,
      });

      const stats = debugService.getDebugStats();
      expect(stats.performanceMetrics.eventFrequency.size).toBeGreaterThan(0);
      expect(
        stats.performanceMetrics.eventProcessingTimes.size,
      ).toBeGreaterThan(0);
    });

    test("should calculate performance statistics", async () => {
      debugService.start();

      // Generate multiple events
      for (let i = 0; i < 5; i++) {
        await QualiaEvents.playerAction("HitNote");
      }

      const stats = debugService.getDebugStats();
      const frequency =
        stats.performanceMetrics.eventFrequency.get("PlayerAction");
      expect(frequency).toBe(5);
    });
  });

  describe("Configuration Management", () => {
    test("should allow configuration updates", () => {
      const newConfig: Partial<DebugConfig> = {
        maxEventHistory: 200,
        enableAIAnalysis: false,
      };

      debugService.updateConfig(newConfig);

      // Configuration change should be reflected in behavior
      expect(() => debugService.updateConfig(newConfig)).not.toThrow();
    });

    test("should handle configuration with custom initial config", () => {
      const customConfig: Partial<DebugConfig> = {
        maxSessionHistory: 5,
        enableGlobalInterface: false,
      };

      const customService = new DebugService(eventBus, mockLogger, customConfig);
      expect(customService).toBeDefined();
    });
  });

  describe("System Snapshot", () => {
    test("should provide comprehensive system snapshot", async () => {
      debugService.start();

      await QualiaEvents.playerAction("HitNote");
      await QualiaEvents.qualiaStateUpdated({
        intensity: 0.7,
        precision: 0.8,
        aggression: 0.3,
        flow: 0.9,
        chaos: 0.1,
        recovery: 0.0,
        transcendence: 0.0,
      });

      const snapshot = debugService.getSystemSnapshot();

      expect(snapshot.eventBus).toBeDefined();
      expect(snapshot.qualiaState).toBeDefined();
      expect(snapshot.recentEvents).toHaveLength(2);
      expect(snapshot.performance).toBeDefined();
    });
  });

  describe("Data Export", () => {
    test("should export comprehensive debug data", async () => {
      debugService.start();

      await QualiaEvents.playerAction("HitNote");
      await QualiaEvents.error(new Error("Test error"), "low");

      const exportData = debugService.exportDebugData();

      expect(exportData.sessions).toBeDefined();
      expect(exportData.eventHistory).toHaveLength(2);
      expect(exportData.errorHistory).toHaveLength(1);
      expect(exportData.aiAnalysis).toBeDefined();
      expect(exportData.config).toBeDefined();
    });
  });

  describe("Global Interface", () => {
    test("should expose global debugging interface", () => {
      const customService = new DebugService(eventBus, mockLogger, {
        enableGlobalInterface: true,
      });

      expect((window as any).QA_DEBUG).toBeDefined();
      expect((window as any).QA_DEBUG.service).toBe(customService);
      expect(typeof (window as any).QA_DEBUG.getStats).toBe("function");
      expect(typeof (window as any).QA_DEBUG.performAnalysis).toBe("function");
      expect(typeof (window as any).QA_DEBUG.log).toBe("function");
    });

    test("should not expose global interface when disabled", () => {
      // Clean up any existing global interface first
      delete (window as any).QA_DEBUG;

      new DebugService(eventBus, mockLogger, { enableGlobalInterface: false });

      expect((window as any).QA_DEBUG).toBeUndefined();
    });

    test("should provide utility functions in global interface", () => {
      new DebugService(eventBus, mockLogger, { enableGlobalInterface: true });

      const QA_DEBUG = (window as any).QA_DEBUG;

      expect(typeof QA_DEBUG.clearHistory).toBe("function");
      expect(typeof QA_DEBUG.enableAI).toBe("function");
      expect(typeof QA_DEBUG.disableAI).toBe("function");
      expect(typeof QA_DEBUG.log).toBe("function");
    });
  });

  describe("Memory Management", () => {
    test("should track memory usage", async () => {
      debugService.start();

      // Generate events to increase memory usage
      for (let i = 0; i < 10; i++) {
        await QualiaEvents.playerAction("HitNote");
      }

      const stats = debugService.getDebugStats();
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    test("should maintain event history limits", async () => {
      debugService.updateConfig({ maxEventHistory: 5 });
      debugService.start();

      // Generate more events than the limit
      for (let i = 0; i < 10; i++) {
        await QualiaEvents.playerAction("HitNote");
      }

      const stats = debugService.getDebugStats();
      expect(stats.totalEvents).toBeLessThanOrEqual(5);
    });
  });

  describe("Error Handling Edge Cases", () => {
    test("should handle malformed events gracefully", async () => {
      debugService.start();

      // This should not crash the service - simulate invalid error event
      try {
        await QualiaEvents.error(new Error("Test malformed handling"), "low");
      } catch (error) {
        // Expected to potentially fail, but service should remain running
      }

      expect(debugService.getDebugStats().isRunning).toBe(true);
    });

    test("should handle service cleanup on stop", () => {
      debugService.start();

      const initialStats = debugService.getDebugStats();
      expect(initialStats.currentSession).not.toBeNull();

      debugService.stop();

      const finalStats = debugService.getDebugStats();
      expect(finalStats.currentSession).toBeNull();
    });
  });

  describe("Integration with EventBus", () => {
    test("should properly subscribe and unsubscribe from EventBus", () => {
      const initialStats = eventBus.getStats();

      debugService.start();
      const runningStats = eventBus.getStats();
      expect(runningStats.totalListeners).toBeGreaterThan(
        initialStats.totalListeners,
      );

      debugService.stop();
      const stoppedStats = eventBus.getStats();
      expect(stoppedStats.totalListeners).toBe(initialStats.totalListeners);
    });

    test("should handle EventBus destruction gracefully", () => {
      debugService.start();
      eventBus.destroy();

      expect(() => debugService.stop()).not.toThrow();
    });
  });
});
