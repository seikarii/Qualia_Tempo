/**
 * QUALIA.CODE v1.1 - IDebugOrchestratorService Interface
 * Service responsible for orchestrating service diagnostics collection.
 * Extracts complex diagnostic logic from ServiceDiagnosticsPanel component.
 */

import type { ServiceDiagnosticData, ServiceStatus } from '../contracts/IDebugOrchestratorService.contracts';

export interface IDebugOrchestratorService {
  /**
   * Gather comprehensive diagnostic data from all services
   * @returns Promise resolving to complete diagnostic data
   */
  gatherServiceDiagnostics(): Promise<ServiceDiagnosticData>;

  /**
   * Get current status of all services
   * @returns Array of service status information
   */
  getServiceStatuses(): Promise<ServiceStatus[]>;

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
