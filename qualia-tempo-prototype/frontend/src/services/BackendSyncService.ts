/**
 * QUALIA.CODE v1.1 - BackendSyncService
 * Service responsible for synchronizing frontend state with backend via EventBus.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import {
  EventHandler,
  BackendSyncEvent,
  ErrorEvent,
} from './EventBus';
import type { QualiaStateUpdatedEvent } from './EventBus';
import { logMethod, catchError, validateEventProperty } from '../utils/decorators';
import type { BackendSyncConfig } from './ConfigurationService';
import type { IBackendSyncService } from './interfaces/IBackendSyncService';
import type { IEventBus } from './interfaces/IEventBus';
import type { ILogger } from './interfaces/ILogger';
import type { IHttpService } from './interfaces/IHttpService';
import type { ITimerService } from './interfaces/ITimerService';
import type { IConfigurationService } from './interfaces/IConfigurationService';
import type { QualiaState } from '../types/contracts';

// Backend synchronization event interface - REMOVED: Using EventBus definition

// Configuration interface for BackendSync behavior - REMOVED: Using ConfigurationService interface

// Default configuration - REMOVED: Using ConfigurationService defaults

// API request/response types
export interface QualiaStateRequest {
  intensity: number;
  precision: number;
  aggression: number;
  flow: number;
  chaos: number;
  recovery: number;
  transcendence: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Service for synchronizing frontend state with backend API.
 * Handles throttled requests, error recovery, and connection management.
 */
@injectable()
export class BackendSyncService implements IBackendSyncService {
  private config: BackendSyncConfig | null = null; // QUALIA.CODE: Lazy initialization
  private eventListenerIds: string[] = [];
  private isRunning = false;
  private isConnected = false;
  private eventBus: IEventBus;
  private logger: ILogger;
  private configService: IConfigurationService;
  private httpService: IHttpService;
  private timerService: ITimerService;

  // Throttling state
  private lastSyncTime = 0;
  private pendingSync: QualiaStateRequest | null = null;
  private syncTimeoutId: number | null = null;

  // Connection monitoring
  private healthCheckInterval: number = 30 * 1000; // 30 seconds default
  private healthCheckIntervalId: number | null = null;

  // Statistics tracking
  private syncCount = 0;
  private errorCount = 0;
  private totalSyncTime = 0;
  private lastSyncTimestamp: Date | null = null;

  constructor(
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IConfigurationService) configService: IConfigurationService,
    @inject(TYPES.IHttpService) httpService: IHttpService,
    @inject(TYPES.ITimerService) timerService: ITimerService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.configService = configService;
    this.httpService = httpService;
    this.timerService = timerService;

    // QUALIA.CODE FIX: Do NOT access configuration in constructor
    // Configuration will be loaded lazily when needed
    this.logger.info('BackendSyncService constructed - configuration will be loaded when start() is called');

