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

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { ILogger } from './interfaces/ILogger';
import type { IEventBus } from './interfaces/IEventBus';
import { QualiaState } from "../types/contracts";
import { logMethod, catchError } from '../utils/decorators';

// Event type definitions following QUALIA.CODE contracts
export interface BaseEvent {
  type: string;
  timestamp: Date;
  source?: string;
  metadata?: Record<string, any>;
}

export interface QualiaStateUpdatedEvent extends BaseEvent {
  type: "QualiaStateUpdated";
  qualiaState: QualiaState; // QUALIA.CODE Contract Compliance: Using generated interface
}

export interface PlayerActionEvent extends BaseEvent {
  type: "PlayerAction";
  action:
    | "Dash"
    | "HitNote"
    | "MissNote"
    | "FastForward"
    | "Rewind"
    | "StartGame"
    | "PauseGame"
    | "ResetGame"
    | "scoreIncrease";
  context?: Record<string, any>;
  value?: number; // For scoreIncrease and other actions that need a value
}

export interface PlayerInputEvent extends BaseEvent {
  type: "PlayerInput";
  key: string;
  source?: string;
}

export interface GameStateChangedEvent extends BaseEvent {
  type: "GameStateChanged";
  newState: "Playing" | "Paused" | "GameOver" | "Menu";
  oldState: string;
  previousState: string;
}

export interface ErrorEvent extends BaseEvent {
  type: "Error";
  error: Error;
  severity: "low" | "medium" | "high" | "critical";
  context?: Record<string, any>;
}

export interface BackendSyncEvent extends BaseEvent {
  type: "BackendSync";
  data: any;
  syncType: "qualiaState" | "gameState" | "config";
  status?: "success" | "error" | "pending";
  error?: any;
}

export interface RhythmicDashEvent extends BaseEvent {
  type: "RhythmicDash";
  direction: "north" | "south" | "east" | "west";
  timing: "perfect" | "good" | "miss";
  newPosition: [number, number];
}

export interface MetronomeTickEvent extends BaseEvent {
  type: "MetronomeTick";
  beatNumber: number;
  bpm: number;
}

