/**
 * QUALIA.CODE v1.1 - QualiaStateCalculatorService
 * Core service for computing QualiaState based on player actions and game events.
 *
 * Architecture:
 * - Event-driven calculation triggered by PlayerAction events
 * - Configurable parameters via external config
 * - Time-decay algorithms for dynamic state evolution
 * - Integration with EventBus for decoupled communication
 * - InversifyJS dependency injection
 *
 * REFACTORED: Eliminates UI coupling, follows single responsibility, uses pure event architecture
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { QualiaCalculatorConfig } from "./contracts/IQualiaStateCalculatorService.contracts";
import type { QualiaStateCalculatorServiceParams } from "./contracts/IQualiaStateCalculatorService.contracts";
import type { IQualiaStateCalculatorService } from "./interfaces/IQualiaStateCalculatorService";
import { QualiaStateCalculatedEvent } from "./contracts/events.contracts";
import type { PlayerActionEvent } from "./contracts/events.contracts";
import type { QualiaState } from "../types/contracts";
import type { IPerformanceService } from "./interfaces/IPerformanceService";
import { logMethod, catchError, validate, OnEvent, IBaseService, initializeEventSubscriptions, cleanupEventSubscriptions } from "../utils/decorators";
import { EVENT_TYPES, PLAYER_ACTIONS } from "./contracts/constants";

// Configuration interface - REMOVED: Using ConfigurationService interface

// Default configuration - REMOVED: Using ConfigurationService

/**
 * Service responsible for calculating and maintaining QualiaState.
 * Listens to player actions and computes real-time state changes.
 *
 * ARCHITECTURE COMPLIANCE:
 * - Single Responsibility: Only calculates QualiaState
 * - Event-Driven: Listens to PlayerActionEvent, emits QualiaStateUpdatedEvent
 * - No UI Coupling: No knowledge of useGameStore or React components
 * - Dependency Injection: Receives EventBus via InversifyJS
 */
