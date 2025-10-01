// IFrontendRenderingService.ts
export interface IFrontendRenderingService {
  /**
   * Initialize the Three.js scene and renderer
   */
  initialize(canvas: HTMLCanvasElement): Promise<void>;

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