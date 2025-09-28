/**
 * QUALIA.CODE v1.1 - IApplicationCompositionRoot Contracts
 * Single Source of Truth for ApplicationCompositionRoot data structures.
 * This file is manually maintained for ApplicationCompositionRoot-specific contracts.
 */

// CompositionRoot Configuration - Migrated from ConfigurationService.ts
export interface CompositionRootConfig {
  autoStart: boolean;
  enableBackendSync: boolean;
  enableHealthMonitoring: boolean;
  healthCheckIntervalMs: number;
  retryInitializationOnError: boolean;
  maxInitializationRetries: number;
  serviceInitializationTimeoutMs: number;
  serviceShutdownTimeoutMs: number;
  enableServiceLifecycleLogging: boolean;
  enablePerformanceMonitoring: boolean;
  http: {
    defaultTimeout: number;
    maxRetries: number;
    retryDelay: number;
  };
  
  // Messages for logging
  messages: {
    alreadyRunning: string;
    initializationStarted: string;
    configurationLoaded: string;
    httpServiceConfigured: string;
    gameStateServiceStarted: string;
    transversalServicesStarted: string;
    gameControllerStarted: string;
    rhythmicControllerStarted: string;
    initializationCompleted: string;
    initializationFailed: string;
  };
  
  // Steps for initialization logging
  steps: {
    loadConfiguration: string;
    configureHttpService: string;
    startGameStateService: string;
    startTransversalServices: string;
    startGameController: string;
    startRhythmicController: string;
    startBackendSync: string;
  };
  
  // State updates for game state store
  stateUpdates: {
    configLoaded: any;
    initializationComplete: any;
  };
}

// Visual Effects Configuration - Migrated from ConfigurationService.ts
export interface VisualEffectsConfig {
  particles: {
    count: number;
    minSize: number;
    maxSize: number;
    speed: number; // base speed magnitude
    drift: number; // directional drift factor
  };
  bloom: {
    intensity: number; // overall additive blending multiplier
    pulseSpeed: number; // seconds per bloom pulse cycle
  };
  gradients: {
    cycleDuration: number; // seconds for full gradient cycle
    layers: string[]; // CSS gradient definitions
  };
  noise: {
    enabled: boolean;
    opacity: number; // overlay opacity
    scale: number; // noise pattern scale
    speed: number; // animation speed
  };
  palette: string[]; // Qualia color palette
  aura: {
    rings: number; // number of concentric reactive rings
    rotationSpeed: number; // seconds per full rotation
    pulseDuration: number; // seconds per pulse
  };
}