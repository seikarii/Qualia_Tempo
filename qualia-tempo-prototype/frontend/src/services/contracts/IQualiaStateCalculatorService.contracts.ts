/**
 * QUALIA.CODE v1.1 - IQualiaStateCalculatorService Contracts
 * Single Source of Truth for QualiaStateCalculatorService data structures.
 * This file is manually maintained for QualiaStateCalculatorService-specific contracts.
 */

// QualiaCalculator Configuration - Migrated from ConfigurationService.ts
export interface QualiaCalculatorConfig {
  baseQualiaState: {
    intensity: number;
    precision: number;
    aggression: number;
    flow: number;
    chaos: number;
    recovery: number;
    transcendence: number;
  };
  precision: {
    hitBonus: number;
    missPenalty: number;
    maxValue: number;
    minValue: number;
    decayRate: number;
  };
  flow: {
    perfectHitBonus: number;
    goodHitBonus: number;
    missPenalty: number;
    maxValue: number;
    minValue: number;
    decayRate: number;
  };
  chaos: {
    missIncrease: number;
    decayAmount: number;
    maxValue: number;
    minValue: number;
    decayRate: number;
  };
  aggression: {
    comboMultiplier: number;
    maxCombo: number;
    maxValue: number;
    minValue: number;
    decayRate: number;
  };
  rhythm: {
    perfectWindow: number;
    goodWindow: number;
    missThreshold: number;
  };
  combo: {
    resetTime: number;
    multiplierCap: number;
  };
  performanceMultipliers: {
    perfect: number;
    good: number;
    miss: number;
    combo: number;
  };
  updateIntervalMs: number;
  historySize: number;
  // Additional properties used by QualiaStateCalculatorService
  hitNoteMultipliers: { intensity: number; precision: number; flow: number };
  missNoteMultipliers: { chaos: number; precision: number; flow: number };
  dashMultipliers: { aggression: number; intensity: number };
  fastForwardMultipliers: { aggression: number; intensity: number };
  rewindMultipliers: { recovery: number; precision: number };
  updateInterval: number; // Legacy property - mapped to updateIntervalMs
  intensityDecay: number;
  precisionDecay: number;
  aggressionDecay: number;
  flowDecay: number;
  chaosDecay: number;
  recoveryDecay: number;
  transcendenceDecay: number;
  transcendenceThresholds: {
    intensity: number;
    precision: number;
    flow: number;
  };
  minValue: number;
  maxValue: number;
}