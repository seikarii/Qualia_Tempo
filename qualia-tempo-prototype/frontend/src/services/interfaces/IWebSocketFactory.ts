/**
 * QUALIA.CODE v1.1 - IWebSocketFactory
 * 
 * CRITICAL: Platform Abstraction for WebSocket Creation
 * 
 * This interface abstracts the native WebSocket API, enabling:
 * - Complete test isolation without global mocking
 * - Platform independence for SSR/Node environments
 * - Dependency injection compliance
 * 
 * RATIONALE: Direct use of `new WebSocket()` violates the Platform
 * Abstraction Mandatory principle. All platform-specific APIs MUST
 * be channeled through injectable services.
 */

export interface IWebSocketFactory {
  /**
   * Create a new WebSocket instance
   * @param url - WebSocket server URL
   * @returns WebSocket instance
   */
  create(url: string): WebSocket;
}
