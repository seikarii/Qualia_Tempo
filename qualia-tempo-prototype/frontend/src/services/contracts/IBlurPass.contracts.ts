/**
 * QUALIA.CODE v1.1 - BlurPass Contracts
 * CRISALIDA.CODE v1.1 - Phase 2: Complete Bloom System
 * 
 * Configuration and parameter contracts for separable Gaussian blur
 */

export interface BlurPassConfig {
  enabled: boolean;
  blurIntensity: number;  // 0.0-1.0, blur strength
  kernelSize: number;     // 1.0 = standard, 2.0 = double
}

export interface BlurPassParams {
  width: number;
  height: number;
  vertexShader: string;
  fragmentShader: string;
  blurIntensity?: number;
  kernelSize?: number;
}
