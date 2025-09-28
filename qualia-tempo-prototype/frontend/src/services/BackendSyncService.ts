/**
 * QUALIA.CODE v1.1 - BackendSyncService
 * Service responsible for synchronizing frontend state with backend via EventBus.
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import { EventHandler } from "./EventBus";
import type { BackendSyncEvent, ErrorEvent, QualiaStateUpdatedEvent } from "./contracts/events.contracts";
import {
  logMethod,
  catchError,
  validateEventProperty,
} from "../utils/decorators";
import type { BackendSyncConfig, QualiaStateRequest, HealthCheckResponse, QualiaSyncResponse } from "./contracts/IBackendSyncService.contracts";
import type { IBackendSyncService } from "./interfaces/IBackendSyncService";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { IHttpService } from "./interfaces/IHttpService";
import type { ITimerService } from "./interfaces/ITimerService";
import type { QualiaState } from "../types/contracts";

// QUALIA.CODE: Module-level constant for pre-config initialization message
const SERVICE_INIT_MESSAGE = "BackendSyncService initialized - configuration will be loaded on demand";

// Backend synchronization event interface - REMOVED: Using EventBus definition

// Configuration interface for BackendSync behavior - REMOVED: Using ConfigurationService interface

// Default configuration - REMOVED: Using ConfigurationService defaults

// API request/response types - MOVED TO contracts/IBackendSyncService.contracts.ts

/**
 * Service for synchronizing frontend state with backend API.
 * Handles throttled requests, error recovery, and connection management.
 */
@injectable()
export class BackendSyncService implements IBackendSyncService {
  private config: BackendSyncConfig;
  private eventListenerIds: string[] = [];
  private isRunning = false;
  private connected = false;
  private eventBus: IEventBus;
  private logger: ILogger;
  private httpService: IHttpService;
  private timerService: ITimerService;

  // Throttling state
  private lastSyncTime = 0;
  private pendingSync: QualiaStateRequest | null = null;
  private syncTimeoutId: number | null = null;

  // Connection monitoring
  private healthCheckInterval: number = 0; // Will be loaded from config
  private healthCheckIntervalId: number | null = null;

  // Statistics tracking
  private syncCount = 0;
  private errorCount = 0;
  private totalSyncTime = 0;
  private lastSyncTimestamp: Date | null = null;

  constructor(
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.BackendSyncConfig) config: BackendSyncConfig,
    @inject(TYPES.IHttpService) httpService: IHttpService,
    @inject(TYPES.ITimerService) timerService: ITimerService,
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.config = config;
    this.httpService = httpService;
    this.timerService = timerService;

