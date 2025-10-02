/**
 * QUALIA.CODE v1.1 - CoordinateSystemService Contracts
 * Configuration interface for coordinate system transformation.
 *
 * Purpose: Defines the configuration structure for grid-to-world coordinate transformations
 * Architecture: Direct Configuration Injection pattern - this config is injected directly
 * into the CoordinateSystemService, not accessed via Service Locator pattern.
 */

import * as THREE from 'three';

/**
 * Configuration interface for CoordinateSystemService
 * Contains the parameters needed for grid-to-world coordinate transformations.
 */
export interface CoordinateSystemConfig {
  /** Size of the grid (e.g., 8 for 8x8 grid) */
  gridSize: number;
  
  /** Size of each tile in world units (e.g., 1.0) */
  tileSize: number;
  
  /** Service messages for logging */
  messages: {
    serviceInitialized: string;
    gridToWorldCalculated: string;
    worldToGridCalculated: string;
    worldToScreenCalculated: string;
    invalidGridCoordinates: string;
    invalidWorldCoordinates: string;
    cameraProjectionFailed: string;
  };
}

/**
 * Parameter object for worldToScreen method
 * Encapsulates the 5 parameters needed for world-to-screen projection.
 */
export interface WorldToScreenParams {
  /** X coordinate in world space */
  worldX: number;
  /** Y coordinate in world space */
  worldY: number;
  /** Z coordinate in world space */
  worldZ: number;
  /** Three.js camera for projection */
  camera: THREE.Camera;
  /** DOM element dimensions for screen coordinate calculation */
  domElementSize: { width: number; height: number };
}