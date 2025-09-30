export interface IPostProcessingService {
  initialize(renderer: any, scene: any, camera: any): Promise<void>; // Using any to avoid THREE.js import in interface
  render(): void;
  resize(width: number, height: number): void;
  dispose(): void;
  getStats(): { passes: number; renderTime: number };
}