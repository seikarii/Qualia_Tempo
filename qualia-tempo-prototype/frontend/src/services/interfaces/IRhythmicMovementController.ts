/**
 * QUALIA.CODE v1.1 - IRhythmicMovementController Interface
 * Rhythmic movement and visual effects interface.
 */

import type { QualiaState } from '../../types/contracts';

export interface IRhythmicMovementController {
  /**
   * Initialize the rhythmic movement controller.
   */
  start(): void;

  /**
   * Stop the rhythmic movement controller and clean up.
   */
  stop(): void;

  /**
   * Update movement based on QualiaState.
   * @param qualiaState The current qualia state
   */
  updateMovement(qualiaState: QualiaState): void;

  /**
   * Set the intensity of rhythmic movement.
   * @param intensity Movement intensity (0.0 to 1.0)
   */
  setIntensity(intensity: number): void;

  /**
   * Get the current movement intensity.
   * @returns Current intensity level
   */
  getIntensity(): number;

  /**
   * Check if the controller is currently running.
   * @returns True if controller is active
   */
  isRunning(): boolean;

  /**
   * Update the movement configuration.
   * @param config New configuration to apply
   */
  updateConfig(config: any): void;

  /**
   * Get current movement statistics.
   * @returns Object containing movement metrics
   */
  getStats(): {
    isRunning: boolean;
    currentIntensity: number;
    updatesPerformed: number;
    averageUpdateTime: number;
  };

  /**
   * Get current BPM value
   * @returns Current beats per minute
   */
  getCurrentBPM(): number;

  /**
   * Get current beat number
   * @returns Current beat count
   */
  getCurrentBeat(): number;

  /**
   * Check if the system is currently playing (not paused)
   * @returns True if playing, false if paused/stopped
   */
  isPlaying(): boolean;
}