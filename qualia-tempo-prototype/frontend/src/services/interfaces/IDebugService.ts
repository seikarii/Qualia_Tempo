/**
 * QUALIA.CODE v1.1 - IDebugService Interface
 * Development-time debugging and monitoring interface.
 */

import type { AIAnalysisResult } from "../contracts/IDebugService.contracts";
import type { DebugEvent } from "../contracts/events.contracts";

// Export AnalysisResult as an alias for AIAnalysisResult for compatibility
export type AnalysisResult = AIAnalysisResult;

export interface DebugConfig {
  maxEventHistory: number;
  enableGlobalInterface: boolean;
  profilingEnabled: boolean;
  debugLevel: "minimal" | "normal" | "verbose";
  enableAIAnalysis?: boolean;
  enablePerformanceMonitoring?: boolean;
  memoryCleanupInterval?: number;
}

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  lastActivity?: number;
  errorCount?: number;
}

export interface DebugStats {
  isRunning: boolean;
  eventsLogged: number;
  memoryUsage: number;
  uptime: number;
  profilingEnabled: boolean;
  eventHistory: DebugEvent[];
}

export interface SystemSnapshot {
  timestamp: Date;
  services: Record<string, DebugStats>;
  performance: {
    memoryUsage: number;
    uptime: number;
  };
  eventHistory: DebugEvent[];
}

export interface ExportedDebugData {
  stats: DebugStats;
  snapshot: SystemSnapshot;
  analysis: AnalysisResult[];
  exportTimestamp: number;
  version: string;
}

export interface DebugInterface {
  logServiceStatus(): void;
  getMetrics(): Record<string, unknown>;
  getSystemSnapshot(): SystemSnapshot;
  performAIAnalysis(): AnalysisResult[];
  exportDebugData(): ExportedDebugData;
}

export interface IDebugService {
  /**
   * Initialize debug monitoring.
   */
  start(): void;

  /**
   * Clean up debug resources.
   */
  stop(): void;

  /**
   * Log service status information.
   */
  logServiceStatus(): void;

  /**
   * Log EventBus activity for debugging.
   * @param event The event to log - must be BaseEvent compliant
   */
  logEvent(event: import("../EventBus").BaseEvent): void;

  /**
   * Get performance metrics.
   * @returns Object containing performance data
   */
  getMetrics(): {
    isRunning: boolean;
    eventsLogged: number;
    memoryUsage: number;
    uptime: number;
  };

  /**
   * Get debug statistics (compatible with test expectations).
   */
  getDebugStats(): DebugStats;

  /**
   * Get system snapshot for debugging.
   */
  getSystemSnapshot(): SystemSnapshot;

  /**
   * Perform AI-based analysis of debug data.
   */
  performAIAnalysis(): AnalysisResult[];

  /**
   * Export debug data for external analysis.
   */
  exportDebugData(): ExportedDebugData;

  /**
   * Update debug configuration.
   */
  updateConfig(config: Partial<DebugConfig>): void;

  /**
   * Enable performance profiling.
   * Only available in development mode.
   */
  enableProfiling(): void;

  /**
   * Disable performance profiling.
   */
  disableProfiling(): void;

  /**
   * Check if debugging is currently enabled.
   * @returns True if debug mode is active
   */
  isEnabled(): boolean;

  /**
   * Get the debug interface for external access (development only).
   * Returns null if debug interface is disabled.
   */
  getDebugInterface(): DebugInterface | null;

  /**
   * Attach the debug interface to the global scope (window.QA_DEBUG).
   * Only available in development mode with debug overlay enabled.
   */
  attachToGlobalScope(): void;
}
