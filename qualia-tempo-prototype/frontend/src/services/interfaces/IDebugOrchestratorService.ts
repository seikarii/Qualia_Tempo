/**
 * QUALIA.CODE v1.1 - IDebugOrchestratorService Interface
 * Service responsible for orchestrating service diagnostics collection.
 * Extracts complex diagnostic logic from ServiceDiagnosticsPanel component.
 */

/**
 * QUALIA.CODE v1.2 - IDebugOrchestratorService Interface
 * Service responsible for orchestrating service diagnostics collection.
 * Extracts complex diagnostic logic from ServiceDiagnosticsPanel component.
 */

import type { ServiceStatus } from '../contracts/IDebugOrchestratorService.contracts';
import type { IBaseService } from './IBaseService';

export interface IDebugOrchestratorService extends IBaseService {
  /**
   * Get real-time health report from cached service statuses
   * QUALIA.CODE v1.1: Event-Driven Pattern (Push Model)
   * This method returns the current state of service statuses that have been
   * passively aggregated via ServiceStatusUpdateEvent events.
   * @returns Array of current service status information (synchronous)
   */
  getHealthReport(): ServiceStatus[];

  /**
   * Check if debug mode is enabled
   * @returns True if debug mode is active
   */
  isDebugModeEnabled(): boolean;

  /**
   * Get last diagnostic update timestamp
   * @returns Last update date
   */
  getLastUpdateTime(): Date;

  /**
   * Force refresh of all diagnostic data
   * @returns Promise resolving when refresh is complete
   */
  forceRefresh(): Promise<void>;
}
