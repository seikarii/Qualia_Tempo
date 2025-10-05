/**
 * QUALIA.CODE v1.1 - BlurPass Contracts
 */

export interface BlurPassConfig {
  enabled: boolean;
  kernelSize: number;        // Blur radius (1.0-5.0)
  passes: number;            // Number of blur passes (1-3)
}

export interface BlurPassState {
  currentPass: number;
  effectiveKernelSize: number;
}
