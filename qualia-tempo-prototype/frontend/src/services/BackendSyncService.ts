/**
 * QUALIA.CODE v1.1 - BackendSyncService
 * Service responsible for synchronizing frontend state with backend via EventBus.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import {
  EventBus,
  EventHandler,
  BackendSyncEvent,
  ErrorEvent,
} from './EventBus';
import type { QualiaStateUpdatedEvent } from './EventBus';
import { logMethod, catchError, validateEventProperty } from '../utils/decorators';
import type { BackendSyncConfig } from './ConfigurationService';
import { QualiaLogger } from './Logger';
import type { IBackendSyncService } from './interfaces/IBackendSyncService';
import type { IEventBus } from './interfaces/IEventBus';
import type { ILogger } from './interfaces/ILogger';
import type { IConfigurationService } from './interfaces/IConfigurationService';

// Backend synchronization event interface - REMOVED: Using EventBus definition

// Configuration interface for BackendSync behavior - REMOVED: Using ConfigurationService interface

// Default configuration - REMOVED: Using ConfigurationService defaults

// API request/response types
export interface QualiaStateRequest {
  intensity: number;
  focus_level: number;
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
  private config: BackendSyncConfig;
  private eventListenerIds: string[] = [];
  private isRunning = false;
  private isConnected = false;
  private eventBus: IEventBus;
  private logger: ILogger;
  private configService: IConfigurationService;

  // Throttling state
  private lastSyncTime = 0;
  private pendingSync: QualiaStateRequest | null = null;
  private syncTimeoutId: number | null = null;

  // Connection monitoring
  private healthCheckInterval: number = 30 * 1000; // 30 seconds in milliseconds
  private healthCheckIntervalId: number | null = null;

  constructor(
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IConfigurationService) configService: IConfigurationService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.configService = configService;

    this.config = this.configService.getBackendConfig();
    // Store health check interval for later use
    this.healthCheckInterval = this.config.connection.healthCheckInterval;

    this.logger.info("🔄 [BackendSync] Service initialized");
  }

  /**
   * Start the sync service and begin listening to events.
   */
  @logMethod()
  @catchError()
  public async start(): Promise<void> {
    const startTime = performance.now();
    this.logger.info("🚀 [BackendSync] Start called");

    if (this.isRunning) {
      this.logger.warn("⚠️ [BackendSync] Service already running");
      return;
    }

    const maxRetries = 5;
    const retryDelay = 1000; // 1 second

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
        await new Promise(resolve => setTimeout(resolve, retryDelay)); // Wait before retrying
      }
    }
  }

  /**
   * Stop the sync service and clean up resources.
   */
  @logMethod()
  @catchError()
  public stop(): void {
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
      { priority: 50 },
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
      this.logger.warn(`⚠️ [BackendSync] ${this.config.messages.backendNotConnected}`);
      return;
    }

    const qualiaRequest: QualiaStateRequest = {
      intensity: event.qualiaState.intensity || 0,
      focus_level: event.qualiaState.focus_level || 0,
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

      this.syncTimeoutId = window.setTimeout(() => {
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

    if (this.config.validation.logValidationErrors) {
      this.logger.info(
        "🌐 [BackendSync] Sending QualiaState to backend:",
        { qualiaRequest },
      );
    }

    const url = `${this.config.api.baseUrl}${this.config.api.qualiaEndpoint}`;

    try {
      const response = await this.makeRequest<any>(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(qualiaRequest),
      });

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
      this.logger.info(`✅ [BackendSync] Sync completed - ${duration.toFixed(2)}ms`);
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `🚨 [BackendSync] Sync failed - ${duration.toFixed(2)}ms:`,
        { error },
      );
      throw error;
    }
  }

  private async checkHealth(): Promise<void> {
    const startTime = performance.now();
    this.logger.info("🏥 [BackendSync] Health check");

    try {
      const url = `${this.config.api.baseUrl}${this.config.api.healthEndpoint}`;
      await this.makeRequest<any>(url, { method: "GET" });

      this.isConnected = true;

      const duration = performance.now() - startTime;
      this.logger.info(
        `✅ [BackendSync] Backend healthy - ${duration.toFixed(2)}ms`,
      );
    } catch (error) {
      this.isConnected = false;
      const duration = performance.now() - startTime;
      this.logger.error(
        `🚨 [BackendSync] Health check failed - ${duration.toFixed(2)}ms:`,
        { error },
      );
      throw error;
    }
  }

  private startHealthChecking(): void {
    this.stopHealthChecking(); // Ensure no duplicate intervals

    this.healthCheckIntervalId = window.setInterval(() => {
      this.checkHealth().catch((error) => {
        this.logger.error("🚨 [BackendSync] Periodic health check failed:", { error });
        this.isConnected = false;
      });
    }, this.healthCheckInterval); // Check every configured interval
  }

  private stopHealthChecking(): void {
    if (this.healthCheckIntervalId !== null) {
      clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = null;
    }
  }

  private clearPendingSync(): void {
    if (this.syncTimeoutId !== null) {
      clearTimeout(this.syncTimeoutId);
      this.syncTimeoutId = null;
    }
  }

  private async makeRequest<T>(url: string, options: any): Promise<T> {
    // Add timeout to fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.api.timeout,
    );

    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // FIX: Required for CORS credentials
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${this.config.api.timeout}ms`);
      }

      throw error;
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
    const qualiaRequest: QualiaStateRequest = {
      intensity: state.intensity || 0,
      focus_level: state.focus_level || 0,
      aggression: state.aggression || 0,
      flow: state.flow || 0,
      chaos: state.chaos || 0,
      recovery: state.recovery || 0,
      transcendence: state.transcendence || 0,
    };

    await this.makeRequest<any>('/api/qualia/state', 'POST', qualiaRequest);
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
    return {
      isRunning: this.isHealthCheckActive,
      isConnected: this.isBackendConnected(),
      lastSyncTime: null, // To be implemented with actual tracking
      syncCount: 0, // To be implemented with actual tracking
      errorCount: 0, // To be implemented with actual tracking
      avgSyncTime: 0, // To be implemented with actual tracking
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
      await this.makeRequest<any>('/api/health', 'GET');
      return true;
    } catch {
      return false;
    }
  }
}

// Note: BackendSyncService should be instantiated by CompositionRoot
// Example: const backendSync = new BackendSyncService();
