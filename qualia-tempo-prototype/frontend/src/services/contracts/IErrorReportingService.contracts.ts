import type { ErrorReport, ErrorBatch } from "../interfaces/IErrorReportingService";
import type { IEventBus } from "../interfaces/IEventBus";
import type { ILogger } from "../interfaces/ILogger";
import type { IHttpService } from "../interfaces/IHttpService";
import type { ITimerService } from "../interfaces/ITimerService";

// External service configuration for error reporting
export interface ExternalServiceConfig {
  endpoint: string;
  apiKey: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  enabled: boolean;
}

// Error reporting export data structure
export interface ErrorReportingExportData {
  timestamp: number;
  sessionId: string;
  statistics: {
    totalErrors: number;
    totalBatches: number;
    successfulReports: number;
    failedReports: number;
    duplicatesFiltered: number;
    averageRetries: number;
  };
  errorHistory: ExtendedErrorReport[];
  pendingBatches: ExtendedErrorBatch[];
  circuitBreakerState: CircuitBreakerState;
  rateLimitState: RateLimitState;
  config: ErrorReportingConfig;
}

// Error severity levels with priority ordering
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

// Error report interface for external service submission
export interface ExtendedErrorReport extends ErrorReport {
  id: string;
  timestamp: Date;
  sessionId: string;
  userAgent: string;
  url: string;
  stackTrace?: string;
  context?: Record<string, unknown>;
  fingerprint: string;
  attempts: number;
  lastAttempt?: Date;
}

// Error batch for efficient bulk reporting
export interface ExtendedErrorBatch extends ErrorBatch {
  id: string;
  createdAt: Date;
  errors: ExtendedErrorReport[];
  size: number;
  totalRetries: number;
  lastRetryAt?: Date;
  status: "pending" | "processing" | "completed" | "failed";
}

// Circuit breaker state for managing external service failures
export interface CircuitBreakerState {
  state: "closed" | "open" | "half-open";
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

// Rate limiting state with token bucket algorithm
export interface RateLimitState {
  tokens: number;
  lastRefill: Date;
  maxTokens: number;
  refillRate: number; // tokens per second
}

// ErrorReporting Configuration - Migrated from ConfigurationService.ts
// Includes all Extended properties to eliminate type conflicts
export interface ErrorReportingConfig {
  // Core error reporting configuration
  enabled: boolean;
  endpoint: string;
  apiKey: string;
  environment: string;
  version: string;
  userId?: string;
  sessionId?: string;
  
  // Batching and throttling
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
  retryDelay: number;
  throttleThreshold: number;
  throttleWindow: number;
  
  // Filtering and classification
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  includeStackTrace: boolean;
  includeUserAgent: boolean;
  includeUrl: boolean;
  includeTimestamp: boolean;
  maxErrorLength: number;
  excludePatterns: string[];
  includePatterns: string[];
  
  // Extended properties to match ExtendedErrorReportingConfig
  maxBatchSize: number;
  batchFlushInterval: number;
  rateLimitTokens: number;
  rateLimitRefillRate: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  enableDeduplication: boolean;
  memoryCleanupThreshold: number;
  memoryCleanupInterval: number;
  
  // QUALIA.CODE v1.1: Event-Driven Diagnostics Configuration
  statusEmission?: {
    enabled: boolean;
    interval: number;  // Interval in milliseconds for periodic status emission
    emitOnStateChange: boolean;  // Emit when service starts/stops
    emitOnError: boolean;  // Emit when errors are reported
  };
  rateLimitRefillInterval: number;
  fingerprintLength: number;
  memoryCleanupRatio: number;  // Ratio of history to keep during cleanup
  
  // Random ID generation settings
  randomIdBase: number;  // Base for random ID generation (36 = alphanumeric)
  randomIdStart: number;  // Start position for substring extraction
  randomIdLength: number;  // Length of random ID suffix
  
  // Retry processing settings
  retryDelayMultiplier: number;  // Multiplier for retry processing interval
  
  // Time conversion
  millisecondsToSecondsConversion: number;  // Convert milliseconds to seconds
  
  // Advanced cleanup settings
  oldHistoryCleanupRatio: number;  // Ratio of old history to keep during aggressive cleanup
  duplicateRegistryMaxSize: number;  // Max size before duplicate registry cleanup
  duplicateCleanupCount: number;  // Number of duplicates to remove during cleanup
  completedBatchesCleanupCount: number;  // Number of completed batches to remove during cleanup
  
  // Properties expected by validator
  rateLimitWindow: number;
  maxErrorsPerWindow: number;
  externalServiceUrl: string;
  
  // External service configuration
  externalService: ExternalServiceConfig;
}

/**
 * QUALIA.CODE v1.1: Constructor parameters object for ErrorReportingService
 * Consolidates 5 constructor parameters into a single object to comply with IoC limits
 */
export interface ErrorReportingServiceParams {
  eventBus: IEventBus;
  logger: ILogger;
  httpService: IHttpService;
  timerService: ITimerService;
  config: ErrorReportingConfig;
}