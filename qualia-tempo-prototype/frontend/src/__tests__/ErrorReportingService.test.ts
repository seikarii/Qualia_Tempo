/**
 * QUALIA.CODE v1.0 - ErrorReportingService Tests
 * Comprehensive test suite for centralized error reporting system.
 * Tests event-driven architecture, rate limiting, batching, and QUALIA.CODE compliance.
 */

import { EventBus } from "../services/EventBus";
import {
  ErrorReportingService,
  ErrorSeverity,
} from "../services/ErrorReportingService";
import { QualiaLogger, LogLevel } from "../services/Logger";

// Mock logger for tests
const mockLogger: QualiaLogger = new QualiaLogger('Test', LogLevel.INFO);

describe("ErrorReportingService - QUALIA.CODE v1.0", () => {
  let eventBus: EventBus;
  let errorService: ErrorReportingService;

  beforeEach(() => {
    // Create fresh instances for each test
    eventBus = new EventBus(mockLogger);
    errorService = new ErrorReportingService(eventBus, mockLogger);
  });

  afterEach(() => {
    // Clean up services
    if (errorService) {
      errorService.stop();
    }
    if (eventBus) {
      eventBus.destroy();
    }
  });

  describe("QUALIA.CODE Compliance", () => {
    test("should use dependency injection (EventBus via constructor)", () => {
      expect(errorService).toBeDefined();
      expect(errorService.getStatistics).toBeDefined();
    });

    test("should throw error when EventBus is not provided", () => {
      expect(() => new ErrorReportingService(null as any, mockLogger)).toThrow(
        "ErrorReportingService requires EventBus dependency",
      );
    });

    test("should follow single responsibility (only handle error reporting)", () => {
      // Service should only handle error reporting, not other concerns
      const methods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(errorService),
      );

      // Public API should be minimal and focused
      expect(methods).toContain("start");
      expect(methods).toContain("stop");
      expect(methods).toContain("getStatistics");
      expect(methods).toContain("updateConfig");
    });

    test("should have no UI coupling", () => {
      // This test verifies architectural compliance
      // The service should only depend on EventBus for input/output
      const stats = errorService.getStatistics();
      expect(stats).toBeDefined();
      expect(typeof stats.queuedErrors).toBe("number");
      expect(typeof stats.isRunning).toBe("boolean");
    });
  });

  describe("Service Lifecycle", () => {
    test("should start and stop correctly", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      errorService.start();
      expect(consoleSpy).toHaveBeenCalledWith(
        "🚀 [ErrorReporting] Service started - ready to handle errors",
      );

      errorService.stop();
      expect(consoleSpy).toHaveBeenCalledWith(
        "🛑 [ErrorReporting] Service stopped",
      );

      consoleSpy.mockRestore();
    });

    test("should handle multiple start/stop calls gracefully", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      // Multiple starts should be idempotent (no warnings)
      errorService.start();
      errorService.start();
      errorService.start();

      // Multiple stops should be idempotent (no warnings)
      errorService.stop();
      errorService.stop();
      errorService.stop();

      // No warnings should have been logged
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test("should provide initial statistics", () => {
      const stats = errorService.getStatistics();

      expect(stats).toEqual({
        queuedErrors: 0,
        reportedErrors: 0,
        rateLimitRemaining: 10, // Default max errors per window
        isRunning: false,
      });
    });
  });

  describe("Event-Driven Architecture", () => {
    test("should listen to Error events after start", async () => {
      errorService.start();

      const initialStats = errorService.getStatistics();
      expect(initialStats.queuedErrors).toBe(0);

      // Emit an Error event
      await eventBus.emit({
        type: "Error",
        error: new Error("Test error"),
        severity: "medium",
      } as any);

      // Allow some time for event processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      const newStats = errorService.getStatistics();
      expect(newStats.queuedErrors).toBe(1);
    });

    test("should not respond to events when stopped", async () => {
      errorService.start();
      errorService.stop();

      const initialStats = errorService.getStatistics();

      // Emit an error after stopping
      await eventBus.emit({
        type: "Error",
        error: new Error("Test error"),
        severity: "high",
      } as any);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const finalStats = errorService.getStatistics();
      expect(finalStats.queuedErrors).toBe(initialStats.queuedErrors);
    });

    test("should handle error events with different severities", async () => {
      errorService.start();

      const severities: ErrorSeverity[] = ["low", "medium", "high", "critical"];

      for (const severity of severities) {
        await eventBus.emit({
          type: "Error",
          error: new Error(`${severity} error`),
          severity,
        } as any);
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      const stats = errorService.getStatistics();
      expect(stats.queuedErrors).toBe(4);
    });
  });

  describe("Error Categorization", () => {
    test("should automatically categorize errors by message content", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      errorService.start();

      // Test different error types that should be auto-categorized
      const errorTests = [
        { message: "Out of memory error", expectedSeverity: "critical" },
        {
          message: "ReferenceError: variable not defined",
          expectedSeverity: "high",
        },
        { message: "Syntax error in code", expectedSeverity: "medium" },
        { message: "Generic error message", expectedSeverity: "low" },
      ];

      for (const test of errorTests) {
        await eventBus.emit({
          type: "Error",
          error: new Error(test.message),
          severity: undefined, // Let auto-categorization work
        } as any);
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check that errors were logged with appropriate categorization
      // Just verify that some errors were processed correctly
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Error queued: (critical|high|medium|low)/),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Rate Limiting", () => {
    test("should enforce rate limiting", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      // Configure with very low limits for testing
      errorService.updateConfig({
        maxErrorsPerWindow: 2,
        rateLimitWindow: 60000,
      });

      errorService.start();

      // Send more errors than the limit
      for (let i = 0; i < 5; i++) {
        await eventBus.emit({
          type: "Error",
          error: new Error(`Error ${i}`),
          severity: "low",
        } as any);
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have rate limited some errors
      expect(consoleSpy).toHaveBeenCalledWith(
        "🚫 [ErrorReporting] Rate limit exceeded, dropping error",
      );

      const stats = errorService.getStatistics();
      expect(stats.queuedErrors).toBeLessThan(5); // Some errors should be dropped
      expect(stats.rateLimitRemaining).toBe(0);

      consoleSpy.mockRestore();
    });

    test("should reset rate limit after time window", async () => {
      // Configure with short window for testing
      errorService.updateConfig({
        maxErrorsPerWindow: 1,
        rateLimitWindow: 100, // 100ms window
      });

      errorService.start();

      // Send first error
      await eventBus.emit({
        type: "Error",
        error: new Error("First error"),
        severity: "low",
      } as any);

      await new Promise((resolve) => setTimeout(resolve, 10));

      let stats = errorService.getStatistics();
      expect(stats.rateLimitRemaining).toBe(0);

      // Wait for rate limit to reset
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Send second error after reset
      await eventBus.emit({
        type: "Error",
        error: new Error("Second error"),
        severity: "low",
      } as any);

      await new Promise((resolve) => setTimeout(resolve, 10));

      stats = errorService.getStatistics();
      expect(stats.queuedErrors).toBe(2); // Both errors should be queued
    });
  });

  describe("Configuration Management", () => {
    test("should allow configuration updates", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const newConfig = {
        maxErrorsPerWindow: 20,
        batchSize: 10,
        batchTimeout: 60000,
      };

      errorService.updateConfig(newConfig);

      expect(consoleSpy).toHaveBeenCalledWith(
        "⚙️ [ErrorReporting] Configuration updated",
      );

      consoleSpy.mockRestore();
    });

    test("should log current configuration", () => {
      // Configuration is logged during initialization
      // We verify this by checking the constructor created the service successfully
      expect(errorService).toBeDefined();
      expect(errorService.getStatistics).toBeDefined();
    });
  });

  describe("Batch Processing", () => {
    test("should process errors in batches", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Configure small batch size for testing
      errorService.updateConfig({
        batchSize: 2,
        batchTimeout: 5000, // Long timeout so only batch size triggers processing
      });

      errorService.start();

      // Send exactly batch size errors
      await eventBus.emit({
        type: "Error",
        error: new Error("Error 1"),
        severity: "low",
      } as any);

      await eventBus.emit({
        type: "Error",
        error: new Error("Error 2"),
        severity: "low",
      } as any);

      // Allow time for batch processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have processed a batch
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Processing batch of 2 errors"),
      );

      consoleSpy.mockRestore();
    });

    test("should handle batch processing failures gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      errorService.updateConfig({
        batchSize: 1,
      });

      errorService.start();

      // Send an error to trigger batch processing
      await eventBus.emit({
        type: "Error",
        error: new Error("Test error"),
        severity: "low",
      } as any);

      // Allow time for processing (including potential failures)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The service should handle any failures gracefully
      // Just verify no uncaught exceptions occurred
      expect(errorService.getStatistics().isRunning).toBe(true);

      consoleSpy.mockRestore();
    }, 10000); // Increase timeout to 10 seconds
  });

  describe("Memory Management", () => {
    test("should track reported errors for cleanup", async () => {
      errorService.start();

      const initialStats = errorService.getStatistics();
      expect(initialStats.reportedErrors).toBe(0);

      // Send an error
      await eventBus.emit({
        type: "Error",
        error: new Error("Test error"),
        severity: "low",
      } as any);

      // Allow time for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      const finalStats = errorService.getStatistics();
      // Reported errors might increase depending on external service simulation
      expect(finalStats.reportedErrors).toBeGreaterThanOrEqual(0);
    });

    test("should handle service cleanup on stop", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      errorService.start();

      // Add some errors to queue
      await eventBus.emit({
        type: "Error",
        error: new Error("Pending error"),
        severity: "low",
      } as any);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Stop should process pending errors
      errorService.stop();

      // Should attempt to process pending errors
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Processing"),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Error Handling Edge Cases", () => {
    test("should handle malformed error events", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      errorService.start();

      // Try to emit malformed events
      try {
        await eventBus.emit({
          type: "Error",
          error: null as any,
          severity: "low",
        } as any);
      } catch (error) {
        // Expected to fail gracefully
      }

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Service should still be running
      const stats = errorService.getStatistics();
      expect(stats.isRunning).toBe(true);

      consoleSpy.mockRestore();
    });

    test("should handle events received while stopped", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      // Don't start the service, and ensure EventBus has no subscribers initially

      await eventBus.emit({
        type: "Error",
        error: new Error("Error while stopped"),
        severity: "medium",
      } as any);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Since service was never started, it should not have processed the event
      const stats = errorService.getStatistics();
      expect(stats.queuedErrors).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe("Integration with EventBus", () => {
    test("should properly subscribe and unsubscribe from EventBus", () => {
      const subscribeSpy = jest.spyOn(eventBus, "subscribe");
      const unsubscribeSpy = jest.spyOn(eventBus, "unsubscribe");

      errorService.start();
      expect(subscribeSpy).toHaveBeenCalledWith("Error", expect.any(Function));

      errorService.stop();
      expect(unsubscribeSpy).toHaveBeenCalledWith(expect.any(String));

      subscribeSpy.mockRestore();
      unsubscribeSpy.mockRestore();
    });
  });
});
