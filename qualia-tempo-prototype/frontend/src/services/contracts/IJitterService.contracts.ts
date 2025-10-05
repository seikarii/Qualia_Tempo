/**
 * QUALIA.CODE v1.1 - JitterService Contracts
 * Purpose: Camera sub-pixel jitter for Temporal Anti-Aliasing (TAA)
 * Algorithm: Halton sequence for low-discrepancy sampling
 */

/**
 * JitterService configuration
 * Controls TAA sample distribution
 */
export interface JitterServiceConfig {
  /** Enable/disable jitter application */
  enabled: boolean;
  
  /** Number of samples in Halton sequence (typically 8 or 16) */
  sampleCount: number;
  
  /** Jitter strength multiplier (default: 1.0) */
  strength: number;
  
  /** Reset sequence on camera movement (helps reduce ghosting) */
  resetOnMove: boolean;
}

/**
 * 2D jitter offset in NDC space
 * Range: [-0.5, 0.5] per axis for sub-pixel offsets
 */
export interface JitterOffset {
  x: number;  // Horizontal offset
  y: number;  // Vertical offset
}

/**
 * Halton sequence state
 * Tracks current sample index for deterministic jitter
 */
export interface HaltonState {
  currentIndex: number;
  totalSamples: number;
}
