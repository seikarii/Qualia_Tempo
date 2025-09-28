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
  context?: Record<string, any>;
  timestamp: string;
  source: string;
}

// Log levels for filtering and prioritization
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
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