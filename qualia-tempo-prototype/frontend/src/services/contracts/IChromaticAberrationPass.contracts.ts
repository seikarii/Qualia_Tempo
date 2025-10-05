/**
 * QUALIA.CODE v1.1 - ChromaticAberrationPass Contracts
 * Configuration and parameter contracts for Chromatic Aberration post-processing effect
 */

export interface ChromaticAberrationPassConfig {
  enabled: boolean;
  strength: number; // 0.001-0.005, typical: 0.002
}

export interface ChromaticAberrationPassParams {
  width: number;
  height: number;
  vertexShader: string;
  fragmentShader: string;
  strength?: number;
}
