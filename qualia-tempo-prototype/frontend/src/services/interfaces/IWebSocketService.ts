/**
 * IWebSocketService interface
 * Abstraction layer for WebSocket operations
 * Provides a testable and mockable interface for WebSocket functionality.
 */

export interface IWebSocketService {
  /**
   * Connect to a WebSocket URL
   */
  connect(url: string): Promise<void>;

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): Promise<void>;

  /**
   * Send a message through the WebSocket
   */
  send(data: string | ArrayBuffer | Blob): void;

  /**
   * Register a message handler callback
   */
  onMessage(callback: (data: any) => void): void;

  /**
   * Register an open connection handler
   */
  onOpen(callback: () => void): void;

  /**
   * Register a close connection handler
   */
  onClose(callback: (event: CloseEvent) => void): void;

  /**
   * Register an error handler
   */
  onError(callback: (error: Event) => void): void;

  /**
   * Get current connection state
   */
  getReadyState(): number;

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean;
}

/**
 * WebSocket ready state constants
 */
export const WebSocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;