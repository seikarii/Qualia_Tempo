/**
 * StreamingConfig contract
 * Configuration object for StateStreamingService
 * Contains all streaming-related configuration values.
 */

import type { IWebSocketService } from '../interfaces/IWebSocketService';
import type { ITimerService } from '../interfaces/ITimerService';
import type { ILogger } from '../interfaces/ILogger';

// QUALIA.CODE v1.2: Constructor parameter object pattern (max 4 parameters rule)
// messageAdapter removed - now resolved via IoC container in @AdaptAndEmit decorator
export interface StateStreamingServiceParams {
  webSocketService: IWebSocketService;
  timerService: ITimerService;
  config: StreamingConfig;
  logger: ILogger;
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