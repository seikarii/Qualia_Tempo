/**
 * QUALIA.CODE v1.1 - StateStreamingService Implementation
 * WebSocket-based state streaming service for receiving QualiaState updates.
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { IConfigurationService } from "./interfaces/IConfigurationService";
import type { QualiaState } from "../types/contracts";
import type { QualiaStateUpdatedEvent, StreamingStatusChangedEvent, ConnectionStatus } from "./contracts/events.contracts";
import { logMethod, catchError } from "../utils/decorators";

export interface IStateStreamingService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionStatus(): ConnectionStatus;
}

@injectable()
export class StateStreamingService implements IStateStreamingService {
  @inject(TYPES.IEventBus)
  private eventBus!: IEventBus;
  private readonly logger: ILogger;
  private readonly configService: IConfigurationService;

  // WebSocket connection
  private websocket: WebSocket | null = null;
  private connectionUrl: string;
  private state: "IDLE" | "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "RECONNECTING" | "ERROR" = "IDLE";

  // Reconnection management
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectDelay: number;
  private readonly pingInterval: number;

  // Statistics
  private messagesReceived = 0;
  private connectionStartTime = 0;

  // Authentication
  private authEnabled: boolean = false;
  private authToken: string | null = null;

  constructor(
    @inject(TYPES.IConfigurationService) configService: IConfigurationService,
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.configService = configService;
    this.logger = logger;

    // Ensure configService is recognized as used
    void this.configService;

    // Load streaming configuration
    const streamingConfig =
      configService.getConfig().backendSync.streaming?.websocket || {};
    this.connectionUrl =
      streamingConfig.url || "ws://127.0.0.1:8000/ws/video_stream";
    this.maxReconnectAttempts = streamingConfig.maxReconnectAttempts || 10;
    this.reconnectDelay = streamingConfig.reconnectDelay || 2000;
    this.pingInterval = streamingConfig.pingInterval || 8000;

    // Load authentication configuration
    const authConfig = configService.getConfig().backendSync.authentication || {};
    this.authEnabled = authConfig.enabled || false;
    this.authToken = authConfig.token || null;

    this.logger.info("StateStreamingService initialized", {
      connectionUrl: this.connectionUrl,
      maxReconnectAttempts: this.maxReconnectAttempts,
    });
  }

  @logMethod
  public async start(): Promise<void> {
    this.logger.info("StateStreamingService started and EventBus injected.");
  }

  @logMethod
  @catchError
  async connect(): Promise<void> {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
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
      // Build connection URL with authentication if enabled
      let connectionUrl = this.connectionUrl;
      if (this.authEnabled && this.authToken) {
        const separator = connectionUrl.includes('?') ? '&' : '?';
        connectionUrl = `${connectionUrl}${separator}token=${encodeURIComponent(this.authToken)}`;
        this.logger.info("Authentication enabled - including token in connection");
      } else {
        this.logger.info("Authentication disabled - connecting without token");
      }

      this.websocket = new WebSocket(connectionUrl);

      this.websocket.onopen = this.handleOpen.bind(this);
      this.websocket.onmessage = this.handleMessage.bind(this);
      this.websocket.onclose = this.handleClose.bind(this);
      this.websocket.onerror = this.handleError.bind(this);

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

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    if (this.websocket) {
      this.websocket.close(1000, "Client disconnecting");
      this.websocket = null;
    }

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

    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
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
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error("Max reconnection attempts reached", {
        attempts: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1); // Exponential backoff

    this.logger.info("Scheduling reconnection", {
      attempt: this.reconnectAttempts,
      delay: delay,
    });

    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch((error) => {
        this.logger.error("Reconnection failed", { error });
      });
    }, delay);
  };

  private startPingTimer = (): void => {
    this.pingTimer = window.setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({
          type: "ping",
          timestamp: Date.now(),
          pingId: Math.random().toString(36).substr(2, 9),
        }));
      }
    }, this.pingInterval);
  };

  private updateConnectionStatus = (): void => {
    this.eventBus.emit<StreamingStatusChangedEvent>({
      type: "StreamingStatusChanged",
      status: this.getConnectionStatus(),
    });
  };
}
