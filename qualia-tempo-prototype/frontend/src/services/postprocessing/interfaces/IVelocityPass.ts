/**
 * QUALIA.CODE v1.1 - IVelocityPass Interface
 * Purpose: Contract for velocity buffer generation pass
 */

import type * as THREE from 'three';
import type { PreviousFrameMatrices } from '../../contracts/IVelocityPass.contracts';

export interface IVelocityPass {
    /**
   * Render velocity buffer to target
   * @param renderer WebGL renderer instance
   * @param writeBuffer Target render buffer
   * @param readBuffer Source render buffer
   * @param optionalParams Optional deltaTime and maskActive parameters (unused, required by Three.js Pass)
   */
  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    ...optionalParams: unknown[]
  ): void;
  
  /**
   * Update previous frame matrices for next render
   * Must be called at end of each frame
   * @param viewMatrix Current frame view matrix
   * @param projectionMatrix Current frame projection matrix
   */
  updatePreviousMatrices(
    viewMatrix: THREE.Matrix4,
    projectionMatrix: THREE.Matrix4
  ): void;
  
  /**
   * Get stored previous frame matrices
   * @returns Previous frame view and projection matrices
   */
  getPreviousMatrices(): PreviousFrameMatrices;
  
  /**
   * Set debug visualization mode
   * @param enabled Enable color-coded motion vector visualization
   */
  setDebugMode(enabled: boolean): void;
  
  /**
   * Update render target size
   * @param width New width in pixels
   * @param height New height in pixels
   */
  setSize(width: number, height: number): void;
  
  /**
   * Cleanup GPU resources
   */
  dispose(): void;
}
