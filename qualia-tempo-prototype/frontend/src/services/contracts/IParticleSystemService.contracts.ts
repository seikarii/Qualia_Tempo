/**
 * QUALIA.CODE v1.1 - Particle System Service Contracts
 * TYPE: Service Configuration Contract
 * 
 * PURPOSE: Define type-safe configuration for GPU-instanced particle system
 * REFERENCE: docs/VISUALS.GOLD.CODE.md Phase 2 - Synesthesia Profunda
 * 
 * ARCHITECTURE NOTES:
 * - ParticleSystemServiceConfig: Direct injection object for service configuration
 * - ParticleSystemServiceParams: Constructor parameter object (QUALIA.CODE v1.1)
 * - FFT reactivity mappings defined here to eliminate hardcoding
 */

/**
 * FFT reactivity configuration
 * Maps audio frequency bands to visual particle properties
 */
export interface FFTReactivityConfig {
  /** Bass frequency (0-200Hz) to particle size multiplier */
  bassToParticleSizeMultiplier: {
    min: number;
    max: number;
  };
  
  /** Mid frequency (200-2000Hz) to velocity multiplier */
  midToVelocityMultiplier: {
    min: number;
    max: number;
  };
  
  /** Treble frequency (2000-20000Hz) to emissive intensity multiplier */
  trebleToEmissiveMultiplier: {
    min: number;
    max: number;
  };
}

/**
 * Particle system configuration object
 * Directly injected into ParticleSystemService (no Service Locator)
 */
export interface ParticleSystemServiceConfig {
  /** Maximum number of particles in the pool */
  maxParticles: number;
  
  /** Base size of each particle (in world units) */
  baseParticleSize: number;
  
  /** Base emission speed (particles per second) */
  emissionSpeed: number;
  
  /** FFT reactivity mappings */
  fftReactivity: FFTReactivityConfig;
}

/**
 * Constructor parameter object for ParticleSystemService
 * Eliminates constructor parameter count explosion (QUALIA.CODE v1.1)
 */
export interface ParticleSystemServiceParams {
  /** Particle system configuration */
  config: ParticleSystemServiceConfig;
  
  /** Logger service (use 'any' to avoid circular imports in contracts) */
  logger: any;
  
  /** EventBus service (use 'any' to avoid circular imports in contracts) */
  eventBus: any;
  
  /** Audio analysis service for FFT data (use 'any' to avoid circular imports) */
  audioAnalysisService: any;
}
