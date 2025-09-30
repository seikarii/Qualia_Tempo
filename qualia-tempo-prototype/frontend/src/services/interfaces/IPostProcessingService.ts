import type { WebGLRenderer, Scene, Camera } from 'three';

export interface IPostProcessingService {
  initialize(renderer: WebGLRenderer, scene: Scene, camera: Camera): Promise<void>;
  render(): void;
  resize(width: number, height: number): void;
  dispose(): void;
  getStats(): { passes: number; renderTime: number };
}