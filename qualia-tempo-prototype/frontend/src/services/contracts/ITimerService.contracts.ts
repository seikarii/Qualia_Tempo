/**
 * QUALIA.CODE v1.1 - TimerService Configuration Contracts
 * Configuration interfaces for TimerService and PerformanceService
 */

/**
 * Messages for TimerService initialization
 */
export interface TimerServiceMessages {
  timerServiceInitialized: string;
  performanceServiceInitialized: string;
}

/**
 * Performance monitoring configuration
 */
export interface TimerPerformanceConfig {
  enableTracking: boolean;
  slowTimerThreshold: number;
}

/**
 * Cleanup configuration
 */
export interface TimerCleanupConfig {
  cleanupInterval: number;
  maxTrackedTimers: number;
}

/**
 * Debug configuration
 */
export interface TimerDebugConfig {
  enableDebugLogging: boolean;
  logTimerLifecycle: boolean;
}

/**
 * Timer configuration structure
 */
export interface TimerConfig {
  performance: TimerPerformanceConfig;
  cleanup: TimerCleanupConfig;
  debug: TimerDebugConfig;
}

/**
 * Complete TimerService configuration
 */
export interface TimerServiceConfig {
  messages: TimerServiceMessages;
  timer: TimerConfig;
}
