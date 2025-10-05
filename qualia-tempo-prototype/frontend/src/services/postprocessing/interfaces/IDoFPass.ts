/**
 * QUALIA.CODE v1.1 - IDoFPass Interface
 * Purpose: Contract for Depth of Field post-processing pass
 * Compliance: Interface-based dependency injection
 */

import type * as THREE from 'three';
import type { DoFPassState } from '../../contracts/IDoFPass.contracts';

/**
 * Interface for Depth of Field post-processing pass
 * Implements Three.js Pass pattern with DoF-specific functionality
 */
export interface IDoFPass {
  /**
   * Render the depth of field effect
   * @param renderer - WebGL renderer
   * @param writeBuffer - Target render buffer
   * @param readBuffer - Source render buffer
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
   * Set the depth texture for DoF calculation
   * @param depthTexture - Linear depth texture from G-Buffer
   */
  setDepthTexture(depthTexture: THREE.Texture): void;

  /**
   * Update focus distance dynamically
   * @param distance - New focus distance in world units
   */
  setFocusDistance(distance: number): void;

  /**
   * Update bokeh radius dynamically
   * @param radius - New bokeh radius in pixels
   */
  setBokehRadius(radius: number): void;

  /**
   * Enable/disable debug visualization
   * @param enabled - Debug mode state
   */
  setDebugMode(enabled: boolean): void;

  /**
   * Get current state of the DoF pass
   * @returns Current pass state
   */
  getState(): DoFPassState;

  /**
   * Dispose of GPU resources
   */
  dispose(): void;
}
