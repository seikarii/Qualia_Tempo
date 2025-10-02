/**
 * QUALIA.CODE v1.1 - Emergency Logger
 * Platform-abstracted emergency logging system for decorator fallback
 * 
 * PURPOSE: Replace console.* usage in decorators when instance logger unavailable
 * COMPLIANCE: Section 5.3 - Logging Standard
 * 
 * CRITICAL: This logger NEVER uses console.* directly
 * Messages are buffered in memory and can be flushed to a real logger
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
}

/**
 * Static emergency logger that buffers messages when no instance logger available
 */
class EmergencyLoggerClass {
  private buffer: LogEntry[] = [];
  private maxBufferSize = 1000;
  private isEnabled = true;

  /**
   * Log debug message (buffered)
   */
  public debug(message: string, data?: unknown): void {
    this.addToBuffer('debug', message, data);
  }

  /**
   * Log info message (buffered)
   */
  public info(message: string, data?: unknown): void {
    this.addToBuffer('info', message, data);
  }

  /**
   * Log warning message (buffered)
   */
  public warn(message: string, data?: unknown): void {
    this.addToBuffer('warn', message, data);
  }

  /**
   * Log error message (buffered)
   */
  public error(message: string, data?: unknown): void {
    this.addToBuffer('error', message, data);
  }

  /**
   * Add message to buffer
   */
  private addToBuffer(level: LogLevel, message: string, data?: unknown): void {
    if (!this.isEnabled) return;

    this.buffer.push({
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
    });

    // Prevent memory leak - keep only recent messages
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
  }

  /**
   * Flush buffered messages to a real logger
   */
  public flushTo(logger: {
    debug: (msg: string, data?: unknown) => void;
    info: (msg: string, data?: unknown) => void;
    warn: (msg: string, data?: unknown) => void;
    error: (msg: string, data?: unknown) => void;
  }): void {
    const messages = [...this.buffer];
    this.buffer = [];

    for (const entry of messages) {
      const fullMessage = `[BUFFERED] ${entry.message}`;
      logger[entry.level](fullMessage, entry.data);
    }
  }

  /**
   * Get current buffer for inspection (testing purposes)
   */
  public getBuffer(): ReadonlyArray<LogEntry> {
    return [...this.buffer];
  }

  /**
   * Clear buffer without flushing
   */
  public clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * Disable/Enable logging
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

/**
 * Singleton instance for use across decorators
 */
export const EmergencyLogger = new EmergencyLoggerClass();
