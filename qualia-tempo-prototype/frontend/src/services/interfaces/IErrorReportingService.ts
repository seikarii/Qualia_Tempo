/**
 * QUALIA.CODE v1.1 - IErrorReportingService Interface
 * Complete contract for production-grade error reporting with batching and external service integration.
 */

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Base error report interface
export interface ErrorReport {
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  severity: ErrorSeverity;
  timestamp: Date;
  context?: Record<string, any>;
}

// Error batch interface
export interface ErrorBatch {
  errors: ErrorReport[];
  timestamp: Date;
}

// Error reporting statistics
export interface ErrorStatistics {
  totalErrors: number;
  totalBatches: number;
  successfulReports: number;
  failedReports: number;
  duplicatesFiltered: number;
  averageRetries: number;
}

// Error reporting configuration
export interface ErrorReportingConfig {
  enabled: boolean;
  maxBatchSize?: number;
  batchFlushInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
  rateLimitTokens?: number;
  rateLimitRefillRate?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  enableDeduplication?: boolean;
  memoryCleanupThreshold?: number;
}

// Service interface
export interface IErrorReportingService {
  start(): void;
  stop(): void;
  reportError(error: Error, severity?: ErrorSeverity, context?: Record<string, any>): Promise<void>;
  updateConfig(newConfig: Partial<ErrorReportingConfig>): void;
  getStatistics(): ErrorStatistics;
  exportErrorData(): any;
  forceFlush(): Promise<void>;
  clearHistory(): void;
  clearStatistics(): void;
  setReportingLevel(level: ErrorSeverity): void;
  isEnabled(): boolean;
}
