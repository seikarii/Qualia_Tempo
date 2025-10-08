/**
 * QUALIA.CODE v1.1 - GameStateStreamingService Contracts
 * Configuration and data structures for CombatState streaming
 * PHASE 6 TASK 6.1: Full System Integration
 */

import type { IEventBus } from '../interfaces/IEventBus';
import type { ILogger } from '../interfaces/ILogger';
import type { IWebSocketService } from '../interfaces/IWebSocketService';
import type { ITimerService } from '../interfaces/ITimerService';
import type { IPerformanceService } from '../interfaces/IPerformanceService';

/**
 * Configuration for GameStateStreamingService
 */
export interface GameStateStreamingConfig {
  /**
   * WebSocket connection configuration
   */
  websocket: {
    /**
     * Backend game state endpoint URL
     * Default: "ws://localhost:8000/ws/game_state"
     */
    url: string;

    /**
     * Maximum reconnection attempts before giving up
     * Default: 5
     */
    maxReconnectAttempts: number;

    /**
     * Initial reconnection delay in milliseconds
     * Default: 1000 (1 second)
     */
    reconnectDelay: number;

    /**
     * Multiplier for exponential backoff
     * Default: 2.0
     */
    reconnectBackoffMultiplier: number;

    /**
     * Maximum reconnection delay in milliseconds
     * Default: 30000 (30 seconds)
     */
    maxReconnectDelay: number;

    /**
     * Ping interval to keep connection alive (milliseconds)
     * Default: 15000 (15 seconds)
     */
    pingInterval: number;

    /**
     * Timeout for ping response (milliseconds)
     * Default: 5000 (5 seconds)
     */
    pingTimeout: number;

    /**
     * Normal closure code for clean disconnect
     * Default: 1000
     */
    normalCloseCode: number;
  };

  /**
   * Statistics and monitoring configuration
   */
  statistics: {
    /**
     * Enable latency tracking
     * Default: true
     */
    trackLatency: boolean;

    /**
     * Number of samples for latency averaging
     * Default: 100
     */
    latencySampleSize: number;
  };

  /**
   * Message configuration
   */
  messages: {
    serviceInitialized: string;
    connecting: string;
    connected: string;
    disconnected: string;
    reconnecting: string;
    maxReconnectAttemptsReached: string;
    stateReceived: string;
    pingFailed: string;
  };
}

/**
 * Dependency injection parameters for GameStateStreamingService
 */
export interface GameStateStreamingServiceParams {
  webSocketService: IWebSocketService;
  timerService: ITimerService;
  config: GameStateStreamingConfig;
  logger: ILogger;
  eventBus: IEventBus;
  performanceService: IPerformanceService;
}

/**
 * WebSocket message format for CombatState updates
 */
export interface CombatStateMessage {
  type: 'combat_state_update';
  timestamp: number;
  combat_state: any; // CombatState from contracts
  dt: number;
}

/**
 * WebSocket ping message format
 */
export interface PingMessage {
  type: 'ping';
  timestamp: number;
  pingId: string;
}

/**
 * WebSocket pong message format
 */
export interface PongMessage {
  type: 'pong';
  timestamp: number;
  pingId: string;
}

/**
 * WebSocket state request message format
 */
export interface StateRequestMessage {
  type: 'request_state';
  timestamp: number;
}
