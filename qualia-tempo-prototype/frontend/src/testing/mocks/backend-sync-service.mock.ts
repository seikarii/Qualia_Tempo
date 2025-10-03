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
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  syncQualiaState: vi.fn().mockResolvedValue(undefined),
  isBackendConnected: vi.fn().mockReturnValue(false),
  forceSync: vi.fn().mockResolvedValue(undefined),
  getConfig: vi.fn().mockReturnValue({
    apiUrl: 'http://localhost:3000',
    throttleInterval: 100,
    retryAttempts: 3,
    retryDelay: 1000,
    healthCheckInterval: 5000,
    timeout: 5000,
  } as BackendSyncConfig),
  updateConfig: vi.fn().mockReturnValue(undefined),
  getStatistics: vi.fn().mockReturnValue({
    totalSyncs: 0,
    failedSyncs: 0,
    lastSyncTimestamp: null,
  }),
};
