/**
 * QUALIA.CODE v1.1 - LUTPass Contracts
 * Configuration and parameter contracts for Color Grading LUT post-processing effect
 */

import * as THREE from 'three';

export interface LUTPassConfig {
  enabled: boolean;
  lutStrength: number; // 0.0-1.0, blend with original
  lutFile?: string;    // Path to .cube LUT file (future: AssetService integration)
}

export interface LUTPassParams {
  width: number;
  height: number;
  vertexShader: string;
  fragmentShader: string;
  lutStrength?: number;
  lutTexture?: THREE.Texture;  // Optional pre-loaded LUT texture
}
