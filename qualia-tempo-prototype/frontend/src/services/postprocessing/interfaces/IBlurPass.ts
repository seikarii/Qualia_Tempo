/**
 * QUALIA.CODE v1.1 - IBlurPass Interface
 */

import type * as THREE from 'three';
import type { BlurPassState } from '../../contracts/IBlurPass.contracts';

export interface IBlurPass {
  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime?: number,
    maskActive?: boolean
  ): void;
  setSize(width: number, height: number): void;
  setKernelSize(size: number): void;
  getState(): BlurPassState;
  dispose(): void;
}
