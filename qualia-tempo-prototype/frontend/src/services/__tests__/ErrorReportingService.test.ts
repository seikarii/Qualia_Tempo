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
 * Tests for Err      expect(mockLogger.debug).toHaveBeenCalledWith(
        '💎💎 [ErrorReportingService] Error queued for proces                      await errorReportingService.reportError(error, 'high', { context: 'test' });
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('[ErrorReportingService] Error queued for processing'),
        expect.objectContaining({
          message: 'Test error',
          severity: 'high'
        })
      );  expect.stringContaining('[ErrorReportingService] Error queued for processing'),pect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('[ErrorReportingService] Error queued for processing'),
        expect.objectContaining({
          message: 'Test error',
          severity: 'high'
        })
      );mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('[ErrorReportingService] Error queued for processing'),
        expect.objectContaining({
          message: 'Test error',
          severity: 'high'
        })
      );mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('[ErrorReportingService] Error queued for processing'),
        expect.objectContaining({
          message: 'Test error',
          severity: 'high'
        })
      );eportingService - GOLD.CODE IoC Compliance
 * Production-grade error handling with batching, ra    it('should report erro    it('should handle different severity levels', async () => {
      const severities: ErrorSeverity[] = ['low', 'medium', 'high', 'critical'];
      
      for (const severity of severities) {
        const error = new Error(`${severity} error`);
        await errorReportingService.reportError(error, severity);
        
        expect(mockLogger.debug).toHaveBeenCalledWith(
          '📄 [ErrorReportingService] Error queued for processing',
          expect.objectContaining({ severity })
        );
      }
    });m metadata', async () => {
      const error = new Error('Metadata test');
      const metadata = { userId: '123', component: 'button', action: 'click' };
      
      await errorReportingService.reportError(error, 'medium', metadata);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '📄 [ErrorReportingService] Error queued for processing',
        expect.objectContaining({
          metadata
        })
      );
    });and external service integration
 */

import {
  createTestContainer,
  getMocksFromContainer,
  resetAllMocks,
} from "../../testing/test-container-factory";
import { ErrorReportingService } from "../ErrorReportingService";
import {
  IErrorReportingService,
  ErrorReportingConfig,
  ErrorSeverity,
} from "../interfaces/IErrorReportingService";
import { IEventBus } from "../interfaces/IEventBus";
import { IConfigurationService } from "../interfaces/IConfigurationService";
import { QualiaLogger } from "../Logger";
import { Container } from "inversify";
import { TYPES } from "../inversify.types";

// Mock fetch for external service testing
global.fetch = vi.fn();

