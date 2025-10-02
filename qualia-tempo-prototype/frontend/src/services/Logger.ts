// QUALIA.CODE v1.1 - Logging Service
// Centralized logging system for Qualia Tempo with InversifyJS support

import { injectable } from "inversify";
import type { ILogger } from "./interfaces/ILogger";
import type { LogEntry } from "./contracts/ILogger.contracts";
import { LogLevel } from "./contracts/ILogger.contracts";

/**
 * Centralized logging service that can be injected into services
 * and configured based on environment
 */
@injectable()
export class QualiaLogger implements ILogger {
  private level: LogLevel;
  private source: string;

  constructor(
    source: string = "QualiaLogger",
    level: LogLevel = LogLevel.INFO,
  ) {
    this.source = source;
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  child(prefix: string): ILogger {
    return new QualiaLogger(`${this.source}:${prefix}`, this.level);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ): void {
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
        // eslint-disable-next-line @qualia-tempo/qualia-code/no-console-in-services, no-console
        console.debug(`🔍 ${prefix}: ${entry.message}`, entry.context ?? {});
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line @qualia-tempo/qualia-code/no-console-in-services, no-console
        console.info(`ℹ️ ${prefix}: ${entry.message}`, entry.context ?? {});
        break;
      case LogLevel.WARN:
        // eslint-disable-next-line @qualia-tempo/qualia-code/no-console-in-services
        console.warn(`⚠️ ${prefix}: ${entry.message}`, entry.context ?? {});
        break;
      case LogLevel.ERROR:
        // eslint-disable-next-line @qualia-tempo/qualia-code/no-console-in-services
        console.error(`🚨 ${prefix}: ${entry.message}`, entry.context ?? {});
        break;
    }
  }
}
