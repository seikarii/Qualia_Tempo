/**
 * QUALIA.CODE v1.1 - IDebugService Interface
 * Development-time debugging and monitoring interface.
 */

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
   * @param event The event to log
   */
  logEvent(event: any): void;

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
   * Set debug level for filtering debug output.
   * @param level The debug level to set
   */
  setDebugLevel(level: 'minimal' | 'normal' | 'verbose'): void;
}