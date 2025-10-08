/**
 * QUALIA.CODE v1.1 - Frontend EventBus
 * Event-driven communication system for decoupled component interaction.
 *
 * Architecture:
 * - Type-safe event definitions via contracts
 * - Async/sync event handling with error boundaries
 * - Automatic cleanup and memory management
 * - Performance monitoring and throttling
 * - InversifyJS dependency injection
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { ILogger } from "./interfaces/ILogger";
import type { IEventBus } from "./interfaces/IEventBus";
import type {
  BaseEvent,
  PlayerActionEvent,
  PlayerInputEvent,
  PlayerDirectionEvent,
  GameStateChangedEvent,
  MetronomeTickEvent,
  RhythmicDashEvent,
  QualiaStateCalculatedEvent,
  QualiaParticleDataReceivedEvent,
  ErrorEvent,
  BackendSyncEvent,
  VisualImpactRequestedEvent,
  StreamingStatusChangedEvent,
  WebGLContextLostEvent,
  WebGLContextRestoredEvent,
  ServiceStatusUpdateEvent,
  SystemAudioReadyEvent,
  ConfigurationLoadedEvent,
  CombatDataUpdatedEvent,
  AudioDataUpdatedEvent,
  PhysicsDataUpdatedEvent,
  KeyPressedEvent,
  EntityPositionUpdatedEvent,
  ComboDetectedEvent,
  ComboExpiredEvent,
  SequenceClearedEvent,
  CombatStateUpdatedEvent,
} from "./contracts/events.contracts";
import type { ITimerService } from "./interfaces/ITimerService";
import type { EventBusConfig } from "./contracts/IEventBus.contracts";
import { QualiaState } from "../types/contracts";
import { logMethod, catchError } from "../utils/decorators";

// Union type for all events
export type EventTypes =
  | QualiaStateCalculatedEvent
  | QualiaParticleDataReceivedEvent
  | PlayerActionEvent
  | PlayerInputEvent
  | PlayerDirectionEvent
  | GameStateChangedEvent
  | ErrorEvent
  | BackendSyncEvent
  | MetronomeTickEvent
  | StreamingStatusChangedEvent
  | VisualImpactRequestedEvent
  | RhythmicDashEvent
  | SystemAudioReadyEvent
  | ConfigurationLoadedEvent
  | WebGLContextLostEvent
  | WebGLContextRestoredEvent
  | ServiceStatusUpdateEvent
  | CombatDataUpdatedEvent
  | AudioDataUpdatedEvent
  | PhysicsDataUpdatedEvent
  | KeyPressedEvent
  | EntityPositionUpdatedEvent
  | ComboDetectedEvent
  | ComboExpiredEvent
  | SequenceClearedEvent
  | CombatStateUpdatedEvent;

// Event handler types
export type EventHandler<T extends BaseEvent = BaseEvent> = (
  _event: T,
) => void | Promise<void>;
export type EventListener = {
  id: string;
  handler: EventHandler;
  once?: boolean;
  priority?: number;
};

/**
 * Frontend EventBus implementing QUALIA.CODE event-driven architecture.
 * Provides type-safe, performant event communication between components.
 */
@injectable()
export class EventBus implements IEventBus {
  private listeners: Map<string, EventListener[]> = new Map();
  private eventHistory: BaseEvent[] = [];
  private statusIntervalId: number | null = null;
  private maxHistorySize: number;
  private isDestroyed = false;
  private logger: ILogger;
  private timerService: ITimerService;
  private config: EventBusConfig;

