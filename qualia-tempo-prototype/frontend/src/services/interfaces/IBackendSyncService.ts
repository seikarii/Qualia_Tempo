/**
 * QUALIA.CODE v1.1 - IBackendSyncService Interface
 * Synchronized communication with backend API interface.
 */

import type { QualiaState } from "../../types/contracts";
import type { BackendSyncConfig } from "../contracts/IBackendSyncService.contracts";
import type { IBaseService } from "../../utils/decorators";

export interface IBackendSyncService extends IBaseService {
  /**
   * Initialize sync process and health checking.
   * @returns Promise that resolves when service is started
   */
  start(): Promise<void>;

  /**
   * Clean up sync process and stop health monitoring.
   * @returns Promise that resolves when service is stopped
   */
  stop(): Promise<void>;

  /**
   * Synchronize QualiaState with backend.
   * @param state The QualiaState to sync
   * @returns Promise that resolves when sync is complete
   */
  syncQualiaState(state: QualiaState): Promise<void>;

  /**
   * Check if backend is currently connected.
   * @returns True if backend connection is healthy
   */
  isBackendConnected(): boolean;

  /**
   * Force an immediate sync of current state.
   * Bypasses throttling and sends immediately.
   * @returns Promise that resolves when sync is complete
   */
  forceSync(): Promise<void>;

  /**
   * Get current backend configuration.
   * @returns The current configuration object
   */
  getConfig(): BackendSyncConfig;

  /**
   * Update the backend configuration.
   * @param config New configuration to apply
   */
  updateConfig(config: Partial<BackendSyncConfig>): void;

  /**
   * Get service status and statistics.
   * @returns Object containing service metrics
   */
  getStatus(): {
    isRunning: boolean;
    isConnected: boolean;
    lastSyncTime: Date | null;
    syncCount: number;
    errorCount: number;
    avgSyncTime: number;
  };

  /**
   * Manually test the backend connection.
   * @returns Promise that resolves with connection status
   */
  testConnection(): Promise<boolean>;
}
