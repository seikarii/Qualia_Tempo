/**
 * QUALIA.CODE v1.1 - DebugService Configuration Validator
 * Modular validation for DebugService configuration section.
 */

import type { DebugServiceConfig } from '../contracts/IDebugService.contracts';

/**
 * Validate DebugService configuration section.
 * @param config - DebugService configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateDebugServiceConfig(config: Partial<DebugServiceConfig> | undefined): void {
  if (!config?.logging?.logLevel || typeof config.logging.logLevel !== 'string') {
    throw new Error('Invalid debugService.logging.logLevel configuration: must be non-empty string');
  }
  
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.logging.logLevel.toLowerCase())) {
    throw new Error(`Invalid debugService.logging.logLevel configuration: must be one of ${validLogLevels.join(', ')}`);
  }
  
  if (typeof config?.eventMonitoring?.maxEventHistory !== 'number' || config.eventMonitoring.maxEventHistory <= 0) {
    throw new Error('Invalid debugService.eventMonitoring.maxEventHistory configuration: must be positive number');
  }
  
  if (typeof config?.performance?.enablePerformanceTracking !== 'boolean') {
    throw new Error('Invalid debugService.performance.enablePerformanceTracking configuration: must be boolean');
  }
  
  if (typeof config?.development?.enableDebugOverlay !== 'boolean') {
    throw new Error('Invalid debugService.development.enableDebugOverlay configuration: must be boolean');
  }
}