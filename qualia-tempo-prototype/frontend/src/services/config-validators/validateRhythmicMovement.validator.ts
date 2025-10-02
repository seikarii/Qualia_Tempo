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
  validateBasicNumericFields(config);
  validateTimingFields(config);
  validateDifficultyFields(config);
  validateOptionalFields(config);
}

function validateBasicNumericFields(config: Partial<RhythmicMovementConfig> | undefined): void {
  validatePositiveNumber(config?.bpm, 'bpm');
  validatePositiveNumber(config?.gridSize, 'gridSize');
  validateNonNegativeNumber(config?.keyThrottleMs, 'keyThrottleMs');
  validatePositiveNumber(config?.audioBeatDetectionThreshold, 'audioBeatDetectionThreshold');

  if (!Array.isArray(config?.availableMovements) || config.availableMovements.length === 0) {
    throw new Error('Invalid rhythmicMovement.availableMovements configuration: must be non-empty array');
  }
}

function validateTimingFields(config: Partial<RhythmicMovementConfig> | undefined): void {
  validatePositiveNumber(config?.perfectTiming, 'perfectTiming');
  validatePositiveNumber(config?.goodTiming, 'goodTiming');
  
  validateRangeNumber(config?.optimalTimingPredictionConfidencePlaying, 'optimalTimingPredictionConfidencePlaying', 0, 1);
  validateRangeNumber(config?.optimalTimingPredictionConfidenceNotPlaying, 'optimalTimingPredictionConfidenceNotPlaying', 0, 1);
}

function validateDifficultyFields(config: Partial<RhythmicMovementConfig> | undefined): void {
  validatePositiveNumber(config?.sequenceDifficultyBaseComplexityMultiplier, 'sequenceDifficultyBaseComplexityMultiplier');
  validatePositiveNumber(config?.sequenceDifficultyVarietyBonusMultiplier, 'sequenceDifficultyVarietyBonusMultiplier');
}

function validateOptionalFields(config: Partial<RhythmicMovementConfig> | undefined): void {
  if (config?.initialPlayerPositionOffset !== undefined) {
    if (!Array.isArray(config.initialPlayerPositionOffset) || config.initialPlayerPositionOffset.length !== 2) {
      throw new Error('Invalid rhythmicMovement.initialPlayerPositionOffset configuration: must be array of 2 numbers');
    }
    if (typeof config.initialPlayerPositionOffset[0] !== 'number' || typeof config.initialPlayerPositionOffset[1] !== 'number') {
      throw new Error('Invalid rhythmicMovement.initialPlayerPositionOffset configuration: must contain numbers');
    }
  }

  validateNonNegativeNumber(config?.flowBpmMultiplier, 'flowBpmMultiplier');
}

function validatePositiveNumber(value: number | undefined, fieldName: string): void {
  if (typeof value !== 'number' || value <= 0) {
    throw new Error(`Invalid rhythmicMovement.${fieldName} configuration: must be positive number`);
  }
}

function validateNonNegativeNumber(value: number | undefined, fieldName: string): void {
  if (typeof value !== 'number' || value < 0) {
    throw new Error(`Invalid rhythmicMovement.${fieldName} configuration: must be non-negative number`);
  }
}

function validateRangeNumber(value: number | undefined, fieldName: string, min: number, max: number): void {
  if (typeof value !== 'number' || value < min || value > max) {
    throw new Error(`Invalid rhythmicMovement.${fieldName} configuration: must be number between ${min} and ${max}`);
  }
}