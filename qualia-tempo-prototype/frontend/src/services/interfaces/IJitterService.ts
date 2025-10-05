import { JitterOffset, HaltonState } from '../contracts/IJitterService.contracts';

/**
 * IJitterService - Camera sub-pixel jitter for TAA
 * 
 * Provides Halton sequence-based jitter offsets for
 * Temporal Anti-Aliasing sub-pixel sampling.
 */
export interface IJitterService {
  /**
   * Get current frame jitter offset in NDC space
   * @returns Jitter offset {x, y} in [-0.5, 0.5] range
   */
  getJitterOffset(): JitterOffset;
  
  /**
   * Advance to next frame in Halton sequence
   * Cycles through sampleCount frames
   */
  advanceFrame(): void;
  
  /**
   * Reset sequence to first frame
   * Used when camera moves (if resetOnMove is true)
   */
  reset(): void;
  
  /**
   * Get current Halton sequence state
   * @returns Current index and total samples
   */
  getState(): HaltonState;
  
  /**
   * Check if jitter is currently enabled
   * @returns True if enabled
   */
  isEnabled(): boolean;
}
