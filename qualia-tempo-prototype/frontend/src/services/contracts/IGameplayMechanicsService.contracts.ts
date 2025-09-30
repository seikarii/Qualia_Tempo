/**
 * QUALIA.CODE v1.1 - IGameplayMechanicsService Contracts
 * Type definitions for gameplay mechanics service configuration and data structures.
 */

export interface TimingWindows {
  perfect: number; // Perfect timing window in milliseconds
  good: number;    // Good timing window in milliseconds
  miss: number;    // Miss threshold in milliseconds
}

export interface ScoreCalculationResult {
  basePoints: number;
  accuracyBonus: number;
  comboMultiplier: number;
  totalPoints: number;
}

export type HitResult = 'perfect' | 'good' | 'miss';

export interface GameplayMechanicsConfig {
  timingWindows: TimingWindows;
  scoring: {
    basePointsPerHit: number;
    perfectBonus: number;
    comboThresholds: number[];
    comboMultipliers: number[];
  };
  difficulty: {
    noteSpeed: number;
    timingTolerance: number;
  };
}
