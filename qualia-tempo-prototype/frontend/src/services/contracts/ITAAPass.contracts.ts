/**
 * QUALIA.CODE v1.1 - TAAPass Contracts
 * CRISALIDA.CODE v1.1 - Phase 4: Temporal Effects (ELITE)
 * 
 * Configuration and state contracts for Temporal Anti-Aliasing
 */

export interface TAAPassConfig {
  enabled: boolean;
  sampleCount: number;           // Halton sequence samples (4-16, must match JitterService)
  sharpness: number;              // Post-TAA sharpening (0.0-1.0)
  varianceClipping: number;       // Ghosting reduction (0.5-2.0, higher = less ghosting)
}

export interface TAAPassState {
  isEnabled: boolean;
  currentFrame: number;           // Frame counter for Halton sequence
  historyValid: boolean;          // Whether history buffer contains valid data
  currentSharpness: number;
  currentVarianceClipping: number;
}
