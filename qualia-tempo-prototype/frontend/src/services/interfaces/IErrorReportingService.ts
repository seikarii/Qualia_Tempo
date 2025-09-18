/**
 * QUALIA.CODE v1.1 - IErrorReportingService Interface
 * Centralized error handling and reporting interface.
 */

export interface IErrorReportingService {
  /**
   * Report an error with optional context.
   * @param error The error to report
   * @param context Optional context information
   */
  reportError(error: Error, context?: any): void;

  /**
   * Initialize error event subscriptions.
   */
  start(): void;

  /**
   * Clean up subscriptions and process pending errors.
   */
  stop(): void;

  /**
   * Get error reporting statistics.
   * @returns Object containing error statistics
   */
  getStatistics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    lastErrorTime: Date | null;
    isRunning: boolean;
  };

  /**
   * Update error reporting configuration.
   * @param newConfig New configuration to apply
   */
  updateConfig(newConfig: any): void;

  /**
   * Clear all error statistics and history.
   */
  clearStatistics(): void;

  /**
   * Set the error reporting level (what types of errors to report).
   * @param level The minimum error level to report
   */
  setReportingLevel(level: 'debug' | 'info' | 'warn' | 'error'): void;
}