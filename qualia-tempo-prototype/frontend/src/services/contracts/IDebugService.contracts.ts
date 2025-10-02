/**
 * QUALIA.CODE v1.1 - IDebugService Contracts
 * Single Source of Truth for DebugService data structures.
 * This file is manually maintained for DebugService-specific contracts.
 */

import type { BaseEvent, ErrorEvent } from "./events.contracts";
import type { ILogger } from "../interfaces/ILogger";
import type { ITimerService } from "../interfaces/ITimerService";
import type { IPerformanceService } from "../interfaces/IPerformanceService";

// Debug session interface for tracking debugging activities
export interface DebugSession {
  id: string;
  startTime: Date;
  events: BaseEvent[];
  errors: ErrorEvent[];
  performance: PerformanceMetrics;
  aiAnalysis?: AIAnalysisResult[];
}

// Performance metrics for system monitoring
export interface PerformanceMetrics {
  eventProcessingTimes: Map<string, number[]>;
  memoryUsage: number[];
  eventFrequency: Map<string, number>;
  errorRate: number;
  averageResponseTime: number;
  qualiaStateUpdateRate: number;
}

// AI analysis result interface
export interface AIAnalysisResult {
  timestamp: Date;
  type:
    | "error_pattern"
    | "performance_issue"
    | "state_anomaly"
    | "recommendation";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  data: Record<string, unknown>;
  suggestions: string[];
  // Optional properties for backward compatibility
  message?: string;
  metadata?: Record<string, unknown>;
}

// Note: DebugInterface and ExportedDebugData are defined in IDebugService.ts interface
// This avoids duplication and ensures single source of truth for API contracts

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
  version: string; // Application version for debug exports
  maxSessionHistory: number;
  maxEventHistory: number;
  performanceMonitoringInterval: number;
  aiAnalysisInterval: number;
  enableAIAnalysis: boolean;
  aiAnalysis: {
    errorPatternThresholds: {
      medium: number;
      high: number;
    };
    recommendationThresholds: {
      highErrorRate: number;
    };
  };
  memoryCleanupThreshold: number;
  sessionIdLength: number;
  sessionIdPrefixLength: number;
  sessionIdBase: number;  // Base for random string generation (default: 36 for alphanumeric)
  memoryCleanupInterval: number;
  eventProcessingTimeThreshold: number;
  memoryCleanupRatio: number;
  maxAIAnalysisHistory: number;
  maxErrorHistory: number;
  maxMemoryUsageHistory: number;  // Maximum memory usage samples to keep
  eventProcessingTimeHighThreshold: number;  // High threshold for event processing time (ms)
  maxEventPatternTimestamps: number;  // Maximum timestamps to keep per event pattern
  maxEventProcessingTimeMeasurements: number;  // Maximum processing time measurements per event type
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

/**
 * QUALIA.CODE v1.1: Constructor parameters object for DebugService
 * Consolidates 5 constructor parameters into a single object to comply with IoC limits
 */
export interface DebugServiceParams {
  logger: ILogger;
  timerService: ITimerService;
  config: DebugServiceConfig;
  performanceService: IPerformanceService;
}