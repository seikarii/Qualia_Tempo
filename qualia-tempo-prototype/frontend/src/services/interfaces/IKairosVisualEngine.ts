/**
 * IKairosVisualEngine
 * Three.js rendering orchestration (Phase 5)
 * 
 * PURPOSE: Main visual rendering engine using Three.js
 * STATUS: 🔮 FUTURE (v2 - RUTA.md Phase 5)
 * IMPLEMENTATION: Pending Phase 5
 */

export interface RenderStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  textureMemoryMB: number;
}

export interface SceneState {
  playerPosition: { x: number; y: number; z: number };
  bossPosition?: { x: number; y: number; z: number };
  particles: Array<{ x: number; y: number; z: number }>;
  activeEffects: string[];
}

export interface IKairosVisualEngine {
  /**
   * Initialize Three.js renderer and scene with canvas
   * NOTE: Separate from IBaseService.initialize() which handles event subscriptions
   */
  initializeRenderer(canvas: HTMLCanvasElement): Promise<void>;

  /**
   * Start rendering loop
   */
  start(): void;

  /**
   * Stop rendering loop
   */
  stop(): void;

  /**
   * Update scene with new state
   */
  updateScene(state: SceneState): void;

  /**
   * Get current render statistics
   */
  getRenderStats(): RenderStats;

  /**
   * Resize renderer (window resize handler)
   */
  resize(width: number, height: number): void;

  /**
   * Enable/disable post-processing effect
   */
  setPostProcessingEffect(effectName: string, enabled: boolean): void;

  /**
   * Update engine configuration
   */
  updateConfig(config: Partial<Record<string, unknown>>): Promise<void>;

  /**
   * Cleanup and dispose resources
   */
  dispose(): void;
}
