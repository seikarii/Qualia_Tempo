/**
 * QUALIA.CODE v1.1 - GBufferPass Contracts
 * Centralized type definitions for GBuffer rendering pass
 *
 * Purpose: Single source of truth for GBuffer pass data structures
 * Architecture: Contract definitions for post-processing pipeline
 */

import type * as THREE from 'three';

// QUALIA.CODE v1.1: Constructor parameter object pattern (max 4 parameters rule)
export interface GBufferPassParams {
  scene: THREE.Scene;
  camera: THREE.Camera;
  width: number;
  height: number;
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, THREE.IUniform>;
}
