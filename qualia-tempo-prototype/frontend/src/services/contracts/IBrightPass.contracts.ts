/**
 * QUALIA.CODE v1.1 - BrightPass Contracts
 * Purpose: Type definitions for luminance threshold extraction pass
 * Compliance: Configuration externalization mandatory
 */

/**
 * Configuration for BrightPass (luminance threshold extraction)
 */
export interface BrightPassConfig {
  /** Enable/disable bright pass extraction */
  enabled: boolean;
  
  /** Primary brightness threshold (0.8-1.2 typical) */
  threshold: number;
  
  /** Soft knee range for smooth transitions (0.0 = hard, 1.0 = very soft) */
  softThreshold: number;
  
  /** Bloom strength multiplier (1.0-3.0) */
  intensity: number;
  
  /** Color saturation preservation (0.7-1.0) */
  colorPreservation: number;
}

/**
 * Runtime state of BrightPass
 */
export interface BrightPassState {
  /** Number of pixels above threshold */
  brightPixelCount: number;
  
  /** Average brightness of extracted pixels */
  averageBrightness: number;
}
