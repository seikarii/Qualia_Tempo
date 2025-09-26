/**
 * QUALIA.CODE v1.1 - IGameStateStoreService Interface
 * Bridge service between EventBus and Zustand store interface.
 */

export interface IGameStateStoreService {
  /**
   * Initialize event subscriptions to GameStateChanged and QualiaStateUpdated.
   */
  start(): void;

  /**
   * Clean up all event subscriptions.
   */
  stop(): void;

  /**
   * Update the game state in the store.
   * @param state Partial game state to update
   */
  updateGameState(state: any): void;

  /**
   * Update the qualia state in the store.
   * @param state Qualia state to update
   */
  updateQualiaState(state: any): void;

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
}
