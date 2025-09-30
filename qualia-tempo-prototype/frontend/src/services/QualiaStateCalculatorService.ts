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
import type { IQualiaStateCalculatorService } from "./interfaces/IQualiaStateCalculatorService";
import { QualiaStateCalculatedEvent } from "./contracts/events.contracts";
import type { PlayerActionEvent } from "./contracts/events.contracts";
import type { QualiaState } from "../types/contracts";
import type { ITimerService, IPerformanceService } from "./interfaces/ITimerService";
import { logMethod, catchError, OnEvent, IBaseService } from "../utils/decorators";

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
  private updateIntervalId: number | null = null;
  private _isRunning = false; // Renamed to avoid conflict with method
  private eventBus: IEventBus;
  private logger: ILogger;
  private timerService: ITimerService;
  private performanceService: IPerformanceService;

  // Statistics tracking
  private calculationsPerformed = 0;
  private totalCalculationTime = 0;

  constructor(
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.QualiaCalculatorConfig) config: QualiaCalculatorConfig,
    @inject(TYPES.ITimerService) timerService: ITimerService,
    @inject(TYPES.IPerformanceService) performanceService: IPerformanceService,
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.config = config;
    this.timerService = timerService;
    this.performanceService = performanceService;

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
   */
  @logMethod
  @catchError
  public initialize(): void {
    this.logger.info("🚀 [QualiaCalculator] Initializing service...");
    // @OnEvent decorators handle subscriptions automatically
    // TODO: Refactor to listen to GameTick event instead of internal loop
    this.startUpdateLoop();
    this.logger.info("🧮 [QualiaCalculator] Service initialized");
  }

  /**
   * Clean up the calculator service and remove event listeners.
   */
  @logMethod
  @catchError
  public cleanup(): void {
    this.logger.info("🛑 [QualiaCalculator] Cleaning up service...");
    // @OnEvent lifecycle handles cleanup automatically
    this.stopUpdateLoop();
    this.logger.info("✅ [QualiaCalculator] Service cleaned up");
  }

  /**
   * Get current QualiaState (for debugging/monitoring).
   */
  @logMethod
  @catchError
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
        ...(this.config?.baseQualiaState || {}),
        ...(newConfig.baseQualiaState || {}),
      },
      // Ensure performanceMultipliers is never undefined
      performanceMultipliers: {
        ...(this.config?.performanceMultipliers || {}),
        ...(newConfig.performanceMultipliers || {}),
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
  @OnEvent('PlayerAction')
  private handlePlayerAction(event: PlayerActionEvent): void {
    const startTime = this.performanceService.now();
    const { action, context } = event;

    switch (action) {
      case "HitNote":
        this.onNoteHit(context);
        break;
      case "MissNote":
        this.onNoteMiss(context);
        break;
      case "Dash":
        this.onDash(context);
        break;
      case "FastForward":
        this.onFastForward(context);
        break;
      case "Rewind":
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

  private onDash(_context?: Record<string, any>): void {
    this.currentState.intensity = this.clamp(
      this.currentState.intensity + this.config.performanceMultipliers.good,
    );
    this.currentState.aggression = this.clamp(
      this.currentState.aggression + this.config.aggression.comboMultiplier,
    );

    this.logger.info("🌊 [QualiaCalculator] Dash! Intensity+, Aggression+");
  }

  private onFastForward(_context?: Record<string, any>): void {
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

  private onRewind(_context?: Record<string, any>): void {
    this.currentState.recovery = this.clamp(
      this.currentState.recovery + this.config.performanceMultipliers.good,
    );
    this.currentState.precision = this.clamp(
      this.currentState.precision + this.config.precision.hitBonus,
    );

    this.logger.info("⏪ [QualiaCalculator] Rewind! Recovery+, Focus+");
  }

  // ==================== STATE MANAGEMENT ====================

  private startUpdateLoop(): void {
    this.stopUpdateLoop(); // Ensure no duplicate intervals

    const config = this.config;
    this.updateIntervalId = this.timerService.setInterval(() => {
      this.updateStateWithDecay();
    }, config.updateInterval);
  }

  private stopUpdateLoop(): void {
    if (this.updateIntervalId !== null) {
      this.timerService.clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }
  }

  /**
   * Apply time-based decay to all state values.
   */
  private updateStateWithDecay(): void {
    const now = this.performanceService.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = now;

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
      this.currentState.transcendence - this.config.flow.decayRate * deltaTime, // Using flow decay for transcendence
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
      this.currentState.transcendence === 0
    ) {
      this.currentState.transcendence = 1.0;
      this.logger.info(
        "🌟 [QualiaCalculator] TRANSCENDENCE ACTIVATED! Ultimate mode triggered!",
      );
    }
  }

  private clamp(value: number): number {
    const config = this.config;
    return Math.max(config.minValue, Math.min(config.maxValue, value));
  }

  private hasSignificantChange(): boolean {
    // Check if any value changed by more than 0.01 (1%)
    // This prevents excessive event emissions during decay
    return true; // For now, always emit to ensure backend sync
  }

  /**
   * Emit QualiaStateCalculated event.
   * ARCHITECTURE: This is the ONLY output from this service - frontend-calculated state.
   */
  private emitStateUpdate(): void {
    this.eventBus.emit<QualiaStateCalculatedEvent>({
      type: "QualiaStateCalculated",
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
    const deltaTime = (now - this.lastUpdateTime) / 1000;
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
    this.currentState.transcendence *= Math.exp(-this.config.flow.decayRate * deltaTime); // Using flow decay for transcendence

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
  @catchError
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
      averageCalculationTime: averageCalculationTime,
      currentState: { ...this.currentState },
    };
  }
}

// QUALIA.CODE COMPLIANCE: Service instantiation handled exclusively by InversifyJS IoC container
// Manual instantiation (new QualiaStateCalculatorService()) is FORBIDDEN
