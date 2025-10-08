/**
 * QUALIA.CODE v1.1 - IGameStateStreamingService Interface
 * WebSocket client service for receiving CombatState from backend
 * PHASE 6 TASK 6.1: Full System Integration
 */

import type { CombatState } from '../../types/CombatState';

/**
 * Connection status for GameState WebSocket
 */
export interface GameStateConnectionStatus {
  connected: boolean;
  state: 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';
  url: string;
  connectedAt?: Date;
  reconnectAttempts: number;
  lastCombatStateTimestamp?: number;
}

/**
 * Service for streaming CombatState from backend via WebSocket.
 * 
 * ARCHITECTURE.GOLD.CODE v2 - Phase 6.1:
 * - Connects to backend `/ws/game_state` endpoint
 * - Receives complete CombatState (player, boss, gameState) at 60fps
 * - Emits CombatStateUpdated events to EventBus
 * - Frontend GameStateStore consumes these events
 * 
 * SEPARATION OF CONCERNS:
 * - StateStreamingService: Handles particle data streaming
 * - GameStateStreamingService: Handles game state streaming
 * - Independent update rates, separate WebSocket connections
 */
export interface IGameStateStreamingService {
  /**
   * Initialize the service and set up EventBus subscriptions
   */
  start(): Promise<void>;

  /**
   * Connect to the backend game state WebSocket endpoint
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the backend game state WebSocket
   */
  disconnect(): Promise<void>;

  /**
   * Get current connection status
   */
  getConnectionStatus(): GameStateConnectionStatus;

  /**
   * Get the latest received CombatState
   */
  getLatestCombatState(): CombatState | null;

  /**
   * Request current state from backend (on-demand)
   */
  requestState(): Promise<void>;

  /**
   * Get service statistics
   */
  getStatistics(): {
    messagesReceived: number;
    lastMessageTimestamp: number | null;
    averageLatency: number;
    connectionUptime: number;
  };
}
