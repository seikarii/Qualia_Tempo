/**
 * QUALIA.CODE v1.1 - IBaseService
 * Interface for services that participate in the application lifecycle.
 * Required for services using @OnEvent decorator.
 */

export interface IBaseService {
  /**
   * Initialize the service and set up event subscriptions.
   * Called during application startup.
   */
  initialize(): void;

  /**
   * Clean up resources and event subscriptions.
   * Called during application shutdown.
   */
  cleanup(): void;
}