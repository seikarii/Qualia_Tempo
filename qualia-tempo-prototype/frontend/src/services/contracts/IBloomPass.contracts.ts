/**
 * QUALIA.CODE v1.1 - BloomPass Contracts
 * CRISALIDA.CODE v1.1 - Phase 2: Bloom System Orchestration
 * 
 * Configuration contracts for the complete bloom pipeline orchestrator.
 * Coordinates BrightPass, Blur, Downsample, Upsample, and Composite passes.
 */

export interface BloomPassConfig {
  enabled: boolean;
  threshold: number;              // Bright pass threshold (0.0-1.0)
  softThreshold: number;          // Soft knee range (0.0-1.0)
  intensity: number;              // Bloom strength multiplier (0.0-5.0)
  colorPreservation: number;      // Color saturation preservation (0.0-1.0)
  radius: number;                 // Bloom diffusion radius (1.0-10.0)
  levels: number;                 // Mipmap chain levels (3-7)
  blendMode: 'additive' | 'screen';  // Composite blend mode
}

export interface BloomPassParams {
  config: BloomPassConfig;
  width: number;                  // Render target width
  height: number;                 // Render target height
}
