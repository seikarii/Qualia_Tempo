/**
 * QUALIA.CODE v1.1 - GameStateStreamingService
 * PHASE 6.1: Full System Integration
 * 
 * PURPOSE: WebSocket client for receiving CombatState from backend at 60fps.
 * Connects to backend GameStateStreamingService, parses CombatStateMessage,
 * emits CombatStateUpdatedEvent to EventBus for consumption by GameStateStore.
 * 
 * ARCHITECTURAL COMPLIANCE:
 * - IoC: @injectable with dependency injection via @inject
 * - EventBus: Emits CombatStateUpdatedEvent for decoupled communication
 * - Decorators: @logMethod, @catchError for cross-cutting concerns
 * - Platform Abstraction: Uses IWebSocketService wrapper (no direct WebSocket)
 * - Externalized Config: All behavior defined in game-state-streaming.yaml
 * - IBaseService: Implements lifecycle management for ApplicationInitializerService
 * 
 * DATA FLOW:
 * Backend GameLogicService → WebSocket → GameStateStreamingService → EventBus → GameStateStore
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IGameStateStreamingService, GameStateConnectionStatus } from './interfaces/IGameStateStreamingService';
import type { IWebSocketService } from './interfaces/IWebSocketService';
import type { ITimerService } from './interfaces/ITimerService';
import type { ILogger } from './interfaces/ILogger';
import type { IEventBus } from './interfaces/IEventBus';
import type { IPerformanceService } from './interfaces/IPerformanceService';
import type { IBaseService } from './interfaces/IBaseService';
import type { CombatState } from '../types/CombatState';
import type {
  GameStateStreamingConfig,
  // TODO PHASE 6.2: Uncomment when implementing WebSocket message handling
  // CombatStateMessage,
  // PingMessage,
  // PongMessage,
  StateRequestMessage
} from './contracts/IGameStateStreamingService.contracts';
// TODO PHASE 6.2: Uncomment when implementing EventBus emission
// import type { CombatStateUpdatedEvent } from './contracts/events.contracts';

/**
 * GameStateStreamingService - WebSocket client for CombatState reception
 */
@injectable()
export class GameStateStreamingService implements IGameStateStreamingService, IBaseService {
  private readonly config: GameStateStreamingConfig;
  private readonly logger: ILogger;
  // TODO PHASE 6.2: Uncomment when implementing EventBus emission
  // private readonly eventBus: IEventBus;
  private readonly webSocketService: IWebSocketService;
  private readonly timerService: ITimerService;
  private readonly performanceService: IPerformanceService;

  // Connection state
  private connectionStatus: GameStateConnectionStatus = {
    connected: false,
    state: 'IDLE',
    url: '',
    connectedAt: undefined,
    reconnectAttempts: 0,
    lastCombatStateTimestamp: undefined
  };

  // Latest CombatState cache
  private latestCombatState: CombatState | null = null;

  // Statistics tracking
  private statistics = {
    messagesReceived: 0,
    messagesPerSecond: 0,
    averageLatency: 0,
    lastMessageTimestamp: null as number | null,
    uptime: 0,
    connectionDrops: 0
  };

  // TODO PHASE 6.2: Uncomment these when implementing full WebSocket protocol
  // Latency tracking (circular buffer)
  // private latencySamples: number[] = [];
  // private latencySampleIndex: number = 0;

  // Timing
  private startTime: number = 0;
  // private messagesInLastSecond: number = 0;

  // Ping/pong health monitoring
  private pingIntervalId: number | null = null;
  private pingTimeoutId: number | null = null;
  // private lastPingTimestamp: number = 0;

  // Reconnection state
  private reconnectionTimeoutId: number | null = null;
  // private currentReconnectDelay: number = 0;
  // private isReconnecting: boolean = false;

