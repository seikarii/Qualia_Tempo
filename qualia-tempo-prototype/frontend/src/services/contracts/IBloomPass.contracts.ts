/**
 * QUALIA.CODE v1.1 - BloomPass Contracts
 */

export interface BloomPassConfig {
  enabled: boolean;
  threshold: number;
  softThreshold: number;
  intensity: number;
  radius: number;
  levels: number;              // Mipmap levels (3-7)
  blendMode: 'additive' | 'screen';
}

export interface BloomPassState {
  activeLevels: number;
  currentIntensity: number;
  renderTargetsAllocated: number;
}
