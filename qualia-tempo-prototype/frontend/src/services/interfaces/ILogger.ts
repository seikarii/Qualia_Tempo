/**
 * QUALIA.CODE v1.1 - ILogger Interface
 * Centralized logging interface for all services.
 */

import type { LogLevel } from '../Logger';

export interface ILogger {
  /**
   * Log a debug message.
   * @param message The message to log
   * @param context Optional context object with additional data
   */
  debug(message: string, context?: any): void;

  /**
   * Log an informational message.
   * @param message The message to log
   * @param context Optional context object with additional data
   */
  info(message: string, context?: any): void;

  /**
   * Log a warning message.
   * @param message The message to log
   * @param context Optional context object with additional data
   */
  warn(message: string, context?: any): void;

  /**
   * Log an error message.
   * @param message The message to log
   * @param context Optional context object with additional data
   */
  error(message: string, context?: any): void;

  /**
   * Set the minimum log level.
   * @param level The minimum level to log
   */
  setLevel(level: LogLevel): void;

  /**
   * Get the current log level.
   * @returns The current minimum log level
   */
  getLevel(): LogLevel;

  /**
   * Create a child logger with a specific prefix.
   * @param prefix The prefix for the child logger
   * @returns A new logger instance with the prefix
   */
  child(prefix: string): ILogger;
}