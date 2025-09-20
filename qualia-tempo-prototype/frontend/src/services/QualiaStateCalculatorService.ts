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

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IEventBus } from './interfaces/IEventBus';
import type { ILogger } from './interfaces/ILogger';
import type { IConfigurationService } from './interfaces/IConfigurationService';
import type { IQualiaStateCalculatorService } from './interfaces/IQualiaStateCalculatorService';
import {
  EventHandler,
  QualiaStateUpdatedEvent,
} from "./EventBus";
import type { PlayerActionEvent } from "./EventBus";
import type { QualiaState } from "../types/contracts";
import { logMethod, catchError } from '../utils/decorators';
import type { QualiaCalculatorConfig } from './ConfigurationService';

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
export class QualiaStateCalculatorService implements IQualiaStateCalculatorService {
  private currentState: QualiaState;
  private config: QualiaCalculatorConfig | null = null; // QUALIA.CODE: Lazy initialization
  private lastUpdateTime: number;
  private updateIntervalId: number | null = null;
  private eventListenerIds: string[] = [];
  private _isRunning = false; // Renamed to avoid conflict with method
  private eventBus: IEventBus;
  private logger: ILogger;
  private configService: IConfigurationService;

  // Statistics tracking
  private calculationsPerformed = 0;
  private totalCalculationTime = 0;

  constructor(
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IConfigurationService) configService: IConfigurationService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.configService = configService;

    // QUALIA.CODE FIX: Do NOT access configuration in constructor
    // Initialize with basic state, configuration will be loaded when start() is called
    this.currentState = this.createInitialStateWithDefaults();
    this.lastUpdateTime = performance.now();

