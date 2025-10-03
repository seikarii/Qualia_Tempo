/**
 * QUALIA.CODE v1.1 - IBackendSyncService Mock
 * HIGH-FIDELITY MOCK: Contract-compliant mock for IBackendSyncService
 * 
 * COMPLIANCE: QUALIA.CODE Section 10.3.1 - High-Fidelity Mocking Standard
 */

import { vi } from 'vitest';
import type { IBackendSyncService } from '../../services/interfaces/IBackendSyncService';
import type { BackendSyncConfig } from '../../services/contracts/IBackendSyncService.contracts';

/**
 * High-Fidelity Mock for IBackendSyncService
 * All methods return type-safe default values
 */
export const mockBackendSyncService: IBackendSyncService = {
  // IBaseService lifecycle methods
  initialize: vi.fn().mockReturnValue(undefined),
  cleanup: vi.fn().mockReturnValue(undefined),
  
  // IBackendSyncService methods
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  syncQualiaState: vi.fn().mockResolvedValue(undefined),
  isBackendConnected: vi.fn().mockReturnValue(false),
  forceSync: vi.fn().mockResolvedValue(undefined),
  getConfig: vi.fn().mockReturnValue({
    api: {
      baseUrl: 'http://localhost:3000',
      qualiaEndpoint: '/api/qualia',
      healthEndpoint: '/health',
      timeout: 5000,
    },
    streaming: {
      websocket: {
        url: 'ws://localhost:3000/ws',
        maxReconnectAttempts: 3,
        reconnectDelay: 1000,
        pingInterval: 30000,
        pingTimeout: 5000,
        connectionTimeout: 10000,
        normalCloseCode: 1000,
      },
    },
    sync: {
      throttleDelay: 100,
      batchSize: 10,
      maxRetries: 3,
      retryDelay: 1000,
    },
    connection: {
      healthCheckInterval: 5000,
      connectionTimeout: 10000,
      maxFailedAttempts: 5,
    },
    validation: {
      enableSchemaValidation: true,
      strictMode: false,
      logValidationErrors: true,
    },
    performance: {
      enableCompression: false,
      maxPayloadSize: 1024 * 1024,
      enableBuffering: true,
      bufferFlushInterval: 1000,
    },
    authentication: {
      enabled: false,
      token: null,
    },
    errorHandling: {
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      enableFallbackMode: false,
    },
    messages: {
      backendNotConnected: 'Backend not connected',
      serviceAlreadyRunning: 'Service already running',
      serviceNotRunning: 'Service not running',
      syncScheduled: 'Sync scheduled',
      sendingQualiaState: 'Sending QualiaState',
      backendResponse: 'Backend response',
      syncCompleted: 'Sync completed',
      syncFailed: 'Sync failed',
      healthCheck: 'Health check',
      backendHealthy: 'Backend healthy',
      backendUnhealthy: 'Backend unhealthy',
      healthCheckFailed: 'Health check failed',
      periodicHealthCheckFailed: 'Periodic health check failed',
      serviceStarted: 'Service started',
      serviceStopped: 'Service stopped',
      startFailed: 'Start failed',
      stopFailed: 'Stop failed',
      updateConfig: 'Update config',
      updateConfigFailed: 'Update config failed',
      forceSync: 'Force sync',
      forceSyncCompleted: 'Force sync completed',
      forceSyncFailed: 'Force sync failed',
      circuitBreakerOpen: 'Circuit breaker open',
      circuitBreakerClosed: 'Circuit breaker closed',
      serviceInitialized: 'Service initialized',
      syncStarted: 'Sync started',
      serviceStartedSuccessfully: 'Service started successfully',
      stopCalled: 'Stop called',
      updateConfigCalled: 'Update config called',
      forceSyncCalled: 'Force sync called',
      qualiaStateCalculated: 'QualiaState calculated',
    },
  } as BackendSyncConfig),
  updateConfig: vi.fn().mockReturnValue(undefined),
  getStatus: vi.fn().mockReturnValue({
    isRunning: false,
    isConnected: false,
    lastSyncTime: null,
    syncCount: 0,
    errorCount: 0,
    avgSyncTime: 0,
  }),
  testConnection: vi.fn().mockResolvedValue(false),
};
