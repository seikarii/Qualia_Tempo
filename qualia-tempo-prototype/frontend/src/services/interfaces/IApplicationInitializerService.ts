/**
 * QUALIA.CODE v1.1 - IApplicationInitializerService Interface
 * Service responsible for orchestrating application initialization and cleanup.
 */

export interface IApplicationInitializerService {
  /**
   * Starts the application initialization sequence.
   * This includes loading configuration, starting backend sync, and updating application state.
   */
  start(): Promise<void>;

  /**
   * Cleans up all managed services and event subscriptions.
   * Ensures proper shutdown and prevents memory leaks.
   */
  cleanup(): void;
}
