/**
 * QUALIA.CODE v1.1 - IDebugService Interface
 * Development-time debugging and monitoring interface.
 */

export interface DebugConfig {
  maxEventHistory: number;
  enableGlobalInterface: boolean;
  profilingEnabled: boolean;
  debugLevel: "minimal" | "normal" | "verbose";
  enableAIAnalysis?: boolean;
  enablePerformanceMonitoring?: boolean;
  memoryCleanupInterval?: number;
}

export interface DebugStats {
  isRunning: boolean;
  eventsLogged: number;
  memoryUsage: number;
  uptime: number;
  profilingEnabled: boolean;
  eventHistory: any[];
}

export interface SystemSnapshot {
  timestamp: number;
  services: Record<string, any>;
  performance: {
    memoryUsage: number;
    uptime: number;
  };
  eventHistory: any[];
}

export interface AnalysisResult {
  type: "error_pattern" | "state_anomaly" | "recommendation";
  severity: "low" | "medium" | "high";
  message: string;
  metadata?: any;
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
  exportDebugData(): any;

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
  getDebugInterface(): any;
}
