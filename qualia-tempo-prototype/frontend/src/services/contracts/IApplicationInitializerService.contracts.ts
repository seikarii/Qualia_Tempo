/**
 * QUALIA.CODE v1.1 - IApplicationInitializerService Contracts
 * Single Source of Truth for ApplicationInitializerService data structures.
 * This file is manually maintained for ApplicationInitializerService-specific contracts.
 */

// ApplicationInitializer Configuration - Migrated from ConfigurationService.ts
export interface AppInitializerConfig {
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  maxInitRetries: number;
  initTimeout: number;
  enableDebugLogging: boolean;

  // Message templates for logging
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

  // Step descriptions for debug logging
  steps: {
    configureHttpService: string;
    startGameStateService: string;
    startTransversalServices: string;
    startGameController: string;
    startRhythmicController: string;
    startBackendSync: string;
  };

  // State updates for store
  stateUpdates: {
    configLoaded: any;
    initializationComplete: any;
  };
}