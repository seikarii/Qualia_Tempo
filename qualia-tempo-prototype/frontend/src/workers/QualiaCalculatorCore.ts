/**
 * QUALIA.CODE v1.1 - QualiaCalculatorCore
 * 
 * Pure calculation core for QualiaState computation.
 * Designed to run in a Web Worker without any IoC or decorator dependencies.
 * 
 * Architecture:
 * - Zero external dependencies (no EventBus, no Logger, no IoC)
 * - Pure functions and class methods
 * - All configuration passed via constructor
 * - Performance tracked internally using native performance.now()
 * - Logging via callback function (bridge to main thread)
 * 
 * CRITICAL: This file must be dependency-free to run in Web Worker context.
 */

import type { QualiaState } from '../types/contracts';
import type { PlayerActionEvent } from '../services/contracts/events.contracts';
import type { QualiaCalculatorConfig } from '../services/contracts/IQualiaStateCalculatorService.contracts';
import { PLAYER_ACTIONS } from '../services/contracts/constants';

/**
 * Logger callback type for worker logging.
 * Worker cannot access main thread logger, so it uses callbacks.
 */
export type LoggerCallback = (
  _level: 'debug' | 'info' | 'warn' | 'error',
  _message: string,
  _data?: Record<string, unknown>
) => void;

/**
 * Pure calculation core for QualiaState.
 * Contains all the calculation logic without any framework dependencies.
 * 
 * Design Philosophy:
 * - Stateful but pure (no side effects except internal state)
 * - All inputs/outputs are plain objects
 * - No async operations
 * - Deterministic calculations
 */
export class QualiaCalculatorCore {
  private currentState: QualiaState;
  private config: QualiaCalculatorConfig;
  // @ts-expect-error - Reserved for future delta-time calculations
  private lastUpdateTime: number;
  private previousState: QualiaState | null = null;
  
  // Statistics
  private calculationsPerformed = 0;
  private totalCalculationTime = 0;
  private startTime: number;
  
  // Logger callback
  private log: LoggerCallback;

  /**
   * Create a new calculator core.
   * 
   * @param config - Configuration for the calculator
   * @param initialState - Optional initial state (defaults to config.baseQualiaState)
   * @param logCallback - Optional logger callback
   */
  constructor(
    config: QualiaCalculatorConfig,
    initialState?: QualiaState,
    logCallback?: LoggerCallback
  ) {
    this.config = config;
    this.currentState = initialState ?? this.createInitialState();
    this.lastUpdateTime = performance.now();
    this.startTime = performance.now();
    this.log = logCallback ?? this.noOpLogger;
    
    this.log('info', '🧮 [QualiaCalculatorCore] Core initialized', {
      hasInitialState: !!initialState,
    });
  }

  // ==================== PUBLIC API ====================

  /**
   * Get the current QualiaState.
   * Returns a copy to prevent external mutation.
   */
  public getCurrentState(): QualiaState {
    return { ...this.currentState };
  }

  /**
   * Process a player action and update state.
   * 
   * @param action - The player action event
   * @returns The updated QualiaState
   */
  public processPlayerAction(action: PlayerActionEvent): QualiaState {
    const startTime = performance.now();

    switch (action.action) {
      case PLAYER_ACTIONS.START_GAME:
        this.log('debug', '🎮 [Core] Game started - no QualiaState impact');
        break;
      case PLAYER_ACTIONS.PAUSE_GAME:
        this.log('debug', '🎮 [Core] Game paused - no QualiaState impact');
        break;
      case PLAYER_ACTIONS.RESET_GAME:
        this.currentState = this.createInitialState();
        this.log('info', '🎮 [Core] Game reset - QualiaState reset to initial');
        break;
      case PLAYER_ACTIONS.HIT_NOTE:
        this.onNoteHit(action.context);
        break;
      case PLAYER_ACTIONS.MISS_NOTE:
        this.onNoteMiss(action.context);
        break;
      case PLAYER_ACTIONS.DASH:
        this.onDash(action.context);
        break;
      case PLAYER_ACTIONS.FAST_FORWARD:
        this.onFastForward(action.context);
        break;
      case PLAYER_ACTIONS.REWIND:
        this.onRewind(action.context);
        break;
      default:
        this.log('warn', `⚠️ [Core] Unknown action: ${action.action}`);
    }

    // Track calculation time
    const duration = performance.now() - startTime;
    this.calculationsPerformed++;
    this.totalCalculationTime += duration;

    return this.getCurrentState();
  }

