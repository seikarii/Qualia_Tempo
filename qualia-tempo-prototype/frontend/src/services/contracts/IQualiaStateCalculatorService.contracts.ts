/**
 * QUALIA.CODE v1.1 - IQualiaStateCalculatorService Contracts
 * Single Source of Truth for QualiaStateCalculatorService data structures.
 * This file is manually maintained for QualiaStateCalculatorService-specific contracts.
 */

import type { IEventBus } from '../interfaces/IEventBus';
import type { ILogger } from '../interfaces/ILogger';
import type { ITimerService, IPerformanceService } from '../interfaces/ITimerService';

// QUALIA.CODE v1.1: Constructor parameter object pattern (max 4 parameters rule)
export interface QualiaStateCalculatorServiceParams {
  eventBus: IEventBus;
  logger: ILogger;
  config: QualiaCalculatorConfig;
  timerService: ITimerService;
  performanceService: IPerformanceService;
}

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
  transcendenceThresholds: {
    intensity: number;
    precision: number;
    flow: number;
  };
  minValue: number;
  maxValue: number;
  // New externalized configuration values for hardcoded constants
  transcendenceActivationValue: number;
  millisecondsToSecondsConversion: number;
  transcendenceDecayRate: number;
  transcendenceCheckValue: number;
}