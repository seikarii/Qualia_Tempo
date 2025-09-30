/**
 * QUALIA.CODE v1.1 - IGameInputControllerService Interface
 * Service responsible for processing game input and emitting appropriate game events.
 * Decouples input handling logic from React components for better testability.
 */

import type { NoteData } from '../../types/contracts';

export interface GameInputControllerConfig {
  timingWindows: {
    perfect: number;
    good: number;
  };
}

export interface IGameInputControllerService {
  /**
   * Initialize input handling for the game
   * @param isActive Whether the game is currently active
   */
  initializeInputHandling(isActive: boolean): void;

  /**
   * Clean up input handling
   */
  cleanupInputHandling(): void;

  /**
   * Calculate timing accuracy for note hits
   * @param currentTime Current game time in milliseconds
   * @param noteTimestamp Note timestamp in milliseconds
   * @returns Accuracy value between 0.0 and 1.0
   */
  calculateNoteAccuracy(currentTime: number, noteTimestamp: number): number;

  /**
   * Process pause game action
   */
  processPauseGame(): void;
}