describe("ErrorReportingService - GOLD.CODE IoC Testing", () => {
  let errorReportingService: IErrorReportingService;
  let container: Container;
  let mockEventBus: Mocked<IEventBus>;
  let mockConfigService: Mocked<IConfigurationService>;
  let mockLogger: Mocked<QualiaLogger>;
  let mockFetch: MockedFunction<typeof fetch>;

  beforeEach(() => {
    // Reset all mocks to clean state
    resetAllMocks();
    vi.clearAllMocks();

    // Setup fetch mock
    mockFetch = global.fetch as MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as Response);

    // Create fresh test container with proper IoC bindings
    container = createTestContainer();

    // Get mock instances for assertions
    const mocks = getMocksFromContainer(container);
    mockEventBus = mocks.mockEventBus as Mocked<IEventBus>;
    mockConfigService =
      mocks.mockConfigurationService as Mocked<IConfigurationService>;
    mockLogger = mocks.mockLogger as Mocked<QualiaLogger>;

    // Configure mock configuration service with error reporting config
    mockConfigService.getConfig.mockReturnValue({
      errorReporting: {
        enabled: true,
        endpoint: "https://api.example.com/errors",
        apiKey: "test-api-key",
        batchSize: 5,
        batchTimeout: 1000,
        maxRetries: 3,
        rateLimitWindow: 60000,
        rateLimitMax: 100,
      },
    });

    // GOLD.CODE COMPLIANCE: Resolve service from IoC container
    errorReportingService = container.get<IErrorReportingService>(
      TYPES.IErrorReportingService,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Service Initialization", () => {
    it("should initialize with proper IoC dependencies", () => {
      expect(errorReportingService).toBeDefined();
      expect(errorReportingService).toBeInstanceOf(ErrorReportingService);
    });

    it("should start successfully and register event listeners", async () => {
      await errorReportingService.start();

      // Verify logger was called for initialization with actual message
      expect(mockLogger.info).toHaveBeenCalledWith(
        "🚀 [ErrorReportingService] Service started - Production error handling active",
      );

      // Verify event subscriptions were registered
      expect(mockEventBus.subscribe).toHaveBeenCalled();
    });

    it("should stop successfully and process pending errors", async () => {
      await errorReportingService.start();
      await errorReportingService.stop();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "🛑 [ErrorReportingService] Service stopped",
      );
    });
  });

  describe("Error Reporting", () => {
    beforeEach(async () => {
      await errorReportingService.start();
    });

    it("should report individual errors", async () => {
      const error = new Error("Test error");

      await errorReportingService.reportError(error, "high", {
        context: "test",
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "�� [ErrorReportingService] Error queued for processing",
        expect.objectContaining({
          message: "Test error",
          severity: "high",
        }),
      );
    });

    it("should report errors with custom metadata", async () => {
      const error = new Error("Test error with metadata");
      const metadata = { userId: "123", action: "click", component: "button" };

      await errorReportingService.reportError(error, "medium", metadata);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          "[ErrorReportingService] Error queued for processing",
        ),
        expect.objectContaining({
          message: "Test error with metadata",
          severity: "medium",
        }),
      );
    });

    it("should handle different severity levels", async () => {
      const severities: Array<"low" | "medium" | "high" | "critical"> = [
        "low",
        "medium",
        "high",
        "critical",
      ];

      for (const severity of severities) {
        const error = new Error(`${severity} error`);
        await errorReportingService.reportError(error, severity);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining(
            "[ErrorReportingService] Error queued for processing",
          ),
          expect.objectContaining({ severity }),
        );
      }
    });
  });

  describe("Batching System", () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await errorReportingService.start();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should batch errors and send when batch size is reached", async () => {
      // Configure smaller batch size for testing
      mockConfigService.getConfig.mockReturnValue({
        errorReporting: {
          enabled: true,
          endpoint: "https://api.example.com/errors",
          batchSize: 2,
          batchTimeout: 5000,
        },
      });

      // Report multiple errors
      await errorReportingService.reportError(new Error("Error 1"), "low");
      await errorReportingService.reportError(new Error("Error 2"), "medium");

      // Should trigger batch send
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/errors",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining("Error 1"),
        }),
      );
    });

    it("should send batched errors on timeout", async () => {
      await errorReportingService.reportError(new Error("Timeout test"), "low");

      // Fast-forward time to trigger batch timeout
      vi.advanceTimersByTime(2000);

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await errorReportingService.start();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should respect rate limits", async () => {
      // Configure very low rate limit for testing
      mockConfigService.getConfig.mockReturnValue({
        errorReporting: {
          enabled: true,
          rateLimitWindow: 1000,
          rateLimitMax: 2,
          batchSize: 1,
          batchTimeout: 100,
        },
      });

      // Report errors up to the limit
      await errorReportingService.reportError(new Error("Error 1"), "low");
      await errorReportingService.reportError(new Error("Error 2"), "low");

      // This should be rate limited
      await errorReportingService.reportError(new Error("Rate limited"), "low");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "🚦 [ErrorReportingService] Rate limit exceeded",
        ),
      );
    });

    it("should reset rate limit after time window", async () => {
      // Configure rate limit
      mockConfigService.getConfig.mockReturnValue({
        errorReporting: {
          enabled: true,
          rateLimitWindow: 1000,
          rateLimitMax: 1,
          batchSize: 1,
          batchTimeout: 100,
        },
      });

      // Use up rate limit
      await errorReportingService.reportError(new Error("Error 1"), "low");

      // Advance time past window
      vi.advanceTimersByTime(1500);

      // Should be able to report again
      await errorReportingService.reportError(
        new Error("Error after reset"),
        "low",
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Circuit Breaker", () => {
    beforeEach(async () => {
      await errorReportingService.start();
    });

    it("should open circuit breaker after consecutive failures", async () => {
      // Mock fetch to fail
      mockFetch.mockRejectedValue(new Error("Network error"));

      // Configure circuit breaker with low threshold
      mockConfigService.getConfig.mockReturnValue({
        errorReporting: {
          enabled: true,
          circuitBreakerThreshold: 2,
          circuitBreakerTimeout: 5000,
          batchSize: 1,
          batchTimeout: 100,
        },
      });

      // Trigger failures to open circuit breaker
      await errorReportingService.reportError(new Error("Error 1"), "low");
      await errorReportingService.reportError(new Error("Error 2"), "low");

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Circuit should be open, next error should not attempt network call
      const fetchCallsBefore = mockFetch.mock.calls.length;
      await errorReportingService.reportError(new Error("Circuit open"), "low");

      // Should not have made additional fetch calls
      expect(mockFetch.mock.calls.length).toBe(fetchCallsBefore);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("⚡ [ErrorReportingService] Circuit breaker"),
      );
    });
  });

  describe("Retry Logic", () => {
    beforeEach(async () => {
      await errorReportingService.start();
    });

    it("should retry failed requests", async () => {
      // Mock fetch to fail first time, succeed second time
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as Response);

      await errorReportingService.reportError(new Error("Retry test"), "low");

      // Wait for async processing and retries
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should have made 2 attempts (original + 1 retry)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should give up after max retries", async () => {
      // Mock fetch to always fail
      mockFetch.mockRejectedValue(new Error("Persistent network error"));

      // Configure max retries
      mockConfigService.getConfig.mockReturnValue({
        errorReporting: {
          enabled: true,
          maxRetries: 2,
          batchSize: 1,
          batchTimeout: 100,
        },
      });

      await errorReportingService.reportError(
        new Error("Max retries test"),
        "low",
      );

      // Wait for all retry attempts
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Should have attempted 1 original + 2 retries = 3 total
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send error batch"),
      );
    });
  });

  describe("Statistics and Metrics", () => {
    beforeEach(async () => {
      await errorReportingService.start();
    });

    it("should track error statistics", async () => {
      await errorReportingService.reportError(new Error("Stats test 1"), "low");
      await errorReportingService.reportError(
        new Error("Stats test 2"),
        "high",
      );

      const stats = errorReportingService.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalErrors).toBeGreaterThanOrEqual(2);
      expect(stats.totalBatches).toBeDefined();
      expect(stats.successfulReports).toBeDefined();
      expect(stats.failedReports).toBeDefined();
      expect(stats.duplicatesFiltered).toBeDefined();
      expect(stats.averageRetries).toBeDefined();
    });

    it("should provide detailed error breakdown", async () => {
      await errorReportingService.reportError(new Error("Low priority"), "low");
      await errorReportingService.reportError(
        new Error("High priority"),
        "high",
      );

      const stats = errorReportingService.getStatistics();

      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.totalBatches).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Configuration Management", () => {
    beforeEach(async () => {
      await errorReportingService.start();
    });

    it("should handle disabled error reporting", async () => {
      await errorReportingService.stop(); // Stop service first

      // Configure service as disabled
      mockConfigService.getConfig.mockReturnValue({
        errorReporting: {
          enabled: false,
        },
      });

      await errorReportingService.reportError(
        new Error("Disabled test"),
        "low",
      );

      // Should not attempt to send or log anything when disabled
      expect(mockFetch).not.toHaveBeenCalled();
      // No specific log message expected for disabled state - service returns silently
    });

    it("should update configuration dynamically", async () => {
      const newConfig: Partial<ErrorReportingConfig> = {
        enabled: true,
        maxBatchSize: 10,
        maxRetries: 5,
      };

      await errorReportingService.updateConfig(newConfig);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "⚙️ [ErrorReportingService] Configuration updated",
      );
    });
  });

  describe("Error Handling Edge Cases", () => {
    beforeEach(async () => {
      await errorReportingService.start();
    });

    it("should handle null or undefined errors gracefully", async () => {
      await errorReportingService.reportError(null as any, "low");
      await errorReportingService.reportError(undefined as any, "medium");

      // Should not throw and should log appropriately
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should handle circular reference errors", async () => {
      const circular: any = { name: "circular" };
      circular.self = circular;

      const error = new Error("Circular test");
      (error as any).circular = circular;

      await errorReportingService.reportError(error, "low");

      // Should handle serialization gracefully
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should handle network failures gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network timeout"));

      await errorReportingService.reportError(new Error("Network test"), "low");

      // Should not throw and should log the failure
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send error batch"),
      );
    });
  });
});
