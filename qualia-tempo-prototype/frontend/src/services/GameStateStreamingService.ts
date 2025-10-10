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
import { logMethod, catchError } from '../utils/decorators';
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
  CombatStateMessage,
  PingMessage,
  PongMessage,
  StateRequestMessage
} from './contracts/IGameStateStreamingService.contracts';
import type { CombatStateUpdatedEvent } from './contracts/events.contracts';

/**
 * GameStateStreamingService - WebSocket client for CombatState reception
 */
@injectable()
export class GameStateStreamingService implements IGameStateStreamingService, IBaseService {
  private readonly config: GameStateStreamingConfig;
  private readonly logger: ILogger;
  private readonly eventBus: IEventBus;
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

  // Latency tracking (circular buffer)
  private latencySamples: number[] = [];
  private latencySampleIndex: number = 0;

  // Timing
  private startTime: number = 0;
  private messagesInLastSecond: number = 0;

  // Ping/pong health monitoring
  private pingIntervalId: number | null = null;
  private pingTimeoutId: number | null = null;
  private lastPingTimestamp: number = 0;

  // Reconnection state
  private reconnectionTimeoutId: number | null = null;
  private currentReconnectDelay: number = 0;
  // @ts-expect-error - Reserved for future reconnection logic implementation
  private isReconnecting: boolean = false;

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
    this.eventBus = eventBus;
    this.webSocketService = webSocketService;
    this.timerService = timerService;
    this.performanceService = performanceService;

