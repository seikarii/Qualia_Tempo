/**
 * QUALIA.CODE v2.0 - IApplicationInitializerService Contracts
 * Single Source of Truth for ApplicationInitializerService data structures.
 * 
 * ARCHITECTURAL EVOLUTION: Hybrid Injection Pattern
 * - Infrastructure Services: Logger, EventBus, Config
 * - Orchestration Services: Services requiring explicit sequencing
 * - Managed Services: Auto-discovered IBaseService implementers (via multi-injection)
 */

import type { ILogger } from "../interfaces/ILogger";
import type { IEventBus } from "../interfaces/IEventBus";
import type { IGameStateStoreService } from "../interfaces/IGameStateStoreService";
import type { IBackendSyncService } from "../interfaces/IBackendSyncService";
import type { IRhythmicMovementController } from "../interfaces/IRhythmicMovementController";
import type { IErrorReportingService } from "../interfaces/IErrorReportingService";
import type { IDebugService } from "../interfaces/IDebugService";
import type { INotificationService } from "../interfaces/INotificationService";
import type { IStateStreamingService } from "../interfaces/IStateStreamingService";

/**
 * QUALIA.CODE v2.0: Hybrid Injection Pattern
 * Parameter object for ApplicationInitializerService constructor
 * 
 * ARCHITECTURAL PRINCIPLE: Separation of Concerns
 * - Infrastructure Services: Logger, EventBus, Config (always needed)
 * - Orchestration Services: Services that require explicit sequencing, specific method calls,
 *   or complex initialization logic beyond simple `initialize()`
 * - Managed Services: Services implementing IBaseService are auto-discovered via multi-injection
 *   for @OnEvent lifecycle management
 * 
 * This interface contains services that ApplicationInitializerService explicitly orchestrates
 * in a specific sequence with specific method calls.
 */
export interface ApplicationInitializerServiceParams {
  config: AppInitializerConfig;
  logger: ILogger;
  eventBus: IEventBus;
  // Orchestration services - explicit sequencing required
  gameStateStoreService: IGameStateStoreService;
  backendSyncService: IBackendSyncService;
  rhythmicMovementController: IRhythmicMovementController;
  errorReportingService: IErrorReportingService;
  debugService: IDebugService;
  notificationService: INotificationService;
  stateStreamingService: IStateStreamingService;
}

// Specific state update interfaces for type safety
export interface ConfigLoadedStateUpdate {
  isConfigLoaded: boolean;
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