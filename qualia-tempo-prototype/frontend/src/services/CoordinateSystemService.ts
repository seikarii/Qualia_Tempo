/**
 * QUALIA.CODE v1.1 - CoordinateSystemService Implementation
 * Single source of truth for coordinate system transformations.
 *
 * Purpose: Provides centralized coordinate transformation logic to eliminate
 * desynchronization between GridRenderer and PlayerRenderer.
 * 
 * Architecture: Injectable service with Direct Configuration Injection pattern.
 * Uses the exact coordinate transformation logic from GridRenderer as canonical.
 */

import { injectable, inject } from 'inversify';
import * as THREE from 'three';
import { TYPES } from './inversify.types';
import type { ICoordinateSystemService } from './interfaces/ICoordinateSystemService';
import type { WorldToScreenParams } from './contracts/ICoordinateSystemService.contracts';
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
   * 
   * Convert world coordinates to screen coordinates.
   * QUALIA.CODE COMPLIANT: Parameter Object Pattern (4 params max)
   * 
   * @param params - WorldToScreenParams object containing all required parameters
   * @returns Screen coordinates {x, y}
   */
  @logMethod
  @catchError
  public worldToScreen(params: WorldToScreenParams): { x: number; y: number } {
    try {
      const screenCoords = this.projectWorldToScreen(params);
      this.logProjectionResult(params, screenCoords);
      return screenCoords;
    } catch (error) {
      this.logger.error(this.config.messages.cameraProjectionFailed, { error });
      return this.getFallbackScreenPosition(params.domElementSize);
    }
  }

  private projectWorldToScreen(params: WorldToScreenParams): { x: number; y: number } {
    const vector = new THREE.Vector3(params.worldX, params.worldY, params.worldZ);
    vector.project(params.camera);

    const screenX = (vector.x * 0.5 + 0.5) * params.domElementSize.width;
    const screenY = (vector.y * -0.5 + 0.5) * params.domElementSize.height;

    return { x: screenX, y: screenY };
  }

  private logProjectionResult(
    params: WorldToScreenParams,
    result: { x: number; y: number }
  ): void {
    this.logger.debug(this.config.messages.worldToScreenCalculated, {
      input: { worldX: params.worldX, worldY: params.worldY, worldZ: params.worldZ },
      output: { screenX: result.x, screenY: result.y },
      domSize: params.domElementSize
    });
  }

  private getFallbackScreenPosition(domElementSize: { width: number; height: number }): { x: number; y: number } {
    return {
      x: domElementSize.width / 2,
      y: domElementSize.height / 2
    };
  }

  /**
   * CANONICAL WORLD-TO-GRID TRANSFORMATION
   * Inverse of gridToWorld transformation for converting world coordinates back to grid coordinates.
   * This is the exact inverse mathematical operation of gridToWorld.
   * 
   * QUALIA.CODE v1.2: Full 3D Support
   * Now validates worldY against grid plane tolerance (config.gridPlaneTolerance).
   * Returns null if the Y coordinate indicates the position is not on the grid plane.
   */
  @logMethod
  @catchError
  public worldToGrid(worldX: number, worldY: number, worldZ: number): { x: number; y: number } | null {
    // Validate Y coordinate is on the grid plane
    if (Math.abs(worldY) > this.config.gridPlaneTolerance) {
      this.logger.warn(this.config.messages.worldYOutOfPlane, { 
        worldX, 
        worldY, 
        worldZ, 
        tolerance: this.config.gridPlaneTolerance 
      });
      return null;
    }

    // Apply the inverse transformation of gridToWorld
    const gridX = Math.round((worldX / this.config.tileSize) + this.config.gridSize / 2 - 0.5);
    const gridY = Math.round((worldZ / this.config.tileSize) + this.config.gridSize / 2 - 0.5);

    // Validate output coordinates
    if (gridX < 0 || gridX >= this.config.gridSize || 
        gridY < 0 || gridY >= this.config.gridSize) {
      this.logger.warn(this.config.messages.invalidWorldCoordinates, { worldX, worldY, worldZ, gridX, gridY });
      return null;
    }

    this.logger.debug(this.config.messages.worldToGridCalculated, {
      input: { worldX, worldY, worldZ },
      output: { gridX, gridY }
    });

    return { x: gridX, y: gridY };
  }

  /**
   * Get current grid configuration for debugging/inspection.
   */
  @logMethod
  public getGridConfig(): { gridSize: number; tileSize: number } {
    return {
      gridSize: this.config.gridSize,
      tileSize: this.config.tileSize
    };
  }

  /**
   * INDEX-TO-GRID TRANSFORMATION
   * Converts array index to grid coordinates using the canonical grid generation logic.
   * This centralizes the coordinate derivation logic that was previously scattered in components.
   */
  @logMethod
  @catchError
  public indexToGrid(index: number): { x: number; y: number } {
    if (index < 0 || index >= this.config.gridSize * this.config.gridSize) {
      this.logger.warn('Invalid index provided for indexToGrid transformation', { index });
      return { x: 0, y: 0 };
    }

    // Lógica correcta que coincide con la generación de la grilla (for x { for z })
    const x = Math.floor(index / this.config.gridSize);
    const y = index % this.config.gridSize; // En nuestro sistema, la 'y' lógica es el eje 'z' de la grilla

    this.logger.debug('indexToGrid calculated', { input: { index }, output: { x, y } });

    return { x, y };
  }
}