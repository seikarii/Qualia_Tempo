/**
 * QUALIA.CODE v1.1 - IMotionBlurPass Interface
 * CRISALIDA.CODE v1.1 - Phase 4: Temporal Effects
 * 
 * Interface for velocity-based motion blur pass
 */

import type * as THREE from 'three';
import type { MotionBlurPassState } from '../../contracts/IMotionBlurPass.contracts';

export interface IMotionBlurPass {
  /**
   * Render motion blur using velocity buffer
   * @param renderer WebGL renderer
   * @param writeBuffer Target render buffer
   * @param readBuffer Source render buffer (scene)
   */
  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime?: number,
    maskActive?: boolean
  ): void;

  /**
   * Update render target sizes
   */
  setSize(width: number, height: number): void;

  /**
   * Set velocity texture from G-Buffer
   */
  setVelocityTexture(velocityTexture: THREE.Texture): void;

  /**
   * Set blur strength
   */
  setStrength(strength: number): void;

  /**
   * Set sample count
   */
  setSamples(samples: number): void;

  /**
   * Get current pass state
   */
  getState(): MotionBlurPassState;

  /**
   * Clean up resources
   */
  dispose(): void;
}
