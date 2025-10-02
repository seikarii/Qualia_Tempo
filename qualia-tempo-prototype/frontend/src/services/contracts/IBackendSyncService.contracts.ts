/**
 * QUALIA.CODE v1.1 - IBackendSyncService Contracts
 * Single Source of Truth for BackendSyncService data structures.
 * This file is manually maintained for BackendSyncService-specific contracts.
 */

import type { IEventBus } from "../interfaces/IEventBus";
import type { ILogger } from "../interfaces/ILogger";
import type { IHttpService } from "../interfaces/IHttpService";
import type { ITimerService, IPerformanceService } from "../interfaces/ITimerService";

// Parameter object for BackendSyncService constructor
export interface BackendSyncServiceParams {
  eventBus: IEventBus;
  logger: ILogger;
  config: BackendSyncConfig;
  httpService: IHttpService;
  timerService: ITimerService;
  performanceService: IPerformanceService;
}

// BackendSync Configuration - Moved from ConfigurationService.ts
export interface BackendSyncConfig {
  api: {
    baseUrl: string;
    qualiaEndpoint: string;
    healthEndpoint: string;
    timeout: number;
  };
  streaming: {
    websocket: {
      url: string;
      maxReconnectAttempts: number;
      reconnectDelay: number;
      pingInterval: number;
      pingTimeout: number;
      connectionTimeout: number;
      normalCloseCode: number;
    };
  };
  sync: {
    throttleDelay: number;
    batchSize: number;
    maxRetries: number;
    retryDelay: number;
  };
  connection: {
    healthCheckInterval: number;
    connectionTimeout: number;
    maxFailedAttempts: number;
  };
  validation: {
    enableSchemaValidation: boolean;
    strictMode: boolean;
    logValidationErrors: boolean;
  };
  performance: {
    enableCompression: boolean;
    maxPayloadSize: number;
    enableBuffering: boolean;
    bufferFlushInterval: number;
  };
  authentication: {
    enabled: boolean;
    token: string | null;
  };
  errorHandling: {
    enableCircuitBreaker: boolean;
    circuitBreakerThreshold: number;
    circuitBreakerTimeout: number;
    enableFallbackMode: boolean;
  };
  messages: {
    backendNotConnected: string;
    serviceAlreadyRunning: string;
    serviceNotRunning: string;
    syncScheduled: string;
    sendingQualiaState: string;
    backendResponse: string;
    syncCompleted: string;
    syncFailed: string;
    healthCheck: string;
    backendHealthy: string;
    backendUnhealthy: string;
    healthCheckFailed: string;
    periodicHealthCheckFailed: string;
    serviceStarted: string;
    serviceStopped: string;
    startFailed: string;
    stopFailed: string;
    updateConfig: string;
    updateConfigFailed: string;
    forceSync: string;
    forceSyncCompleted: string;
    forceSyncFailed: string;
    circuitBreakerOpen: string;
    circuitBreakerClosed: string;
    serviceInitialized: string;
    syncStarted: string;
    serviceStartedSuccessfully: string;
    stopCalled: string;
    updateConfigCalled: string;
    forceSyncCalled: string;
    qualiaStateCalculated: string;
  };
}

// QualiaState Request - Moved from BackendSyncService.ts
export interface QualiaStateRequest {
  intensity: number;
  precision: number;
  aggression: number;
  flow: number;
  chaos: number;
  recovery: number;
  transcendence: number;
}

// Health Check Response - New interface for health endpoint
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  version?: string;
  uptime?: number;
  services?: {
    database?: string;
    cache?: string;
    api?: string;
  };
}

// Qualia Sync Response - New interface for sync endpoint
export interface QualiaSyncResponse {
  success: boolean;
  message?: string;
  timestamp: string;
  processedAt?: string;
  requestId?: string;
}

// Generic API Response - Moved from BackendSyncService.ts, changed to unknown
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}