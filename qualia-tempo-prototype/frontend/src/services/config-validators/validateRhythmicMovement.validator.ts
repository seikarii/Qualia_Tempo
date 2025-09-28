/**
 * QUALIA.CODE v1.1 - RhythmicMovement Configuration Validator
 * Modular validation for RhythmicMovement configuration section.
 */

import type { RhythmicMovementConfig } from '../contracts/IRhythmicMovementController.contracts';

/**
 * Validate RhythmicMovement configuration section.
 * @param config - RhythmicMovement configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateRhythmicMovementConfig(config: Partial<RhythmicMovementConfig> | undefined): void {
  if (typeof config?.bpm !== 'number' || config.bpm <= 0) {
    throw new Error('Invalid rhythmicMovement.bpm configuration: must be positive number');
  }
  
  if (typeof config?.perfectTiming !== 'number' || config.perfectTiming <= 0) {
    throw new Error('Invalid rhythmicMovement.perfectTiming configuration: must be positive number');
  }
  
  if (typeof config?.goodTiming !== 'number' || config.goodTiming <= 0) {
    throw new Error('Invalid rhythmicMovement.goodTiming configuration: must be positive number');
  }
  
  if (typeof config?.gridSize !== 'number' || config.gridSize <= 0) {
    throw new Error('Invalid rhythmicMovement.gridSize configuration: must be positive number');
  }
  
  if (typeof config?.keyThrottleMs !== 'number' || config.keyThrottleMs < 0) {
    throw new Error('Invalid rhythmicMovement.keyThrottleMs configuration: must be non-negative number');
  }
}