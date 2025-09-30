/**
 * QUALIA.CODE v1.1 - CoordinateSystemService Implementation
 * Single source of truth for coordinate system transformations.
 *
 * Purpose: Provides centralized coordinate transformation logic to eliminate
 * desynchronization between GridRenderer, PlayerRenderer, and PlayerAvatar.
 * 
 * Architecture: Injectable service with Direct Configuration Injection pattern.
 * Uses the exact coordinate transformation logic from GridRenderer as canonical.
 */

import { injectable, inject } from 'inversify';
import * as THREE from 'three';
import { TYPES } from './inversify.types';
import type { ICoordinateSystemService } from './interfaces/ICoordinateSystemService';
import type { CoordinateSystemConfig } from './contracts/ICoordinateSystemService.contracts';
import type { ILogger } from './interfaces/ILogger';
import { logMethod, catchError } from '../utils/decorators';

@injectable()
export class CoordinateSystemService implements ICoordinateSystemService {
  private readonly config: CoordinateSystemConfig;
  private readonly logger: ILogger;

  constructor(
    @inject(TYPES.CoordinateSystemConfig) config: CoordinateSystemConfig,
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.config = config;
    this.logger = logger;
    this.logger.info(this.config.messages.serviceInitialized, { 
      gridSize: this.config.gridSize, 
      tileSize: this.config.tileSize 
    });
  }

  /**
   * CANONICAL GRID-TO-WORLD TRANSFORMATION
   * This implements the exact same logic as GridRenderer.tsx:
   * position={[(x - gridSize / 2 + 0.5) * tileSize, 0, (z - gridSize / 2 + 0.5) * tileSize]}
   */
  @logMethod
  @catchError
  public gridToWorld(gridX: number, gridZ: number): [number, number, number] {
    // Validate input coordinates
    if (gridX < 0 || gridX >= this.config.gridSize || 
        gridZ < 0 || gridZ >= this.config.gridSize) {
      this.logger.warn(this.config.messages.invalidGridCoordinates, { gridX, gridZ });
    }

    // Apply the canonical GridRenderer transformation
    const worldX = (gridX - this.config.gridSize / 2 + 0.5) * this.config.tileSize;
    const worldY = 0; // Always ground level
    const worldZ = (gridZ - this.config.gridSize / 2 + 0.5) * this.config.tileSize;

    this.logger.debug(this.config.messages.gridToWorldCalculated, {
      input: { gridX, gridZ },
      output: { worldX, worldY, worldZ }
    });

    return [worldX, worldY, worldZ];
  }

  /**
   * WORLD-TO-SCREEN PROJECTION
   * Uses Three.js Vector3.project() for accurate camera projection.
   */
  @logMethod
  @catchError
  public worldToScreen(
    worldX: number,
    worldY: number, 
    worldZ: number,
    camera: THREE.Camera,
    domElementSize: { width: number; height: number }
  ): { x: number; y: number } {
    try {
      // Create vector and project it through the camera
      const vector = new THREE.Vector3(worldX, worldY, worldZ);
      vector.project(camera);

      // Convert from normalized device coordinates (-1 to 1) to screen pixels
      const screenX = (vector.x * 0.5 + 0.5) * domElementSize.width;
      const screenY = (vector.y * -0.5 + 0.5) * domElementSize.height;

      this.logger.debug(this.config.messages.worldToScreenCalculated, {
        input: { worldX, worldY, worldZ },
        output: { screenX, screenY },
        domSize: domElementSize
      });

      return { x: screenX, y: screenY };
    } catch (error) {
      this.logger.error(this.config.messages.cameraProjectionFailed, { error });
      // Fallback to center of screen
      return { 
        x: domElementSize.width / 2, 
        y: domElementSize.height / 2 
      };
    }
  }

  /**
   * Get current grid configuration for debugging/inspection.
   */
  public getGridConfig(): { gridSize: number; tileSize: number } {
    return {
      gridSize: this.config.gridSize,
      tileSize: this.config.tileSize
    };
  }
}