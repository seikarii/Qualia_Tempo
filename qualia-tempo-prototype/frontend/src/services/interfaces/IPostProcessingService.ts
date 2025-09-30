import type { WebGLRenderer, Scene, PerspectiveCamera } from 'three';

export interface IPostProcessingService {
  initialize(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): Promise<void>;
  render(camera: PerspectiveCamera): void;
  resize(width: number, height: number): void;
  dispose(): void;
  getStats(): { pipelines: number; renderTargets: number; renderTime: number };
}