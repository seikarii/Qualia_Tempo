/**
 * QUALIA.CODE v2.0 - PhysicsService
 * Real-time physics simulation service for player movement and velocity calculations.
 *
 * Architecture:
 * - Uses IInputStateService to read directional input
 * - Calculates velocity with acceleration and friction
 * - Emits PhysicsDataUpdatedEvent with simulation results
 * - Follows IBaseService pattern for lifecycle management
 * - Uses requestAnimationFrame for smooth physics updates
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { IPhysicsService, PhysicsData, Vector3D } from "./interfaces/IPhysicsService";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { ITimerService } from "./interfaces/ITimerService";
import type { IInputStateService } from "./interfaces/IInputStateService";
import type { PhysicsServiceConfig, PhysicsServiceParams } from "./contracts/IPhysicsService.contracts";
import type { PhysicsDataUpdatedEvent } from "./contracts/events.contracts";
import {
  logMethod,
  catchError,
  initializeEventSubscriptions,
  cleanupEventSubscriptions,
} from "../utils/decorators";

@injectable()
export class PhysicsService implements IPhysicsService {
  private readonly config: PhysicsServiceConfig;
  private readonly eventBus: IEventBus;
  private readonly logger: ILogger;
  private readonly timerService: ITimerService;
  private readonly inputStateService: IInputStateService;

  // @ts-expect-error - Reserved for @OnEvent decorator lifecycle management
  private _eventListeners: string[] = [];
  
  // Physics state
  private velocity: Vector3D = { x: 0, y: 0, z: 0 };
  private acceleration: Vector3D = { x: 0, y: 0, z: 0 };
  private physicsLoopId: number | null = null;
  private lastUpdateTime = 0;
  private running = false;

  constructor(
    @inject(TYPES.PhysicsServiceParams) params: PhysicsServiceParams
  ) {
    this.eventBus = params.eventBus;
    this.logger = params.logger;
    this.timerService = params.timerService;
    this.inputStateService = params.inputStateService;
    this.config = params.config;
    this.logger.info(this.config.messages.initialized);
  }

  @logMethod
  @catchError
  public initialize(): void {
    initializeEventSubscriptions(this);
    this.startPhysicsLoop();
    this.logger.info(this.config.messages.started);
  }

  @logMethod
  @catchError
  public cleanup(): void {
    this.stopPhysicsLoop();
    cleanupEventSubscriptions(this);
    this.logger.info(this.config.messages.stopped);
  }

  @logMethod
  public getCurrentPhysicsData(): PhysicsData {
    return {
      velocity: { ...this.velocity },
      acceleration: { ...this.acceleration },
    };
  }

  @logMethod
  public isRunning(): boolean {
    return this.running;
  }

  // === PRIVATE METHODS ===

  /**
   * Start the physics simulation loop
   */
  @catchError
  private startPhysicsLoop(): void {
    if (this.physicsLoopId !== null) {
      return; // Already running
    }

    this.running = true;
    this.lastUpdateTime = performance.now();
    this.runPhysicsLoop();
  }

  /**
   * Stop the physics simulation loop
   */
  @catchError
  private stopPhysicsLoop(): void {
    if (this.physicsLoopId !== null) {
      this.timerService.cancelAnimationFrame(this.physicsLoopId);
      this.physicsLoopId = null;
      this.running = false;
    }
  }

  /**
   * Main physics loop - runs on requestAnimationFrame
   */
  @catchError
  private runPhysicsLoop(): void {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = currentTime;

    // Update physics
    this.updatePhysics(deltaTime);

    // Emit event
    this.emitPhysicsDataEvent();

    // Schedule next frame
    this.physicsLoopId = this.timerService.requestAnimationFrame(() => {
      this.runPhysicsLoop();
    });
  }

  /**
   * Update physics simulation
   */
  @catchError
  private updatePhysics(deltaTime: number): void {
    const inputVector = this.inputStateService.getDirectionVector();
    this.updateAcceleration(inputVector.x, inputVector.z);
    this.applyAccelerationToVelocity(deltaTime);
    this.applyFriction(inputVector.x, inputVector.z);
    this.clampVelocityToMax();
    this.applyDamping();
  }

  /**
   * Update acceleration based on input direction
   */
  private updateAcceleration(inputX: number, inputZ: number): void {
    this.acceleration.x = inputX * this.config.accelerationRate;
    this.acceleration.y = 0; // No vertical movement for now
    this.acceleration.z = inputZ * this.config.accelerationRate;
  }

  /**
   * Apply acceleration to velocity
   */
  private applyAccelerationToVelocity(deltaTime: number): void {
    this.velocity.x += this.acceleration.x * deltaTime;
    this.velocity.y += this.acceleration.y * deltaTime;
    this.velocity.z += this.acceleration.z * deltaTime;
  }

  /**
   * Apply friction when no input is detected
   */
  private applyFriction(inputX: number, inputZ: number): void {
    if (inputX === 0 && inputZ === 0) {
      const friction = this.config.frictionCoefficient;
      this.velocity.x *= (1 - friction);
      this.velocity.z *= (1 - friction);

      // Stop completely if velocity is very small
      if (Math.abs(this.velocity.x) < this.config.velocityThreshold) {
        this.velocity.x = 0;
      }
      if (Math.abs(this.velocity.z) < this.config.velocityThreshold) {
        this.velocity.z = 0;
      }
    }
  }

  /**
   * Clamp velocity magnitude to configured maximum
   */
  private clampVelocityToMax(): void {
    const velocityMagnitude = Math.sqrt(
      this.velocity.x * this.velocity.x +
      this.velocity.y * this.velocity.y +
      this.velocity.z * this.velocity.z
    );

    if (velocityMagnitude > this.config.maxVelocity) {
      const scale = this.config.maxVelocity / velocityMagnitude;
      this.velocity.x *= scale;
      this.velocity.y *= scale;
      this.velocity.z *= scale;
    }
  }

  /**
   * Apply velocity damping if enabled
   */
  private applyDamping(): void {
    if (this.config.enableDamping) {
      const damping = 0.98;
      this.velocity.x *= damping;
      this.velocity.y *= damping;
      this.velocity.z *= damping;
    }
  }

  /**
   * Emit physics data event
   */
  @catchError
  private emitPhysicsDataEvent(): void {
    const event: PhysicsDataUpdatedEvent = {
      type: "PhysicsDataUpdated",
      velocity: { ...this.velocity },
      acceleration: { ...this.acceleration },
      source: "PhysicsService",
      timestamp: new Date(),
    };

    this.eventBus.emit(event);
  }
}
