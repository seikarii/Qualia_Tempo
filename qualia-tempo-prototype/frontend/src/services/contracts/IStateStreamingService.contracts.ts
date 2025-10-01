/**
 * StreamingConfig contract
 * Configuration object for StateStreamingService
 * Contains all streaming-related configuration values.
 */

import type { IWebSocketService } from '../interfaces/IWebSocketService';
import type { ITimerService } from '../interfaces/ITimerService';
import type { ILogger } from '../interfaces/ILogger';
import type { IMessageAdapter } from '../protocol/IMessageAdapter';

// QUALIA.CODE v1.1: Constructor parameter object pattern (max 4 parameters rule)
export interface StateStreamingServiceParams {
  webSocketService: IWebSocketService;
  timerService: ITimerService;
  config: StreamingConfig;
  logger: ILogger;
  messageAdapter: IMessageAdapter;
}

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