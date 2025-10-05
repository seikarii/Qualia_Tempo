/**
 * QUALIA.CODE v1.1 - IBloomPass Interface
 */

import type * as THREE from 'three';
import type { BloomPassState } from '../../contracts/IBloomPass.contracts';

export interface IBloomPass {
  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime?: number,
    maskActive?: boolean
  ): void;
  setSize(width: number, height: number): void;
  setIntensity(intensity: number): void;
  setThreshold(threshold: number): void;
  getState(): BloomPassState;
  dispose(): void;
}
