/**
 * QUALIA.CODE v1.1 - SharpeningPass Contracts
 * Configuration and parameter contracts for Sharpening post-processing effect
 */

export interface SharpeningPassConfig {
  enabled: boolean;
  sharpness: number; // 0.0-1.0, typical: 0.2-0.5
}

export interface SharpeningPassParams {
  width: number;
  height: number;
  vertexShader: string;
  fragmentShader: string;
  sharpness?: number;
}
