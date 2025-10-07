/**
 * QUALIA.CODE v1.1 - Particle System Service Interface
 * TYPE: Service Interface Contract
 * 
 * PURPOSE: Define public API for GPU-instanced particle system
 * REFERENCE: docs/VISUALS.GOLD.CODE.md Phase 2 - Synesthesia Profura
 * 
 * ARCHITECTURE:
 * - Extends IBaseService for lifecycle management
 * - Exposes mesh for scene integration
 * - Update method called every frame by KairosVisualEngine
 */

import type { IBaseService } from './IBaseService';
import type * as THREE from 'three';

/**
 * IParticleSystemService
 * 
 * RESPONSIBILITY: Manage 10,000+ GPU-instanced particles that react to audio FFT data
 * LIFECYCLE: Managed by ApplicationInitializerService via IBaseService
 * INTEGRATION: Called by KairosVisualEngine.renderLoop()
 */
export interface IParticleSystemService extends IBaseService {
  /**
   * Get the THREE.InstancedMesh for adding to scene
   * Returns null if not initialized
   */
  getInstancedMesh(): THREE.InstancedMesh | null;
  
  /**
   * Update particle system for current frame
   * @param deltaTime - Time since last frame in seconds
   */
  update(deltaTime: number): void;
  
  /**
   * Dispose GPU resources (geometry, material, mesh)
   */
  dispose(): void;
}
