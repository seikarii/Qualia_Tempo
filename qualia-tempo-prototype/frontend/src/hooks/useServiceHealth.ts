/**
 * QUALIA.CODE v1.1 - useServiceHealth Hook
 * 
 * Business logic hook for real-time service health monitoring.
 * This hook implements the event-driven pattern by polling the cached
 * service statuses from DebugOrchestratorService.
 * 
 * ARCHITECTURE:
 * - Uses useDebugOrchestratorService() to access the orchestrator
 * - Polls getHealthReport() every 500ms for near-real-time updates
 * - getHealthReport() is synchronous and reads from event-driven cache
 * - No direct service calls - pure event-driven aggregation
 * 
 * USAGE:
 * ```tsx
 * const healthReport = useServiceHealth();
 * return <div>{healthReport.map(s => <ServiceCard service={s} />)}</div>;
 * ```
 */

import { useState, useEffect } from 'react';
import { useDebugOrchestratorService, useTimerService } from '../services/hooks';
import type { ServiceStatus } from '../services/contracts/IDebugOrchestratorService.contracts';

/**
 * Hook for real-time service health monitoring
 * @param refreshInterval - Polling interval in milliseconds (default: 500ms)
 * @returns Array of current service statuses
 */
export function useServiceHealth(refreshInterval: number = 500): ServiceStatus[] {
  const orchestrator = useDebugOrchestratorService();
  const timerService = useTimerService();
  const [healthReport, setHealthReport] = useState<ServiceStatus[]>([]);

  useEffect(() => {
    // Initial fetch
    setHealthReport(orchestrator.getHealthReport());

    // Set up polling for near-real-time updates
    const intervalId = timerService.setInterval(() => {
      // Call the SYNCHRONOUS method - no async/await needed
      // This is ultra-fast because it just reads from the cached Map
      setHealthReport(orchestrator.getHealthReport());
    }, refreshInterval);

    // Cleanup interval on unmount
    return () => {
      timerService.clearInterval(intervalId);
    };
  }, [orchestrator, timerService, refreshInterval]);

  return healthReport;
}