  constructor(
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.ITimerService) timerService: ITimerService,
    @inject(TYPES.EventBusConfig) config: EventBusConfig
  ) {
    this.logger = logger;
    this.timerService = timerService;
    this.config = config;
    
    // Initialize configuration-driven values
    this.maxHistorySize = config.performance.maxEventHistory;
    
    this.setupErrorHandling();
    this.setupPerformanceMonitoring();
    this.logger.info("🚀 [EventBus] EventBus initialized via InversifyJS");
  }

  /**
   * Subscribe to events of a specific type.
   * @param eventType - The event type to listen for
   * @param handler - The event handler function
   * @param options - Additional options (once, priority)
   */
  @logMethod
  @catchError
  public subscribe<T extends EventTypes>(
    eventType: T["type"],
    handler: EventHandler<T>,
    options: { once?: boolean; priority?: "low" | "normal" | "high" } = {},
  ): string {
    const startTime = this.timerService.performanceNow();
    this.logger.info(`🔗 [EventBus] Subscribe called for ${eventType}`);

    try {
      if (this.isDestroyed) {
        throw new Error("EventBus has been destroyed");
      }

      const listenerId = this.generateListenerId();
      const listener: EventListener = {
        id: listenerId,
        handler: handler as EventHandler,
        once: options.once,
        priority: this.convertPriority(options.priority),
      };

      if (!this.listeners.has(eventType)) {
        this.listeners.set(eventType, []);
      }

      const eventListeners = this.listeners.get(eventType);
      if (!eventListeners) {
        throw new Error(`Failed to initialize listeners array for event type: ${eventType}`);
      }
      eventListeners.push(listener);

      // Sort by priority (higher priority first)
      eventListeners.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

      const duration = this.timerService.performanceNow() - startTime;
      this.logger.info(
        `🔗 [EventBus] Subscribed to ${eventType} (ID: ${listenerId}) - ${duration.toFixed(2)}ms`,
      );
      return listenerId;
    } catch (error) {
      const duration = this.timerService.performanceNow() - startTime;
      this.logger.error(
        `🚨 [EventBus] Subscribe failed - ${duration.toFixed(2)}ms: ${error}`,
        { error },
      );
      throw error;
    }
  }

  /**
   * Subscribe to an event that will only fire once.
   */
  public once<T extends EventTypes>(
    eventType: T["type"],
    handler: EventHandler<T>,
  ): string {
    this.logger.info(`🔗 [EventBus] Once called for ${eventType}`);

    try {
      return this.subscribe(eventType, handler, { once: true });
    } catch (error) {
      this.logger.error(`🚨 [EventBus] Once failed: ${error}`, { error });
      throw error;
    }
  }

  /**
   * Unsubscribe from events using the listener ID.
   */
  public unsubscribe(listenerId: string): boolean {
    this.logger.info(`🔌 [EventBus] Unsubscribe called for ID: ${listenerId}`);

    // If EventBus is destroyed, silently succeed (listeners are already cleared)
    if (this.isDestroyed) {
      this.logger.info(
        `🔌 [EventBus] Skipping unsubscribe for destroyed EventBus (ID: ${listenerId})`,
      );
      return true;
    }

    try {
      for (const [eventType, listeners] of Array.from(
        this.listeners.entries(),
      )) {
        const index = listeners.findIndex(
          (listener) => listener.id === listenerId,
        );
        if (index !== -1) {
          listeners.splice(index, 1);

          if (listeners.length === 0) {
            this.listeners.delete(eventType);
          }

          this.logger.info(
            `🔌 [EventBus] Unsubscribed from ${eventType} (ID: ${listenerId})`,
          );
          return true;
        }
      }

      // Don't warn if no listener found - this is common during cleanup
      this.logger.debug(
        `🔌 [EventBus] Listener not found for unsubscribe (ID: ${listenerId}) - may have been already cleared`,
      );
      return true; // Return true to indicate successful "cleanup"
    } catch (error) {
      this.logger.error(`🚨 [EventBus] Unsubscribe failed:`, { error });
      return false;
    }
  }

  /**
   * Emit an event to all registered listeners.
   */
  @logMethod
  @catchError
  public async emit<T extends EventTypes>(
    event: Omit<T, "timestamp">,
  ): Promise<void> {
    const startTime = this.timerService.performanceNow();

    try {
      if (this.isDestroyed) {
        const config = this.config;
        this.logger.warn(config.messages.destroyedEventBusWarning);
        return;
      }

      // Complete the event with timestamp
      const completeEvent = this.completeEventWithTimestamp(event);

      // Add to history
      this.addToHistory(completeEvent);

      const listeners = this.listeners.get(completeEvent.type) ?? [];
      if (listeners.length === 0) {
        this.logger.debug(
          `📢 [EventBus] No listeners for event: ${completeEvent.type}`,
        );
        return;
      }

      this.logger.info(
        `📢 [EventBus] Emitting ${completeEvent.type} to ${listeners.length} listeners`,
      );

      // Execute handlers with error isolation
      const listenersToRemove = await this.executeHandlers(completeEvent, listeners);

      // Remove once listeners
      this.removeOnceListeners(listenersToRemove);

      const duration = this.timerService.performanceNow() - startTime;
      this.logEmitCompletion(completeEvent.type, duration);
    } catch (error) {
      const duration = this.timerService.performanceNow() - startTime;
      this.logger.error(
        `🚨 [EventBus] Emit failed - ${duration.toFixed(2)}ms: ${error}`,
        { error },
      );
      throw error;
    }
  }

  /**
   * Complete an event with a timestamp.
   */
  private completeEventWithTimestamp<T extends EventTypes>(
    event: Omit<T, "timestamp">,
  ): T {
    return {
      ...event,
      timestamp: new Date(),
    } as T;
  }

  /**
   * Handle errors from event handlers.
   */
  private handleHandlerError(
    error: unknown,
    eventType: string,
    listenerId: string,
  ): void {
    this.logger.error(
      `🚨 [EventBus] Handler error for ${eventType}: ${error}`,
      { error, eventType, listenerId },
    );

    // Emit error event (async to avoid recursion)
    this.timerService.setTimeout(() => {
      this.emit({
        type: "Error",
        error: error instanceof Error ? error : new Error(String(error)),
        severity: "medium",
        source: "EventBus",
        metadata: {
          eventType,
          listenerId,
        },
      } as Omit<ErrorEvent, "timestamp">);
    }, 0);
  }

  /**
   * Execute all handlers for an event with error isolation.
   */
  private async executeHandlers<T extends EventTypes>(
    completeEvent: T,
    listeners: EventListener[],
  ): Promise<string[]> {
    const promises: Promise<void>[] = [];
    const listenersToRemove: string[] = [];

    for (const listener of listeners) {
      const handlerPromise = this.executeHandler(listener, completeEvent).catch(
        (error) => this.handleHandlerError(error, completeEvent.type, listener.id),
      );

      promises.push(handlerPromise);

      // Mark for removal if it's a once listener
      if (listener.once) {
        listenersToRemove.push(listener.id);
      }
    }

    // Wait for all handlers to complete
    await Promise.all(promises);

    return listenersToRemove;
  }

  /**
   * Remove listeners that were marked for one-time execution.
   */
  private removeOnceListeners(listenersToRemove: string[]): void {
    for (const listenerId of listenersToRemove) {
      this.unsubscribe(listenerId);
    }
  }

  /**
   * Log the completion of an emit operation.
   */
  private logEmitCompletion(eventType: string, duration: number): void {
    this.logger.info(
      `📢 [EventBus] Emit completed for ${eventType} - ${duration.toFixed(2)}ms`,
    );
  }
  @logMethod
  @catchError
  public getEventHistory(eventType?: string, limit?: number): BaseEvent[] {
    this.logger.debug(
      `📚 [EventBus] GetEventHistory called for ${eventType ?? "all"} events`,
    );

    try {
      let history = eventType
        ? this.eventHistory.filter((event) => event.type === eventType)
        : this.eventHistory;

      if (limit) {
        history = history.slice(-limit);
      }

      return [...history]; // Return a copy
    } catch (error) {
      this.logger.error(`🚨 [EventBus] GetEventHistory failed:`, { error });
      return [];
    }
  }

  /**
   * Clear all listeners and event history.
   */
  public clear(): void {
    this.logger.info("🧹 [EventBus] Clear called");

    try {
      const listenerCount = Array.from(this.listeners.values()).reduce(
        (sum, listeners) => sum + listeners.length,
        0,
      );

      this.listeners.clear();
      this.eventHistory = [];

      this.logger.info(
        `🧹 [EventBus] Cleared ${listenerCount} listeners and event history`,
      );
    } catch (error) {
      this.logger.error(`🚨 [EventBus] Clear failed:`, { error });
    }
  }

  /**
   * Destroy the EventBus and clean up resources.
   */
  public destroy(): void {
    this.logger.info("💀 [EventBus] Destroy called");

    try {
      this.clear();
      this.isDestroyed = true;
      this.logger.info("💀 [EventBus] EventBus destroyed");
    } catch (error) {
      this.logger.error(`🚨 [EventBus] Destroy failed:`, { error });
    }
  }

  /**
   * Get statistics about the EventBus state.
   */
  public getStats(): {
    totalListeners: number;
    eventTypes: string[];
    historySize: number;
    isDestroyed: boolean;
  } {
    try {
      const totalListeners = Array.from(this.listeners.values()).reduce(
        (sum, listeners) => sum + listeners.length,
        0,
      );

      return {
        totalListeners,
        eventTypes: Array.from(this.listeners.keys()),
        historySize: this.eventHistory.length,
        isDestroyed: this.isDestroyed,
      };
    } catch (error) {
      this.logger.error(`🚨 [EventBus] GetStats failed:`, { error });
      return {
        totalListeners: 0,
        eventTypes: [],
        historySize: 0,
        isDestroyed: this.isDestroyed,
      };
    }
  }

  // Private helper methods

  private convertPriority(priority?: "low" | "normal" | "high"): number {
    const config = this.config;
    switch (priority) {
      case "high":
        return config.priorities.high;
      case "normal":
        return config.priorities.normal;
      case "low":
        return config.priorities.low;
      default:
        return config.priorities.default;
    }
  }

  private generateListenerId(): string {
    const config = this.config;
    return `${config.idPrefix}_${Date.now()}_${Math.random().toString(config.randomBase).substr(config.idStart, config.idLength)}`;
  }

  private async executeHandler(
    listener: EventListener,
    event: BaseEvent,
  ): Promise<void> {
    const result = listener.handler(event);
    if (result instanceof Promise) {
      await result;
    }
  }

  private addToHistory(event: BaseEvent): void {
    this.eventHistory.push(event);

    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize / 2);
    }
  }

  private setupErrorHandling(): void {
    // QUALIA.CODE COMPLIANCE: Global error handling moved to BrowserEventsService
    // Direct window.addEventListener access violates platform abstraction mandate
    // BrowserEventsService now handles unhandledrejection events and emits them through EventBus
    this.logger.debug("EventBus error handling initialized (global error handling delegated to BrowserEventsService)");
  }

  private setupPerformanceMonitoring(): void {
    // Monitor EventBus performance
    this.timerService.setInterval(() => {
      const stats = this.getStats();
      if (stats.totalListeners > 100) {
        this.logger.warn(
          `⚠️ [EventBus] High listener count: ${stats.totalListeners}`,
        );
      }
      if (stats.historySize > this.maxHistorySize * 0.8) {
        this.logger.warn(
          `⚠️ [EventBus] Event history approaching limit: ${stats.historySize}`,
        );
      }
    }, this.config.performance.cleanupInterval);
  }

  @logMethod
  public initialize(): void {
    this.statusIntervalId = this.timerService.setInterval(
      () => this.emitStatusUpdate(),
      this.config.performance.statusUpdateInterval
    );
    this.logger.info("EventBus initialized with status monitoring");
  }

  @logMethod
  public cleanup(): void {
    if (this.statusIntervalId !== null) {
      this.timerService.clearInterval(this.statusIntervalId);
      this.statusIntervalId = null;
    }
    this.logger.info("EventBus cleaned up");
  }

  private emitStatusUpdate(): void {
    const stats = this.getStats();
    const statusEvent: ServiceStatusUpdateEvent = {
      type: 'ServiceStatusUpdate',
      serviceName: 'EventBus',
      timestamp: new Date(),
      status: {
        isRunning: !stats.isDestroyed,
        stats: {
          totalListeners: stats.totalListeners,
          eventTypes: stats.eventTypes.length,
          historySize: stats.historySize,
        }
      }
    };
    this.emit(statusEvent);
  }
}

