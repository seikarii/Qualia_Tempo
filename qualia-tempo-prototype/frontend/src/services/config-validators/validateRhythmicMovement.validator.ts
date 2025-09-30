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

  if (typeof config?.audioBeatDetectionThreshold !== 'number' || config.audioBeatDetectionThreshold <= 0) {
    throw new Error('Invalid rhythmicMovement.audioBeatDetectionThreshold configuration: must be positive number');
  }

  if (!Array.isArray(config?.availableMovements) || config.availableMovements.length === 0) {
    throw new Error('Invalid rhythmicMovement.availableMovements configuration: must be non-empty array');
  }

  if (typeof config?.optimalTimingPredictionConfidencePlaying !== 'number' ||
      config.optimalTimingPredictionConfidencePlaying < 0 || config.optimalTimingPredictionConfidencePlaying > 1) {
    throw new Error('Invalid rhythmicMovement.optimalTimingPredictionConfidencePlaying configuration: must be number between 0 and 1');
  }

  if (typeof config?.optimalTimingPredictionConfidenceNotPlaying !== 'number' ||
      config.optimalTimingPredictionConfidenceNotPlaying < 0 || config.optimalTimingPredictionConfidenceNotPlaying > 1) {
    throw new Error('Invalid rhythmicMovement.optimalTimingPredictionConfidenceNotPlaying configuration: must be number between 0 and 1');
  }

  if (typeof config?.sequenceDifficultyBaseComplexityMultiplier !== 'number' || config.sequenceDifficultyBaseComplexityMultiplier <= 0) {
    throw new Error('Invalid rhythmicMovement.sequenceDifficultyBaseComplexityMultiplier configuration: must be positive number');
  }

  if (typeof config?.sequenceDifficultyVarietyBonusMultiplier !== 'number' || config.sequenceDifficultyVarietyBonusMultiplier <= 0) {
    throw new Error('Invalid rhythmicMovement.sequenceDifficultyVarietyBonusMultiplier configuration: must be positive number');
  }

  if (config?.initialPlayerPositionOffset !== undefined) {
    if (!Array.isArray(config.initialPlayerPositionOffset) || config.initialPlayerPositionOffset.length !== 2) {
      throw new Error('Invalid rhythmicMovement.initialPlayerPositionOffset configuration: must be array of 2 numbers');
    }
    if (typeof config.initialPlayerPositionOffset[0] !== 'number' || typeof config.initialPlayerPositionOffset[1] !== 'number') {
      throw new Error('Invalid rhythmicMovement.initialPlayerPositionOffset configuration: must contain numbers');
    }
  }

  if (typeof config?.flowBpmMultiplier !== 'number' || config.flowBpmMultiplier < 0) {
    throw new Error('Invalid rhythmicMovement.flowBpmMultiplier configuration: must be non-negative number');
  }
}