    this.logger.info("🔄 [BackendSync] Service initialized");
  }

  /**
   * QUALIA.CODE: Ensure configuration is loaded before accessing it
   */
  private ensureConfigLoaded(): BackendSyncConfig {
    if (!this.config) {
      try {
        this.config = this.configService.getConfigSection<BackendSyncConfig>('backendSync');
        this.healthCheckInterval = this.config.connection.healthCheckInterval;
        this.logger.debug('BackendSyncService configuration loaded successfully');
      } catch (error) {
        this.logger.error('Failed to load BackendSyncService configuration', error);
        throw new Error('BackendSyncService configuration not available');
      }
    }
    return this.config;
  }

  /**
   * Start the sync service and begin listening to events.
   */
  @logMethod()
  @catchError()
  public async start(): Promise<void> {
    const startTime = performance.now();
    this.logger.info("🚀 [BackendSync] Start called");

    // QUALIA.CODE: Load configuration before proceeding
    this.ensureConfigLoaded();

    if (this.isRunning) {
      this.logger.warn("⚠️ [BackendSync] Service already running");
      return;
    }

    const config = this.ensureConfigLoaded();
    const maxRetries = config.sync.maxRetries;
    const retryDelay = config.sync.retryDelay;

    for (let i = 0; i < maxRetries; i++) {
      try {
        this.logger.info(`[BackendSync] Connection attempt ${i + 1}/${maxRetries}...`);
        await this.checkHealth(); // Attempt to connect
        
        // If checkHealth succeeds, we're connected
        this.subscribeToEvents();
        this.startHealthChecking();
        this.isRunning = true;
        const duration = performance.now() - startTime;
        this.logger.info(
          `🚀 [BackendSync] Service started successfully after ${i + 1} attempts - ${duration.toFixed(2)}ms`,
        );
        return; // Exit the function successfully

      } catch (error) {
        this.logger.warn(
          `[BackendSync] Connection attempt ${i + 1} failed. Retrying in ${retryDelay}ms...`,
        );
        if (i === maxRetries - 1) {
          // This was the last attempt, so fail permanently
          const duration = performance.now() - startTime;
          this.logger.error(
            `🚨 [BackendSync] Start failed after ${maxRetries} attempts - ${duration.toFixed(2)}ms`,
            { error },
          );
          this.eventBus.emit<ErrorEvent>({
            type: "Error",
            error: error instanceof Error ? error : new Error(String(error)),
            severity: "high",
          });
          throw error; // Re-throw the final error
        }
        await new Promise<void>(resolve => {
          this.timerService.setTimeout(() => resolve(), retryDelay);
        }); // Wait before retrying
      }
    }
  }

  /**
   * Stop the sync service and clean up resources.
   */
  @logMethod()
  @catchError()
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
      this.isConnected = false;

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
  @logMethod()
  @catchError()
  public updateConfig(newConfig: Partial<BackendSyncConfig>): void {
    const startTime = performance.now();
    this.logger.info("⚙️ [BackendSync] UpdateConfig called");

    try {
      const currentConfig = this.ensureConfigLoaded();
      this.config = { ...currentConfig, ...newConfig };

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
  @logMethod()
  @catchError()
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
  @logMethod()
  @catchError()
  public isBackendConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get current configuration.
   */
  @logMethod()
  @catchError()
  public getConfig(): BackendSyncConfig {
    return { ...this.ensureConfigLoaded() };
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
      { priority: 'high' },
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

  @validateEventProperty('qualiaState', 'QualiaState')
  private handleQualiaStateUpdate(event: QualiaStateUpdatedEvent): void {
    this.logger.info("📊 [BackendSync] QualiaState update received");

    if (!this.isConnected) {
      const config = this.ensureConfigLoaded();
      this.logger.warn(`⚠️ [BackendSync] ${config.messages.backendNotConnected}`);
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
    const config = this.ensureConfigLoaded();

    // Store the latest state
    this.pendingSync = qualiaRequest;

    // If we haven't hit the throttle limit, sync immediately
    if (timeSinceLastSync >= config.sync.throttleDelay) {
      this.performSyncSafe(qualiaRequest);
      this.pendingSync = null;
    } else {
      // Schedule a delayed sync
      this.clearPendingSync();
      const delay = config.sync.throttleDelay - timeSinceLastSync;

      this.syncTimeoutId = this.timerService.setTimeout(() => {
        if (this.pendingSync) {
          this.performSyncSafe(this.pendingSync);
          this.pendingSync = null;
        }
      }, delay);

      this.logger.info(`⏱️ [BackendSync] Sync scheduled in ${delay.toFixed(0)}ms`);
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
    const config = this.ensureConfigLoaded();

    if (config.validation.logValidationErrors) {
      this.logger.info(
        "🌐 [BackendSync] Sending QualiaState to backend:",
        { qualiaRequest },
      );
    }

    const url = `${config.api.baseUrl}${config.api.qualiaEndpoint}`;

    try {
      const response = await this.httpService.post<any>(url, {
        timeout: config.api.timeout,
        headers: {
          "Content-Type": "application/json",
        },
        body: qualiaRequest,
      });

      this.lastSyncTime = performance.now();

      if (config.validation.logValidationErrors) {
        this.logger.info("📥 [BackendSync] Backend response:", { response });
      }

      // Emit backend sync event
      this.eventBus.emit<BackendSyncEvent>({
        type: "BackendSync",
        data: response,
        syncType: "qualiaState",
      });

      const duration = performance.now() - startTime;
      this.logger.info(`✅ [BackendSync] Sync completed - ${duration.toFixed(2)}ms`);

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

  private async checkHealth(): Promise<void> {
    const startTime = performance.now();
    const config = this.ensureConfigLoaded();
    this.logger.info("🏥 [BackendSync] Health check");

    try {
      const url = `${config.api.baseUrl}${config.api.healthEndpoint}`;
      this.logger.debug(`[BackendSync] Health check URL: ${url}`);
      
      const response = await this.httpService.get<any>(url, { 
        timeout: config.api.timeout,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });

      this.isConnected = true;

      const duration = performance.now() - startTime;
      this.logger.info(
        `✅ [BackendSync] Backend healthy - ${duration.toFixed(2)}ms`,
        { response }
      );
    } catch (error) {
      this.isConnected = false;
      const duration = performance.now() - startTime;
      this.logger.error(
        `🚨 [BackendSync] Health check failed - ${duration.toFixed(2)}ms:`,
        { error, url: `${config.api.baseUrl}${config.api.healthEndpoint}` },
      );
      throw error;
    }
  }

  private startHealthChecking(): void {
    this.stopHealthChecking(); // Ensure no duplicate intervals

    this.healthCheckIntervalId = this.timerService.setInterval(() => {
      this.checkHealth().catch((error) => {
        this.logger.error("🚨 [BackendSync] Periodic health check failed:", { error });
        this.isConnected = false;
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
  @logMethod()
  @catchError()
  public async syncQualiaState(state: QualiaState): Promise<void> {
    const config = this.ensureConfigLoaded();
    const qualiaRequest: QualiaStateRequest = {
      intensity: state.intensity || 0,
      precision: state.precision || 0,
      aggression: state.aggression || 0,
      flow: state.flow || 0,
      chaos: state.chaos || 0,
      recovery: state.recovery || 0,
      transcendence: state.transcendence || 0,
    };

    const url = `${config.api.baseUrl}${config.api.qualiaEndpoint}`;
    await this.httpService.post<any>(url, {
      timeout: config.api.timeout,
      body: qualiaRequest,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get service status and statistics.
   * @returns Object containing service metrics
   */
  @logMethod()
  public getStatus(): {
    isRunning: boolean;
    isConnected: boolean;
    lastSyncTime: Date | null;
    syncCount: number;
    errorCount: number;
    avgSyncTime: number;
  } {
    const avgSyncTime = this.syncCount > 0 ? this.totalSyncTime / this.syncCount : 0;

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
  @logMethod()
  @catchError()
  public async testConnection(): Promise<boolean> {
    try {
      const config = this.ensureConfigLoaded();
      const url = `${config.api.baseUrl}${config.api.healthEndpoint}`;
      await this.httpService.get<any>(url, { 
        timeout: config.api.timeout,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      return true;
    } catch {
      return false;
    }
  }
}

// QUALIA.CODE COMPLIANCE: Service instantiation handled exclusively by InversifyJS IoC container
// Manual instantiation (new BackendSyncService()) is FORBIDDEN
