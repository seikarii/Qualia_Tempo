import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import { logMethod, catchError } from "../utils/decorators";
import type { ILogger } from "./interfaces/ILogger";
import type { IWebSocketService } from "./interfaces/IWebSocketService";

/**
 * QUALIA.CODE v1.1 Compliant WebSocketService
 * Abstraction layer for WebSocket operations
 * Provides a testable and mockable WebSocket implementation.
 */
@injectable()
export class WebSocketService implements IWebSocketService {
  private readonly logger: ILogger;
  private websocket: WebSocket | null = null;

  // Event handlers
  private messageHandler?: (data: any) => void;
  private openHandler?: () => void;
  private closeHandler?: (event: CloseEvent) => void;
  private errorHandler?: (error: Event) => void;

  constructor(@inject(TYPES.ILogger) logger: ILogger) {
    this.logger = logger;
    this.logger.info("WebSocketService initialized");
  }

  @logMethod
  @catchError
  public async connect(url: string): Promise<void> {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.logger.info("WebSocket already connected");
      return;
    }

    if (this.websocket && this.websocket.readyState === WebSocket.CONNECTING) {
      this.logger.info("WebSocket connection already in progress");
      return;
    }

    try {
      this.websocket = new WebSocket(url);

      // Bind event handlers
      this.websocket.onopen = this.handleOpen.bind(this);
      this.websocket.onmessage = this.handleMessage.bind(this);
      this.websocket.onclose = this.handleClose.bind(this);
      this.websocket.onerror = this.handleError.bind(this);

      this.logger.info("WebSocket connection initiated", { url });

      // Wait for connection to open
      return new Promise((resolve, reject) => {
        if (!this.websocket) {
          reject(new Error("WebSocket not initialized"));
          return;
        }

        const originalOnOpen = this.websocket.onopen;
        this.websocket.onopen = (event) => {
          if (originalOnOpen) originalOnOpen.call(this.websocket!, event);
          resolve();
        };

        const originalOnError = this.websocket.onerror;
        this.websocket.onerror = (event) => {
          if (originalOnError) originalOnError.call(this.websocket!, event);
          reject(new Error("WebSocket connection failed"));
        };
      });
    } catch (error) {
      this.logger.error("Failed to create WebSocket connection", { error, url });
      throw error;
    }
  }

  @logMethod
  @catchError
  public async disconnect(): Promise<void> {
    if (this.websocket) {
      this.websocket.close(1000, "Client disconnecting");
      this.websocket = null;
    }

    // Clear handlers
    this.messageHandler = undefined;
    this.openHandler = undefined;
    this.closeHandler = undefined;
    this.errorHandler = undefined;

    this.logger.info("WebSocket disconnected and cleaned up");
  }

  @logMethod
  public send(data: string | ArrayBuffer | Blob): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      this.logger.error("Cannot send message: WebSocket not connected");
      throw new Error("WebSocket not connected");
    }

    this.websocket.send(data);
    this.logger.debug("WebSocket message sent", {
      type: typeof data,
      size: typeof data === 'string' ? data.length : 'binary'
    });
  }

  @logMethod
  public onMessage(callback: (data: any) => void): void {
    this.messageHandler = callback;
    this.logger.debug("Message handler registered");
  }

  @logMethod
  public onOpen(callback: () => void): void {
    this.openHandler = callback;
    this.logger.debug("Open handler registered");
  }

  @logMethod
  public onClose(callback: (event: CloseEvent) => void): void {
    this.closeHandler = callback;
    this.logger.debug("Close handler registered");
  }

  @logMethod
  public onError(callback: (error: Event) => void): void {
    this.errorHandler = callback;
    this.logger.debug("Error handler registered");
  }

  @logMethod
  public getReadyState(): number {
    return this.websocket ? this.websocket.readyState : WebSocket.CLOSED;
  }

  @logMethod
  public isConnected(): boolean {
    return this.websocket ? this.websocket.readyState === WebSocket.OPEN : false;
  }

  private handleOpen = (): void => {
    this.logger.info("WebSocket connection opened");
    if (this.openHandler) {
      try {
        this.openHandler();
      } catch (error) {
        this.logger.error("Open handler failed", { error });
      }
    }
  };

  private handleMessage = (event: MessageEvent): void => {
    this.logger.debug("WebSocket message received");
    if (this.messageHandler) {
      try {
        this.messageHandler(event.data);
      } catch (error) {
        this.logger.error("Message handler failed", { error });
      }
    }
  };

  private handleClose = (event: CloseEvent): void => {
    this.logger.info("WebSocket connection closed", {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });
    if (this.closeHandler) {
      try {
        this.closeHandler(event);
      } catch (error) {
        this.logger.error("Close handler failed", { error });
      }
    }
  };

  private handleError = (error: Event): void => {
    this.logger.error("WebSocket error occurred", { error });
    if (this.errorHandler) {
      try {
        this.errorHandler(error);
      } catch (handlerError) {
        this.logger.error("Error handler failed", { error: handlerError });
      }
    }
  };
}