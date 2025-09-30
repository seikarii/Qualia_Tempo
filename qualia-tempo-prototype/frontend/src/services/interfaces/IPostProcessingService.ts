export interface IPostProcessingService {
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  render(scene: any, camera: any): void; // Using any to avoid THREE.js import in interface
  resize(width: number, height: number): void;
  dispose(): void;
  getStats(): { passes: number; renderTime: number };
}