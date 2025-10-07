/**
 * QUALIA.CODE v1.1 - QualiaCalculatorWorkerService Contracts
 * 
 * Configuration and data contracts for the Worker Service.
 * 
 * Architecture:
 * - Configuration for worker management
 * - Error handling strategies
 * - Performance monitoring
 * - Fallback mechanisms
 */

import type { WorkerStats } from '../../workers/types/worker-messages';

/**
 * Configuration for QualiaCalculatorWorkerService.
 */
export interface QualiaCalculatorWorkerServiceConfig {
  /**
   * Enable/disable worker. If false, uses main thread fallback.
   */
  enabled: boolean;

  /**
   * Worker initialization timeout in milliseconds.
   */
  initializationTimeout: number;

  /**
   * Message response timeout in milliseconds.
   */
  messageTimeout: number;

  /**
   * Maximum number of retry attempts for failed operations.
   */
  maxRetries: number;

  /**
   * Delay between retry attempts in milliseconds.
   */
  retryDelay: number;

  /**
   * Enable performance monitoring.
   */
  enablePerformanceMonitoring: boolean;

  /**
   * Performance monitoring interval in milliseconds.
   */
  performanceMonitoringInterval: number;

  /**
   * Enable debug logging for worker messages.
   */
  debugLogging: boolean;

  /**
   * Fallback strategy when worker fails.
   */
  fallbackStrategy: 'main-thread' | 'error' | 'retry';

  /**
   * Maximum worker age in milliseconds before recreation (0 = never).
   * Useful for preventing memory leaks in long-running workers.
   */
  maxWorkerAge: number;

  /**
   * Enable automatic worker recreation on error.
   */
  autoRecreateOnError: boolean;

  /**
   * Error threshold before fallback (number of consecutive errors).
   */
  errorThreshold: number;
}

/**
 * Worker service statistics.
 */
export interface WorkerServiceStats extends WorkerStats {
  /**
   * Worker status.
   */
  workerStatus: 'not-created' | 'initializing' | 'ready' | 'error' | 'terminated';

  /**
   * Whether currently using fallback (main thread).
   */
  usingFallback: boolean;

  /**
   * Number of worker recreations.
   */
  workerRecreations: number;

  /**
   * Number of fallback activations.
   */
  fallbackActivations: number;

  /**
   * Last error message (if any).
   */
  lastError?: string;

  /**
   * Worker creation timestamp.
   */
  workerCreatedAt?: number;

  /**
   * Number of consecutive errors.
   */
  consecutiveErrors: number;
}

/**
 * Worker health status.
 */
export interface WorkerHealthStatus {
  /**
   * Whether worker is healthy.
   */
  isHealthy: boolean;

  /**
   * Worker status.
   */
  status: WorkerServiceStats['workerStatus'];

  /**
   * Last successful operation timestamp.
   */
  lastSuccessfulOperation?: number;

  /**
   * Consecutive errors count.
   */
  consecutiveErrors: number;

  /**
   * Worker uptime in milliseconds.
   */
  uptime: number;

  /**
   * Health check timestamp.
   */
  timestamp: number;

  /**
   * Issues detected (if any).
   */
  issues: string[];
}
