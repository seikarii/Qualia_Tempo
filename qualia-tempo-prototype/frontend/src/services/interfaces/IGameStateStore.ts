/**
 * QUALIA.CODE v1.1 - IGameStateStore Interface
 * Contract for Zustand store bridging and state management.
 *
 * This interface defines the contract for the game state store that provides
 * decoupled access to Zustand store functionality for services.
 */

import type { ExtendedNotification } from '../NotificationService';

export interface IGameStateStore {
  /**
   * Set notifications in the store.
   * Used by NotificationService to update the UI with current notifications.
   */
  setNotifications(notifications: ExtendedNotification[]): void;

  /**
   * Get current notifications from the store.
   */
  getNotifications(): ExtendedNotification[];

  /**
   * Update game state in the store.
   */
  updateGameState(state: any): void;

  /**
   * Get current game state from the store.
   */
  getGameState(): any;

  /**
   * Update qualia state in the store.
   */
  updateQualiaState(state: any): void;

  /**
   * Get current qualia state from the store.
   */
  getQualiaState(): any;
}
