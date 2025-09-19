/**
 * QUALIA.CODE v1.1 - StreamingVideoService Implementation  
 * WebSocket-based video streaming service with automatic reconnection and performance monitoring.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IStreamingVideoService, VideoFrame, ConnectionStatus, StreamingStatistics } from './interfaces/IStreamingVideoService';
import type { IEventBus } from './interfaces/IEventBus';
import type { ILogger } from './interfaces/ILogger';
import type { IConfigurationService } from './interfaces/IConfigurationService';
import { logMethod, catchError } from '../utils/decorators';

type FrameCallback = (frame: VideoFrame) => void;

@injectable()
export class StreamingVideoService implements IStreamingVideoService {
  private readonly eventBus: IEventBus;
  private readonly logger: ILogger;
  private readonly config: IConfigurationService;
  
  // WebSocket connection
  private websocket: WebSocket | null = null;
  private connectionUrl: string;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  
  // Subscription management
  private frameSubscriptions: Map<string, FrameCallback> = new Map();
  private nextSubscriptionId = 1;
  
  // Connection state
  private connectionStatus: ConnectionStatus = {
    connected: false,
    state: 'disconnected',
    reconnectAttempts: 0
  };
  
  // Statistics tracking
  private statistics: StreamingStatistics = {
    framesReceived: 0,
    bytesReceived: 0,
    currentFps: 0,
    averageFrameSize: 0,
    lastFrameTimestamp: 0,
    latency: 0,
    droppedFrames: 0
  };
  
  // Performance monitoring
  private fpsCounter = 0;
  private fpsTimestamp = 0;
  private pendingPings: Map<number, number> = new Map();
  private nextPingId = 1;
  
  // Configuration
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 2000; // 2 seconds
  private readonly pingInterval = 5000; // 5 seconds

  constructor(
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IConfigurationService) config: IConfigurationService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.config = config;
    
    // Get WebSocket URL from configuration - using hardcoded for now
    // TODO: Add streaming configuration to config service
    this.connectionUrl = 'ws://localhost:8000/ws/video_stream';
    
    this.logger.info('StreamingVideoService initialized', {
      url: this.connectionUrl
    });
  }

  @logMethod()
  @catchError()
  public async connect(): Promise<void> {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.logger.warn('Already connected to video stream');
      return;
    }

    this.connectionStatus.state = 'connecting';
    
    try {
      this.websocket = new WebSocket(this.connectionUrl);
      
      // Setup event handlers
      this.websocket.onopen = this.onWebSocketOpen.bind(this);
      this.websocket.onmessage = this.onWebSocketMessage.bind(this);
      this.websocket.onclose = this.onWebSocketClose.bind(this);
      this.websocket.onerror = this.onWebSocketError.bind(this);
      
      // Wait for connection to open
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);
        
        this.websocket!.addEventListener('open', () => {
          clearTimeout(timeoutId);
          resolve();
        });
        
        this.websocket!.addEventListener('error', () => {
          clearTimeout(timeoutId);
          reject(new Error('Connection failed'));
        });
      });
      
    } catch (error) {
      this.logger.error('Failed to connect to video stream', { error });
      this.connectionStatus.state = 'error';
      this.connectionStatus.lastError = String(error);
      throw error;
    }
  }

  @logMethod()
  @catchError()
  public async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.connectionStatus.connected = false;
    this.connectionStatus.state = 'disconnected';
    this.connectionStatus.connectedAt = undefined;
    
    this.logger.info('Disconnected from video stream');
  }

  @logMethod()
  public subscribeToFrames(callback: FrameCallback): string {
    const subscriptionId = `frame_sub_${this.nextSubscriptionId++}`;
    this.frameSubscriptions.set(subscriptionId, callback);
    
    this.logger.debug('Frame subscription created', { subscriptionId });
    return subscriptionId;
  }

  @logMethod()
  public unsubscribeFromFrames(subscriptionId: string): void {
    this.frameSubscriptions.delete(subscriptionId);
    this.logger.debug('Frame subscription removed', { subscriptionId });
  }

  public getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  public getStatistics(): StreamingStatistics {
    return { ...this.statistics };
  }

  @logMethod()
  public requestQualityChange(quality: number): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      this.logger.warn('Cannot change quality: not connected');
      return;
    }
    
    if (quality < 10 || quality > 100) {
      this.logger.warn('Invalid quality value', { quality });
      return;
    }
    
    this.websocket.send(JSON.stringify({
      type: 'quality_change',
      quality
    }));
    
    this.logger.info('Requested quality change', { quality });
  }

  @logMethod()
  public requestFpsChange(fps: number): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      this.logger.warn('Cannot change FPS: not connected');
      return;
    }
    
    if (fps < 1 || fps > 60) {
      this.logger.warn('Invalid FPS value', { fps });
      return;
    }
    
    this.websocket.send(JSON.stringify({
      type: 'fps_change',
      fps
    }));
    
    this.logger.info('Requested FPS change', { fps });
  }

  @logMethod()
  public async ping(): Promise<number> {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }
    
    const pingId = this.nextPingId++;
    const startTime = Date.now();
    
    this.pendingPings.set(pingId, startTime);
    
    this.websocket.send(JSON.stringify({
      type: 'ping',
      timestamp: startTime,
      pingId
    }));
    
    // Wait for pong response (with timeout)
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingPings.delete(pingId);
        reject(new Error('Ping timeout'));
      }, 5000);
      
      // Check for pong in the next event loop cycle
      const checkPong = () => {
        if (!this.pendingPings.has(pingId)) {
          clearTimeout(timeoutId);
          const roundTripTime = Date.now() - startTime;
          resolve(roundTripTime);
        } else {
          setTimeout(checkPong, 10);
        }
      };
      
      setTimeout(checkPong, 10);
    });
  }

  @catchError()
  private onWebSocketOpen(): void {
    this.connectionStatus.connected = true;
    this.connectionStatus.state = 'connected';
    this.connectionStatus.connectedAt = new Date();
    this.connectionStatus.reconnectAttempts = 0;
    this.connectionStatus.lastError = undefined;
    
    // Start ping timer
    this.pingTimer = setInterval(() => {
      this.ping().catch(() => {
        // Ping failed, connection might be dead
        this.logger.warn('Ping failed, connection may be unstable');
      });
    }, this.pingInterval);
    
    this.logger.info('Connected to video stream', {
      url: this.connectionUrl
    });
    
    // Note: EventBus integration simplified for initial implementation
  }

  @catchError()
  private onWebSocketMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === 'video_frame') {
        this.handleVideoFrame(message);
      } else if (message.type === 'pong') {
        this.handlePong(message);
      } else {
        this.logger.debug('Unknown WebSocket message type', { type: message.type });
      }
      
    } catch (error) {
      this.logger.error('Failed to parse WebSocket message', { error });
    }
  }

  @catchError()
  private onWebSocketClose(event: CloseEvent): void {
    this.connectionStatus.connected = false;
    this.connectionStatus.state = 'disconnected';
    
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    
    this.logger.info('WebSocket connection closed', {
      code: event.code,
      reason: event.reason
    });
    
    // Note: EventBus integration simplified for initial implementation
    
    // Auto-reconnect if not intentionally closed
    if (event.code !== 1000 && this.connectionStatus.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  @catchError()
  private onWebSocketError(event: Event): void {
    this.connectionStatus.state = 'error';
    this.connectionStatus.lastError = 'WebSocket error occurred';
    
    this.logger.error('WebSocket error', { event });
    
    // Note: EventBus integration simplified for initial implementation
  }

  @catchError()
  private handleVideoFrame(message: any): void {
    const frame: VideoFrame = {
      data: message.data,
      timestamp: message.timestamp,
      frameNumber: message.frame_number,
      width: message.width,
      height: message.height
    };
    
    // Update statistics
    this.statistics.framesReceived++;
    this.statistics.bytesReceived += message.data.length;
    this.statistics.lastFrameTimestamp = Date.now();
    
    // Calculate FPS
    this.updateFpsCounter();
    
    // Calculate average frame size
    this.statistics.averageFrameSize = this.statistics.bytesReceived / this.statistics.framesReceived;
    
    // Notify all frame subscribers
    for (const callback of this.frameSubscriptions.values()) {
      try {
        callback(frame);
      } catch (error) {
        this.logger.error('Error in frame callback', { error });
      }
    }
  }

  @catchError()
  private handlePong(message: any): void {
    const pingId = message.pingId;
    
    if (this.pendingPings.has(pingId)) {
      const startTime = this.pendingPings.get(pingId)!;
      const roundTripTime = Date.now() - startTime;
      
      this.statistics.latency = roundTripTime;
      this.pendingPings.delete(pingId);
      
      this.logger.debug('Received pong', { latency: roundTripTime });
    }
  }

  private updateFpsCounter(): void {
    const now = Date.now();
    this.fpsCounter++;
    
    // Calculate FPS every second
    if (now - this.fpsTimestamp >= 1000) {
      this.statistics.currentFps = this.fpsCounter;
      this.fpsCounter = 0;
      this.fpsTimestamp = now;
    }
  }

  private scheduleReconnect(): void {
    this.connectionStatus.reconnectAttempts++;
    
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.connectionStatus.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );
    
    this.logger.info('Scheduling reconnect', {
      attempt: this.connectionStatus.reconnectAttempts,
      delay
    });
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        this.logger.error('Reconnection failed', { error });
      });
    }, delay);
  }
}