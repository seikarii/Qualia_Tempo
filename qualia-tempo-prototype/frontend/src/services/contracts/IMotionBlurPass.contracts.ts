/**
 * QUALIA.CODE v1.1 - MotionBlurPass Contracts
 * CRISALIDA.CODE v1.1 - Phase 4: Temporal Effects
 * 
 * Configuration and state contracts for velocity-based motion blur
 */

export interface MotionBlurPassConfig {
  enabled: boolean;
  samples: number;        // Sample count (4-16 typical, higher = better quality)
  strength: number;       // Blur strength multiplier (0.5-1.0 typical)
  threshold: number;      // Minimum velocity for blur (0.001 default, optimization)
}

export interface MotionBlurPassState {
  isEnabled: boolean;
  currentSamples: number;
  currentStrength: number;
}
