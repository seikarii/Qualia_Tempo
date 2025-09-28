/**
 * QUALIA.CODE v1.1 - IApplicationInitializerService Contracts
 * Single Source of Truth for ApplicationInitializerService data structures.
 * This file is manually maintained for ApplicationInitializerService-specific contracts.
 */

// ApplicationInitializer Configuration - Migrated from ConfigurationService.ts
export interface AppInitializerConfig {
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  maxInitRetries: number;
  initTimeout: number;
  enableDebugLogging: boolean;
}