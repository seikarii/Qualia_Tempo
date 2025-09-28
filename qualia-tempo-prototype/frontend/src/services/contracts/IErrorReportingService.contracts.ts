/**
 * QUALIA.CODE v1.1 - IErrorReportingService Contracts
 * Single Source of Truth for ErrorReportingService data structures.
 * This file is manually maintained for ErrorReportingService-specific contracts.
 */

// ErrorReporting Configuration - Migrated from ConfigurationService.ts
export interface ErrorReportingConfig {
  rateLimitWindow: number;
  maxErrorsPerWindow: number;
  batchSize: number;
  batchTimeout: number;
  maxRetentionTime: number;
  externalServiceUrl: string;
  retryAttempts: number;
  enableCompression: boolean;
  maxBatchSizeBytes: number;
  enableErrorFiltering: boolean;
  filterSensitiveData: boolean;
  allowedDomains: string[];
  cleanupInterval: number; // CRISALIDA.CODE: Explicit cleanup timer interval
}