/**
 * QUALIA.CODE v1.1 - IBackendSyncService Mock
 * HIGH-FIDELITY MOCK: Contract-compliant mock for IBackendSyncService
 * 
 * COMPLIANCE: QUALIA.CODE Section 10.3.1 - High-Fidelity Mocking Standard
 */

import { vi } from 'vitest';
import type { IBackendSyncService } from '../../services/interfaces/IBackendSyncService';

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
