// QUALIA.CODE v1.0 - Logging Service
// Centralized logging system for Qualia Tempo

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
  source: string;
}

export interface Logger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any>): void;
}

/**
 * Centralized logging service that can be injected into services
 * and configured based on environment
 */
export class QualiaLogger implements Logger {
  private level: LogLevel;
  private source: string;

  constructor(source: string, level: LogLevel = LogLevel.INFO) {
    this.source = source;
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (level < this.level) return;

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      source: this.source,
    };

    this.output(entry);
  }

  private output(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const prefix = `[${entry.source}] ${levelName}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`🔍 ${prefix}: ${entry.message}`, entry.context || {});
        break;
      case LogLevel.INFO:
        console.info(`ℹ️ ${prefix}: ${entry.message}`, entry.context || {});
        break;
      case LogLevel.WARN:
        console.warn(`⚠️ ${prefix}: ${entry.message}`, entry.context || {});
        break;
      case LogLevel.ERROR:
        console.error(`🚨 ${prefix}: ${entry.message}`, entry.context || {});
        break;
    }
  }
}

/**
 * LoggerProvider - Static bridge between CompositionRoot and decorators
 * This controlled static access allows decorators to access the Logger
 * without violating IoC principles or creating global anarchy.
 */
export class LoggerProvider {
  private static loggerInstance: QualiaLogger | null = null;
  private static isRegistering = false;

  public static register(logger: QualiaLogger): void {
    if (this.loggerInstance && !this.isRegistering) {
      // Opcional: Prevenir doble registro
      console.warn('[LoggerProvider] Logger already registered.');
      return;
    }
    this.isRegistering = true;
    this.loggerInstance = logger;
    this.isRegistering = false;
  }

  public static getLogger(): QualiaLogger {
    if (!this.loggerInstance) {
      // Durante la inicialización, usar un logger temporal con fallback
      if (this.isRegistering) {
        return new QualiaLogger('Fallback', LogLevel.WARN);
      }
      
      // Crear un logger temporal en lugar de fallar
      console.warn('[LoggerProvider] Logger not registered, creating temporary logger');
      return new QualiaLogger('Temporary', LogLevel.INFO);
    }
    return this.loggerInstance;
  }

  public static isRegistered(): boolean {
    return this.loggerInstance !== null;
  }
}