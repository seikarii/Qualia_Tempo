/**
 * QUALIA.CODE v1.1 - IEventBus Contracts
 * Single Source of Truth for EventBus data structures.
 * This file is manually maintained for EventBus-specific contracts.
 */

// EventBus Configuration - Migrated from ConfigurationService.ts
export interface EventBusConfig {
  performance: {
    maxEventHistory: number;
    maxConcurrentEvents: number;
    statusUpdateInterval: number;
    throttle: {
      enable: boolean;
      windowMs: number;
      maxEventsPerWindow: number;
    };
    cleanupInterval: number;
  };
  errorHandling: {
    maxRetries: number;
    retryDelayMs: number;
    continueOnError: boolean;
    errorLogLevel: string;
  };
  priority: {
    highPriorityQueueSize: number;
    normalPriorityQueueSize: number;
    lowPriorityQueueSize: number;
    priorityProcessing: boolean;
  };
  development: {
    enableEventLogging: boolean;
    enablePerformanceMetrics: boolean;
    enableEventHistory: boolean;
    enableEventValidation: boolean;
  };
  production: {
    enableEventLogging: boolean;
    enablePerformanceMetrics: boolean;
    enableEventHistory: boolean;
    enableEventValidation: boolean;
  };
  
  // Additional properties needed by EventBus for ID generation
  idPrefix: string;
  randomBase: number;
  idStart: number;
  idLength: number;
  
  // Priority configuration (referenced in EventBus.ts)
  priorities: {
    high: number;
    normal: number;
    low: number;
    default: number;
  };
  
  // Messages for logging
  messages: {
    destroyedEventBusWarning: string;
  };
}