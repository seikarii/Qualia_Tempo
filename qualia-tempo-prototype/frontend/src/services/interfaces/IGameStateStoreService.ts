/**
 * QUALIA.CODE v1.1 - IGameStateStoreService Interface
 * Bridge service between EventBus and Zustand store interface.
 */

import type { GameState } from "../../state/useGameStore";
import type { QualiaState } from "../../types/contracts";

export interface IGameStateStoreService {
  /**
   * Initialize event subscriptions to GameStateChanged and QualiaStateUpdated.
   */
  initialize(): void;

  /**
   * Clean up all event subscriptions.
   */
  cleanup(): void;

  /**
   * Update the game state in the store.
   * @param state Partial game state to update
   */
  updateGameState(state: Partial<GameState>): void;

  /**
   * Update the qualia state in the store.
   * @param state Qualia state to update
   */
  updateQualiaState(state: QualiaState): void;

  /**
   * Get current service status.
   * @returns Service status (running/stopped)
   */
  getStatus(): "running" | "stopped";

  /**
   * Check if the service is currently running.
   * @returns True if service is active
   */
  isRunning(): boolean;

  /**
   * Provide the store setter dependency from the UI layer.
   * CRITICAL: This method allows the Composition Root to inject the UI dependency
   * after the service is constructed, breaking the React context collision.
   * @param setStore Zustand store setter function
   */
  setStoreSetter(setStore: (updater: (state: GameState) => GameState) => void): void;
}
