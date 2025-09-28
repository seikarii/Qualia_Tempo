/**
 * QUALIA.CODE v1.1 - StreamingVideoService Implementation
 * CRISALIDA.CODE v1.1 - SINGLETON REFERENCE COUNTING ARCHITECTURE
 * WebSocket-based video streaming service with reference counting and debounced disconnection.
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type {
  IStreamingVideoService,
  StreamingStatistics,
} from "./interfaces/IStreamingVideoService";
import type {
  VideoFrame,
  ConnectionStatus,
  ConnectionStateType,
} from "./contracts/events.contracts";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { IConfigurationService } from "./interfaces/IConfigurationService";
import type { ITimerService } from "./interfaces/ITimerService";
import type { StreamingStatusChangedEvent } from "./contracts/events.contracts";
import { logMethod, catchError } from "../utils/decorators";

type FrameCallback = (_frame: VideoFrame) => void;

@injectable()
export class StreamingVideoService implements IStreamingVideoService {
  private readonly eventBus: IEventBus;
  private readonly logger: ILogger;
  private readonly timerService: ITimerService;

  // WebSocket connection with singleton management
  private websocket: WebSocket | null = null;
  private connectionUrl: string;
  private state: ConnectionStateType = "IDLE";

  // Reference counting architecture
  private referenceCount = 0;
  private disconnectDebounceTimer: number | null = null;
  private readonly DEBOUNCE_DELAY = 500; // ms

  // Reconnection management
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;

  // Subscription management
  private frameSubscriptions: Map<string, FrameCallback> = new Map();
  private nextSubscriptionId = 1;

  // Connection status
  private connectionStatus: ConnectionStatus = {
    connected: false,
    state: "IDLE",
    reconnectAttempts: 0,
  };

  // Statistics tracking
  private statistics: StreamingStatistics = {
    framesReceived: 0,
    bytesReceived: 0,
    currentFps: 0,
    averageFrameSize: 0,
    lastFrameTimestamp: 0,
    latency: 0,
    droppedFrames: 0,
  };

  // Performance monitoring
  private fpsCounter = 0;
  private fpsTimestamp = 0;
  private pendingPings: Map<number, number> = new Map();
  private nextPingId = 1;

  // Configuration
  private readonly maxReconnectAttempts: number;
  private readonly reconnectDelay: number;
  private readonly pingInterval: number;
  private readonly pingTimeout: number;

  constructor(
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IConfigurationService) configService: IConfigurationService,
    @inject(TYPES.ITimerService) timerService: ITimerService,
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.timerService = timerService;

    // Load streaming configuration from config service
    const streamingConfig =
      configService.getConfig().backendSync.streaming?.websocket || {};
    this.connectionUrl =
      streamingConfig.url || "ws://127.0.0.1:8000/ws/video_stream";
    this.maxReconnectAttempts = streamingConfig.maxReconnectAttempts || 10;
    this.reconnectDelay = streamingConfig.reconnectDelay || 2000;
    this.pingInterval = streamingConfig.pingInterval || 8000;
    this.pingTimeout = streamingConfig.pingTimeout || 6000;

    this.logger.info(
      "StreamingVideoService initialized with Reference Counting architecture",
      {
        url: this.connectionUrl,
        pingInterval: this.pingInterval,
        pingTimeout: this.pingTimeout,
      },
    );
  }

  @logMethod
  @catchError
  public async connect(): Promise<void> {
    this.referenceCount++;
    this.logger.debug(
      `Connection reference count increased to ${this.referenceCount}`,
    );

    // Si hay un debounce de desconexión pendiente, cancelarlo.
    if (this.disconnectDebounceTimer) {
      this.timerService.clearTimeout(this.disconnectDebounceTimer);
      this.disconnectDebounceTimer = null;
      this.logger.info(
        "Cancelled pending disconnect due to new connection request.",
      );
    }

    // Si ya estamos conectados o conectando, no hacer nada más.
    if (this.state === "CONNECTED" || this.state === "CONNECTING") {
      this.logger.info(`Connect called but already in state: ${this.state}.`);
      return;
    }

    // Iniciar el proceso de conexión.
    this.state = "CONNECTING";
    this.connectionStatus.state = "CONNECTING";
    this.logger.info(
      "State changed to CONNECTING. Initiating WebSocket connection.",
    );

    // Emitir evento para la UI
    this.eventBus.emit<StreamingStatusChangedEvent>({
      type: "StreamingStatusChanged",
      status: this.getConnectionStatus(),
      source: "StreamingVideoService",
    });

    try {
      this.websocket = new WebSocket(this.connectionUrl);

      // Setup event handlers
      this.websocket.onopen = this.onWebSocketOpen.bind(this);
      this.websocket.onmessage = this.onWebSocketMessage.bind(this);
      this.websocket.onclose = this.onWebSocketClose.bind(this);
      this.websocket.onerror = this.onWebSocketError.bind(this);

      // Wait for connection to open (never reject - handle errors internally)
      await new Promise<void>((resolve) => {
        const timeoutId = this.timerService.setTimeout(() => {
          this.logger.warn(
            "WebSocket connection timeout - operating in offline mode",
          );
          this.state = "ERROR";
          this.connectionStatus.state = "ERROR";
          this.connectionStatus.lastError = "Connection timeout";
          this.eventBus.emit<StreamingStatusChangedEvent>({
            type: "StreamingStatusChanged",
            status: this.getConnectionStatus(),
            source: "StreamingVideoService",
          });
          resolve(); // Resolve instead of reject
        }, 10000);

        this.websocket!.addEventListener("open", () => {
          this.timerService.clearTimeout(timeoutId);
          resolve();
        });

        this.websocket!.addEventListener("error", () => {
          this.timerService.clearTimeout(timeoutId);
          this.logger.warn(
            "WebSocket connection failed - operating in offline mode",
          );
          this.state = "ERROR";
          this.connectionStatus.state = "ERROR";
          this.connectionStatus.lastError = "Connection failed";
          this.eventBus.emit<StreamingStatusChangedEvent>({
            type: "StreamingStatusChanged",
            status: this.getConnectionStatus(),
            source: "StreamingVideoService",
          });
          resolve(); // Resolve instead of reject
        });
      });
    } catch (error) {
      this.logger.warn(
        "Failed to connect to video stream - operating in offline mode",
        { error },
      );
      this.state = "ERROR";
      this.connectionStatus.state = "ERROR";
      this.connectionStatus.lastError = String(error);
      this.eventBus.emit<StreamingStatusChangedEvent>({
        type: "StreamingStatusChanged",
        status: this.getConnectionStatus(),
        source: "StreamingVideoService",
      });
      // Don't throw error - allow application to continue in offline mode
      return;
    }
  }

  @logMethod
  public disconnect(): void {
    if (this.referenceCount > 0) {
      this.referenceCount--;
      this.logger.debug(
        `Connection reference count decreased to ${this.referenceCount}`,
      );
    }

    if (this.referenceCount === 0) {
      this.logger.info("Reference count is zero. Debouncing disconnection.");
      // Iniciar debounce para cerrar la conexión.
      this.disconnectDebounceTimer = this.timerService.setTimeout(() => {
        this.forceDisconnect();
      }, this.DEBOUNCE_DELAY);
    }
  }

  private forceDisconnect(): void {
    if (this.websocket) {
      this.logger.info("Forcing WebSocket disconnection now.");
      this.websocket.close(1000, "Client initiated disconnect");
      this.websocket = null;
    }

    this.clearReconnectTimer();

    if (this.pingTimer) {
      this.timerService.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    this.state = "IDLE";
    this.connectionStatus.connected = false;
    this.connectionStatus.state = "IDLE";
    this.connectionStatus.connectedAt = undefined;

    this.eventBus.emit<StreamingStatusChangedEvent>({
      type: "StreamingStatusChanged",
      status: this.getConnectionStatus(),
      source: "StreamingVideoService",
    });

    this.logger.info("Disconnected from video stream");
  }

  @logMethod
  public subscribeToFrames(callback: FrameCallback): string {
    const subscriptionId = `frame_sub_${this.nextSubscriptionId++}`;
    this.frameSubscriptions.set(subscriptionId, callback);

    this.logger.debug("Frame subscription created", { subscriptionId });
    return subscriptionId;
  }

  @logMethod
  public unsubscribeFromFrames(subscriptionId: string): void {
    this.frameSubscriptions.delete(subscriptionId);
    this.logger.debug("Frame subscription removed", { subscriptionId });
  }

  @logMethod
  public getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  @logMethod
  public getStatistics(): StreamingStatistics {
    return { ...this.statistics };
  }

  @logMethod
  public requestQualityChange(quality: number): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      this.logger.warn("Cannot change quality: not connected");
      return;
    }

    if (quality < 10 || quality > 100) {
      this.logger.warn("Invalid quality value", { quality });
      return;
    }

    this.websocket.send(
      JSON.stringify({
        type: "quality_change",
        quality,
      }),
    );

    this.logger.info("Requested quality change", { quality });
  }

  @logMethod
  public requestFpsChange(fps: number): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      this.logger.warn("Cannot change FPS: not connected");
      return;
    }

    if (fps < 1 || fps > 60) {
      this.logger.warn("Invalid FPS value", { fps });
      return;
    }

    this.websocket.send(
      JSON.stringify({
        type: "fps_change",
        fps,
      }),
    );

    this.logger.info("Requested FPS change", { fps });
  }

  @logMethod
  @catchError
  public async ping(): Promise<number> {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected");
    }

    const pingId = this.nextPingId++;
    const startTime = Date.now();

    this.pendingPings.set(pingId, startTime);

    this.websocket.send(
      JSON.stringify({
        type: "ping",
        timestamp: startTime,
        pingId,
      }),
    );

    // Wait for pong response (with timeout)
    return new Promise((resolve, reject) => {
      const timeoutId = this.timerService.setTimeout(() => {
        this.pendingPings.delete(pingId);
        reject(new Error("Ping timeout"));
      }, this.pingTimeout); // Use configurable timeout

      // Store resolver for this ping to be called by handlePong
      const checkInterval = this.timerService.setInterval(() => {
        if (!this.pendingPings.has(pingId)) {
          this.timerService.clearTimeout(timeoutId);
          this.timerService.clearInterval(checkInterval);
          const roundTripTime = Date.now() - startTime;
          resolve(roundTripTime);
        }
      }, 50); // Check every 50ms
    });
  }

  @catchError
  private onWebSocketOpen(): void {
    this.logger.info("WebSocket connection established.");
    this.state = "CONNECTED";
    this.connectionStatus.connected = true;
    this.connectionStatus.state = "CONNECTED";
    this.connectionStatus.connectedAt = new Date();
    this.connectionStatus.reconnectAttempts = 0;
    this.connectionStatus.lastError = undefined;

    // Clear any pending reconnect timer since we're now connected
    this.clearReconnectTimer();

    // Start ping timer - increased interval for stability
    this.pingTimer = this.timerService.setInterval(() => {
      this.ping().catch((error) => {
        // Ping failed, but don't disconnect immediately - just log it
        this.logger.debug("Ping failed, monitoring connection stability", {
          error: String(error),
        });
      });
    }, this.pingInterval);

    this.logger.info("Connected to video stream", {
      url: this.connectionUrl,
    });

    // Emit event for UI updates
    this.eventBus.emit<StreamingStatusChangedEvent>({
      type: "StreamingStatusChanged",
      status: this.getConnectionStatus(),
      source: "StreamingVideoService",
    });
  }

  @catchError
  private onWebSocketMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      if (message.type === "video_frame") {
        this.handleVideoFrame(message);
      } else if (message.type === "pong") {
        this.handlePong(message);
      } else {
        this.logger.debug("Unknown WebSocket message type", {
          type: message.type,
        });
      }
    } catch (error) {
      this.logger.error("Failed to parse WebSocket message", { error });
    }
  }

  @catchError
  private onWebSocketClose(event: CloseEvent): void {
    this.logger.warn(
      `WebSocket closed. Code: ${event.code}, Clean: ${event.wasClean}`,
    );
    this.state = "DISCONNECTED";
    this.connectionStatus.connected = false;
    this.connectionStatus.state = "DISCONNECTED";

    if (this.pingTimer) {
      this.timerService.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    this.logger.info("WebSocket connection closed", {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });

    // Emit event for UI updates
    this.eventBus.emit<StreamingStatusChangedEvent>({
      type: "StreamingStatusChanged",
      status: this.getConnectionStatus(),
      source: "StreamingVideoService",
    });

    // Auto-reconnect only if connection was not intentionally closed
    // and if we haven't exceeded retry limit and we still have references
    if (
      event.code !== 1000 && // 1000 = normal closure
      event.code !== 1001 && // 1001 = going away
      this.connectionStatus.reconnectAttempts < this.maxReconnectAttempts &&
      this.referenceCount > 0
    ) {
      this.scheduleReconnect();
    } else if (
      this.connectionStatus.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      this.logger.warn(
        "Max reconnection attempts reached, stopping auto-reconnect",
      );
    }
  }

  @catchError
  private onWebSocketError(event: Event): void {
    this.state = "ERROR";
    this.connectionStatus.state = "ERROR";
    this.connectionStatus.lastError = "WebSocket error occurred";

    this.logger.error("WebSocket error", { event });

    // Emit event for UI updates
    this.eventBus.emit<StreamingStatusChangedEvent>({
      type: "StreamingStatusChanged",
      status: this.getConnectionStatus(),
      source: "StreamingVideoService",
    });
  }

  @catchError
  private handleVideoFrame(message: any): void {
    const frame: VideoFrame = {
      data: message.data,
      timestamp: message.timestamp,
      frameNumber: message.frame_number,
      width: message.width,
      height: message.height,
    };

    // Update statistics
    this.statistics.framesReceived++;
    this.statistics.bytesReceived += message.data.length;
    this.statistics.lastFrameTimestamp = Date.now();

    // Calculate FPS
    this.updateFpsCounter();

    // Calculate average frame size
    this.statistics.averageFrameSize =
      this.statistics.bytesReceived / this.statistics.framesReceived;

    // Notify all frame subscribers
    for (const callback of this.frameSubscriptions.values()) {
      try {
        callback(frame);
      } catch (error) {
        this.logger.error("Error in frame callback", { error });
      }
    }
  }

  @catchError
  private handlePong(message: any): void {
    const pingId = message.pingId;

    if (this.pendingPings.has(pingId)) {
      const startTime = this.pendingPings.get(pingId)!;
      const roundTripTime = Date.now() - startTime;

      this.statistics.latency = roundTripTime;
      this.pendingPings.delete(pingId);

      this.logger.debug("Received pong", { latency: roundTripTime });
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

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      this.timerService.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      this.logger.debug("Cleared reconnect timer");

      // Only reset reconnect attempts if we're transitioning away from reconnecting
      if (this.state === "RECONNECTING") {
        this.connectionStatus.reconnectAttempts = 0;
      }
    }
  }

  private scheduleReconnect(): void {
    this.connectionStatus.reconnectAttempts++;
    this.state = "RECONNECTING";
    this.connectionStatus.state = "RECONNECTING";

    const delay = Math.min(
      this.reconnectDelay *
        Math.pow(2, this.connectionStatus.reconnectAttempts - 1),
      30000, // Max 30 seconds
    );

    this.logger.info("Scheduling reconnect", {
      attempt: this.connectionStatus.reconnectAttempts,
      delay,
    });

    // Emit status change event
    this.eventBus.emit<StreamingStatusChangedEvent>({
      type: "StreamingStatusChanged",
      status: this.getConnectionStatus(),
      source: "StreamingVideoService",
    });

    this.reconnectTimer = this.timerService.setTimeout(() => {
      this.connect().catch((error) => {
        this.logger.error("Reconnection failed", { error });
      });
    }, delay);
  }
}
