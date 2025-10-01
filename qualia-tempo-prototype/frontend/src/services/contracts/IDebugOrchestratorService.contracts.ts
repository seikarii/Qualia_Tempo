/**
 * QUALIA.CODE v1.1 - IDebugOrchestratorService Contracts
 * Type definitions for debug orchestration service.
 */

import type { ILogger } from "../interfaces/ILogger";
import type { ITimerService } from "../interfaces/ITimerService";
import type { INotificationService } from "../interfaces/INotificationService";
import type { IErrorReportingService } from "../interfaces/IErrorReportingService";

// Parameter object for DebugOrchestratorService constructor
export interface DebugOrchestratorServiceParams {
  config: DebugOrchestratorConfig;
  logger: ILogger;
  timerService: ITimerService;
  notificationService: INotificationService;
  errorReportingService: IErrorReportingService;
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
  eventBusStats: {
    totalEvents: number;
    activeListeners: number;
    eventTypes: string[];
  };
}

export interface DebugOrchestratorConfig {
  refreshInterval: number;     // Auto-refresh interval in milliseconds
  maxHistoryLength: number;    // Maximum diagnostic history to keep
  enablePerformanceTracking: boolean;
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
