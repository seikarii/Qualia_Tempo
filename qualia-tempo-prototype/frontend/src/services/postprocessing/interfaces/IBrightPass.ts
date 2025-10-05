/**
 * QUALIA.CODE v1.1 - IBrightPass Interface
 * Purpose: Contract for luminance threshold extraction pass
 * Compliance: Interface-based dependency injection
 */

import type * as THREE from 'three';
import type { BrightPassState } from '../../contracts/IBrightPass.contracts';

/**
 * Interface for BrightPass (luminance threshold extraction)
 * Implements Three.js Pass pattern with brightness extraction functionality
 */
export interface IBrightPass {
  /**
   * Render the bright pass extraction
   * @param renderer - WebGL renderer
   * @param writeBuffer - Target render buffer
   * @param readBuffer - Source render buffer (HDR scene)
   * @param deltaTime - Time since last frame (optional)
   * @param maskActive - Is masking active (optional)
   */
  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime?: number,
    maskActive?: boolean
  ): void;

  /**
   * Update pass size when viewport changes
   * @param width - New viewport width
   * @param height - New viewport height
   */
  setSize(width: number, height: number): void;

  /**
   * Update brightness threshold dynamically
   * @param threshold - New threshold value (0.0-2.0)
   */
  setThreshold(threshold: number): void;

  /**
   * Update bloom intensity dynamically
   * @param intensity - New intensity multiplier (0.0-5.0)
   */
  setIntensity(intensity: number): void;

  /**
   * Get current state of the BrightPass
   * @returns Current pass state
   */
  getState(): BrightPassState;

  /**
   * Dispose of GPU resources
   */
  dispose(): void;
}
