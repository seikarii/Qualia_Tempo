/**
 * QUALIA.CODE v1.1 - IGameInputControllerService Interface
 * Service responsible for processing game input and emitting appropriate game events.
 * Decouples input handling logic from React components for better testability.
 */

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
   * Process pause game action
   */
  processPauseGame(): void;
}