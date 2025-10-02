/**
 * QUALIA.CODE v1.1 - QualiaCalculator Configuration Validator
 * Modular validation for QualiaCalculator configuration section.
 */

import type { QualiaCalculatorConfig } from '../contracts/IQualiaStateCalculatorService.contracts';

/**
 * Validate QualiaCalculator configuration section.
 * @param config - QualiaCalculator configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateQualiaCalculatorConfig(config: Partial<QualiaCalculatorConfig> | undefined): void {
  if (!config?.baseQualiaState) {
    throw new Error('Invalid qualiaCalculator.baseQualiaState configuration: must be defined object');
  }
  
  const requiredBaseFields = ['intensity', 'precision', 'aggression', 'flow', 'chaos', 'recovery', 'transcendence'];
  for (const field of requiredBaseFields) {
    if (typeof (config.baseQualiaState as Record<string, unknown>)?.[field] !== 'number') {
      throw new Error(`Invalid qualiaCalculator.baseQualiaState.${field} configuration: must be number`);
    }
  }
  
  if (!config?.performanceMultipliers) {
    throw new Error('Invalid qualiaCalculator.performanceMultipliers configuration: must be defined object');
  }
  
  if (typeof config?.updateIntervalMs !== 'number' || config.updateIntervalMs <= 0) {
    throw new Error('Invalid qualiaCalculator.updateIntervalMs configuration: must be positive number');
  }
  
  if (typeof config?.historySize !== 'number' || config.historySize <= 0) {
    throw new Error('Invalid qualiaCalculator.historySize configuration: must be positive number');
  }
}