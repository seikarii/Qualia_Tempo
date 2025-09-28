/**
 * QUALIA.CODE v1.1 - IDebugService Contracts
 * Single Source of Truth for DebugService data structures.
 * This file is manually maintained for DebugService-specific contracts.
 */

// DebugService Configuration - Migrated from ConfigurationService.ts
export interface DebugServiceConfig {
  logging: {
    enableConsoleOutput: boolean;
    enableFileOutput: boolean;
    logLevel: string;
    maxLogFiles: number;
    maxLogSize: number;
  };
  eventMonitoring: {
    enableEventLogging: boolean;
    enableEventMetrics: boolean;
    maxEventHistory: number;
    eventLogThrottle: number;
  };
  performance: {
    enablePerformanceTracking: boolean;
    enableMemoryMonitoring: boolean;
    enableFrameRateTracking: boolean;
    metricsUpdateInterval: number;
  };
  development: {
    enableDebugOverlay: boolean;
    enableCheats: boolean;
    enableHotReload: boolean;
    enableBreakpoints: boolean;
  };
  profiling: {
    enableProfiling: boolean;
    profileUpdateInterval: number;
    maxProfileSamples: number;
  };
  errorTracking: {
    enableErrorStackTraces: boolean;
    enableErrorReporting: boolean;
    maxErrorHistory: number;
  };
  network: {
    enableNetworkLogging: boolean;
    enableRequestMetrics: boolean;
    logRequestHeaders: boolean;
    logRequestBodies: boolean;
  };
  // QUALIA.CODE: Additional DebugService configuration properties
  maxSessionHistory?: number;
  maxEventHistory?: number;
  performanceMonitoringInterval?: number;
  aiAnalysisInterval?: number;
  enableAIAnalysis?: boolean;
  memoryCleanupThreshold?: number;
  sessionIdLength?: number;
  sessionIdPrefixLength?: number;
  memoryCleanupInterval?: number;
  eventProcessingTimeThreshold?: number;
  memoryCleanupRatio?: number;
  maxAIAnalysisHistory?: number;
  maxErrorHistory?: number;
  aiAnalysisIntervalDefault?: string;
  enableAIAnalysisDefault?: boolean;
  memoryCleanupThresholdDefault?: number;
  messages?: {
    serviceInitialized?: string;
    configLoaded?: string;
    configLoadFailed?: string;
    serviceStarted?: string;
    serviceStartFailed?: string;
    serviceNotRunning?: string;
    serviceStopping?: string;
    serviceStopped?: string;
    serviceStopFailed?: string;
    monitoringStarted?: string;
    monitoringStopped?: string;
    performanceTrackingEnabled?: string;
    aiAnalysisEnabled?: string;
    memoryCleanupPerformed?: string;
    historyCleared?: string;
    globalInterfaceCreated?: string;
  };
}