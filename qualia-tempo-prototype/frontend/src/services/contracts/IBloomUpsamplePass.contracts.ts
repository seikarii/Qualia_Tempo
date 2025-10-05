/**
 * QUALIA.CODE v1.1 - BloomUpsamplePass Contracts
 * CRISALIDA.CODE v1.1 - Phase 2: Complete Bloom System
 * 
 * Configuration and parameter contracts for bloom upsampling
 */

export interface BloomUpsamplePassConfig {
  enabled: boolean;
  intensity: number;  // Bloom blend intensity (0.1-0.5 typical)
}

export interface BloomUpsamplePassParams {
  width: number;
  height: number;
  vertexShader: string;
  fragmentShader: string;
  intensity?: number;
}