// Union type for all events
export type EventTypes =
  | QualiaStateUpdatedEvent
  | PlayerActionEvent
  | PlayerInputEvent
  | GameStateChangedEvent
  | ErrorEvent
  | BackendSyncEvent
  | RhythmicDashEvent
  | MetronomeTickEvent;

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
  private maxHistorySize = 1000;
  private isDestroyed = false;
  private logger: ILogger;

  constructor(
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.logger = logger;
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
  @logMethod()
  @catchError()
  public subscribe<T extends EventTypes>(
    eventType: T["type"],
    handler: EventHandler<T>,
    options: { once?: boolean; priority?: 'low' | 'normal' | 'high' } = {},
  ): string {
    const startTime = performance.now();
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

      const eventListeners = this.listeners.get(eventType)!;
      eventListeners.push(listener);

      // Sort by priority (higher priority first)
      eventListeners.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      const duration = performance.now() - startTime;
      this.logger.info(
        `🔗 [EventBus] Subscribed to ${eventType} (ID: ${listenerId}) - ${duration.toFixed(2)}ms`,
      );
      return listenerId;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `🚨 [EventBus] Subscribe failed - ${duration.toFixed(2)}ms: ${error}`,
        { error }
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
      for (const [eventType, listeners] of Array.from(this.listeners.entries())) {
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
  public async emit<T extends EventTypes>(
    event: Omit<T, "timestamp">,
  ): Promise<void> {
    const startTime = performance.now();

    try {
      if (this.isDestroyed) {
        this.logger.warn(
          "⚠️ [EventBus] Attempted to emit event on destroyed EventBus",
        );
        return;
      }

      // Complete the event with timestamp
      const completeEvent: T = {
        ...event,
        timestamp: new Date(),
      } as T;

      // Add to history
      this.addToHistory(completeEvent);

      const listeners = this.listeners.get(completeEvent.type) || [];
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
      const promises: Promise<void>[] = [];
      const listenersToRemove: string[] = [];

      for (const listener of listeners) {
        const handlerPromise = this.executeHandler(
          listener,
          completeEvent,
        ).catch((error) => {
          this.logger.error(
            `🚨 [EventBus] Handler error for ${completeEvent.type}: ${error}`,
            { error, eventType: completeEvent.type }
          );
          // Emit error event (async to avoid recursion)
          setTimeout(() => {
            this.emit({
              type: "Error",
              error: error instanceof Error ? error : new Error(String(error)),
              severity: "medium",
              source: "EventBus",
              metadata: {
                eventType: completeEvent.type,
                listenerId: listener.id,
              },
            } as Omit<ErrorEvent, "timestamp">);
          }, 0);
        });

        promises.push(handlerPromise);

        // Mark for removal if it's a once listener
        if (listener.once) {
          listenersToRemove.push(listener.id);
        }
      }

      // Wait for all handlers to complete
      await Promise.all(promises);

      // Remove once listeners
      for (const listenerId of listenersToRemove) {
        this.unsubscribe(listenerId);
      }

      const duration = performance.now() - startTime;
      this.logger.info(
        `📢 [EventBus] Emit completed for ${completeEvent.type} - ${duration.toFixed(2)}ms`,
      );
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `🚨 [EventBus] Emit failed - ${duration.toFixed(2)}ms: ${error}`,
        { error }
      );
      throw error;
    }
  }

  /**
   * Get event history for debugging and analysis.
   */
  public getEventHistory(eventType?: string, limit?: number): BaseEvent[] {
    this.logger.debug(
      `📚 [EventBus] GetEventHistory called for ${eventType || "all"} events`,
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

  private convertPriority(priority?: 'low' | 'normal' | 'high'): number {
    switch (priority) {
      case 'high': return 100;
      case 'normal': return 50;
      case 'low': return 0;
      default: return 50; // default to normal
    }
  }

  private generateListenerId(): string {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    // Global error handler for unhandled promise rejections
    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", (event) => {
        this.emit({
          type: "Error",
          error: new Error(`Unhandled promise rejection: ${event.reason}`),
          severity: "high",
          source: "Global",
          metadata: { reason: event.reason },
        } as Omit<ErrorEvent, "timestamp">);
      });
    }
  }

  private setupPerformanceMonitoring(): void {
    // Monitor EventBus performance
    setInterval(() => {
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
    }, 30000); // Check every 30 seconds
  }
}

// Type-safe event emission helpers that can use a specific EventBus instance
export const createQualiaEvents = (targetEventBus: EventBus) => ({
  playerAction: (
    action: PlayerActionEvent["action"],
    context?: Record<string, any>,
  ) =>
    targetEventBus.emit({
      type: "PlayerAction",
      action,
      context,
      source: "PlayerInput",
    } as Omit<PlayerActionEvent, "timestamp">),

  qualiaStateUpdated: (qualiaState: QualiaState) =>
    targetEventBus.emit({
      type: "QualiaStateUpdated",
      qualiaState,
      source: "QualiaCalculator",
    } as Omit<QualiaStateUpdatedEvent, "timestamp">),

  gameStateChanged: (
    newState: GameStateChangedEvent["newState"],
    previousState: string,
  ) =>
    targetEventBus.emit({
      type: "GameStateChanged",
      newState,
      previousState,
      source: "GameController",
    } as Omit<GameStateChangedEvent, "timestamp">),

  error: (
    error: Error,
    severity: ErrorEvent["severity"] = "medium",
    source = "Unknown",
  ) =>
    targetEventBus.emit({
      type: "Error",
      error,
      severity,
      source,
    } as Omit<ErrorEvent, "timestamp">),

  backendSync: (data: any, syncType: BackendSyncEvent["syncType"]) =>
    targetEventBus.emit({
      type: "BackendSync",
      data,
      syncType,
      source: "BackendSync",
    } as Omit<BackendSyncEvent, "timestamp">),
});

// Note: QualiaEvents should be created using createQualiaEvents(eventBusInstance)
// from the CompositionRoot where the EventBus instance is available
