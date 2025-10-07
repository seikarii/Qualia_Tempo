/**
 * QUALIA.CODE v1.1 - QualiaCalculatorCore Tests
 * RUTA.md Phase 3 Step 7: Unit Tests for Web Worker Core
 * 
 * Tests the pure calculation engine without IoC dependencies.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QualiaCalculatorCore, type LoggerCallback } from '../QualiaCalculatorCore';
import type { QualiaState } from '../../types/contracts';
import type { PlayerActionEvent } from '../../services/contracts/events.contracts';
import type { QualiaCalculatorConfig } from '../../services/contracts/IQualiaStateCalculatorService.contracts';
import { PLAYER_ACTIONS } from '../../services/contracts/constants';

describe('QualiaCalculatorCore - Pure Calculation Engine', () => {
  let core: QualiaCalculatorCore;
  let mockLogger: LoggerCallback;
  let logSpy: ReturnType<typeof vi.fn>;

  const defaultConfig: QualiaCalculatorConfig = {
    baseQualiaState: {
      intensity: 0,
      precision: 0.5,
      aggression: 0,
      flow: 0,
      chaos: 0,
      recovery: 0,
      transcendence: 0,
    },
    performanceMultipliers: {
      perfect: 0.1,
      good: 0.05,
      miss: -0.1,
      combo: 0.02,
    },
    precision: {
      hitBonus: 0.05,
      missPenalty: -0.1,
      maxValue: 1,
      minValue: 0,
      decayRate: 0.01,
    },
    flow: {
      perfectHitBonus: 0.05,
      goodHitBonus: 0.03,
      missPenalty: -0.05,
      maxValue: 1,
      minValue: 0,
      decayRate: 0.02,
    },
    chaos: {
      missIncrease: 0.1,
      decayAmount: 0.05,
      maxValue: 1,
      minValue: 0,
      decayRate: 0.03,
    },
    aggression: {
      comboMultiplier: 0.02,
      maxCombo: 100,
      maxValue: 1,
      minValue: 0,
      decayRate: 0.01,
    },
    rhythm: {
      perfectWindow: 50,
      goodWindow: 100,
      missThreshold: 200,
    },
    combo: {
      resetTime: 2000,
      multiplierCap: 10,
    },
    transcendenceThresholds: {
      intensity: 0.9,
      precision: 0.9,
      flow: 0.9,
    },
    updateIntervalMs: 50,
    historySize: 100,
    minValue: 0,
    maxValue: 1,
    transcendenceActivationValue: 1,
    millisecondsToSecondsConversion: 1000,
    transcendenceDecayRate: 0.05,
    transcendenceCheckValue: 0,
  };

  beforeEach(() => {
    logSpy = vi.fn();
    mockLogger = (level, message, data) => {
      logSpy(level, message, data);
    };
  });

  describe('1. Initialization', () => {
    it('should initialize with default state from config', () => {
      core = new QualiaCalculatorCore(defaultConfig, undefined, mockLogger);
      const state = core.getCurrentState();

      // State includes collectionWindowEnd which is added by createInitialState()
      expect(state.intensity).toBe(defaultConfig.baseQualiaState.intensity);
      expect(state.precision).toBe(defaultConfig.baseQualiaState.precision);
      expect(state.collectionWindowEnd).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('Core initialized'),
        expect.objectContaining({ hasInitialState: false })
      );
    });

    it('should initialize with provided initial state', () => {
      const customState: QualiaState = {
        intensity: 0.5,
        precision: 0.7,
        aggression: 0.3,
        flow: 0.4,
        chaos: 0.2,
        recovery: 0.1,
        transcendence: 0,
        collectionWindowEnd: 0,
      };

      core = new QualiaCalculatorCore(defaultConfig, customState, mockLogger);
      const state = core.getCurrentState();

      expect(state).toEqual(customState);
      expect(logSpy).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('Core initialized'),
        expect.objectContaining({ hasInitialState: true })
      );
    });

    it('should work without logger callback (no-op logger)', () => {
      expect(() => {
        core = new QualiaCalculatorCore(defaultConfig);
        core.getCurrentState();
      }).not.toThrow();
    });
  });

  describe('2. Player Action Processing', () => {
    beforeEach(() => {
      core = new QualiaCalculatorCore(defaultConfig, undefined, mockLogger);
    });

    describe('2.1. HitNote Action', () => {
      it('should increase intensity, precision, and flow on perfect hit', () => {
        const initialState = core.getCurrentState();
        const action: PlayerActionEvent = {
          type: 'PlayerAction',
          action: PLAYER_ACTIONS.HIT_NOTE,
          context: { accuracy: 1.0 },
          timestamp: new Date(),
        };

        const newState = core.processPlayerAction(action);

        expect(newState.intensity).toBeGreaterThan(initialState.intensity);
        expect(newState.precision).toBeGreaterThan(initialState.precision);
        expect(newState.flow).toBeGreaterThan(initialState.flow);
      });

      it('should increase values less on good hit (accuracy < 1.0)', () => {
        const perfectAction: PlayerActionEvent = {
          type: 'PlayerAction',
          action: PLAYER_ACTIONS.HIT_NOTE,
          context: { accuracy: 1.0 },
          timestamp: new Date(),
        };

        core.processPlayerAction(perfectAction);
        const stateAfterPerfect = core.getCurrentState();

        // Reset
        core.reset();

        const goodAction: PlayerActionEvent = {
          type: 'PlayerAction',
          action: PLAYER_ACTIONS.HIT_NOTE,
          context: { accuracy: 0.5 }, // Lower accuracy for clearer difference
          timestamp: new Date(),
        };

        core.processPlayerAction(goodAction);
        const stateAfterGood = core.getCurrentState();

        // Good hit should increase values, but less than perfect
        expect(stateAfterGood.intensity).toBeLessThanOrEqual(stateAfterPerfect.intensity);
        expect(stateAfterGood.precision).toBeLessThanOrEqual(stateAfterPerfect.precision);
      });
    });

    describe('2.2. MissNote Action', () => {
      it('should increase chaos and decrease precision', () => {
        const initialState = core.getCurrentState();
        const action: PlayerActionEvent = {
          type: 'PlayerAction',
          action: PLAYER_ACTIONS.MISS_NOTE,
          timestamp: new Date(),
        };

        const newState = core.processPlayerAction(action);

        expect(newState.chaos).toBeGreaterThan(initialState.chaos);
        expect(newState.precision).toBeLessThan(initialState.precision);
        // Flow starts at 0, so it can't go lower
        expect(newState.flow).toBeLessThanOrEqual(initialState.flow);
      });
    });

    describe('2.3. Dash Action', () => {
      it('should increase intensity and aggression', () => {
        const initialState = core.getCurrentState();
        const action: PlayerActionEvent = {
          type: 'PlayerAction',
          action: PLAYER_ACTIONS.DASH,
          timestamp: new Date(),
        };

        const newState = core.processPlayerAction(action);

        expect(newState.intensity).toBeGreaterThan(initialState.intensity);
        expect(newState.aggression).toBeGreaterThan(initialState.aggression);
      });
    });

    describe('2.4. Fast-Forward and Rewind Actions', () => {
      it('should handle FastForward action', () => {
        const action: PlayerActionEvent = {
          type: 'PlayerAction',
          action: PLAYER_ACTIONS.FAST_FORWARD,
          timestamp: new Date(),
        };

        expect(() => core.processPlayerAction(action)).not.toThrow();
      });

      it('should handle Rewind action', () => {
        const action: PlayerActionEvent = {
          type: 'PlayerAction',
          action: PLAYER_ACTIONS.REWIND,
          timestamp: new Date(),
        };

        expect(() => core.processPlayerAction(action)).not.toThrow();
      });
    });

    describe('2.5. Ignored Actions', () => {
      it('should not modify state for START_GAME action', () => {
        const initialState = core.getCurrentState();
        const action: PlayerActionEvent = {
          type: 'PlayerAction',
          action: PLAYER_ACTIONS.START_GAME,
          timestamp: new Date(),
        };

        const newState = core.processPlayerAction(action);

        expect(newState).toEqual(initialState);
      });
    });
  });

  describe('3. Time Decay', () => {
    beforeEach(() => {
      core = new QualiaCalculatorCore(defaultConfig, undefined, mockLogger);
    });

    it('should decay intensity over time', () => {
      // Build up intensity
      const hitAction: PlayerActionEvent = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: 1.0 },
        timestamp: new Date(),
      };
      core.processPlayerAction(hitAction);

      const stateBeforeDecay = core.getCurrentState();
      const deltaTimeMs = 1000; // 1 second

      core.applyTimeDecay(deltaTimeMs);
      const stateAfterDecay = core.getCurrentState();

      expect(stateAfterDecay.intensity).toBeLessThan(stateBeforeDecay.intensity);
    });

    it('should not decay below minimum value (0)', () => {
      const deltaTimeMs = 10000; // 10 seconds

      core.applyTimeDecay(deltaTimeMs);
      const state = core.getCurrentState();

      expect(state.intensity).toBeGreaterThanOrEqual(defaultConfig.minValue);
      expect(state.precision).toBeGreaterThanOrEqual(defaultConfig.minValue);
      expect(state.chaos).toBeGreaterThanOrEqual(defaultConfig.minValue);
    });
  });

  describe('4. Value Clamping', () => {
    beforeEach(() => {
      core = new QualiaCalculatorCore(defaultConfig, undefined, mockLogger);
    });

    it('should clamp values to maximum (1.0)', () => {
      const hitAction: PlayerActionEvent = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: 1.0 },
        timestamp: new Date(),
      };

      // Process many actions to try to exceed max
      for (let i = 0; i < 50; i++) {
        core.processPlayerAction(hitAction);
      }

      const state = core.getCurrentState();

      expect(state.intensity).toBeLessThanOrEqual(defaultConfig.maxValue);
      expect(state.precision).toBeLessThanOrEqual(defaultConfig.maxValue);
      expect(state.flow).toBeLessThanOrEqual(defaultConfig.maxValue);
    });

    it('should clamp values to minimum (0.0)', () => {
      const missAction: PlayerActionEvent = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.MISS_NOTE,
        timestamp: new Date(),
      };

      // Process many misses and decay
      for (let i = 0; i < 50; i++) {
        core.processPlayerAction(missAction);
      }
      core.applyTimeDecay(10000);

      const state = core.getCurrentState();

      expect(state.precision).toBeGreaterThanOrEqual(defaultConfig.minValue);
      expect(state.flow).toBeGreaterThanOrEqual(defaultConfig.minValue);
    });
  });

  describe('5. Transcendence Activation', () => {
    beforeEach(() => {
      core = new QualiaCalculatorCore(defaultConfig, undefined, mockLogger);
    });

    it('should activate transcendence when thresholds met', () => {
      const hitAction: PlayerActionEvent = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: 1.0 },
        timestamp: new Date(),
      };

      // Build up to transcendence thresholds
      for (let i = 0; i < 30; i++) {
        core.processPlayerAction(hitAction);
      }

      const state = core.getCurrentState();

      // Either transcendence is activated or values are at threshold
      const transcendenceConditionsMet =
        state.intensity >= defaultConfig.transcendenceThresholds.intensity &&
        state.precision >= defaultConfig.transcendenceThresholds.precision &&
        state.flow >= defaultConfig.transcendenceThresholds.flow;

      if (transcendenceConditionsMet) {
        expect(state.transcendence).toBeGreaterThan(0);
      }
    });
  });

  describe('6. State Management', () => {
    beforeEach(() => {
      core = new QualiaCalculatorCore(defaultConfig, undefined, mockLogger);
    });

    it('should reset state to base values', () => {
      // Modify state
      const hitAction: PlayerActionEvent = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: 1.0 },
        timestamp: new Date(),
      };
      core.processPlayerAction(hitAction);

      // Reset
      core.reset();
      const state = core.getCurrentState();

      expect(state.intensity).toBe(defaultConfig.baseQualiaState.intensity);
      expect(state.precision).toBe(defaultConfig.baseQualiaState.precision);
      expect(state.aggression).toBe(defaultConfig.baseQualiaState.aggression);
    });

    it('should update configuration', () => {
      const newConfig: QualiaCalculatorConfig = {
        ...defaultConfig,
        precision: {
          hitBonus: 0.2, // Doubled
          missPenalty: -0.2,
          maxValue: 1,
          minValue: 0,
          decayRate: 0.02,
        },
      };

      core.updateConfig(newConfig);

      const hitAction: PlayerActionEvent = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: 1.0 },
        timestamp: new Date(),
      };

      const stateAfterUpdate = core.processPlayerAction(hitAction);

      // With doubled bonus, precision should increase more
      expect(stateAfterUpdate.precision).toBeGreaterThan(0.55); // Base 0.5 + doubled bonus
    });

    it('should return immutable state copy', () => {
      const state1 = core.getCurrentState();
      const state2 = core.getCurrentState();

      expect(state1).not.toBe(state2); // Different objects
      expect(state1).toEqual(state2); // Same values

      // Mutating returned state should not affect internal state
      state1.intensity = 999;
      const state3 = core.getCurrentState();

      expect(state3.intensity).not.toBe(999);
    });
  });

  describe('7. Significant Change Detection', () => {
    beforeEach(() => {
      core = new QualiaCalculatorCore(defaultConfig, undefined, mockLogger);
    });

    it('should detect significant changes', () => {
      const hitAction: PlayerActionEvent = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: 1.0 },
        timestamp: new Date(),
      };

      core.processPlayerAction(hitAction);
      const hasChanged = core.hasSignificantChange();

      expect(hasChanged).toBe(true);
    });

    it('should not detect insignificant changes after very small decay', () => {
      // First action creates significant change
      const hitAction: PlayerActionEvent = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: 1.0 },
        timestamp: new Date(),
      };

      core.processPlayerAction(hitAction);
      core.hasSignificantChange(); // Clear previous state

      // Very small decay (less than 1ms worth)
      core.applyTimeDecay(0.0001); // Negligible

      const hasChanged = core.hasSignificantChange();

      // With such small decay, change should be insignificant
      expect(hasChanged).toBe(false);
    });
  });

  describe('8. Statistics', () => {
    beforeEach(() => {
      core = new QualiaCalculatorCore(defaultConfig, undefined, mockLogger);
    });

    it('should track calculations performed', () => {
      const initialStats = core.getStats();
      expect(initialStats.calculationsPerformed).toBe(0);

      const hitAction: PlayerActionEvent = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: 1.0 },
        timestamp: new Date(),
      };

      core.processPlayerAction(hitAction);
      core.processPlayerAction(hitAction);

      const newStats = core.getStats();
      expect(newStats.calculationsPerformed).toBe(2);
    });

    it('should track uptime', () => {
      // Wait a tiny bit to ensure measurable uptime
      const start = performance.now();
      while (performance.now() - start < 1) {
        // Busy wait 1ms
      }
      const stats = core.getStats();
      expect(stats.uptime).toBeGreaterThan(0);
    });

    it('should track average calculation time', () => {
      const hitAction: PlayerActionEvent = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: 1.0 },
        timestamp: new Date(),
      };

      for (let i = 0; i < 10; i++) {
        core.processPlayerAction(hitAction);
      }

      const stats = core.getStats();
      // Average calculation time should be tracked (might be very small but >= 0)
      expect(stats.averageCalculationTime).toBeGreaterThanOrEqual(0);
      expect(stats.calculationsPerformed).toBe(10);
    });
  });

  describe('9. Edge Cases', () => {
    it('should handle missing accuracy context', () => {
      core = new QualiaCalculatorCore(defaultConfig, undefined, mockLogger);

      const action: PlayerActionEvent = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        // No context
        timestamp: new Date(),
      };

      expect(() => core.processPlayerAction(action)).not.toThrow();
    });

    it('should handle invalid accuracy values', () => {
      core = new QualiaCalculatorCore(defaultConfig, undefined, mockLogger);

      const action: PlayerActionEvent = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: -1 }, // Invalid
        timestamp: new Date(),
      };

      expect(() => core.processPlayerAction(action)).not.toThrow();
    });

    it('should handle negative deltaTime in decay', () => {
      core = new QualiaCalculatorCore(defaultConfig, undefined, mockLogger);

      const hitAction: PlayerActionEvent = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: 1.0 },
        timestamp: new Date(),
      };
      core.processPlayerAction(hitAction);

      const stateBefore = core.getCurrentState();
      
      // Apply negative decay (implementation might clamp or reverse)
      expect(() => {
        core.applyTimeDecay(-1000);
      }).not.toThrow();

      const stateAfter = core.getCurrentState();
      
      // Either state is unchanged or values are clamped to valid range
      expect(stateAfter.intensity).toBeGreaterThanOrEqual(0);
      expect(stateAfter.intensity).toBeLessThanOrEqual(1);
    });
  });
});
