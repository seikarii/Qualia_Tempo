/**
 * QUALIA.CODE v2.0 - PhysicsService Configuration Contract
 * Configuration interface for physics simulation parameters.
 */

import type { IEventBus } from "../interfaces/IEventBus";
import type { ILogger } from "../interfaces/ILogger";
import type { ITimerService } from "../interfaces/ITimerService";
import type { IInputStateService } from "../interfaces/IInputStateService";

/**
 * Dependency injection parameters for PhysicsService
 * Used to comply with max-params ESLint rule
 */
export interface PhysicsServiceParams {
  eventBus: IEventBus;
  logger: ILogger;
  timerService: ITimerService;
  inputStateService: IInputStateService;
  config: PhysicsServiceConfig;
}

export interface PhysicsServiceConfig {
  /** Maximum velocity magnitude */
  maxVelocity: number;
  
  /** Acceleration magnitude per second */
  accelerationRate: number;
  
  /** Friction coefficient (0-1, higher = more friction) */
  frictionCoefficient: number;
  
  /** Minimum velocity threshold (below this, velocity is set to 0) */
  velocityThreshold: number;
  
  /** Update interval in milliseconds (typically 1000/60 for 60fps) */
  updateInterval: number;
  
  /** Enable velocity damping */
  enableDamping: boolean;
  
  /** Messages for logging */
  messages: {
    initialized: string;
    started: string;
    stopped: string;
    velocityUpdated: string;
  };
}