    this.logger.info(SERVICE_INIT_MESSAGE);
  }

  // eslint-disable-next-line max-params
  /**
   * QUALIA.CODE: Ensure configuration is loaded before accessing it
   */


  /**
   * Start the sync service and begin listening to events.
   */
  @logMethod
  @catchError
  public async start(): Promise<void> {
    this.logger.info("🚀 [BackendSync] Starting service...");
    
    if (this.isRunning) {
      this.logger.warn("⚠️ [BackendSync] Service already running");
      return;
    }

    this.healthCheckInterval = this.config.connection.healthCheckInterval;
    this.subscribeToEvents();
    this.startHealthChecking();
    this.isRunning = true;
    
    this.logger.info("✅ [BackendSync] Service started successfully");
  }

  /**
   * Check if backend is connected
   */
  @logMethod
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Stop the sync service and clean up resources.
   */
  @logMethod
  @catchError
  public async stop(): Promise<void> {
    const startTime = performance.now();
    this.logger.info("🛑 [BackendSync] Stop called");

    try {
      if (!this.isRunning) {
        this.logger.warn("⚠️ [BackendSync] Service not running");
        return;
      }

      this.unsubscribeFromEvents();
      this.stopHealthChecking();
      this.clearPendingSync();
      this.isRunning = false;
      this.connected = false;

      const duration = performance.now() - startTime;
      this.logger.info(
        `🛑 [BackendSync] Service stopped - ${duration.toFixed(2)}ms`,
      );
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `🚨 [BackendSync] Stop failed - ${duration.toFixed(2)}ms:`,
        { error },
      );
    }
  }

  /**
   * Update configuration at runtime.
   */
  @logMethod
  @catchError
  public updateConfig(newConfig: Partial<BackendSyncConfig>): void {
    const startTime = performance.now();
    this.logger.info("⚙️ [BackendSync] UpdateConfig called");

    try {
      this.config = { ...this.config, ...newConfig };

      const duration = performance.now() - startTime;
      this.logger.info(
        `⚙️ [BackendSync] Configuration updated - ${duration.toFixed(2)}ms`,
      );
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `🚨 [BackendSync] UpdateConfig failed - ${duration.toFixed(2)}ms:`,
        { error },
      );
      throw error;
    }
  }

  /**
   * Force an immediate sync (bypassing throttling).
   */
  @logMethod
  @catchError
  public async forceSync(): Promise<void> {
    const startTime = performance.now();
    this.logger.info("⚡ [BackendSync] ForceSync called");

    try {
      if (this.pendingSync) {
        await this.performSync(this.pendingSync);
        this.pendingSync = null;
      }

      const duration = performance.now() - startTime;
      this.logger.info(
        `⚡ [BackendSync] Force sync completed - ${duration.toFixed(2)}ms`,
      );
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `🚨 [BackendSync] ForceSync failed - ${duration.toFixed(2)}ms:`,
        { error },
      );
      throw error;
    }
  }

  /**
   * Check if the service is connected to the backend.
   */
  @logMethod
  public isBackendConnected(): boolean {
    return this.connected;
  }

  /**
   * Get current configuration.
   */
  @logMethod
  @catchError
  public getConfig(): BackendSyncConfig {
    return { ...this.config };
  }

  // Private methods

  private subscribeToEvents(): void {
    // Subscribe to QualiaStateUpdated events
    const qualiaStateListener: EventHandler<QualiaStateUpdatedEvent> = (
      event,
    ) => {
      this.handleQualiaStateUpdate(event);
    };

    const listenerId = this.eventBus.subscribe(
      "QualiaStateUpdated",
      qualiaStateListener,
      { priority: "high" },
    );
    this.eventListenerIds.push(listenerId);

    this.logger.info("📡 [BackendSync] Subscribed to events");
  }

  private unsubscribeFromEvents(): void {
    for (const listenerId of this.eventListenerIds) {
      this.eventBus.unsubscribe(listenerId);
    }
    this.eventListenerIds = [];

    this.logger.info("📡 [BackendSync] Unsubscribed from events");
  }

  @validateEventProperty("qualiaState", "QualiaState")
  private handleQualiaStateUpdate(event: QualiaStateUpdatedEvent): void {
    this.logger.info("📊 [BackendSync] QualiaState update received");

    if (!this.isConnected) {
      this.logger.warn(
        `⚠️ [BackendSync] ${this.config.messages.backendNotConnected}`,
      );
      return;
    }

    const qualiaRequest: QualiaStateRequest = {
      intensity: event.qualiaState.intensity || 0,
      precision: event.qualiaState.precision || 0,
      aggression: event.qualiaState.aggression || 0,
      flow: event.qualiaState.flow || 0,
      chaos: event.qualiaState.chaos || 0,
      recovery: event.qualiaState.recovery || 0,
      transcendence: event.qualiaState.transcendence || 0,
    };

    this.scheduleSync(qualiaRequest);
  }

  private scheduleSync(qualiaRequest: QualiaStateRequest): void {
    const now = performance.now();
    const timeSinceLastSync = now - this.lastSyncTime;

    // Store the latest state
    this.pendingSync = qualiaRequest;

    // If we haven't hit the throttle limit, sync immediately
    if (timeSinceLastSync >= this.config.sync.throttleDelay) {
      this.performSyncSafe(qualiaRequest);
      this.pendingSync = null;
    } else {
      // Schedule a delayed sync
      this.clearPendingSync();
      const delay = this.config.sync.throttleDelay - timeSinceLastSync;

      this.syncTimeoutId = this.timerService.setTimeout(() => {
        if (this.pendingSync) {
          this.performSyncSafe(this.pendingSync);
          this.pendingSync = null;
        }
      }, delay);

      this.logger.info(
        `⏱️ [BackendSync] Sync scheduled in ${delay.toFixed(0)}ms`,
      );
    }
  }

  private async performSyncSafe(
    qualiaRequest: QualiaStateRequest,
  ): Promise<void> {
    try {
      await this.performSync(qualiaRequest);
    } catch (error) {
      this.logger.error("🚨 [BackendSync] Sync failed", { error });

      // Emit error event
      this.eventBus.emit<ErrorEvent>({
        type: "Error",
        error: error instanceof Error ? error : new Error(String(error)),
        severity: "medium",
      });
    }
  }

  private async performSync(qualiaRequest: QualiaStateRequest): Promise<void> {
    const startTime = performance.now();

    if (this.config.validation.logValidationErrors) {
      this.logger.info("🌐 [BackendSync] Sending QualiaState to backend:", {
        qualiaRequest,
      });
    }

    const url = `${this.config.api.baseUrl}${this.config.api.qualiaEndpoint}`;

    try {
      const response = await this._executeSyncRequest(url, qualiaRequest);

      this.lastSyncTime = performance.now();

      if (this.config.validation.logValidationErrors) {
        this.logger.info("📥 [BackendSync] Backend response:", { response });
      }

      // Emit backend sync event
      this.eventBus.emit<BackendSyncEvent>({
        type: "BackendSync",
        data: response,
        syncType: "qualiaState",
      });

      const duration = performance.now() - startTime;
      this.logger.info(
        `✅ [BackendSync] Sync completed - ${duration.toFixed(2)}ms`,
      );

      // Update statistics
      this.syncCount++;
      this.totalSyncTime += duration;
      this.lastSyncTimestamp = new Date();
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `🚨 [BackendSync] Sync failed - ${duration.toFixed(2)}ms:`,
        { error },
      );

      // Update error statistics
      this.errorCount++;

      throw error;
    }
  }

  private async _executeSyncRequest(url: string, data: QualiaStateRequest): Promise<QualiaSyncResponse> {
    return await this.httpService.post<QualiaSyncResponse>(url, {
      timeout: this.config.api.timeout,
      headers: {
        "Content-Type": "application/json",
      },
      body: data,
    });
  }

  private async checkHealth(): Promise<void> {
    const startTime = performance.now();
    this.logger.info("🏥 [BackendSync] Health check");

    try {
      const url = `${this.config.api.baseUrl}${this.config.api.healthEndpoint}`;
      const response = await this._executeHealthCheckRequest(url);

      this.connected = true;

      const duration = performance.now() - startTime;
      this.logger.info(
        `✅ [BackendSync] Backend healthy - ${duration.toFixed(2)}ms`,
        { response },
      );
    } catch (error) {
      this.connected = false;
      const duration = performance.now() - startTime;
      this.logger.error(
        `🚨 [BackendSync] Health check failed - ${duration.toFixed(2)}ms:`,
        { error, url: `${this.config.api.baseUrl}${this.config.api.healthEndpoint}` },
      );
      throw error;
    }
  }

  private async _executeHealthCheckRequest(url: string): Promise<HealthCheckResponse> {
    return await this.httpService.get<HealthCheckResponse>(url, {
      timeout: this.config.api.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  private startHealthChecking(): void {
    this.stopHealthChecking(); // Ensure no duplicate intervals

    this.healthCheckIntervalId = this.timerService.setInterval(() => {
      this.checkHealth().catch((error) => {
        this.logger.error("🚨 [BackendSync] Periodic health check failed:", {
          error,
        });
        this.connected = false;
      });
    }, this.healthCheckInterval); // Check every configured interval
  }

  private stopHealthChecking(): void {
    if (this.healthCheckIntervalId !== null) {
      this.timerService.clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = null;
    }
  }

  private clearPendingSync(): void {
    if (this.syncTimeoutId !== null) {
      this.timerService.clearTimeout(this.syncTimeoutId);
      this.syncTimeoutId = null;
    }
  }

  // ===== INTERFACE COMPLIANCE METHODS =====

  /**
   * Synchronize QualiaState with backend.
   * @param state The QualiaState to sync
   * @returns Promise that resolves when sync is complete
   */
  @logMethod
  @catchError
  public async syncQualiaState(state: QualiaState): Promise<void> {
    const qualiaRequest: QualiaStateRequest = {
      intensity: state.intensity || 0,
      precision: state.precision || 0,
      aggression: state.aggression || 0,
      flow: state.flow || 0,
      chaos: state.chaos || 0,
      recovery: state.recovery || 0,
      transcendence: state.transcendence || 0,
    };

    const url = `${this.config.api.baseUrl}${this.config.api.qualiaEndpoint}`;
    await this.httpService.post<QualiaSyncResponse>(url, {
      timeout: this.config.api.timeout,
      body: qualiaRequest,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get service status and statistics.
   * @returns Object containing service metrics
   */
  @logMethod
  public getStatus(): {
    isRunning: boolean;
    isConnected: boolean;
    lastSyncTime: Date | null;
    syncCount: number;
    errorCount: number;
    avgSyncTime: number;
  } {
    const avgSyncTime =
      this.syncCount > 0 ? this.totalSyncTime / this.syncCount : 0;

    return {
      isRunning: this.isRunning,
      isConnected: this.isBackendConnected(),
      lastSyncTime: this.lastSyncTimestamp,
      syncCount: this.syncCount,
      errorCount: this.errorCount,
      avgSyncTime: avgSyncTime,
    };
  }

  /**
   * Manually test the backend connection.
   * @returns Promise that resolves with connection status
   */
  @logMethod
  @catchError
  public async testConnection(): Promise<boolean> {
    try {
      const url = `${this.config.api.baseUrl}${this.config.api.healthEndpoint}`;
      await this.httpService.get<HealthCheckResponse>(url, {
        timeout: this.config.api.timeout,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}

// QUALIA.CODE COMPLIANCE: Service instantiation handled exclusively by InversifyJS IoC container
// Manual instantiation (new BackendSyncService()) is FORBIDDEN
