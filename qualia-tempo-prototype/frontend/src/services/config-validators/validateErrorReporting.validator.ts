/**
 * QUALIA.CODE v1.1 - ErrorReporting Configuration Validator
 * Modular validation for ErrorReporting configuration section.
 */

import type { ErrorReportingConfig } from '../contracts/IErrorReportingService.contracts';

/**
 * Validate ErrorReporting configuration section.
 * @param config - ErrorReporting configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateErrorReportingConfig(config: Partial<ErrorReportingConfig> | undefined): void {
  if (typeof config?.rateLimitWindow !== 'number' || config.rateLimitWindow <= 0) {
    throw new Error('Invalid errorReporting.rateLimitWindow configuration: must be positive number');
  }
  
  if (typeof config?.maxErrorsPerWindow !== 'number' || config.maxErrorsPerWindow <= 0) {
    throw new Error('Invalid errorReporting.maxErrorsPerWindow configuration: must be positive number');
  }
  
  if (typeof config?.batchSize !== 'number' || config.batchSize <= 0) {
    throw new Error('Invalid errorReporting.batchSize configuration: must be positive number');
  }
  
  if (!config?.externalServiceUrl || typeof config.externalServiceUrl !== 'string') {
    throw new Error('Invalid errorReporting.externalServiceUrl configuration: must be non-empty string');
  }
}