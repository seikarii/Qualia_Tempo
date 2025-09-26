/**
 * QUALIA.CODE v1.1 - IEventBus Interface
 * Central communication hub interface for decoupled component interaction.
 */

import type { EventTypes } from "../EventBus";

export interface IEventBus {
  /**
   * Subscribe to events of a specific type with type safety.
   * @param eventType The type of event to listen for
   * @param handler Function to handle the event
   * @param options Optional configuration for the subscription
   * @returns Unique listener ID for unsubscribing
   */
  subscribe<T extends EventTypes>(
    eventType: string,
    handler: (event: T) => void | Promise<void>,
    options?: {
      once?: boolean;
      priority?: "low" | "normal" | "high";
    },
  ): string;

  /**
   * Emit an event to all registered listeners.
   * @param event The event to emit (timestamp will be added automatically)
   */
  emit<T extends EventTypes>(event: Omit<T, "timestamp">): Promise<void>;

  /**
   * Unsubscribe a listener by ID.
   * @param listenerId The unique ID returned by subscribe
   * @returns True if the listener was successfully removed
   */
  unsubscribe(listenerId: string): boolean;

  /**
   * Clean up and destroy the EventBus.
   * After calling this, the EventBus should not be used.
   */
  destroy(): void;

  /**
   * Get performance and usage statistics.
   * @returns Object containing EventBus statistics
   */
  getStats(): {
    totalListeners: number;
    eventTypes: string[];
    historySize: number;
    isDestroyed: boolean;
  };

  /**
   * Clear all listeners and event history.
   * Useful for testing and cleanup scenarios.
   */
  clear(): void;
}
