/**
 * QUALIA.CODE v1.1 - LUTPass Contracts (WebGL 2.0 Upgrade)
 * Configuration and parameter contracts for Color Grading LUT post-processing effect
 * Now uses native sampler3D with Data3DTexture for optimal performance
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
  lutTexture?: THREE.Data3DTexture;  // Native 3D LUT texture (32x32x32)
}
