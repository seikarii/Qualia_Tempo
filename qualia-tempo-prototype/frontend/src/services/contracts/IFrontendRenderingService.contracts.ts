/**
 * FrontendRenderingService Configuration Contract
 * QUALIA.CODE v1.1 Compliant - Externalized Configuration
 */

import type { ILogger } from "../interfaces/ILogger";
import type { IPerformanceService } from "../interfaces/IPerformanceService";
import type { IPostProcessingService } from "../interfaces/IPostProcessingService";
import type { IEventBus } from "../interfaces/IEventBus";

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
  
  // Scene configuration
  scene: {
    lookAtTarget: [number, number, number];  // QUALIA.CODE v1.1: Externalized camera look-at target
  };
  
  // Renderer configuration
  backgroundColor: number;
  antialias: boolean;
  devicePixelRatio: number;
  
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

// QUALIA.CODE v1.1: Constructor Parameter Object
// Consolidates 5 constructor parameters into a single object to comply with IoC limits
export interface FrontendRenderingServiceParams {
  logger: ILogger;
  performanceService: IPerformanceService;
  postProcessingService: IPostProcessingService;
  eventBus: IEventBus;
  config: FrontendRenderingConfig;
}