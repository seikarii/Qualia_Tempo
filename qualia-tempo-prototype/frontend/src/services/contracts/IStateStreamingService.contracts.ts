/**
 * StreamingConfig contract
 * Configuration object for StateStreamingService
 * Contains all streaming-related configuration values.
 */

export interface StreamingConfig {
  websocket: {
    url: string;
    maxReconnectAttempts: number;
    reconnectDelay: number;
    pingInterval: number;
    pingTimeout: number;
    connectionTimeout: number;
  };
  authentication?: {
    enabled: boolean;
    token?: string;
  };
}