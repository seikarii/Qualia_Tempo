/**
 * QUALIA.CODE v1.1 - DoFPass Contracts
 * Purpose: Type definitions for Depth of Field post-processing pass
 * Compliance: Configuration externalization mandatory
 */

/**
 * Configuration for Depth of Field effect
 */
export interface DoFPassConfig {
  /** Enable/disable depth of field effect */
  enabled: boolean;
  
  /** Focus plane distance in world units (meters) */
  focusDistance: number;
  
  /** Range of sharp focus in world units (meters) */
  focusRange: number;
  
  /** Maximum blur radius in pixels */
  bokehRadius: number;
  
  /** Number of samples for bokeh shape (16-64) */
  bokehSamples: number;
  
  /** Aperture f-stop for realistic DoF calculation */
  aperture: number;
  
  /** Enable debug visualization mode */
  debugMode: boolean;
}

/**
 * Runtime state of DoF pass
 */
export interface DoFPassState {
  /** Current circle of confusion radius */
  circleOfConfusion: number;
  
  /** Is the current pixel in focus */
  isInFocus: boolean;
  
  /** Current sample count being used */
  activeSamples: number;
}