    this.logger.info(this.config.messages.serviceInitialized);
  }

  /**
   * IBaseService lifecycle: initialize service
   */
  @catchError
  public async initialize(): Promise<void> {
    this.logger.info('[GameStateStreaming] Initializing service...');
    // No EventBus subscriptions needed - this service is a pure emitter
  }

  /**
   * IBaseService lifecycle: cleanup service
   */
  @logMethod
  @catchError
  public async cleanup(): Promise<void> {
    this.logger.info('[GameStateStreaming] Cleaning up service...');
    await this.disconnect();
    this.clearTimers();
  }

  /**
   * IGameStateStreamingService: start service
   */
  @logMethod
  @catchError
  public async start(): Promise<void> {
    this.logger.info('[GameStateStreaming] Starting service...');
    this.startTime = this.performanceService.now();
    this.currentReconnectDelay = this.config.websocket.reconnectDelay;
    this.latencySamples = new Array(this.config.statistics.latencySampleSize).fill(0);
  }

  /**
   * Connect to backend WebSocket endpoint
   */
  @logMethod
  @catchError
  public async connect(): Promise<void> {
    if (this.connectionStatus.connected) {
      this.logger.warn('[GameStateStreaming] Already connected, ignoring connect request');
      return;
    }

    this.connectionStatus.state = 'CONNECTING';
    this.connectionStatus.url = this.config.websocket.url;
    this.logger.info(this.config.messages.connecting, { url: this.config.websocket.url });

    try {
      // Register WebSocket event handlers BEFORE connecting
      this.webSocketService.onMessage(this.handleMessage.bind(this));
      this.webSocketService.onClose(this.handleClose.bind(this));
      this.webSocketService.onError(this.handleError.bind(this));

      // Connect to WebSocket
      await this.webSocketService.connect(this.config.websocket.url);

      this.connectionStatus.connected = true;
      this.connectionStatus.state = 'CONNECTED';
      this.connectionStatus.connectedAt = new Date();
      this.connectionStatus.reconnectAttempts = 0;
      this.currentReconnectDelay = this.config.websocket.reconnectDelay;
      this.isReconnecting = false;

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
  @logMethod
  @catchError
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
  @logMethod
  public getConnectionStatus(): GameStateConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Get latest cached CombatState (null if not yet received)
   */
  @logMethod
  public getLatestCombatState(): CombatState | null {
    return this.latestCombatState ? { ...this.latestCombatState } : null;
  }

  /**
   * Request fresh state from backend (sends state_request message)
   */
  @logMethod
  @catchError
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
  @logMethod
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
   * PHASE 6.2: WebSocket Message Handling
   */

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string | ArrayBuffer | Blob): void {
    try {
      // Backend sends JSON strings
      if (typeof data !== 'string') {
        this.logger.warn('[GameStateStreaming] Received non-string message, ignoring', { type: typeof data });
        return;
      }

      const message = JSON.parse(data);

      // Route to specific handler based on message type
      switch (message.type) {
        case 'combat_state_update':
          this.handleCombatStateUpdate(message as CombatStateMessage);
          break;
        case 'pong':
          this.handlePongMessage(message as PongMessage);
          break;
        default:
          this.logger.warn('[GameStateStreaming] Unknown message type', { type: message.type });
      }
    } catch (error) {
      this.logger.error('[GameStateStreaming] Failed to parse message', { error });
    }
  }

  /**
   * Handle CombatState update from backend
   */
  private handleCombatStateUpdate(message: CombatStateMessage): void {
    const now = this.performanceService.now();
    const latency = now - message.timestamp;

    // Update statistics
    this.statistics.messagesReceived++;
    this.statistics.lastMessageTimestamp = now;
    this.messagesInLastSecond++;

    // Track latency if configured
    if (this.config.statistics.trackLatency) {
      this.trackLatency(latency);
    }

    // Cache latest CombatState
    this.latestCombatState = message.combat_state as CombatState;
    this.connectionStatus.lastCombatStateTimestamp = now;

    // Emit event to EventBus for consumption by GameStateStore
    const event: CombatStateUpdatedEvent = {
      type: 'CombatStateUpdated',
      combatState: message.combat_state,
      backendTimestamp: message.timestamp,
      latency,
      source: 'GameStateStreamingService',
      timestamp: new Date(),
      metadata: {
        dt: message.dt
      }
    };

    this.eventBus.emit(event);

    this.logger.debug(this.config.messages.stateReceived, {
      latency: latency.toFixed(2),
      messagesReceived: this.statistics.messagesReceived
    });
  }

  /**
   * Handle pong response from backend
   */
  private handlePongMessage(message: PongMessage): void {
    // Clear ping timeout
    if (this.pingTimeoutId !== null) {
      this.timerService.clearTimeout(this.pingTimeoutId);
      this.pingTimeoutId = null;
    }

    // Calculate round-trip latency
    const now = this.performanceService.now();
    const pingLatency = now - this.lastPingTimestamp;

    if (this.config.statistics.trackLatency) {
      this.trackLatency(pingLatency);
    }

    this.logger.debug('[GameStateStreaming] Pong received', {
      pingId: message.pingId,
      latency: pingLatency.toFixed(2)
    });
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    this.logger.warn('[GameStateStreaming] WebSocket closed', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    this.connectionStatus.connected = false;
    this.connectionStatus.state = 'DISCONNECTED';
    this.statistics.connectionDrops++;

    this.clearTimers();

    // Attempt reconnection if not a normal closure
    if (event.code !== this.config.websocket.normalCloseCode) {
      this.attemptReconnection();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(error: Event): void {
    this.logger.error('[GameStateStreaming] WebSocket error', { error });
    this.connectionStatus.state = 'ERROR';
  }

  /**
   * Start ping interval for connection health monitoring
   */
  private startPingInterval(): void {
    if (this.pingIntervalId !== null) {
      return; // Already running
    }

    this.pingIntervalId = this.timerService.setInterval(() => {
      this.sendPing();
    }, this.config.websocket.pingInterval);

    this.logger.debug('[GameStateStreaming] Ping interval started', {
      interval: this.config.websocket.pingInterval
    });
  }

  /**
   * Send ping message to backend
   */
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

  /**
   * Handle ping timeout (connection appears dead)
   */
  private handlePingTimeout(): void {
    this.logger.error('[GameStateStreaming] Ping timeout - connection appears dead');
    void this.disconnect();
    this.attemptReconnection();
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
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
      void this.connect().catch((error) => {
        this.logger.error('[GameStateStreaming] Reconnection failed', { error });
        this.currentReconnectDelay *= this.config.websocket.reconnectBackoffMultiplier;
        this.attemptReconnection();
      });
    }, delay);
  }

  /**
   * Track latency in circular buffer and calculate rolling average
   */
  private trackLatency(latency: number): void {
    this.latencySamples[this.latencySampleIndex] = latency;
    this.latencySampleIndex = (this.latencySampleIndex + 1) % this.latencySamples.length;

    const sum = this.latencySamples.reduce((acc, val) => acc + val, 0);
    this.statistics.averageLatency = sum / this.latencySamples.length;
  }

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