  /**
   * Apply time-based decay to the state.
   * 
   * @param deltaTime - Time passed in seconds
   * @returns The updated QualiaState
   */
  public applyTimeDecay(deltaTime: number): QualiaState {
    const startTime = performance.now();

    // Apply decay to all values
    this.currentState.intensity = this.clamp(
      this.currentState.intensity - this.config.precision.decayRate * deltaTime
    );
    this.currentState.precision = this.clamp(
      this.currentState.precision - this.config.precision.decayRate * deltaTime
    );
    this.currentState.aggression = this.clamp(
      this.currentState.aggression - this.config.aggression.decayRate * deltaTime
    );
    this.currentState.flow = this.clamp(
      this.currentState.flow - this.config.flow.decayRate * deltaTime
    );
    this.currentState.chaos = this.clamp(
      this.currentState.chaos - this.config.chaos.decayRate * deltaTime
    );
    this.currentState.recovery = this.clamp(
      this.currentState.recovery - this.config.flow.decayRate * deltaTime
    );
    this.currentState.transcendence = this.clamp(
      this.currentState.transcendence - this.config.transcendenceDecayRate * deltaTime
    );

    // Track calculation time
    const duration = performance.now() - startTime;
    this.calculationsPerformed++;
    this.totalCalculationTime += duration;

    return this.getCurrentState();
  }

  /**
   * Reset the state to initial values.
   * 
   * @returns The reset QualiaState
   */
  public reset(): QualiaState {
    this.currentState = this.createInitialState();
    this.previousState = null;
    this.calculationsPerformed = 0;
    this.totalCalculationTime = 0;
    this.startTime = performance.now();
    
    this.log('info', '🔄 [Core] State reset to initial values');
    
    return this.getCurrentState();
  }

  /**
   * Update configuration at runtime.
   * 
   * @param newConfig - Partial configuration to merge
   */
  public updateConfig(newConfig: Partial<QualiaCalculatorConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      // Ensure nested objects are properly merged
      baseQualiaState: {
        ...(this.config?.baseQualiaState ?? {}),
        ...(newConfig.baseQualiaState ?? {}),
      },
      performanceMultipliers: {
        ...(this.config?.performanceMultipliers ?? {}),
        ...(newConfig.performanceMultipliers ?? {}),
      },
      precision: {
        ...(this.config?.precision ?? {}),
        ...(newConfig.precision ?? {}),
      },
      aggression: {
        ...(this.config?.aggression ?? {}),
        ...(newConfig.aggression ?? {}),
      },
      flow: {
        ...(this.config?.flow ?? {}),
        ...(newConfig.flow ?? {}),
      },
      chaos: {
        ...(this.config?.chaos ?? {}),
        ...(newConfig.chaos ?? {}),
      },
      transcendenceThresholds: {
        ...(this.config?.transcendenceThresholds ?? {}),
        ...(newConfig.transcendenceThresholds ?? {}),
      },
    } as QualiaCalculatorConfig;
    