    this.logger.info(
      "🧮 [QualiaCalculator] Service constructed - configuration will be loaded when start() is called",
    );
    this.logCurrentState();
  }

  /**
   * QUALIA.CODE: Ensure configuration is loaded before accessing it
   */
  private ensureConfigLoaded(): QualiaCalculatorConfig {
    if (!this.config) {
      try {
        this.config = this.configService.getConfigSection<QualiaCalculatorConfig>('qualiaCalculator');
        // Reinitialize state with proper configuration
        this.currentState = this.createInitialState();
        this.logger.debug('QualiaStateCalculatorService configuration loaded successfully');
      } catch (error) {
        this.logger.error('Failed to load QualiaStateCalculatorService configuration', error);
        throw new Error('QualiaStateCalculatorService configuration not available');
      }
    }
    return this.config;
  }

  /**
   * Create initial state with default values (used before config is loaded)
   */
  private createInitialStateWithDefaults(): QualiaState {
    return {
      intensity: 0,
      precision: 0,
      aggression: 0,
      flow: 0,
      chaos: 0,
      recovery: 0,
      transcendence: 0
    };
  }

  /**
   * Start the calculator service and begin listening to events.
   */
  public start(): void {
    if (this._isRunning) {
      this.logger.warn("⚠️ [QualiaCalculator] Service already running");
      return;
    }

    // QUALIA.CODE: Load configuration before proceeding
    this.ensureConfigLoaded();

    this.subscribeToPlayerActionEvents();
    this.startUpdateLoop();
    this._isRunning = true;

    this.logger.info(
      "🚀 [QualiaCalculator] Service started - pure event architecture",
    );
  }

  /**
   * Stop the calculator service and unsubscribe from events.
   */
  public stop(): void {
    if (!this._isRunning) {
      this.logger.warn("⚠️ [QualiaCalculator] Service not running");
      return;
    }

    this.unsubscribeFromEvents();
    this.stopUpdateLoop();
    this._isRunning = false;

    this.logger.info("🛑 [QualiaCalculator] Service stopped");
  }

  /**
   * Get current QualiaState (for debugging/monitoring).
   */
  @logMethod()
  @catchError()
  public getCurrentState(): QualiaState {
    return { ...this.currentState };
  }

  /**
   * Update configuration (for runtime adjustments).
   */
  @logMethod()
  @catchError()
  public updateConfig(newConfig: Partial<QualiaCalculatorConfig>): void {
    // Safely merge configurations, ensuring all required properties are preserved
    this.config = {
      ...this.config,
      ...newConfig,
      // Ensure baseQualiaState is never undefined
      baseQualiaState: {
        ...(this.config?.baseQualiaState || {}),
        ...(newConfig.baseQualiaState || {})
      },
      // Ensure performanceMultipliers is never undefined
      performanceMultipliers: {
        ...(this.config?.performanceMultipliers || {}),
        ...(newConfig.performanceMultipliers || {})
      }
    } as QualiaCalculatorConfig;
    this.logger.info("⚙️ [QualiaCalculator] Configuration updated");
  }

  // ==================== PRIVATE METHODS ====================

  private createInitialState(): QualiaState {
    return {
      intensity: 0.3,
      precision: 0.5,
      aggression: 0.0,
      flow: 0.4,
      chaos: 0.0,
      recovery: 0.0,
      transcendence: 0.0,
    };
  }

  /**
   * Subscribe to PlayerAction events on the EventBus.
   * ARCHITECTURE: This is the ONLY input to this service.
   */
  private subscribeToPlayerActionEvents(): void {
    const playerActionHandler: EventHandler<PlayerActionEvent> = (event) => {
      this.handlePlayerAction(event);
    };

    const listenerId = this.eventBus.subscribe(
      "PlayerAction",
      playerActionHandler,
      { priority: 'high' },
    );
    this.eventListenerIds.push(listenerId);

    this.logger.info("📡 [QualiaCalculator] Subscribed to PlayerAction events");
  }

  private unsubscribeFromEvents(): void {
    for (const listenerId of this.eventListenerIds) {
      this.eventBus.unsubscribe(listenerId);
    }
    this.eventListenerIds = [];

    this.logger.info("📡 [QualiaCalculator] Unsubscribed from all events");
  }

  /**
   * Handle incoming PlayerAction events.
   * ARCHITECTURE: This replaces the direct method calls from UI.
   */
  private handlePlayerAction(event: PlayerActionEvent): void {
    const startTime = performance.now();
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
    const duration = performance.now() - startTime;
    this.calculationsPerformed++;
    this.totalCalculationTime += duration;
  }

  // ==================== ACTION HANDLERS ====================

  private onNoteHit(_context?: Record<string, any>): void {
    const config = this.ensureConfigLoaded();
    const multipliers = config.hitNoteMultipliers;

    this.currentState.intensity = this.clamp(
      this.currentState.intensity + multipliers.intensity,
    );
    this.currentState.precision = this.clamp(
      this.currentState.precision + multipliers.precision,
    );
    this.currentState.flow = this.clamp(
      this.currentState.flow + multipliers.flow,
    );

    // Reduce chaos on successful hits
    this.currentState.chaos = this.clamp(this.currentState.chaos - 0.1);

    this.logger.info(
      "🎯 [QualiaCalculator] Note Hit! Intensity+, Precision+, Flow+, Chaos-",
    );
    this.checkTranscendenceActivation();
  }

  private onNoteMiss(_context?: Record<string, any>): void {
    const config = this.ensureConfigLoaded();
    const multipliers = config.missNoteMultipliers;

    this.currentState.precision = this.clamp(
      this.currentState.precision + multipliers.precision, // negative value
    );
    this.currentState.chaos = this.clamp(
      this.currentState.chaos + multipliers.chaos,
    );
    this.currentState.flow = this.clamp(
      this.currentState.flow + multipliers.flow, // negative value
    );

    this.logger.info("❌ [QualiaCalculator] Note Miss! Chaos+, Focus-, Flow-");
  }

  private onDash(_context?: Record<string, any>): void {
    const config = this.ensureConfigLoaded();
    const multipliers = config.dashMultipliers;

    this.currentState.intensity = this.clamp(
      this.currentState.intensity + multipliers.intensity,
    );
    this.currentState.aggression = this.clamp(
      this.currentState.aggression + multipliers.aggression,
    );

    this.logger.info("🌊 [QualiaCalculator] Dash! Intensity+, Aggression+");
  }

  private onFastForward(_context?: Record<string, any>): void {
    const config = this.ensureConfigLoaded();
    const multipliers = config.fastForwardMultipliers;

    this.currentState.aggression = this.clamp(
      this.currentState.aggression + multipliers.aggression,
    );
    this.currentState.intensity = this.clamp(
      this.currentState.intensity + multipliers.intensity,
    );

    this.logger.info("⏩ [QualiaCalculator] FastForward! Aggression+, Intensity+");
  }

  private onRewind(_context?: Record<string, any>): void {
    const config = this.ensureConfigLoaded();
    const multipliers = config.rewindMultipliers;

    this.currentState.recovery = this.clamp(
      this.currentState.recovery + multipliers.recovery,
    );
    this.currentState.precision = this.clamp(
      this.currentState.precision + multipliers.precision,
    );

    this.logger.info("⏪ [QualiaCalculator] Rewind! Recovery+, Focus+");
  }

  // ==================== STATE MANAGEMENT ====================

  private startUpdateLoop(): void {
    this.stopUpdateLoop(); // Ensure no duplicate intervals

    const config = this.ensureConfigLoaded();
    this.updateIntervalId = window.setInterval(() => {
      this.updateStateWithDecay();
    }, config.updateInterval);
  }

  private stopUpdateLoop(): void {
    if (this.updateIntervalId !== null) {
      window.clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }
  }

  /**
   * Apply time-based decay to all state values.
   */
  private updateStateWithDecay(): void {
    const now = performance.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = now;

    const config = this.ensureConfigLoaded();

    // Apply decay to all values
    this.currentState.intensity = this.clamp(
      this.currentState.intensity - config.intensityDecay * deltaTime,
    );
    this.currentState.precision = this.clamp(
      this.currentState.precision - config.precisionDecay * deltaTime,
    );
    this.currentState.aggression = this.clamp(
      this.currentState.aggression - config.aggressionDecay * deltaTime,
    );
    this.currentState.flow = this.clamp(
      this.currentState.flow - config.flowDecay * deltaTime,
    );
    this.currentState.chaos = this.clamp(
      this.currentState.chaos - config.chaosDecay * deltaTime,
    );
    this.currentState.recovery = this.clamp(
      this.currentState.recovery - config.recoveryDecay * deltaTime,
    );
    this.currentState.transcendence = this.clamp(
      this.currentState.transcendence -
        config.transcendenceDecay * deltaTime,
    );

    // Only emit state update if there's significant change
    if (this.hasSignificantChange()) {
      this.emitStateUpdate();
    }
  }

  private checkTranscendenceActivation(): void {
    const config = this.ensureConfigLoaded();
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
    const config = this.ensureConfigLoaded();
    return Math.max(
      config.minValue,
      Math.min(config.maxValue, value),
    );
  }

  private hasSignificantChange(): boolean {
    // Check if any value changed by more than 0.01 (1%)
    // This prevents excessive event emissions during decay
    return true; // For now, always emit to ensure backend sync
  }

  /**
   * Emit QualiaStateUpdated event.
   * ARCHITECTURE: This is the ONLY output from this service.
   */
  private emitStateUpdate(): void {
    this.eventBus.emit<QualiaStateUpdatedEvent>({
      type: "QualiaStateUpdated",
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
  @logMethod()
  @catchError()
  public calculateQualiaState(_action: PlayerActionEvent): QualiaState {
    // This method would process the action and return updated state
    // For now, return current state (implementation can be expanded)
    return { ...this.currentState };
  }

  /**
   * Reset the QualiaState to initial values.
   */
  @logMethod()
  @catchError()
  public resetState(): void {
    this.currentState = this.createInitialState();
    this.logger.info('🔄 [QualiaCalculator] State reset to initial values');
  }

  /**
   * Apply time-based decay to the current state.
   * Called automatically by the service's internal timer.
   */
  @logMethod()
  @catchError()
  public applyTimeDecay(): void {
    const now = Date.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    this.applyDecayToAllValues(deltaTime);
  }

  /**
   * Apply decay to all qualia values based on time passed.
   * @param deltaTime Time passed in seconds
   */
  @logMethod()
  private applyDecayToAllValues(deltaTime: number): void {
    const config = this.ensureConfigLoaded();
    const decayRates = config.decayRates;
    
    // Apply exponential decay to all values using individual decay rates
    this.currentState.intensity *= Math.exp(-decayRates.intensity * deltaTime);
    this.currentState.precision *= Math.exp(-decayRates.precision * deltaTime);
    this.currentState.aggression *= Math.exp(-decayRates.aggression * deltaTime);
    this.currentState.flow *= Math.exp(-decayRates.flow * deltaTime);
    this.currentState.chaos *= Math.exp(-decayRates.chaos * deltaTime);
    this.currentState.recovery *= Math.exp(-decayRates.recovery * deltaTime);
    this.currentState.transcendence *= Math.exp(-decayRates.transcendence * deltaTime);

    this.logger.debug('Applied temporal decay', { deltaTime, decayRates });
  }

  /**
   * Check if the service is currently running.
   * @returns True if the service is active
   */
  public isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Get performance statistics for the calculator.
   * @returns Object containing performance metrics
   */
  @logMethod()
  @catchError()
  public getStats(): {
    isRunning: boolean;
    calculationsPerformed: number;
    averageCalculationTime: number;
    currentState: QualiaState;
  } {
    const averageCalculationTime = this.calculationsPerformed > 0
      ? this.totalCalculationTime / this.calculationsPerformed
      : 0;

    return {
      isRunning: this._isRunning,
      calculationsPerformed: this.calculationsPerformed,
      averageCalculationTime: averageCalculationTime,
      currentState: { ...this.currentState }
    };
  }
}

// QUALIA.CODE COMPLIANCE: Service instantiation handled exclusively by InversifyJS IoC container
// Manual instantiation (new QualiaStateCalculatorService()) is FORBIDDEN
