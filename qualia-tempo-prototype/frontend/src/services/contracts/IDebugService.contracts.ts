/**
 * QUALIA.CODE v1.1 - IDebugService Contracts
 * Single Source of Truth for DebugService data structures.
 * This file is manually maintained for DebugService-specific contracts.
 */

import type { BaseEvent, ErrorEvent } from "./events.contracts";

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
}

// Debug interface exposed globally for development
export interface DebugInterface {
  service: unknown; // Reference to DebugService (avoiding circular dependency)
  getStats: () => unknown;
  getSnapshot: () => unknown;
  performAnalysis: () => unknown;
  exportData: () => DebugExportData;
  startSession: () => void;
  endSession: () => void;
  clearHistory: () => void;
  enableAI: () => void;
  disableAI: () => void;
  log: (message: string, data?: unknown) => void;
}

// Debug data export structure
export interface DebugExportData {
  timestamp: number;
  sessions: DebugSession[];
  eventHistory: BaseEvent[];
  errorHistory: ErrorEvent[];
  aiAnalysis: AIAnalysisResult[];
  config: DebugServiceConfig;
  debugStats: unknown;
  systemSnapshot: unknown;
  analysis: unknown;
}

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
  maxMemoryUsageHistory?: number;  // Maximum memory usage samples to keep
  eventProcessingTimeHighThreshold?: number;  // High threshold for event processing time (ms)
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