/**
 * QUALIA.CODE v1.1 - IHttpService Contracts
 * Single Source of Truth for HttpService data structures.
 * This file is manually maintained for HttpService-specific contracts.
 */

// HttpService Configuration - Migrated from ConfigurationService.ts
export interface HttpConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
  enableCompression: boolean;
  enableCaching: boolean;
}