/**
 * QUALIA.CODE v1.0 - ErrorReportingService
 * Centralized error handling and reporting system with event-driven architecture.
 *
 * Features:
 * - Event-driven error collection via EventBus
 * - Automatic error categorization by severity
 * - Rate limiting to prevent error spam
 * - Batch processing for optimized external reporting
 * - Memory management with automatic cleanup
 * - External service integration (simulated)
 *
 * Architecture Compliance:
 * - Dependency injection (EventBus via constructor)
 * - Single responsibility principle
 * - Event-driven communication
 * - No UI coupling
 */

import { EventBus, ErrorEvent } from "./EventBus";
import { logMethod, catchError } from '../utils/decorators';
import { QualiaLogger } from './Logger';
import { ConfigurationService } from './ConfigurationService';

// Error severity levels
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

// Error report structure
export interface ErrorReport {
  id: string;
  error: Error;
  severity: ErrorSeverity;
  timestamp: Date;
  context?: Record<string, any>;
  stack?: string;
  userAgent?: string;
  source?: string;
}

// External service response simulation
interface ExternalServiceResponse {
  success: boolean;
  reportId?: string;
  error?: string;
}

// Configuration interface
interface ErrorReportingConfig {
  rateLimitWindow: number; // Time window for rate limiting (ms)
  maxErrorsPerWindow: number; // Max errors per time window
  batchSize: number; // Number of errors to batch together
  batchTimeout: number; // Max time to wait before sending batch (ms)
  maxRetentionTime: number; // How long to keep errors in memory (ms)
  externalServiceUrl: string; // URL for external error reporting service
  retryAttempts: number; // Number of retry attempts for failed reports
}

/**
 * Centralized error reporting service following QUALIA.CODE v1.0 architecture.
 * Handles error collection, categorization, batching, and external reporting.
 */
export class ErrorReportingService {
  private eventBus: EventBus;
  private logger: QualiaLogger;
  private isRunning = false;
  private errorQueue: ErrorReport[] = [];
  private reportedErrors: Set<string> = new Set();
  private rateLimitCounter = 0;
  private rateLimitResetTime = 0;
  private batchTimer: any = null;
  private cleanupTimer: any = null;
  private errorEventSubscriptionId: string | null = null;

  private config: ErrorReportingConfig;

  /**
   * QUALIA.CODE v1.0: Dependency injection constructor
   */
  constructor(
    eventBus: EventBus,
    logger: QualiaLogger,
    private configService: ConfigurationService
  ) {
    if (!eventBus) {
      throw new Error("ErrorReportingService requires EventBus dependency");
    }

    this.eventBus = eventBus;
    this.logger = logger;
    this.config = this.configService.getErrorReportingConfig();
    this.logger.info(
      "🚨 [ErrorReporting] Service initialized with event-driven architecture",
    );
    this.logCurrentConfig();
  }

  /**
   * Start the error reporting service
   */
  @logMethod()
  @catchError()
  public start(): void {
    if (this.isRunning) {
      // Service already running, nothing to do
      return;
    }

    this.subscribeToErrorEvents();
    this.startBatchTimer();
    this.startCleanupTimer();
    this.resetRateLimit();

    this.isRunning = true;
    this.logger.info("🚀 [ErrorReporting] Service started - ready to handle errors");
  }

  /**
   * Stop the error reporting service
   */
  @logMethod()
  @catchError()
  public stop(): void {
    if (!this.isRunning) {
      // Service already stopped, nothing to do
      return;
    }

    this.unsubscribeFromErrorEvents();
    this.stopTimers();
    this.processPendingErrors();

    this.isRunning = false;
    this.logger.info("🛑 [ErrorReporting] Service stopped");
  }

  /**
   * Update service configuration
   */
  @logMethod()
  @catchError()
  public updateConfig(newConfig: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info("⚙️ [ErrorReporting] Configuration updated");
    this.logCurrentConfig();
  }