    this.log('info', '⚙️ [Core] Configuration updated');
  }

  /**
   * Check if there has been a significant change since last check.
   * Used to reduce unnecessary state emissions.
   * 
   * @returns True if change is significant (>1%)
   */
  public hasSignificantChange(): boolean {
    if (!this.previousState) {
      this.previousState = { ...this.currentState };
      return true; // First check always significant
    }

    const threshold = 0.01; // 1% change threshold
    const hasChange =
      Math.abs(this.currentState.intensity - this.previousState.intensity) > threshold ||
      Math.abs(this.currentState.precision - this.previousState.precision) > threshold ||
      Math.abs(this.currentState.aggression - this.previousState.aggression) > threshold ||
      Math.abs(this.currentState.flow - this.previousState.flow) > threshold ||
      Math.abs(this.currentState.chaos - this.previousState.chaos) > threshold ||
      Math.abs(this.currentState.recovery - this.previousState.recovery) > threshold ||
      Math.abs(this.currentState.transcendence - this.previousState.transcendence) > threshold;

    if (hasChange) {
      this.previousState = { ...this.currentState };
    }

    return hasChange;
  }

  /**
   * Get performance statistics.
   * 
   * @returns Statistics object
   */
  public getStats() {
    const averageCalculationTime =
      this.calculationsPerformed > 0
        ? this.totalCalculationTime / this.calculationsPerformed
        : 0;

    return {
      calculationsPerformed: this.calculationsPerformed,
      averageCalculationTime,
      totalCalculationTime: this.totalCalculationTime,
      uptime: performance.now() - this.startTime,
      currentState: this.getCurrentState(),
    };
  }

  // ==================== PRIVATE ACTION HANDLERS ====================

  private onNoteHit(_context?: Record<string, unknown>): void {
    this.currentState.intensity = this.clamp(
      this.currentState.intensity + this.config.performanceMultipliers.perfect
    );
    this.currentState.precision = this.clamp(
      this.currentState.precision + this.config.precision.hitBonus
    );
    this.currentState.flow = this.clamp(
      this.currentState.flow + this.config.flow.perfectHitBonus
    );
    this.currentState.chaos = this.clamp(
      this.currentState.chaos - this.config.chaos.decayAmount
    );

    this.log('info', '🎯 [Core] Note Hit! Intensity+, Precision+, Flow+, Chaos-');
    this.checkTranscendenceActivation();
  }

  private onNoteMiss(_context?: Record<string, unknown>): void {
    this.currentState.precision = this.clamp(
      this.currentState.precision + this.config.precision.missPenalty
    );
    this.currentState.chaos = this.clamp(
      this.currentState.chaos + this.config.chaos.missIncrease
    );
    this.currentState.flow = this.clamp(
      this.currentState.flow + this.config.flow.missPenalty
    );

    this.log('info', '❌ [Core] Note Miss! Chaos+, Precision-, Flow-');
  }

  private onDash(_context?: Record<string, unknown>): void {
    this.currentState.intensity = this.clamp(
      this.currentState.intensity + this.config.performanceMultipliers.good
    );
    this.currentState.aggression = this.clamp(
      this.currentState.aggression + this.config.aggression.comboMultiplier
    );

    this.log('info', '🌊 [Core] Dash! Intensity+, Aggression+');
  }

  private onFastForward(_context?: Record<string, unknown>): void {
    this.currentState.aggression = this.clamp(
      this.currentState.aggression + this.config.aggression.comboMultiplier
    );
    this.currentState.intensity = this.clamp(
      this.currentState.intensity + this.config.performanceMultipliers.good
    );

    this.log('info', '⏩ [Core] FastForward! Aggression+, Intensity+');
  }

  private onRewind(_context?: Record<string, unknown>): void {
    this.currentState.recovery = this.clamp(
      this.currentState.recovery + this.config.performanceMultipliers.good
    );
    this.currentState.precision = this.clamp(
      this.currentState.precision + this.config.precision.hitBonus
    );

    this.log('info', '⏪ [Core] Rewind! Recovery+, Precision+');
  }

  // ==================== PRIVATE HELPERS ====================

  private createInitialState(): QualiaState {
    return {
      intensity: this.config.baseQualiaState.intensity,
      precision: this.config.baseQualiaState.precision,
      aggression: this.config.baseQualiaState.aggression,
      flow: this.config.baseQualiaState.flow,
      chaos: this.config.baseQualiaState.chaos,
      recovery: this.config.baseQualiaState.recovery,
      transcendence: this.config.baseQualiaState.transcendence,
      collectionWindowEnd: 0,
    };
  }

  private checkTranscendenceActivation(): void {
    const thresholds = this.config.transcendenceThresholds;

    if (
      this.currentState.intensity >= thresholds.intensity &&
      this.currentState.precision >= thresholds.precision &&
      this.currentState.flow >= thresholds.flow &&
      this.currentState.transcendence === this.config.transcendenceCheckValue
    ) {
      this.currentState.transcendence = this.config.transcendenceActivationValue;
      this.log('info', '🌟 [Core] TRANSCENDENCE ACTIVATED! Ultimate mode triggered!');
    }
  }

  private clamp(value: number): number {
    return Math.max(this.config.minValue, Math.min(this.config.maxValue, value));
  }

  private noOpLogger: LoggerCallback = () => {
    // No-op logger for when no callback is provided
  };
}
