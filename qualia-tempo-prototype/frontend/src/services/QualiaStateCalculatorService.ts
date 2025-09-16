/**
 * QUALIA.CODE v1.0 - QualiaStateCalculatorService
 * Core service for computing QualiaState based on player actions and game events.
 *
 * Architecture:
 * - Event-driven calculation triggered by PlayerAction events
 * - Configurable parameters via external config
 * - Time-decay algorithms for dynamic state evolution
 * - Integration with EventBus for decoupled communication
 *
 * REFACTORED: Eliminates UI coupling, follows single responsibility, uses pure event architecture
 */

import {
  EventBus,
  EventHandler,
  PlayerActionEvent,
  QualiaStateUpdatedEvent,
} from "./EventBus";
import type { QualiaState } from "../types/contracts";
import { logMethod, catchError } from '../utils/decorators';
import { QualiaLogger } from './Logger';
import type { ConfigurationService, QualiaCalculatorConfig } from './ConfigurationService';

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
 * - Dependency Injection: Receives EventBus via constructor
 */
export class QualiaStateCalculatorService {
  private currentState: QualiaState;
  private config: QualiaCalculatorConfig;
  private lastUpdateTime: number;
  private updateIntervalId: number | null = null;
  private eventListenerIds: string[] = [];
  private isRunning = false;
  private eventBus: EventBus;
  private logger: QualiaLogger;

  constructor(
    eventBus: EventBus,
    logger: QualiaLogger,
    configService: ConfigurationService,
  ) {
    this.eventBus = eventBus;
    this.logger = logger;

    // Use configuration from service - no fallback allowed
    if (!configService || !configService.isLoaded()) {
      throw new Error('ConfigurationService must be provided and loaded for QualiaStateCalculatorService');
    }

    this.config = configService.getQualiaCalculatorConfig();
    this.currentState = this.createInitialState();
    this.lastUpdateTime = performance.now();

    this.logger.info(
      "🧮 [QualiaCalculator] Service initialized with event-driven architecture",
    );
    this.logCurrentState();
  }

  /**
   * Start the calculator service and begin listening to events.
   */
  public start(): void {
    if (this.isRunning) {
      this.logger.warn("⚠️ [QualiaCalculator] Service already running");
      return;
    }

    this.subscribeToPlayerActionEvents();
    this.startUpdateLoop();
    this.isRunning = true;

    this.logger.info(
      "🚀 [QualiaCalculator] Service started - pure event architecture",
    );
  }

  /**
   * Stop the calculator service and unsubscribe from events.
   */
  public stop(): void {
    if (!this.isRunning) {
      this.logger.warn("⚠️ [QualiaCalculator] Service not running");
      return;
    }

    this.unsubscribeFromEvents();
    this.stopUpdateLoop();
    this.isRunning = false;

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
    this.config = { ...this.config, ...newConfig };
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
      { priority: 100 },
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
  }

  // ==================== ACTION HANDLERS ====================

  private onNoteHit(_context?: Record<string, any>): void {
    const multipliers = this.config.hitNoteMultipliers;

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
    const multipliers = this.config.missNoteMultipliers;

    this.currentState.precision = this.clamp(
      this.currentState.precision + multipliers.precision, // negative value
    );
    this.currentState.chaos = this.clamp(
      this.currentState.chaos + multipliers.chaos,
    );
    this.currentState.flow = this.clamp(
      this.currentState.flow + multipliers.flow, // negative value
    );

    this.logger.info("❌ [QualiaCalculator] Note Miss! Chaos+, Precision-, Flow-");
  }

  private onDash(_context?: Record<string, any>): void {
    const multipliers = this.config.dashMultipliers;

    this.currentState.intensity = this.clamp(
      this.currentState.intensity + multipliers.intensity,
    );
    this.currentState.aggression = this.clamp(
      this.currentState.aggression + multipliers.aggression,
    );

    this.logger.info("🌊 [QualiaCalculator] Dash! Intensity+, Aggression+");
  }

  private onFastForward(_context?: Record<string, any>): void {
    const multipliers = this.config.fastForwardMultipliers;

    this.currentState.aggression = this.clamp(
      this.currentState.aggression + multipliers.aggression,
    );
    this.currentState.intensity = this.clamp(
      this.currentState.intensity + multipliers.intensity,
    );

    this.logger.info("⏩ [QualiaCalculator] FastForward! Aggression+, Intensity+");
  }

  private onRewind(_context?: Record<string, any>): void {
    const multipliers = this.config.rewindMultipliers;

    this.currentState.recovery = this.clamp(
      this.currentState.recovery + multipliers.recovery,
    );
    this.currentState.precision = this.clamp(
      this.currentState.precision + multipliers.precision,
    );

    this.logger.info("⏪ [QualiaCalculator] Rewind! Recovery+, Precision+");
  }

  // ==================== STATE MANAGEMENT ====================

  private startUpdateLoop(): void {
    this.stopUpdateLoop(); // Ensure no duplicate intervals

    this.updateIntervalId = window.setInterval(() => {
      this.updateStateWithDecay();
    }, this.config.updateInterval);
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

    // Apply decay to all values
    this.currentState.intensity = this.clamp(
      this.currentState.intensity - this.config.intensityDecay * deltaTime,
    );
    this.currentState.precision = this.clamp(
      this.currentState.precision - this.config.precisionDecay * deltaTime,
    );
    this.currentState.aggression = this.clamp(
      this.currentState.aggression - this.config.aggressionDecay * deltaTime,
    );
    this.currentState.flow = this.clamp(
      this.currentState.flow - this.config.flowDecay * deltaTime,
    );
    this.currentState.chaos = this.clamp(
      this.currentState.chaos - this.config.chaosDecay * deltaTime,
    );
    this.currentState.recovery = this.clamp(
      this.currentState.recovery - this.config.recoveryDecay * deltaTime,
    );
    this.currentState.transcendence = this.clamp(
      this.currentState.transcendence -
        this.config.transcendenceDecay * deltaTime,
    );

    // Only emit state update if there's significant change
    if (this.hasSignificantChange()) {
      this.emitStateUpdate();
    }
  }

  private checkTranscendenceActivation(): void {
    const thresholds = this.config.transcendenceThresholds;

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
    return Math.max(
      this.config.minValue,
      Math.min(this.config.maxValue, value),
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
}

// Note: QualiaStateCalculatorService should be instantiated by CompositionRoot
// Example: const qualiaCalculator = new QualiaStateCalculatorService(eventBus);
