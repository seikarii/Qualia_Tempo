/**
 * QUALIA.CODE v1.1 - IGameControllerService Interface
 * Game state management and control logic interface.
 */

import type { GameState } from "../contracts/IGameControllerService.contracts";

export interface IGameControllerService {
  /**
   * Start the game and begin gameplay.
   */
  startGame(): Promise<void>;

  /**
   * Pause the current game.
   */
  pauseGame(): void;

  /**
   * Resume a paused game.
   */
  resumeGame(): void;

  /**
   * Reset the game to initial state.
   */
  resetGame(): void;

  /**
   * Get the current game state.
   * @returns The current game state object
   */
  getGameState(): GameState;

  /**
   * Check if the game is currently playing.
   * @returns True if game is in playing state
   */
  isPlaying(): boolean;

  /**
   * Check if the game is currently paused.
   * @returns True if game is in paused state
   */
  isPaused(): boolean;

  /**
   * Initialize event subscriptions.
   */
  start(): void;

  /**
   * Clean up event subscriptions.
   */
  stop(): void;
}
