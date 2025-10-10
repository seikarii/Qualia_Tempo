/**
 * QUALIA.CODE v1.1 - IReactionDiffusionService Contracts
 * VISUALS.GOLD.CODE Phase 3: El Mundo Viviente
 * 
 * PURPOSE: Configuration contracts for Reaction-Diffusion simulation
 * ARCHITECTURE: Direct Configuration Injection pattern
 * 
 * LINT EXCEPTION: This file uses 'any' types for service dependencies to avoid circular imports.
 * This is an intentional architectural pattern for Params interfaces in contracts.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Gray-Scott reaction-diffusion model parameters
 * These control the fundamental behavior of the simulation
 */
export interface GrayScottParameters {
  feedRate: number; // Feed rate (F) - typically 0.02-0.08
  diffusionA: number; // Diffusion rate for chemical A (Da) - typically 1.0
  diffusionB: number; // Diffusion rate for chemical B (Db) - typically 0.5
}

/**
 * Simulation quality and performance settings
 */
export interface SimulationQuality {
  resolution: number; // Texture resolution (256, 512, 1024)
  updateRate: number; // Simulation steps per frame (1-4)
  deltaTimeScale: number; // Time step multiplier for simulation speed
}

/**
 * Ground plane visual configuration
 */
export interface GroundPlaneConfig {
  size: number; // Physical size in world units (e.g., 50)
  height: number; // Y position of the plane (typically 0 or slightly below)
  segments: number; // Mesh detail (32, 64, 128)
}

/**
 * Complete Reaction-Diffusion Service Configuration
 */
export interface ReactionDiffusionServiceConfig {
  enabled: boolean; // Master enable/disable
  grayScott: GrayScottParameters; // Core simulation parameters
  simulation: SimulationQuality; // Performance settings
  groundPlane: GroundPlaneConfig; // Visual settings
}

/**
 * Constructor parameters for Direct Configuration Injection
 */
export interface ReactionDiffusionServiceParams {
  config: ReactionDiffusionServiceConfig;
  logger: any; // ILogger (avoiding circular import)
}
