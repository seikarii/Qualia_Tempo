/**
 * QUALIA.CODE v1.1 - IDebugOrchestratorService Contracts
 * Type definitions for debug orchestration service.
 * 
 * ARCHITECTURE UPDATE: Event-Driven Pattern (Push Model)
 * Service no longer requires direct service injections.
 * All diagnostics collected via ServiceStatusUpdateEvent.
 */

import type { ILogger } from "../interfaces/ILogger";
import type { ITimerService } from "../interfaces/ITimerService";
import type { IPerformanceService } from "../interfaces/IPerformanceService";
// QUALIA.CODE v1.1: Service imports removed - event-driven pattern eliminates coupling
// import type { INotificationService } from "../interfaces/INotificationService";
// import type { IErrorReportingService } from "../interfaces/IErrorReportingService";

/**
 * Parameter object for DebugOrchestratorService constructor
 * 
 * QUALIA.CODE v1.1: Services removed from parameters
 * The service now operates in event-driven mode, listening for
 * ServiceStatusUpdateEvent instead of calling service methods directly.
 * 
 * DIRECTIVA 03: IEventBus added for getStats() access
 */
export interface DebugOrchestratorServiceParams {
  config: DebugOrchestratorConfig;
  logger: ILogger;
  timerService: ITimerService;
  performanceService: IPerformanceService;
  // REMOVED: notificationService, errorReportingService, eventBus
  // Pattern: Event-driven aggregation (push model)
}

export interface ServiceStatus {
  name: string;
  isRunning: boolean;
  status: string;
  stats?: Record<string, unknown>;
  error?: string;
  lastUpdate?: Date;
}

export interface ServiceDiagnosticData {
  services: ServiceStatus[];
  systemInfo: {
    timestamp: Date;
    performance: {
      memoryUsage?: number;
      fpsAverage?: number;
      renderTime?: number;
    };
    configuration: {
      debugMode: boolean;
      environment: string;
      version: string;
    };
  };
}

export interface DebugOrchestratorConfig {
  refreshInterval: number;     // Auto-refresh interval in milliseconds
  maxHistoryLength: number;    // Maximum diagnostic history to keep
  enablePerformanceTracking: boolean;
  
  // QUALIA.CODE v1.1: Environment information (replaces process.env access)
  environment: string;         // Application environment (development, production, test)
  version: string;             // Application version
  
  services: {
    [serviceName: string]: {
      enabled: boolean;
      priority: number;
    };
  };
  
  // Default values for system metrics
  defaultMetrics: {
    temperature: number;        // Default temperature in Celsius
    frameTime: number;          // Default frame time in milliseconds (~60fps)
    memoryConversionFactor: number; // Factor to convert bytes to MB (1024*1024)
    fps: number;                // Default FPS average
  };
}
