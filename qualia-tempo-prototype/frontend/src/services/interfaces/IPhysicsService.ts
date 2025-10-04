/**
 * QUALIA.CODE v2.0 - IPhysicsService Interface
 * Real-time physics simulation service for player movement and velocity calculations.
 *
 * Architecture:
 * - Implements IBaseService for lifecycle management
 * - Uses IInputStateService for input vector reading
 * - Uses ITimerService for requestAnimationFrame loop
 * - Emits PhysicsDataUpdatedEvent on EventBus
 * - Calculates velocity with acceleration and friction
 */

import type { IBaseService } from "../../utils/decorators";

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface PhysicsData {
  velocity: Vector3D;
  acceleration: Vector3D;
}

export interface IPhysicsService extends IBaseService {
  /**
   * Initialize the service and start physics loop
   */
  initialize(): void;

  /**
   * Clean up resources and stop physics loop
   */
  cleanup(): void;

  /**
   * Get current physics data
   * @returns Current velocity and acceleration
   */
  getCurrentPhysicsData(): PhysicsData;

  /**
   * Check if physics simulation is currently running
   */
  isRunning(): boolean;
}
