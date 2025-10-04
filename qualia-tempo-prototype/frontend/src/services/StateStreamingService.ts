/**
 * QUALIA.CODE v1.2 - StateStreamingService Implementation
 * WebSocket-based state streaming service for receiving binary particle data.
 * BINARY PROTOCOL: Eliminates JSON serialization for maximum performance.
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { IWebSocketService } from "./interfaces/IWebSocketService";
import type { ITimerService } from "./interfaces/ITimerService";
import type { StreamingConfig, StateStreamingServiceParams } from "./contracts/IStateStreamingService.contracts";
import type { ConnectionStatus, StreamingStatusChangedEvent, ConnectionStateType } from "./contracts/events.contracts";
import { logMethod, catchError, AdaptAndEmit } from "../utils/decorators";
import type { IStateStreamingService } from "./interfaces/IStateStreamingService";
import type { IMessageAdapter } from "./protocol/IMessageAdapter";

@injectable()
export class StateStreamingService implements IStateStreamingService {
  @inject(TYPES.IEventBus)
  private eventBus!: IEventBus;
  private readonly logger: ILogger;
  private readonly webSocketService: IWebSocketService;
  private readonly timerService: ITimerService;
  private readonly config: StreamingConfig;
  private readonly rawToParticleEventAdapter: IMessageAdapter;

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
    @inject(TYPES.StateStreamingServiceParams) params: StateStreamingServiceParams,
    @inject(TYPES.IRawToParticleEventAdapter) rawToParticleEventAdapter: IMessageAdapter
  ) {
    this.webSocketService = params.webSocketService;
    this.timerService = params.timerService;
    this.config = params.config;
    this.logger = params.logger;
    this.rawToParticleEventAdapter = rawToParticleEventAdapter;

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
      // BINARY PROTOCOL: Configure WebSocket for ArrayBuffer mode
      // This must be set before connection establishment
      await this.webSocketService.setBinaryType('arraybuffer');

      // Register event handlers
      this.webSocketService.onOpen(() => this.handleOpen());
      this.webSocketService.onMessage((data) => {
        if (data instanceof ArrayBuffer) {
          this.onRawMessage(data);
        } else {
          this.logger.warn("Received non-ArrayBuffer data from WebSocket", { type: typeof data });
        }
      });
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
      state: this.state as ConnectionStateType,
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

  /**
   * QUALIA.CODE v1.2 - Protocol Adaptation Bundle Implementation
   * This method serves as a PURE ENTRY POINT for raw WebSocket data.
   * The @AdaptAndEmit decorator handles all protocol translation and event emission.
   * 
   * ARCHITECTURAL PURITY ACHIEVED:
   * - StateStreamingService no longer knows about QualiaParticleDataReceivedEvent
   * - StateStreamingService no longer constructs domain events
   * - StateStreamingService no longer directly calls EventBus.emit
   * - Single Responsibility: WebSocket connection management ONLY
   */
  @AdaptAndEmit('rawToParticleEventAdapter')
  private onRawMessage(_data: ArrayBuffer): void {
    // ARCHITECTURAL COMPLIANCE: This method body contains ONLY business logic
    // that belongs to the StateStreamingService (statistics tracking).
    // Protocol translation, event construction, and emission is handled
    // by the @AdaptAndEmit decorator using IoC-resolved dependencies.
    
    this.messagesReceived++;
  }

  private handleClose = (event: CloseEvent): void => {
    this.state = "DISCONNECTED";
    this.updateConnectionStatus();

    if (this.pingTimerId) {
      this.timerService.clearInterval(this.pingTimerId);
      this.pingTimerId = null;
    }

    this.logger.info("State stream connection closed", {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });

    // Attempt reconnection if not a clean close
    if (!event.wasClean && this.reconnectAttempts < this.config.websocket.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  };

  private handleError = (error: Event): void => {
    this.logger.error("State stream connection error", { error });
    this.state = "ERROR";
    this.updateConnectionStatus();

    // Schedule reconnection on error
    if (this.reconnectAttempts < this.config.websocket.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  };

  private scheduleReconnect = (): void => {
    if (this.reconnectTimerId) {
      return; // Already scheduled
    }

    this.reconnectAttempts++;
    this.state = "RECONNECTING";
    this.updateConnectionStatus();

    const delay = this.config.websocket.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    this.logger.info(`Scheduling reconnection attempt ${this.reconnectAttempts}`, {
      delay,
      maxAttempts: this.config.websocket.maxReconnectAttempts,
    });

    this.reconnectTimerId = this.timerService.setTimeout(async () => {
      this.reconnectTimerId = null;
      
      if (this.reconnectAttempts <= this.config.websocket.maxReconnectAttempts) {
        try {
          await this.connect();
        } catch (error) {
          this.logger.error("Reconnection attempt failed", { error });
        }
      }
    }, delay);
  };

  private startPingTimer = (): void => {
    if (this.pingTimerId) {
      this.timerService.clearInterval(this.pingTimerId);
    }

    this.pingTimerId = this.timerService.setInterval(() => {
      if (this.webSocketService.isConnected()) {
        try {
          this.webSocketService.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
          this.logger.debug("Sent ping to server");
        } catch (error) {
          this.logger.error("Failed to send ping", { error });
        }
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
