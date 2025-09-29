/**
 * QUALIA.CODE v1.1 - IApplicationInitializerService Contracts
 * Single Source of Truth for ApplicationInitializerService data structures.
 * This file is manually maintained for ApplicationInitializerService-specific contracts.
 */

// Specific state update interfaces for type safety
export interface ConfigLoadedStateUpdate {
  configurationLoaded: boolean;
  lastConfigLoadTime: number | null;
}

export interface InitializationCompleteStateUpdate {
  initializationComplete: boolean;
  timestamp: number | null;
  duration: number | null;
  servicesStarted: string[];
}

// ApplicationInitializer Configuration - Migrated from ConfigurationService.ts
export interface AppInitializerConfig {
  // Message templates for logging
  messages: {
    serviceConstructed: string;
    serviceInitialized: string;
    alreadyRunning: string;
    initializationStarted: string;
    configurationLoaded: string;
    httpServiceConfigured: string;
    gameStateServiceStarted: string;
    transversalServicesStarted: string;
    gameControllerStarted: string;
    rhythmicControllerStarted: string;
    backendSyncStarted: string;
    initializationComplete: string;
    initializationFailed: string;
  };

  // Step descriptions for debug logging
  steps: {
    loadConfiguration: string;
    configureHttpService: string;
    startGameStateService: string;
    startTransversalServices: string;
    startGameController: string;
    startRhythmicController: string;
    startBackendSync: string;
  };

  // State updates for store - now type-safe
  stateUpdates: {
    configLoaded: ConfigLoadedStateUpdate;
    initializationComplete: InitializationCompleteStateUpdate;
  };

  // Error messages
  errors: {
    configurationLoadFailed: string;
    serviceStartFailed: string;
    initializationFailed: string;
  };

  // Timing configuration
  timing: {
    maxInitializationTime: number;
    serviceStartupDelay: number;
    healthCheckDelay: number;
  };

  // Feature flags
  features: {
    enableDetailedLogging: boolean;
    enablePerformanceMonitoring: boolean;
    enableHealthChecks: boolean;
    enableErrorReporting: boolean;
  };
}