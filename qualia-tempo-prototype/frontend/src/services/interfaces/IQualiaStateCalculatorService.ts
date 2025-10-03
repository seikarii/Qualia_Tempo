/**
 * QUALIA.CODE v1.1 - IQualiaStateCalculatorService Interface
 * Real-time calculation of player performance metrics.
 */

import type { QualiaCalculatorConfig } from "../contracts/IQualiaStateCalculatorService.contracts";
import type { QualiaState } from "../../types/contracts";
import type { PlayerActionEvent } from "../contracts/events.contracts";
import type { IBaseService } from "../../utils/decorators";

export interface IQualiaStateCalculatorService extends IBaseService {
  /**
   * Initialize event subscriptions and start the calculation service.
   */
  initialize(): void;

  /**
   * Clean up subscriptions and stop the calculation service.
   */
  cleanup(): void;

  /**
   * Calculate new QualiaState based on player action.
   * @param action The player action to process
   * @returns The updated QualiaState
   */
  calculateQualiaState(action: PlayerActionEvent): QualiaState;

  /**
   * Get the current QualiaState.
   * @returns The current QualiaState
   */
  getCurrentState(): QualiaState;

  /**
   * Reset the QualiaState to initial values.
   */
  resetState(): void;

  /**
   * Apply time-based decay to the current state.
   * Called automatically by the service's internal timer.
   */
  applyTimeDecay(): void;

  /**
   * Check if the service is currently running.
   * @returns True if the service is active
   */
  isRunning(): boolean;

  /**
   * Update the configuration for the calculator.
   * @param config New configuration to apply
   */
  updateConfig(config: QualiaCalculatorConfig): void;

  /**
   * Get performance statistics for the calculator.
   * @returns Object containing performance metrics
   */
  getStats(): {
    isRunning: boolean;
    calculationsPerformed: number;
    averageCalculationTime: number;
    currentState: QualiaState;
  };
}
