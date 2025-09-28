/**
 * QUALIA.CODE v1.1 - CompositionRoot Configuration Validator
 * Modular validation for CompositionRoot configuration section.
 */

import type { CompositionRootConfig } from '../contracts/IApplicationCompositionRoot.contracts';

/**
 * Validate CompositionRoot configuration section.
 * @param config - CompositionRoot configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateCompositionRootConfig(config: Partial<CompositionRootConfig> | undefined): void {
  if (typeof config?.autoStart !== 'boolean') {
    throw new Error('Invalid compositionRoot.autoStart configuration: must be boolean');
  }
  
  if (typeof config?.enableBackendSync !== 'boolean') {
    throw new Error('Invalid compositionRoot.enableBackendSync configuration: must be boolean');
  }
  
  if (typeof config?.healthCheckIntervalMs !== 'number' || config.healthCheckIntervalMs <= 0) {
    throw new Error('Invalid compositionRoot.healthCheckIntervalMs configuration: must be positive number');
  }
  
  if (!config?.http?.defaultTimeout || typeof config.http.defaultTimeout !== 'number') {
    throw new Error('Invalid compositionRoot.http.defaultTimeout configuration: must be positive number');
  }
}