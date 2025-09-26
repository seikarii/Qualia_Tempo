/**
 * QUALIA.CODE v1.1 - Event Data Contracts
 * Single source of truth for data structures used in EventBus events.
 * Eliminates circular dependencies between EventBus and service interfaces.
 */

// Moved from IStreamingVideoService.ts
export type ConnectionStateType =
  | "IDLE"
  | "CONNECTING"
  | "CONNECTED"
  | "DISCONNECTED"
  | "RECONNECTING"
  | "ERROR";

// Moved from IStreamingVideoService.ts
export interface ConnectionStatus {
  /** Whether WebSocket is connected */
  connected: boolean;
  /** Current connection state with detailed lifecycle */
  state: ConnectionStateType;
  /** Last error message if any */
  lastError?: string;
  /** Connection URL */
  url?: string;
  /** Time when connection was established */
  connectedAt?: Date;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
}

// Moved from IStreamingVideoService.ts
export interface VideoFrame {
  /** Base64 encoded JPEG image data */
  data: string;
  /** Timestamp when frame was generated */
  timestamp: number;
  /** Sequential frame number */
  frameNumber: number;
  /** Frame width in pixels */
  width?: number;
  /** Frame height in pixels */
  height?: number;
}
