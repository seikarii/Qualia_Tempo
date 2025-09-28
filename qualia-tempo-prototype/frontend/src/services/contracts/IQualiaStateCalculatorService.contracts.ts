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
  performanceMultipliers: {
    perfectHit: number;
    goodHit: number;
    missHit: number;
    comboBonus: number;
  };
  decayRates: {
    intensity: number;
    precision: number;
    aggression: number;
    flow: number;
    chaos: number;
    recovery: number;
    transcendence: number;
  };
  thresholds: {
    highIntensity: number;
    lowPrecision: number;
    chaosThreshold: number;
    transcendenceThreshold: number;
  };
  comboSystem: {
    maxComboMultiplier: number;
    comboDecayTime: number;
    perfectComboBonus: number;
  };
  recoveryMechanics: {
    recoveryRate: number;
    maxRecovery: number;
    recoveryCooldown: number;
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