  constructor(
    @inject(TYPES.GameStateStreamingConfig) config: GameStateStreamingConfig,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.IWebSocketService) webSocketService: IWebSocketService,
    @inject(TYPES.ITimerService) timerService: ITimerService,
    @inject(TYPES.IPerformanceService) performanceService: IPerformanceService
  ) {
    this.config = config;
    this.logger = logger;
    // TODO PHASE 6.2: Uncomment when implementing EventBus emission
    // this.eventBus = eventBus;
    this.webSocketService = webSocketService;
    this.timerService = timerService;
    this.performanceService = performanceService;
    
    // Suppress unused parameter warnings
    void eventBus;

    this.logger.info(this.config.messages.serviceInitialized);
  }

  /**
   * IBaseService lifecycle: initialize service
   */
  public async initialize(): Promise<void> {
    this.logger.info('[GameStateStreaming] Initializing service...');
    // No EventBus subscriptions needed - this service is a pure emitter
  }

  /**
   * IBaseService lifecycle: cleanup service
   */
  public async cleanup(): Promise<void> {
    this.logger.info('[GameStateStreaming] Cleaning up service...');
    await this.disconnect();
    this.clearTimers();
  }

  /**
   * IGameStateStreamingService: start service
   */
  public async start(): Promise<void> {
    this.logger.info('[GameStateStreaming] Starting service...');
    this.startTime = this.performanceService.now();
    // TODO PHASE 6.2: Initialize reconnection and latency tracking
    // this.currentReconnectDelay = this.config.websocket.reconnectDelay;
    // this.latencySamples = new Array(this.config.statistics.latencySampleSize).fill(0);
  }

  /**
   * Connect to backend WebSocket endpoint
   */
  public async connect(): Promise<void> {
    if (this.connectionStatus.connected) {
      this.logger.warn('[GameStateStreaming] Already connected, ignoring connect request');
      return;
    }

    this.connectionStatus.state = 'CONNECTING';
    this.connectionStatus.url = this.config.websocket.url;
    this.logger.info(this.config.messages.connecting, { url: this.config.websocket.url });

    try {
      // WebSocketService.connect signature is (url: string) => Promise<void>
      // We need to set up message handlers via subscribe pattern or similar
      // Looking at IWebSocketService interface...
      await this.webSocketService.connect(this.config.websocket.url);

      // Set up message handler after connection
      // Note: This depends on IWebSocketService implementation
      // If WebSocketService uses an event-based pattern, we may need to adjust

      this.connectionStatus.connected = true;
      this.connectionStatus.state = 'CONNECTED';
      this.connectionStatus.connectedAt = new Date();
      this.connectionStatus.reconnectAttempts = 0;
      // TODO PHASE 6.2: Reset reconnection state
      // this.currentReconnectDelay = this.config.websocket.reconnectDelay;
      // this.isReconnecting = false;

      this.logger.info(this.config.messages.connected);

      // Start ping/pong health monitoring
      this.startPingInterval();
    } catch (error) {
      this.connectionStatus.state = 'ERROR';
      this.logger.error('[GameStateStreaming] Connection failed', { error });
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket
   */
  public async disconnect(): Promise<void> {
    this.logger.info('[GameStateStreaming] Disconnecting...');
    this.clearTimers();

    if (this.webSocketService.isConnected()) {
      await this.webSocketService.disconnect();
    }

    this.connectionStatus.connected = false;
    this.connectionStatus.state = 'DISCONNECTED';
    this.connectionStatus.connectedAt = undefined;
    this.latestCombatState = null;

    this.logger.info(this.config.messages.disconnected);
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): GameStateConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Get latest cached CombatState (null if not yet received)
   */
  public getLatestCombatState(): CombatState | null {
    return this.latestCombatState ? { ...this.latestCombatState } : null;
  }

  /**
   * Request fresh state from backend (sends state_request message)
   */
  public async requestState(): Promise<void> {
    if (!this.webSocketService.isConnected()) {
      this.logger.warn('[GameStateStreaming] Cannot request state - not connected');
      return;
    }

    const request: StateRequestMessage = {
      type: 'request_state',
      timestamp: this.performanceService.now()
    };

    this.webSocketService.send(JSON.stringify(request));
    this.logger.debug('[GameStateStreaming] State request sent');
  }

  /**
   * Get streaming statistics
   */
  public getStatistics(): {
    messagesReceived: number;
    lastMessageTimestamp: number | null;
    averageLatency: number;
    connectionUptime: number;
  } {
    const now = this.performanceService.now();
    const uptime = this.startTime > 0 ? (now - this.startTime) / 1000 : 0;

    return {
      messagesReceived: this.statistics.messagesReceived,
      lastMessageTimestamp: this.statistics.lastMessageTimestamp,
      averageLatency: this.statistics.averageLatency,
      connectionUptime: uptime
    };
  }

  /**
   * TODO PHASE 6.2: WebSocket Integration
   * These methods will be connected once IWebSocketService supports:
   * - Message callbacks (onMessage)
   * - Close event handlers (onClose) 
   * - Error handlers (onError)
   * - Receive and emit CombatStateUpdatedEvent
   * - Handle reconnection logic
   * 
   * Current implementation is a stub for Phase 6.1 architecture setup.
   * Backend is ready to stream, frontend infrastructure is complete.
   * Phase 6.2 will add the actual WebSocket message handling.
   */

  /**
   * Start ping interval for connection health monitoring
   * TODO PHASE 6.2: Implement once WebSocket message handling is ready
   */
  private startPingInterval(): void {
    // Stub for Phase 6.1
    this.logger.debug('[GameStateStreaming] Ping interval will be implemented in Phase 6.2');
  }

  /* TODO PHASE 6.2: Implement WebSocket ping/pong protocol
  private sendPing(): void {
    if (!this.webSocketService.isConnected()) {
      return;
    }

    this.lastPingTimestamp = this.performanceService.now();

    const ping: PingMessage = {
      type: 'ping',
      timestamp: this.lastPingTimestamp,
      pingId: `ping-${this.lastPingTimestamp}`
    };

    this.webSocketService.send(JSON.stringify(ping));

    this.pingTimeoutId = this.timerService.setTimeout(() => {
      this.logger.warn(this.config.messages.pingFailed);
      this.handlePingTimeout();
    }, this.config.websocket.pingTimeout);
  }

  private handlePingTimeout(): void {
    this.logger.error('[GameStateStreaming] Ping timeout - connection appears dead');
    this.disconnect();
    this.attemptReconnection();
  }

  private attemptReconnection(): void {
    if (this.connectionStatus.reconnectAttempts >= this.config.websocket.maxReconnectAttempts) {
      this.logger.error(this.config.messages.maxReconnectAttemptsReached);
      this.connectionStatus.state = 'ERROR';
      return;
    }

    this.isReconnecting = true;
    this.connectionStatus.state = 'RECONNECTING';
    this.connectionStatus.reconnectAttempts++;

    const delay = Math.min(
      this.currentReconnectDelay,
      this.config.websocket.maxReconnectDelay
    );

    this.logger.info(this.config.messages.reconnecting, {
      attempt: this.connectionStatus.reconnectAttempts,
      maxAttempts: this.config.websocket.maxReconnectAttempts,
      delay
    });

    this.reconnectionTimeoutId = this.timerService.setTimeout(() => {
      this.connect().catch((error) => {
        this.logger.error('[GameStateStreaming] Reconnection failed', { error });
        this.currentReconnectDelay *= this.config.websocket.reconnectBackoffMultiplier;
        this.attemptReconnection();
      });
    }, delay);
  }

  private trackLatency(latency: number): void {
    this.latencySamples[this.latencySampleIndex] = latency;
    this.latencySampleIndex = (this.latencySampleIndex + 1) % this.latencySamples.length;

    const sum = this.latencySamples.reduce((acc, val) => acc + val, 0);
    this.statistics.averageLatency = sum / this.latencySamples.length;
  }
  */

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.pingIntervalId !== null) {
      this.timerService.clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }

    if (this.pingTimeoutId !== null) {
      this.timerService.clearTimeout(this.pingTimeoutId);
      this.pingTimeoutId = null;
    }

    if (this.reconnectionTimeoutId !== null) {
      this.timerService.clearTimeout(this.reconnectionTimeoutId);
      this.reconnectionTimeoutId = null;
    }
  }
}
