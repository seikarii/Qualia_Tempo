/**
 * QUALIA.CODE v1.1 - StateStreamingService Implementation
 * WebSocket-based state streaming service for receiving QualiaState updates.
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { IConfigurationService } from "./interfaces/IConfigurationService";
import type { ITimerService } from "./interfaces/ITimerService";
import type { QualiaState } from "../types/contracts";
import { logMethod, catchError } from "../utils/decorators";

export interface IStateStreamingService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionStatus(): ConnectionStatus;
}

export interface ConnectionStatus {
  connected: boolean;
  state: "IDLE" | "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";
  lastStateUpdate?: number;
}

@injectable()
export class StateStreamingService implements IStateStreamingService {
  private readonly eventBus: IEventBus;
  private readonly logger: ILogger;
  private readonly configService: IConfigurationService;
  private readonly timerService: ITimerService;

  // WebSocket connection
  private websocket: WebSocket | null = null;
  private connectionUrl: string;
  private state: "IDLE" | "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR" = "IDLE";

  // Reconnection management
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectDelay: number;
  private readonly pingInterval: number;
  private readonly pingTimeout: number;

  // Statistics
  private messagesReceived = 0;
  private lastMessageTimestamp = 0;
  private connectionStartTime = 0;

  constructor(
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IConfigurationService) configService: IConfigurationService,
    @inject(TYPES.ITimerService) timerService: ITimerService,
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.configService = configService;
    this.timerService = timerService;

    // Load streaming configuration
    const streamingConfig =
      configService.getConfig().backendSync.streaming?.websocket || {};
    this.connectionUrl =
      streamingConfig.url || "ws://127.0.0.1:8000/ws/state_stream";
    this.maxReconnectAttempts = streamingConfig.maxReconnectAttempts || 10;
    this.reconnectDelay = streamingConfig.reconnectDelay || 2000;
    this.pingInterval = streamingConfig.pingInterval || 8000;
    this.pingTimeout = streamingConfig.pingTimeout || 6000;

    this.logger.info("StateStreamingService initialized", {
      connectionUrl: this.connectionUrl,
      maxReconnectAttempts: this.maxReconnectAttempts,
    });
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
      this.websocket = new WebSocket(this.connectionUrl);

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
      state: this.state,
      lastStateUpdate: Date.now(),
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
      this.lastMessageTimestamp = Date.now();

      if (data.type === "qualiaState") {
        const qualiaState: QualiaState = data.state;
        this.eventBus.publish("QualiaStateUpdated", { qualiaState }, "StateStreamingService");
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
    this.eventBus.publish("StreamingStatusChanged", {
      service: "StateStreamingService",
      status: this.getConnectionStatus(),
      statistics: {
        messagesReceived: this.messagesReceived,
        lastMessageTimestamp: this.lastMessageTimestamp,
        connectionStartTime: this.connectionStartTime,
      },
    }, "StateStreamingService");
  };
}
