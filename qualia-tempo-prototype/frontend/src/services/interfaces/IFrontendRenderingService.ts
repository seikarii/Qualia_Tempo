// IFrontendRenderingService.ts
import type { ReactNode } from 'react';

export interface IFrontendRenderingService {
  /**
   * Initialize the Three.js scene and renderer
   */
  initializeRenderer(canvas: HTMLCanvasElement): Promise<void>;

  /**
   * Start the rendering loop
   */
  start(): void;

  /**
   * Stop the rendering loop
   */
  stop(): void;

  /**
   * Update particle buffer with binary data from backend
   */
  updateParticleBuffer(data: Float32Array): void;

  /**
   * Resize the renderer
   */
  resize(width: number, height: number): void;

  /**
   * Get rendering statistics
   */
  getStats(): RenderingStats;

  /**
   * CRISALIDA.CODE v2.0: Unified rendering pipeline
   * Render game scene content (React Three Fiber JSX) into the main scene
   * This enables QualiaTempoGame to be a "scene provider" without owning a canvas
   * 
   * @param sceneContent - React Three Fiber JSX elements (lights, meshes, etc.)
   */
  setGameScene(sceneContent: ReactNode): void;

  /**
   * CRISALIDA.CODE v2.0: Clear game scene content
   * Removes game objects from the main scene, returning to particle-only rendering
   */
  clearGameScene(): void;

  /**
   * Cleanup resources
   */
  dispose(): void;
}

export interface RenderingStats {
  fps: number;
  frameTime: number;
  triangles: number;
  drawCalls: number;
}

export interface QualiaState {
  intensity: number;
  precision: number;
  aggression: number;
  flow: number;
  chaos: number;
  recovery: number;
  ultimate: number;
}