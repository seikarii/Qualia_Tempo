import type { ErrorReport, ErrorBatch } from "../interfaces/IErrorReportingService";

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
  context?: Record<string, any>;
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
  rateLimitRefillInterval: number;
  fingerprintLength: number;
  
  // Properties expected by validator
  rateLimitWindow: number;
  maxErrorsPerWindow: number;
  externalServiceUrl: string;
  
  // External service configuration
  externalService: ExternalServiceConfig;
}