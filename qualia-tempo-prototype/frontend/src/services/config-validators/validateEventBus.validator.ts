/**
 * QUALIA.CODE v1.1 - EventBus Configuration Validator
 * Modular validation for EventBus configuration section.
 */

import type { EventBusConfig } from '../contracts/IEventBus.contracts';

/**
 * Validate EventBus configuration section.
 * @param config - EventBus configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateEventBusConfig(config: Partial<EventBusConfig> | undefined): void {
  if (typeof config?.performance?.maxEventHistory !== 'number' || config.performance.maxEventHistory <= 0) {
    throw new Error('Invalid eventbus.performance.maxEventHistory configuration: must be positive number');
  }
  
  if (typeof config?.performance?.maxConcurrentEvents !== 'number' || config.performance.maxConcurrentEvents <= 0) {
    throw new Error('Invalid eventbus.performance.maxConcurrentEvents configuration: must be positive number');
  }
  
  if (typeof config?.performance?.cleanupInterval !== 'number' || config.performance.cleanupInterval <= 0) {
    throw new Error('Invalid eventbus.performance.cleanupInterval configuration: must be positive number');
  }
  
  if (typeof config?.errorHandling?.maxRetries !== 'number' || config.errorHandling.maxRetries < 0) {
    throw new Error('Invalid eventbus.errorHandling.maxRetries configuration: must be non-negative number');
  }
  
  if (typeof config?.development?.enableEventLogging !== 'boolean') {
    throw new Error('Invalid eventbus.development.enableEventLogging configuration: must be boolean');
  }
}