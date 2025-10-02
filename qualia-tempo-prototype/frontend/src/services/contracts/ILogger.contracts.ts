/**
 * QUALIA.CODE v1.1 - Logger Contracts
 * Centralized type definitions for logging system
 *
 * Purpose: Single source of truth for all logging-related data structures
 * Architecture: Contract definitions extracted from service implementation for clarity and reusability
 */

// Log entry interface for structured logging
export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  source: string;
}

// Log levels for filtering and prioritization
// eslint-disable-next-line no-unused-vars
export enum LogLevel {
  // eslint-disable-next-line no-unused-vars
  DEBUG = 0,
  // eslint-disable-next-line no-unused-vars
  INFO = 1,
  // eslint-disable-next-line no-unused-vars
  WARN = 2,
  // eslint-disable-next-line no-unused-vars
  ERROR = 3,
  // eslint-disable-next-line no-unused-vars
  NONE = 4,
}

// Logger Configuration - Migrated from ConfigurationService.ts
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  maxFileSize: number;
  maxFiles: number;
  logDirectory: string;
  remoteEndpoint?: string;
  format: 'json' | 'text';
  timestampFormat: string;
}