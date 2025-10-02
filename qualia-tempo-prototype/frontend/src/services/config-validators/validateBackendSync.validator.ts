/**
 * QUALIA.CODE v1.1 - BackendSync Configuration Validator
 * Modular validation for BackendSync configuration section.
 */

import type { BackendSyncConfig } from '../contracts/IBackendSyncService.contracts';

/**
 * Validate BackendSync configuration section.
 * @param config - BackendSync configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateBackendSyncConfig(config: Partial<BackendSyncConfig> | undefined): void {
  validateApiConfig(config);
  validateSyncConfig(config);
  validateConnectionConfig(config);
}

function validateApiConfig(config: Partial<BackendSyncConfig> | undefined): void {
  if (!config?.api?.baseUrl || typeof config.api.baseUrl !== 'string') {
    throw new Error('Invalid backendSync.api.baseUrl configuration: must be non-empty string');
  }
  
  if (!config?.api?.qualiaEndpoint || typeof config.api.qualiaEndpoint !== 'string') {
    throw new Error('Invalid backendSync.api.qualiaEndpoint configuration: must be non-empty string');
  }
  
  if (typeof config?.api?.timeout !== 'number' || config.api.timeout <= 0) {
    throw new Error('Invalid backendSync.api.timeout configuration: must be positive number');
  }
}

function validateSyncConfig(config: Partial<BackendSyncConfig> | undefined): void {
  if (typeof config?.sync?.throttleDelay !== 'number' || config.sync.throttleDelay < 0) {
    throw new Error('Invalid backendSync.sync.throttleDelay configuration: must be non-negative number');
  }
}

function validateConnectionConfig(config: Partial<BackendSyncConfig> | undefined): void {
  if (typeof config?.connection?.healthCheckInterval !== 'number' || config.connection.healthCheckInterval <= 0) {
    throw new Error('Invalid backendSync.connection.healthCheckInterval configuration: must be positive number');
  }
}