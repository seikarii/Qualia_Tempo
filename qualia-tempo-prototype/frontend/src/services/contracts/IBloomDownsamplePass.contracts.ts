/**
 * QUALIA.CODE v1.1 - BloomDownsamplePass Contracts
 * CRISALIDA.CODE v1.1 - Phase 2: Complete Bloom System
 * 
 * Configuration and parameter contracts for bloom downsampling
 */

export interface BloomDownsamplePassConfig {
  enabled: boolean;
  levels: number;  // Mipmap chain levels (3-7 typical)
}

export interface BloomDownsamplePassParams {
  width: number;
  height: number;
  vertexShader: string;
  fragmentShader: string;
}
