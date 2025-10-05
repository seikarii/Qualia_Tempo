/**
 * QUALIA.CODE v1.1 - VelocityPass Contracts
 * Purpose: Configuration contracts for velocity buffer generation
 * Breaking Change: Expands G-Buffer from 4 to 5 render targets
 */

/**
 * VelocityPass configuration
 * Controls motion vector calculation for temporal effects
 */
export interface VelocityPassConfig {
  /** Enable/disable velocity buffer generation */
  enabled: boolean;
  
  /** Velocity amplification factor for visualization (default: 1.0) */
  velocityScale: number;
  
  /** Enable debug visualization mode (color-coded motion vectors) */
  debugMode: boolean;
  
  /** Render target format (default: RGBAFormat) */
  format: number;  // THREE.RGBAFormat | THREE.RGBFormat
  
  /** Render target type (default: HalfFloatType for precision) */
  type: number;  // THREE.HalfFloatType | THREE.FloatType
}

/**
 * Velocity buffer output
 * RG: Screen-space velocity vector (NDC space, range [-1, 1])
 * B: Velocity magnitude (speed)
 * A: Always 1.0
 */
export interface VelocityBufferData {
  velocityX: number;  // Horizontal motion
  velocityY: number;  // Vertical motion
  speed: number;      // Magnitude of motion
}

/**
 * Matrix storage for previous frame
 * Required for velocity calculation
 */
export interface PreviousFrameMatrices {
  viewMatrix: Float32Array;        // 4x4 view matrix (16 elements)
  projectionMatrix: Float32Array;  // 4x4 projection matrix (16 elements)
}
