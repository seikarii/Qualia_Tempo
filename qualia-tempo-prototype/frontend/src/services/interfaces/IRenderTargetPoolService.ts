/**
 * QUALIA.CODE v1.1 - IRenderTargetPoolService Interface
 * CRISALIDA.CODE v1.1 - Phase 2: Resource Optimization
 *
 * Service interface for managing pooled WebGL render targets.
 * Prevents GPU memory fragmentation and reduces allocation overhead.
 */

import * as THREE from 'three';
import type { RenderTargetOptions, PoolStatistics } from '../contracts/IRenderTargetPoolService.contracts';

export interface IRenderTargetPoolService {
  /**
   * Acquire a render target from the pool or create a new one
   * @param width - Target width in pixels
   * @param height - Target height in pixels
   * @param options - WebGL render target options
   * @returns A render target ready for use
   */
  acquire(width: number, height: number, options?: RenderTargetOptions): THREE.WebGLRenderTarget;

  /**
   * Release a render target back to the pool for reuse
   * @param target - The render target to release
   */
  release(target: THREE.WebGLRenderTarget): void;

  /**
   * Get current pool statistics for debugging
   * @returns Pool statistics object
   */
  getStatistics(): PoolStatistics;

  /**
   * Clear all pools and dispose all render targets
   * Should be called on application shutdown or resize
   */
  dispose(): void;

  /**
   * Clear unused render targets from pools
   * Helps prevent memory bloat in long-running sessions
   */
  cleanup(): void;
}
