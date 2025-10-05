/**
 * QUALIA.CODE v1.1 - ITAAPass Interface
 * CRISALIDA.CODE v1.1 - Phase 4: Temporal Effects (ELITE)
 * 
 * Interface for Temporal Anti-Aliasing pass
 */

import type * as THREE from 'three';
import type { TAAPassState } from '../../contracts/ITAAPass.contracts';

export interface ITAAPass {
  /**
   * Render TAA using current frame + history buffer
   * @param renderer WebGL renderer
   * @param writeBuffer Target render buffer (becomes next history)
   * @param readBuffer Source render buffer (current jittered frame)
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
   * Set sharpening strength
   */
  setSharpness(sharpness: number): void;

  /**
   * Set variance clipping amount
   */
  setVarianceClipping(amount: number): void;

  /**
   * Reset history buffer (call on scene changes)
   */
  resetHistory(): void;

  /**
   * Get current pass state
   */
  getState(): TAAPassState;

  /**
   * Clean up resources
   */
  dispose(): void;
}
