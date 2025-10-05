/**
 * QUALIA.CODE v1.1 - BrightPass Contracts
 * CRISALIDA.CODE v1.1 - Phase 2: Complete Bloom System
 * 
 * Configuration and parameter contracts for BrightPass (luminance threshold extraction)
 */

export interface BrightPassConfig {
  enabled: boolean;
  threshold: number;        // Primary brightness threshold (0.8-1.2 typical)
  softThreshold: number;    // Soft knee range (0.0 = hard, 1.0 = very soft)
  intensity: number;        // Bloom strength multiplier (1.0-3.0)
  colorPreservation: number; // Saturation preservation (0.7-1.0)
}

export interface BrightPassParams {
  width: number;
  height: number;
  vertexShader: string;
  fragmentShader: string;
  threshold?: number;
  softThreshold?: number;
  intensity?: number;
  colorPreservation?: number;
}