  /**
   * Get current error queue statistics
   */
  @logMethod()
  @catchError()
  public getStatistics(): {
    queuedErrors: number;
    reportedErrors: number;
    rateLimitRemaining: number;
    isRunning: boolean;
  } {
    const rateLimitRemaining = Math.max(
      0,
      this.config.maxErrorsPerWindow - this.rateLimitCounter,
    );

    return {
      queuedErrors: this.errorQueue.length,
      reportedErrors: this.reportedErrors.size,
      rateLimitRemaining,
      isRunning: this.isRunning,
    };
  }

  /**
   * QUALIA.CODE v1.0: Subscribe to Error events from EventBus
   */
  private subscribeToErrorEvents(): void {
    this.errorEventSubscriptionId = this.eventBus.subscribe(
      "Error",
      (event: ErrorEvent) => this.handleErrorEvent(event),
    );
    this.logger.info("📡 [ErrorReporting] Subscribed to Error events");
  }

  /**
   * Unsubscribe from Error events
   */
  private unsubscribeFromErrorEvents(): void {
    if (this.errorEventSubscriptionId) {
      this.eventBus.unsubscribe(this.errorEventSubscriptionId);
      this.errorEventSubscriptionId = null;
      this.logger.info("📡 [ErrorReporting] Unsubscribed from all events");
    }
  }