// Type-safe event emission helpers class with sealed constructor
export class QualiaEvents {
  private constructor(private _eventBus: IEventBus) {}

  /**
   * Factory method to create QualiaEvents instance.
   * This is the ONLY way to instantiate QualiaEvents.
   */
  public static create(_eventBus: IEventBus): QualiaEvents {
    return new QualiaEvents(_eventBus);
  }

  public playerAction(
    action: PlayerActionEvent["action"],
    context?: Record<string, unknown>,
  ): void {
    this._eventBus.emit({
      type: "PlayerAction",
      action,
      context,
      source: "PlayerInput",
    } as Omit<PlayerActionEvent, "timestamp">);
  }

  public qualiaStateCalculated(qualiaState: QualiaState): void {
    this._eventBus.emit({
      type: "QualiaStateCalculated",
      qualiaState,
      source: "QualiaCalculator",
    } as Omit<QualiaStateCalculatedEvent, "timestamp">);
  }

  public gameStateChanged(
    newState: GameStateChangedEvent["newState"],
    previousState: string,
    metadata?: Record<string, unknown>,
  ): void {
    this._eventBus.emit({
      type: "GameStateChanged",
      newState,
      previousState,
      metadata,
    } as Omit<GameStateChangedEvent, "timestamp">);
  }

  public error(
    error: Error,
    severity: ErrorEvent["severity"] = "medium",
    source = "Unknown",
  ): void {
    this._eventBus.emit({
      type: "Error",
      error,
      severity,
      source,
    } as Omit<ErrorEvent, "timestamp">);
  }

  public backendSync(data: QualiaState | Record<string, unknown>, syncType: BackendSyncEvent["syncType"]): void {
    this._eventBus.emit({
      type: "BackendSync",
      data,
      syncType,
      source: "BackendSync",
    } as Omit<BackendSyncEvent, "timestamp">);
  }
}

// Re-export event types for external use
export type {
  BaseEvent,
  PlayerActionEvent,
  PlayerInputEvent,
  RhythmicDashEvent,
  MetronomeTickEvent,
  GameStateChangedEvent,
} from "./contracts/events.contracts";
