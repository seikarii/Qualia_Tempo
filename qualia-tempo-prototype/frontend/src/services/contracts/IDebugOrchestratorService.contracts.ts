/**
 * QUALIA.CODE v1.1 - IDebugOrchestratorService Contracts
 * Type definitions for debug orchestration service.
 */

export interface ServiceStatus {
  name: string;
  isRunning: boolean;
  status: string;
  stats?: any;
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
}