  /**
   * Handle incoming error events from EventBus
   */
  private async handleErrorEvent(event: ErrorEvent): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn(
        "⚠️ [ErrorReporting] Received error event while service is stopped",
      );
      return;
    }

    // Validate error event
    if (!event || !event.error) {
      this.logger.warn("⚠️ [ErrorReporting] Received malformed error event");
      return;
    }

    // Check rate limiting
    if (this.shouldRateLimit()) {
      this.logger.warn("🚫 [ErrorReporting] Rate limit exceeded, dropping error");
      return;
    }

    try {
      // Create error report
      const errorReport = this.createErrorReport(event);

      // Add to queue
      this.errorQueue.push(errorReport);
      this.rateLimitCounter++;

      this.logger.info(
        `🔍 [ErrorReporting] Error queued: ${errorReport.severity} - ${errorReport.error.message}`,
      );

      // Process immediately if batch is full
      if (this.errorQueue.length >= this.config.batchSize) {
        await this.processBatch();
      }

      // Note: We don't emit ErrorReported events to prevent infinite loops
    } catch (processingError) {
      this.logger.error(
        "❌ [ErrorReporting] Failed to process error event:",
        { error: processingError },
      );
    }
  }

  /**
   * Create error report from error event
   */
  private createErrorReport(event: ErrorEvent): ErrorReport {
    const reportId = this.generateReportId();
    const severity = event.severity || this.categorizeError(event.error);

    return {
      id: reportId,
      error: event.error,
      severity,
      timestamp: event.timestamp || new Date(),
      context: event.metadata,
      stack: event.error?.stack || "No stack trace available",
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "Node.js",
      source: event.source || "Unknown",
    };
  }

  /**
   * Automatic error categorization based on error characteristics
   */
  private categorizeError(error: Error): ErrorSeverity {
    if (!error || !error.message) {
      return "low";
    }

    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || "";

    // Critical errors
    if (
      message.includes("out of memory") ||
      message.includes("maximum call stack") ||
      message.includes("network error") ||
      message.includes("security")
    ) {
      return "critical";
    }

    // High severity errors
    if (
      message.includes("reference error") ||
      message.includes("type error") ||
      message.includes("range error") ||
      stack.includes("unhandled")
    ) {
      return "high";
    }

    // Medium severity errors
    if (
      message.includes("syntax error") ||
      message.includes("validation") ||
      message.includes("timeout")
    ) {
      return "medium";
    }

    // Default to low severity
    return "low";
  }

  /**
   * Check if rate limiting should be applied
   */
  private shouldRateLimit(): boolean {
    const now = Date.now();

    // Reset rate limit if window has passed
    if (now >= this.rateLimitResetTime) {
      this.resetRateLimit();
    }

    return this.rateLimitCounter >= this.config.maxErrorsPerWindow;
  }

  /**
   * Reset rate limiting counter
   */
  private resetRateLimit(): void {
    this.rateLimitCounter = 0;
    this.rateLimitResetTime = Date.now() + this.config.rateLimitWindow;
  }

  /**
   * Start batch processing timer
   */
  private startBatchTimer(): void {
    this.batchTimer = setInterval(async () => {
      if (this.errorQueue.length > 0) {
        await this.processBatch();
      }
    }, this.config.batchTimeout);
  }

  /**
   * Start cleanup timer for old error reports
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldReports();
    }, this.config.maxRetentionTime / 2); // Run cleanup every 30 minutes
  }

  /**
   * Stop all timers
   */
  private stopTimers(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Process a batch of errors
   */
  private async processBatch(): Promise<void> {
    if (this.errorQueue.length === 0) {
      return;
    }

    const batch = this.errorQueue.splice(0, this.config.batchSize);
    this.logger.info(
      `📦 [ErrorReporting] Processing batch of ${batch.length} errors`,
    );

    try {
      const response = await this.reportToExternalService(batch);

      if (response.success) {
        // Mark errors as reported
        batch.forEach((report) => this.reportedErrors.add(report.id));
        this.logger.info(
          `✅ [ErrorReporting] Successfully reported ${batch.length} errors`,
        );
      } else {
        // Re-queue errors for retry
        this.errorQueue.unshift(...batch);
        this.logger.warn(
          `⚠️ [ErrorReporting] Failed to report errors: ${response.error}`,
        );
      }
    } catch (error) {
      // Re-queue errors for retry
      this.errorQueue.unshift(...batch);
      this.logger.warn(
        "⚠️ [ErrorReporting] Exception during batch processing:",
        { error: error },
      );
    }
  }

  /**
   * Process any pending errors when stopping
   */
  private async processPendingErrors(): Promise<void> {
    if (this.errorQueue.length > 0) {
      this.logger.info(
        `🔄 [ErrorReporting] Processing ${this.errorQueue.length} pending errors`,
      );
      await this.processBatch();
    }
  }

  /**
   * Simulate external service reporting
   */
  private async reportToExternalService(
    _reports: ErrorReport[],
  ): Promise<ExternalServiceResponse> {
    const startTime = performance.now();

    try {
      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 1000 + 500),
      );

      // Simulate occasional failures (10% failure rate)
      if (Math.random() < 0.1) {
        return {
          success: false,
          error: "External service temporarily unavailable",
        };
      }

      // Simulate successful response
      const reportId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const duration = performance.now() - startTime;
      this.logger.info(
        `🌐 [ErrorReporting] External service responded in ${duration.toFixed(2)}ms`,
      );

      return {
        success: true,
        reportId,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `🌐 [ErrorReporting] External service error after ${duration.toFixed(2)}ms:`,
        { error: error },
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Clean up old error reports to prevent memory leaks
   */
  private cleanupOldReports(): void {
    const initialSize = this.reportedErrors.size;

    // Remove old reported error IDs (we don't store full reports for reported errors)
    // This is a simplified cleanup - in a real implementation, we'd track timestamps
    const oldReportIds = Array.from(this.reportedErrors).slice(
      0,
      Math.floor(this.reportedErrors.size / 2),
    );
    oldReportIds.forEach((id) => this.reportedErrors.delete(id));

    const cleanedCount = initialSize - this.reportedErrors.size;
    if (cleanedCount > 0) {
      this.logger.info(
        `🧹 [ErrorReporting] Cleaned up ${cleanedCount} old error reports`,
      );
    }
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `error_${timestamp}_${random}`;
  }

  /**
   * Log current configuration for debugging
   */
  private logCurrentConfig(): void {
    this.logger.info("📊 [ErrorReporting] Current Configuration:", {
      rateLimitWindow: `${this.config.rateLimitWindow}ms`,
      maxErrorsPerWindow: this.config.maxErrorsPerWindow,
      batchSize: this.config.batchSize,
      batchTimeout: `${this.config.batchTimeout}ms`,
      maxRetentionTime: `${this.config.maxRetentionTime}ms`,
      externalServiceUrl: this.config.externalServiceUrl,
      retryAttempts: this.config.retryAttempts,
    });
  }
}

// Utility function to create an error reporting service instance
/**
 * QUALIA.CODE COMPLIANCE: Direct service instantiation is forbidden.
 * Services must be created through CompositionRoot dependency injection.
 * Use the useServices() hook to access ErrorReportingService.
 */
