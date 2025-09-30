/**
 * QUALIA.CODE v1.1 - ICoordinateSystemService Interface
 * Contract for coordinate system transformation service.
 * 
 * Purpose: Provides the single source of truth for coordinate transformations
 * between grid coordinates and 3D world coordinates, solving the desynchronization
 * issue between GridRenderer, PlayerRenderer, and PlayerAvatar.
 * 
 * Architecture: Service abstraction following QUALIA.CODE principles
 */

import type * as THREE from 'three';

export interface ICoordinateSystemService {
  /**
   * Converts grid coordinates (logical game positions) to 3D world coordinates.
   * Uses the canonical GridRenderer transformation as the source of truth.
   * 
   * @param gridX - Position X in the grid (e.g: 0 to 7).
   * @param gridZ - Position Z in the grid (e.g: 0 to 7).
   * @returns An array [x, y, z] in 3D world space.
   */
  gridToWorld(gridX: number, gridZ: number): [number, number, number];

  /**
   * Converts 3D world coordinates to 2D screen coordinates (CSS pixels).
   * Requires the camera and DOM element size for proper projection.
   * 
   * @param worldX - Position X in 3D world space.
   * @param worldY - Position Y in 3D world space.
   * @param worldZ - Position Z in 3D world space.
   * @param camera - The Three.js camera for the scene.
   * @param domElementSize - Object with { width, height } of the canvas container.
   * @returns An object { x, y } in screen pixels.
   */
  worldToScreen(
    worldX: number, 
    worldY: number, 
    worldZ: number, 
    camera: THREE.Camera, 
    domElementSize: { width: number; height: number }
  ): { x: number; y: number };

  /**
   * Converts 3D world coordinates back to grid coordinates.
   * This is the inverse transformation of gridToWorld.
   * 
   * @param worldX - Position X in 3D world space.
   * @param worldZ - Position Z in 3D world space.
   * @returns An object { x, y } representing grid coordinates.
   */
  worldToGrid(worldX: number, worldZ: number): { x: number; y: number };

  /**
   * Get current grid configuration for debugging/inspection.
   * @returns Current grid configuration values.
   */
  getGridConfig(): { gridSize: number; tileSize: number };

  /**
   * Converts array index to grid coordinates.
   * This method centralizes the logic for deriving grid coordinates from array indices,
   * ensuring consistency across all components that work with grid data structures.
   * 
   * @param index - The array index (0-based) representing a tile position.
   * @returns An object { x, y } representing grid coordinates.
   */
  indexToGrid(index: number): { x: number; y: number };
}