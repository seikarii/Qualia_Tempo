/**
 * QUALIA.CODE v1.1 - IReactionDiffusionService Interface
 * VISUALS.GOLD.CODE Phase 3: El Mundo Viviente (The Living World)
 * 
 * PURPOSE: Manage reaction-diffusion simulation for ground plane
 * ARCHITECTURE: Injectable service with Direct Configuration Injection
 */

import * as THREE from 'three';

/**
 * Interface for Reaction-Diffusion simulation service
 * Generates organic, living patterns on the combat arena floor
 */
export interface IReactionDiffusionService {
  /**
   * Initialize the simulation
   * Creates render targets and materials
   */
  initialize(renderer: THREE.WebGLRenderer): void;
  
  /**
   * Update simulation one step
   * Should be called every frame
   * 
   * @param deltaTime Time since last update in seconds
   * @param qualiaState Current QualiaState for parameter mapping
   */
  update(deltaTime: number, qualiaState: {
    chaos: number;
    flow: number;
    recovery: number;
    intensity: number;
    aggression: number;
    transcendence: number;
  }): void;
  
  /**
   * Get the ground plane mesh with simulation texture
   * This mesh should be added to the main scene
   */
  getGroundMesh(): THREE.Mesh | null;
  
  /**
   * Get the current simulation texture
   * Can be used for debugging or additional effects
   */
  getSimulationTexture(): THREE.Texture | null;
  
  /**
   * Reset simulation to initial state
   * Useful for scene transitions or debugging
   */
  reset(): void;
  
  /**
   * Enable/disable simulation updates
   * Useful for performance optimization
   */
  setEnabled(enabled: boolean): void;
  
  /**
   * Cleanup and dispose resources
   */
  dispose(): void;
}