@injectable()
export class QualiaStateCalculatorService
  implements IQualiaStateCalculatorService, IBaseService
{
  private currentState!: QualiaState;
  private config: QualiaCalculatorConfig; // QUALIA.CODE: Injected directly via constructor
  private lastUpdateTime: number;
  private _isRunning = false; // Renamed to avoid conflict with method
  private eventBus: IEventBus;
  private logger: ILogger;
  private performanceService: IPerformanceService;

  // Statistics tracking
  private calculationsPerformed = 0;
  private totalCalculationTime = 0;

  constructor(
    @inject(TYPES.QualiaStateCalculatorServiceParams) params: QualiaStateCalculatorServiceParams
  ) {
    this.eventBus = params.eventBus;
    this.logger = params.logger;
    this.config = params.config;
    this.performanceService = params.performanceService;

    // QUALIA.CODE: Configuration is now injected directly via constructor
    // Always ensure currentState is initialized
    if (!this.currentState) {
      this.currentState = this.createInitialState();
      this.logger.debug("QualiaStateCalculatorService state initialized");
    }
    this.lastUpdateTime = this.performanceService.now();

    this.logger.info(
      "🧮 [QualiaCalculator] Service constructed - configuration loaded",
    );
    this.logCurrentState();
  }

  /**
   * QUALIA.CODE: Ensure configuration is loaded before accessing it
   */


  /**
   * Initialize the calculator service and set up event listeners.
   * QUALIA.CODE v1.1: Pure event-driven architecture - no internal loops
   */
  @logMethod
  @catchError
  public initialize(): void {
    // Activa todas las suscripciones de eventos declaradas con @OnEvent
    initializeEventSubscriptions(this);
    // CRITICAL FIX: Emit initial state so AudioService can start with base values
    this.emitStateUpdate();
  }

  /**
   * Clean up the calculator service and remove event listeners.
   * QUALIA.CODE v1.1: Pure event-driven architecture - no internal loops to stop
   */
  @logMethod
  public cleanup(): void {
    // Limpia todas las suscripciones de eventos para prevenir memory leaks
    cleanupEventSubscriptions(this);
  }

  /**
   * Get current QualiaState (for debugging/monitoring).
   */
  @logMethod
  public getCurrentState(): QualiaState {
    return { ...this.currentState };
  }

  /**
   * Update configuration (for runtime adjustments).
   */
  @logMethod
  @catchError
  public updateConfig(newConfig: Partial<QualiaCalculatorConfig>): void {
    // Safely merge configurations, ensuring all required properties are preserved
    this.config = {
      ...this.config,
      ...newConfig,
      // Ensure baseQualiaState is never undefined
      baseQualiaState: {
        ...(this.config?.baseQualiaState ?? {}),
        ...(newConfig.baseQualiaState ?? {}),
      },
      // Ensure performanceMultipliers is never undefined
      performanceMultipliers: {
        ...(this.config?.performanceMultipliers ?? {}),
        ...(newConfig.performanceMultipliers ?? {}),
      },
    } as QualiaCalculatorConfig;
    this.logger.info("⚙️ [QualiaCalculator] Configuration updated");
  }

  // ==================== PRIVATE METHODS ====================

  private createInitialState(): QualiaState {
    return {
      intensity: this.config.baseQualiaState.intensity,
      precision: this.config.baseQualiaState.precision,
      aggression: this.config.baseQualiaState.aggression,
      flow: this.config.baseQualiaState.flow,
      chaos: this.config.baseQualiaState.chaos,
      recovery: this.config.baseQualiaState.recovery,
      transcendence: this.config.baseQualiaState.transcendence,
    };
  }

  /**
   * Handle incoming PlayerAction events.
   * ARCHITECTURE: This replaces the direct method calls from UI.
   */
  @catchError
  @OnEvent('PlayerAction')
  // @ts-expect-error - Method used by @OnEvent decorator but TypeScript cannot detect it
  private handlePlayerAction(event: PlayerActionEvent): void {
    const startTime = this.performanceService.now();
    const { action, context } = event;

    switch (action) {
      case PLAYER_ACTIONS.START_GAME:
        // Game start doesn't directly affect QualiaState, handled by GameControllerService
        this.logger.debug(`🎮 [QualiaCalculator] Game started - no QualiaState impact`);
        break;
      case PLAYER_ACTIONS.PAUSE_GAME:
        // Game pause doesn't directly affect QualiaState
        this.logger.debug(`🎮 [QualiaCalculator] Game paused - no QualiaState impact`);
        break;
      case PLAYER_ACTIONS.RESET_GAME:
        // Game reset - reset QualiaState to initial
        this.currentState = this.createInitialState();
        this.logger.info(`🎮 [QualiaCalculator] Game reset - QualiaState reset to initial`);
        break;
      case PLAYER_ACTIONS.HIT_NOTE:
        this.onNoteHit(context);
        break;
      case PLAYER_ACTIONS.MISS_NOTE:
        this.onNoteMiss(context);
        break;
      case PLAYER_ACTIONS.DASH:
        this.onDash(context);
        break;
      case PLAYER_ACTIONS.FAST_FORWARD:
        this.onFastForward(context);
        break;
      case PLAYER_ACTIONS.REWIND:
        this.onRewind(context);
        break;
      default:
        this.logger.warn(`⚠️ [QualiaCalculator] Unknown action: ${action}`);
    }

    // Always emit state update after processing action
    this.emitStateUpdate();

    // Track calculation statistics
    const duration = this.performanceService.now() - startTime;
    this.calculationsPerformed++;
    this.totalCalculationTime += duration;
  }

  // ==================== ACTION HANDLERS ====================

  private onNoteHit(_context?: Record<string, unknown>): void {
    const currentState = this.currentState;

    currentState.intensity = this.clamp(
      currentState.intensity + this.config.performanceMultipliers.perfect,
    );
    this.currentState.precision = this.clamp(
      this.currentState.precision + this.config.precision.hitBonus,
    );
    this.currentState.flow = this.clamp(
      this.currentState.flow + this.config.flow.perfectHitBonus,
    );

    // Reduce chaos on successful hits
    this.currentState.chaos = this.clamp(this.currentState.chaos - this.config.chaos.decayAmount);

    this.logger.info(
      "🎯 [QualiaCalculator] Note Hit! Intensity+, Precision+, Flow+, Chaos-",
    );
    this.checkTranscendenceActivation();
  }

  private onNoteMiss(_context?: Record<string, unknown>): void {
    this.currentState.precision = this.clamp(
      this.currentState.precision + this.config.precision.missPenalty, // negative value
    );
    this.currentState.chaos = this.clamp(
      this.currentState.chaos + this.config.chaos.missIncrease,
    );
    this.currentState.flow = this.clamp(
      this.currentState.flow + this.config.flow.missPenalty, // negative value
    );

    this.logger.info("❌ [QualiaCalculator] Note Miss! Chaos+, Focus-, Flow-");
  }

  private onDash(_context?: Record<string, unknown>): void {
    this.currentState.intensity = this.clamp(
      this.currentState.intensity + this.config.performanceMultipliers.good,
    );
    this.currentState.aggression = this.clamp(
      this.currentState.aggression + this.config.aggression.comboMultiplier,
    );

    this.logger.info("🌊 [QualiaCalculator] Dash! Intensity+, Aggression+");
  }

  private onFastForward(_context?: Record<string, unknown>): void {
    this.currentState.aggression = this.clamp(
      this.currentState.aggression + this.config.aggression.comboMultiplier,
    );
    this.currentState.intensity = this.clamp(
      this.currentState.intensity + this.config.performanceMultipliers.good,
    );

    this.logger.info(
      "⏩ [QualiaCalculator] FastForward! Aggression+, Intensity+",
    );
  }

  private onRewind(_context?: Record<string, unknown>): void {
    this.currentState.recovery = this.clamp(
      this.currentState.recovery + this.config.performanceMultipliers.good,
    );
    this.currentState.precision = this.clamp(
      this.currentState.precision + this.config.precision.hitBonus,
    );

    this.logger.info("⏪ [QualiaCalculator] Rewind! Recovery+, Focus+");
  }

  // ==================== STATE MANAGEMENT ====================

  /**
   * Handle GameTick events for time-based state decay.
   * QUALIA.CODE v1.1: Pure event-driven architecture replaces internal setInterval.
   * This method is automatically subscribed via @OnEvent decorator.
   */
  @catchError
  @OnEvent('GameTick')
  // @ts-expect-error - Method used by @OnEvent decorator but TypeScript cannot detect it
  private _handleGameTick(event: { deltaTime: number }): void {
    const deltaTime = event.deltaTime; // Already in seconds from GameTick event

    // Apply decay to all values
    this.currentState.intensity = this.clamp(
      this.currentState.intensity - this.config.precision.decayRate * deltaTime,
    );
    this.currentState.precision = this.clamp(
      this.currentState.precision - this.config.precision.decayRate * deltaTime,
    );
    this.currentState.aggression = this.clamp(
      this.currentState.aggression - this.config.aggression.decayRate * deltaTime,
    );
    this.currentState.flow = this.clamp(
      this.currentState.flow - this.config.flow.decayRate * deltaTime,
    );
    this.currentState.chaos = this.clamp(
      this.currentState.chaos - this.config.chaos.decayRate * deltaTime,
    );
    this.currentState.recovery = this.clamp(
      this.currentState.recovery - this.config.flow.decayRate * deltaTime, // Using flow decay for recovery
    );
    this.currentState.transcendence = this.clamp(
      this.currentState.transcendence - this.config.transcendenceDecayRate * deltaTime,
    );

    // Only emit state update if there's significant change
    if (this.hasSignificantChange()) {
      this.emitStateUpdate();
    }
  }

  private checkTranscendenceActivation(): void {
    const config = this.config;
    const thresholds = config.transcendenceThresholds;

    if (
      this.currentState.intensity >= thresholds.intensity &&
      this.currentState.precision >= thresholds.precision &&
      this.currentState.flow >= thresholds.flow &&
      this.currentState.transcendence === config.transcendenceCheckValue
    ) {
      this.currentState.transcendence = config.transcendenceActivationValue;
      this.logger.info(
        "🌟 [QualiaCalculator] TRANSCENDENCE ACTIVATED! Ultimate mode triggered!",
      );
    }
  }

  private clamp(value: number): number {
    const config = this.config;
    return Math.max(config.minValue, Math.min(config.maxValue, value));
  }

  private previousState: QualiaState | null = null;

  private hasSignificantChange(): boolean {
    // QUALIA.CODE v1.1: Production-ready implementation - no prototypes
    // Check if any value changed by more than 0.01 (1%)
    // This prevents excessive event emissions during decay
    if (!this.previousState) {
      this.previousState = { ...this.currentState };
      return true; // First emission always significant
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
   * Emit QualiaStateCalculated event.
   * ARCHITECTURE: This is the ONLY output from this service - frontend-calculated state.
   */
  private emitStateUpdate(): void {
    this.eventBus.emit<QualiaStateCalculatedEvent>({
      type: EVENT_TYPES.QUALIA_STATE_CALCULATED,
      qualiaState: this.currentState,
    });
  }

  private logCurrentState(): void {
    this.logger.info("📊 [QualiaCalculator] Current State:", {
      intensity: this.currentState.intensity.toFixed(3),
      precision: this.currentState.precision.toFixed(3),
      aggression: this.currentState.aggression.toFixed(3),
      flow: this.currentState.flow.toFixed(3),
      chaos: this.currentState.chaos.toFixed(3),
      recovery: this.currentState.recovery.toFixed(3),
      transcendence: this.currentState.transcendence.toFixed(3),
    });
  }

  // ===== INTERFACE COMPLIANCE METHODS =====

  /**
   * Calculate new QualiaState based on player action.
   * @param action The player action to process
   * @returns The updated QualiaState
   */
  @logMethod
  @catchError
  @validate('PlayerActionEvent')
  public calculateQualiaState(_action: PlayerActionEvent): QualiaState {
    // This method would process the action and return updated state
    // For now, return current state (implementation can be expanded)
    return { ...this.currentState };
  }

  /**
   * Reset the QualiaState to initial values.
   */
  @logMethod
  @catchError
  public resetState(): void {
    this.currentState = this.createInitialState();
    this.logger.info("🔄 [QualiaCalculator] State reset to initial values");
  }

  /**
   * Apply time-based decay to the current state.
   * Called automatically by the service's internal timer.
   */
  @logMethod
  @catchError
  public applyTimeDecay(): void {
    const now = this.performanceService.now();
    const deltaTime = (now - this.lastUpdateTime) / this.config.millisecondsToSecondsConversion;
    this.lastUpdateTime = now;

    this.applyDecayToAllValues(deltaTime);
  }

  /**
   * Apply decay to all qualia values based on time passed.
   * @param deltaTime Time passed in seconds
   */
  @logMethod
  private applyDecayToAllValues(deltaTime: number): void {
    // Apply exponential decay to all values using individual decay rates
    this.currentState.intensity *= Math.exp(-this.config.precision.decayRate * deltaTime);
    this.currentState.precision *= Math.exp(-this.config.precision.decayRate * deltaTime);
    this.currentState.aggression *= Math.exp(-this.config.aggression.decayRate * deltaTime);
    this.currentState.flow *= Math.exp(-this.config.flow.decayRate * deltaTime);
    this.currentState.chaos *= Math.exp(-this.config.chaos.decayRate * deltaTime);
    this.currentState.recovery *= Math.exp(-this.config.flow.decayRate * deltaTime); // Using flow decay for recovery
    this.currentState.transcendence *= Math.exp(-this.config.transcendenceDecayRate * deltaTime);

    this.logger.debug("Applied temporal decay", { deltaTime });
  }

  /**
   * Check if the service is currently running.
   * @returns True if the service is active
   */
  @logMethod
  public isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Get performance statistics for the calculator.
   * @returns Object containing performance metrics
   */
  @logMethod
  public getStats(): {
    isRunning: boolean;
    calculationsPerformed: number;
    averageCalculationTime: number;
    currentState: QualiaState;
  } {
    const averageCalculationTime =
      this.calculationsPerformed > 0
        ? this.totalCalculationTime / this.calculationsPerformed
        : 0;

    return {
      isRunning: this._isRunning,
      calculationsPerformed: this.calculationsPerformed,
      averageCalculationTime,
      currentState: { ...this.currentState },
    };
  }
}

// QUALIA.CODE COMPLIANCE: Service instantiation handled exclusively by InversifyJS IoC container
// Manual instantiation (new QualiaStateCalculatorService()) is FORBIDDEN
