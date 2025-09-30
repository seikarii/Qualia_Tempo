/**
 * FrontendRenderingService Configuration Contract
 * QUALIA.CODE v1.1 Compliant - Externalized Configuration
 */

export interface FrontendRenderingConfig {
  // Particle system configuration
  particleCount: number;
  particlePositionRange: number;
  particleSizeMin: number;
  particleSizeMax: number;
  
  // Particle data format configuration
  componentsPerParticle: number;
  positionComponents: number;
  colorComponents: number;
  positionOffset: number;
  colorOffset: number;
  sizeOffset: number;
  
  // Camera configuration
  cameraFov: number;
  cameraNear: number;
  cameraFar: number;
  cameraDistance: number;
  cameraOrbitSpeed: number;
  cameraOrbitRadius: number;
  
  // Renderer configuration
  backgroundColor: number;
  antialias: boolean;
  
  // Performance configuration
  fpsUpdateInterval: number;
  
  // WebGL context resilience
  contextLossRecoveryDelay: number;
  maxContextLossRetries: number;
  
  // Messages
  messages: {
    serviceInitialized: string;
    alreadyInitialized: string;
    alreadyRunning: string;
    contextLost: string;
    contextRestored: string;
    reinitializing: string;
    started: string;
    stopped: string;
    disposed: string;
    mustInitializeFirst: string;
  };
}