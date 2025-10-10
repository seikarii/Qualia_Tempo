/**
 * QUALIA.CODE v1.1 - IQualiaCalculatorWorkerService Interface
 * 
 * Interface for the Worker-based Qualia Calculator Service.
 * This service bridges the main thread and the Web Worker.
 * 
 * Architecture:
 * - Manages worker lifecycle
 * - Bridges EventBus to Worker messages
 * - Handles errors and fallback to main thread
 * - Provides performance monitoring
 * 
 * CRITICAL: Implements IBaseService for @OnEvent support.
 */

import type { QualiaState } from '../../types/contracts';
import type { QualiaCalculatorConfig } from '../contracts/IQualiaStateCalculatorService.contracts';
import type {
  WorkerServiceStats,
  WorkerHealthStatus,
} from '../contracts/IQualiaCalculatorWorkerService.contracts';

/**
 * Interface for the Worker-based Qualia Calculator Service.
 * 
 * This service manages a Web Worker that performs QualiaState calculations
 * off the main thread, ensuring the UI remains responsive.
 */
export interface IQualiaCalculatorWorkerService {
  /**
   * Initialize the worker service and set up event listeners.
   * Creates the worker and establishes communication.
   * 
   * @throws {Error} If worker initialization fails and no fallback is available
   */
  initialize(): Promise<void>;

  /**
   * Clean up the worker service and terminate the worker.
   * Removes event listeners and releases resources.
   */
  cleanup(): void;

  /**
   * Get the current QualiaState.
   * May come from worker or fallback service.
   * 
   * @returns The current QualiaState
   */
  getCurrentState(): QualiaState;

  /**
   * Update the worker configuration at runtime.
   * Sends new configuration to the worker.
   * 
   * @param newConfig - Partial configuration to merge
   */
  updateConfig(newConfig: Partial<QualiaCalculatorConfig>): Promise<void>;

  /**
   * Reset the QualiaState to initial values.
   * Sends reset message to worker.
   */
  resetState(): Promise<void>;

  /**
   * Get service statistics including worker stats.
   * 
   * @returns Service statistics object
   */
  getStats(): WorkerServiceStats;

  /**
   * Get worker health status.
   * Useful for monitoring and diagnostics.
   * 
   * @returns Health status object
   */
  getHealthStatus(): WorkerHealthStatus;

  /**
   * Check if the worker is running and healthy.
   * 
   * @returns True if worker is operational
   */
  isWorkerHealthy(): boolean;

  /**
   * Force recreation of the worker.
   * Useful for recovering from errors or memory leaks.
   */
  recreateWorker(): Promise<void>;

  /**
   * Enable or disable the worker at runtime.
   * When disabled, automatically falls back to main thread.
   * 
   * @param enabled - Whether to enable the worker
   */
  setWorkerEnabled(enabled: boolean): Promise<void>;

  /**
   * Get whether currently using fallback (main thread).
   * 
   * @returns True if using main thread fallback
   */
  isUsingFallback(): boolean;
}
