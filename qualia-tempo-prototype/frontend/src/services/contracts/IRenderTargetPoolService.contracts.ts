/**
 * QUALIA.CODE v1.1 - RenderTargetPoolService Contracts
 * CRISALIDA.CODE v1.1 - Phase 2: Resource Optimization
 * 
 * Configuration and parameter contracts for render target pooling system
 */

import * as THREE from 'three';

export interface RenderTargetPoolConfig {
  enabled: boolean;
  maxPoolSize: number;        // Maximum targets per pool (default: 10)
  autoCleanup: boolean;       // Auto-cleanup on resize (default: true)
  debugMode: boolean;         // Log pool statistics (default: false)
}

export interface RenderTargetOptions {
  format?: THREE.PixelFormat;
  type?: THREE.TextureDataType;
  minFilter?: THREE.TextureFilter;
  magFilter?: THREE.TextureFilter;
  wrapS?: THREE.Wrapping;
  wrapT?: THREE.Wrapping;
  depthBuffer?: boolean;
  stencilBuffer?: boolean;
  samples?: number;
}

export interface RenderTargetPoolKey {
  width: number;
  height: number;
  format: THREE.PixelFormat;
  type: THREE.TextureDataType;
}

export interface PoolStatistics {
  totalPools: number;
  totalTargets: number;
  activeTargets: number;
  availableTargets: number;
  pools: Map<string, {
    size: number;
    active: number;
    available: number;
  }>;
}
