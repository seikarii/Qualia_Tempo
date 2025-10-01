/**
 * QUALIA.CODE v1.1 - ApplicationInitializerService
 * Orchestrates the application initialization sequence.
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { IBackendSyncService } from "./interfaces/IBackendSyncService";
import type { IGameStateStoreService } from "./interfaces/IGameStateStoreService";
import type { IGameControllerService } from "./interfaces/IGameControllerService";
import type { IRhythmicMovementController } from "./interfaces/IRhythmicMovementController";
import type { INotificationService } from "./interfaces/INotificationService";
import type { IErrorReportingService } from "./interfaces/IErrorReportingService";
import type { IDebugService } from "./interfaces/IDebugService";
import type { IStateStreamingService } from "./interfaces/IStateStreamingService";
import type { ILogger } from "./interfaces/ILogger";
import type { IApplicationInitializerService } from "./interfaces/IApplicationInitializerService";
import type { AppInitializerConfig } from "./contracts/IApplicationInitializerService.contracts";
import type { ApplicationInitializerServiceParams } from "./contracts/IApplicationInitializerService.contracts";
import type { IGameplayMechanicsService } from "./interfaces/IGameplayMechanicsService";
import type { IViewLogicService } from "./interfaces/IViewLogicService";
import type { ISubtitleService } from "./interfaces/ISubtitleService";
import type { IDebugOrchestratorService } from "./interfaces/IDebugOrchestratorService";
import { logMethod, catchError, IBaseService, initializeEventSubscriptions, cleanupEventSubscriptions } from "../utils/decorators";

// QUALIA.CODE: Module-level constant for pre-config initialization message
const SERVICE_INIT_MESSAGE = "ApplicationInitializerService constructed - awaiting start()";

@injectable()
export class ApplicationInitializerService
  implements IApplicationInitializerService
{
  private readonly config: AppInitializerConfig;
  private readonly backendSyncService: IBackendSyncService;
  private readonly gameStateStoreService: IGameStateStoreService;
  private readonly gameControllerService: IGameControllerService;
  private readonly rhythmicMovementController: IRhythmicMovementController;
  private readonly notificationService: INotificationService;
  private readonly errorReportingService: IErrorReportingService;
  private readonly debugService: IDebugService;
  private readonly stateStreamingService: IStateStreamingService;
  private readonly logger: ILogger;

  // QUALIA.CODE v1.1: New Services with @OnEvent lifecycle
  private readonly gameplayMechanicsService: IGameplayMechanicsService;
  private readonly viewLogicService: IViewLogicService;
  private readonly subtitleService: ISubtitleService;
  private readonly debugOrchestratorService: IDebugOrchestratorService;

  private isStarted = false;
  private readonly managedServices: IBaseService[] = [];

  constructor(
    @inject(TYPES.ApplicationInitializerServiceParams) params: ApplicationInitializerServiceParams,
  ) {
    this.config = params.config;
    this.backendSyncService = params.backendSyncService;
    this.gameStateStoreService = params.gameStateStoreService;
    this.gameControllerService = params.gameControllerService;
    this.rhythmicMovementController = params.rhythmicMovementController;
    this.notificationService = params.notificationService;
    this.errorReportingService = params.errorReportingService;
    this.debugService = params.debugService;
    this.stateStreamingService = params.stateStreamingService;
    this.logger = params.logger;
    
    // QUALIA.CODE v1.1: Initialize new services
    this.gameplayMechanicsService = params.gameplayMechanicsService;
    this.viewLogicService = params.viewLogicService;
    this.subtitleService = params.subtitleService;
    this.debugOrchestratorService = params.debugOrchestratorService;
    
    // Configuration will be accessed in start() method after it's loaded
    // Note: Using pre-loaded constant since ConfigService may not be ready yet
    this.logger.info(SERVICE_INIT_MESSAGE);
  }

  @logMethod
  @catchError
  public async start(): Promise<void> {
    if (this.isStarted) {
      this.logger.warn(this.config.messages.alreadyRunning);
      return;
    }

    this.logger.info(this.config.messages.initializationStarted);

    try {
      await this.initializeServices();
      this.isStarted = true;
      this.logger.info(this.config.messages.initializationComplete, {
        ...this.config.stateUpdates.initializationComplete,
        backendConnected: this.backendSyncService.isBackendConnected(),
      });
    } catch (error) {
      this.logger.error(this.config.messages.initializationFailed, error);
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    // Configuration is already loaded by ApplicationCompositionRoot.configureServices()
    this.logger.info(this.config.messages.configurationLoaded);

    await this.startCoreServices();
    await this.startGameServices();
    await this.startBackendServices();
  }

  private async startCoreServices(): Promise<void> {
    // Step 1: Start GameStateStoreService - it must listen to all events
    this.logger.debug(this.config.steps.startGameStateService);
    this.gameStateStoreService.initialize();
    this.logger.info(this.config.messages.gameStateServiceStarted);

    // Step 2: Update store with config loaded state
    this.gameStateStoreService.updateGameState(this.config.stateUpdates.configLoaded);

    // Step 3: Start transversal services (now that config is loaded)
    this.logger.debug(this.config.steps.startTransversalServices);
    this.errorReportingService.start();
    this.debugService.start();
    this.notificationService.start();
    this.logger.info(this.config.messages.transversalServicesStarted);

    // Step 4: QUALIA.CODE v1.1 - Initialize new services with @OnEvent lifecycle
    this.initializeNewServices();

    // Step 5: Start state streaming service (needs EventBus to be available)
    await this.stateStreamingService.start();
    this.logger.info("State streaming service started");
  }

  private initializeNewServices(): void {
    this.logger.debug('Initializing QUALIA.CODE v1.1 services with @OnEvent lifecycle...');
    
    // Initialize services that implement IBaseService with @OnEvent decorators
    const newServices = [
      this.gameplayMechanicsService,
      this.viewLogicService,
      this.subtitleService,
      this.debugOrchestratorService
    ];

    newServices.forEach(service => {
      if (this.implementsIBaseService(service)) {
        // Initialize @OnEvent subscriptions
        initializeEventSubscriptions(service);
        
        // Call service initialize method
        service.initialize();
        
        // Track for cleanup
        this.managedServices.push(service);
        
        this.logger.debug(`✅ Initialized service: ${service.constructor.name}`);
      }
    });

    this.logger.info(`🚀 Initialized ${this.managedServices.length} QUALIA.CODE v1.1 services`);
  }

  private implementsIBaseService(service: any): service is IBaseService {
    return service && 
           typeof service.initialize === 'function' && 
           typeof service.cleanup === 'function';
  }

  private async startGameServices(): Promise<void> {
    // Step 5: Start game controller service
    this.logger.debug(this.config.steps.startGameController);
    this.gameControllerService.start();
    this.logger.info(this.config.messages.gameControllerStarted);

    // Step 5: Start rhythmic movement controller
    this.logger.debug(this.config.steps.startRhythmicController);
    this.rhythmicMovementController.start();
    this.logger.info(this.config.messages.rhythmicControllerStarted);
  }

  private async startBackendServices(): Promise<void> {
    // Step 6: Start backend synchronization
    this.logger.debug(this.config.steps.startBackendSync);
    await this.backendSyncService.start();

    // Step 7: Update backend connection status
    const isConnected = this.backendSyncService.isBackendConnected();
    this.gameStateStoreService.updateGameState({
      backendConnected: isConnected,
    });
  }

  @logMethod
  @catchError
  public cleanup(): void {
    this.logger.info('🧹 Starting application cleanup...');

    // Cleanup all managed services with @OnEvent decorators
    this.managedServices.forEach(service => {
      try {
        // Cleanup @OnEvent subscriptions
        cleanupEventSubscriptions(service);
        
        // Call service cleanup method
        service.cleanup();
        
        this.logger.debug(`✅ Cleaned up service: ${service.constructor.name}`);
      } catch (error) {
        this.logger.error(`❌ Failed to cleanup service: ${service.constructor.name}`, { error });
      }
    });

    this.logger.info(`🧹 Cleaned up ${this.managedServices.length} managed services`);
    this.isStarted = false;
  }
}
