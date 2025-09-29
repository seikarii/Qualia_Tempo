/**
 * QUALIA.CODE v1.1 - StateStreamingService Implementation
 * WebSocket-based state streaming service for receiving QualiaState updates.
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { IWebSocketService } from "./interfaces/IWebSocketService";
import type { ITimerService } from "./interfaces/ITimerService";
import type { StreamingConfig } from "./contracts/IStateStreamingService.contracts";
import type { QualiaState } from "../types/contracts";
import type { QualiaStateUpdatedEvent, StreamingStatusChangedEvent, ConnectionStatus } from "./contracts/events.contracts";
import { logMethod, catchError } from "../utils/decorators";
import type { IStateStreamingService } from "./interfaces/IStateStreamingService";

@injectable()
export class StateStreamingService implements IStateStreamingService {
  @inject(TYPES.IEventBus)
  private eventBus!: IEventBus;
  private readonly logger: ILogger;
  private readonly webSocketService: IWebSocketService;
  private readonly timerService: ITimerService;
  private readonly config: StreamingConfig;

  // WebSocket connection state
  private connectionUrl: string;
  private state: "IDLE" | "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "RECONNECTING" | "ERROR" = "IDLE";

  // Reconnection management
  private reconnectTimerId: number | null = null;
  private pingTimerId: number | null = null;
  private reconnectAttempts = 0;

  // Statistics
  private messagesReceived = 0;
  private connectionStartTime = 0;

  constructor(
    @inject(TYPES.IWebSocketService) webSocketService: IWebSocketService,
    @inject(TYPES.ITimerService) timerService: ITimerService,
    @inject(TYPES.StreamingConfig) config: StreamingConfig,
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.webSocketService = webSocketService;
    this.timerService = timerService;
    this.config = config;
    this.logger = logger;

    // Build connection URL with authentication if enabled
    this.connectionUrl = this.config.websocket.url;
    if (this.config.authentication?.enabled && this.config.authentication.token) {
      const separator = this.connectionUrl.includes('?') ? '&' : '?';
      this.connectionUrl = `${this.connectionUrl}${separator}token=${encodeURIComponent(this.config.authentication.token)}`;
    }

    this.logger.info("StateStreamingService initialized", {
      connectionUrl: this.connectionUrl,
      maxReconnectAttempts: this.config.websocket.maxReconnectAttempts,
    });
  }

  @logMethod
  public async start(): Promise<void> {
    this.logger.info("StateStreamingService started and EventBus injected.");
  }

  @logMethod
  @catchError
  async connect(): Promise<void> {
    if (this.webSocketService.isConnected()) {
      this.logger.info("Already connected to state stream");
      return;
    }

    if (this.state === "CONNECTING") {
      this.logger.info("Connection attempt already in progress");
      return;
    }

    this.state = "CONNECTING";
    this.updateConnectionStatus();

    try {
      // Register event handlers
      this.webSocketService.onOpen(() => this.handleOpen());
      this.webSocketService.onMessage((data) => this.handleMessage(data));
      this.webSocketService.onClose((event) => this.handleClose(event));
      this.webSocketService.onError((error) => this.handleError(error));

      // Connect to WebSocket
      await this.webSocketService.connect(this.connectionUrl);

      this.logger.info("Initiating WebSocket connection to state stream", {
        url: this.connectionUrl,
      });
    } catch (error) {
      this.logger.error("Failed to create WebSocket connection", { error });
      this.state = "ERROR";
      this.updateConnectionStatus();
      throw error;
    }
  }

  @logMethod
  @catchError
  async disconnect(): Promise<void> {
    this.state = "DISCONNECTED";
    this.updateConnectionStatus();

    if (this.reconnectTimerId) {
      this.timerService.clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }

    if (this.pingTimerId) {
      this.timerService.clearInterval(this.pingTimerId);
      this.pingTimerId = null;
    }

    await this.webSocketService.disconnect();

    this.logger.info("Disconnected from state stream");
  }

  @logMethod
  getConnectionStatus(): ConnectionStatus {
    return {
      connected: this.state === "CONNECTED",
      state: this.state as any, // Type assertion for compatibility
      url: this.connectionUrl,
      connectedAt: this.connectionStartTime ? new Date(this.connectionStartTime) : undefined,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  private handleOpen = (): void => {
    this.state = "CONNECTED";
    this.connectionStartTime = Date.now();
    this.reconnectAttempts = 0;
    this.updateConnectionStatus();

    this.startPingTimer();

    this.logger.info("Connected to state stream", {
      connectionTime: this.connectionStartTime,
    });
  };

  private handleMessage = (event: MessageEvent): void => {
    try {
      const data = JSON.parse(event.data);
      this.messagesReceived++;

      if (data.type === "qualiaState") {
        const qualiaState: QualiaState = data.state;
        this.eventBus.emit<QualiaStateUpdatedEvent>({
          type: "QualiaStateUpdated",
          qualiaState,
        });
      } else if (data.type === "pong") {
        // Handle ping response
        this.logger.debug("Received pong from server");
      } else {
        this.logger.debug("Received unknown message type", { type: data.type });
      }
    } catch (error) {
      this.logger.error("Failed to parse WebSocket message", { error, data: event.data });
    }
  };

  private handleClose = (event: CloseEvent): void => {
    this.state = "DISCONNECTED";
    this.updateConnectionStatus();

    if (this.pingTimerId) {
      this.timerService.clearInterval(this.pingTimerId);
      this.pingTimerId = null;
    }

    this.logger.info("WebSocket connection closed", {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });

    // Attempt reconnection if not a clean disconnect
    if (!event.wasClean && event.code !== 1000) {
      this.scheduleReconnect();
    }
  };

  private handleError = (error: Event): void => {
    this.state = "ERROR";
    this.updateConnectionStatus();

    this.logger.error("WebSocket connection error", { error });
    this.scheduleReconnect();
  };

  private scheduleReconnect = (): void => {
    if (this.reconnectAttempts >= this.config.websocket.maxReconnectAttempts) {
      this.logger.error("Max reconnection attempts reached", {
        attempts: this.reconnectAttempts,
        maxAttempts: this.config.websocket.maxReconnectAttempts,
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.websocket.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1); // Exponential backoff

    this.logger.info("Scheduling reconnection", {
      attempt: this.reconnectAttempts,
      delay: delay,
    });

    this.reconnectTimerId = this.timerService.setTimeout(() => {
      this.connect().catch((error) => {
        this.logger.error("Reconnection failed", { error });
      });
    }, delay);
  };

  private startPingTimer = (): void => {
    this.pingTimerId = this.timerService.setInterval(() => {
      if (this.webSocketService.isConnected()) {
        this.webSocketService.send(JSON.stringify({
          type: "ping",
          timestamp: Date.now(),
          pingId: Math.random().toString(36).substr(2, 9),
        }));
      }
    }, this.config.websocket.pingInterval);
  };

  private updateConnectionStatus = (): void => {
    this.eventBus.emit<StreamingStatusChangedEvent>({
      type: "StreamingStatusChanged",
      status: this.getConnectionStatus(),
    });
  };
}
