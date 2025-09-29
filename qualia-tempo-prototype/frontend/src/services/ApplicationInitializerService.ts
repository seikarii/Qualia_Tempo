/**
 * QUALIA.CODE v1.1 - ApplicationInitializerService
 * Orchestrates the application initialization sequence.
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { IConfigurationService } from "./interfaces/IConfigurationService";
import type { IHttpService } from "./interfaces/IHttpService";
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
import { logMethod, catchError } from "../utils/decorators";

// QUALIA.CODE: Module-level constant for pre-config initialization message
const SERVICE_INIT_MESSAGE = "ApplicationInitializerService constructed - awaiting start()";

@injectable()
export class ApplicationInitializerService
  implements IApplicationInitializerService
{
  private readonly config: AppInitializerConfig;
  private readonly configService: IConfigurationService;
  private readonly httpService: IHttpService;
  private readonly backendSyncService: IBackendSyncService;
  private readonly gameStateStoreService: IGameStateStoreService;
  private readonly gameControllerService: IGameControllerService;
  private readonly rhythmicMovementController: IRhythmicMovementController;
  private readonly notificationService: INotificationService;
  private readonly errorReportingService: IErrorReportingService;
  private readonly debugService: IDebugService;
  private readonly stateStreamingService: IStateStreamingService;
  private readonly logger: ILogger;
  private isStarted = false;

  constructor(
    @inject(TYPES.AppInitializerConfig) config: AppInitializerConfig,
    @inject(TYPES.IConfigurationService) configService: IConfigurationService,
    @inject(TYPES.IHttpService) httpService: IHttpService,
    @inject(TYPES.IBackendSyncService) backendSyncService: IBackendSyncService,
    @inject(TYPES.IGameStateStoreService)
    gameStateStoreService: IGameStateStoreService,
    @inject(TYPES.IGameControllerService)
    gameControllerService: IGameControllerService,
    @inject(TYPES.IRhythmicMovementController)
    rhythmicMovementController: IRhythmicMovementController,
    @inject(TYPES.INotificationService)
    notificationService: INotificationService,
    @inject(TYPES.IErrorReportingService)
    errorReportingService: IErrorReportingService,
    @inject(TYPES.IDebugService) debugService: IDebugService,
    @inject(TYPES.IStateStreamingService) stateStreamingService: IStateStreamingService,
    @inject(TYPES.ILogger) logger: ILogger,
  ) {
    this.config = config;
    this.configService = configService;
    this.httpService = httpService;
    this.backendSyncService = backendSyncService;
    this.gameStateStoreService = gameStateStoreService;
    this.gameControllerService = gameControllerService;
    this.rhythmicMovementController = rhythmicMovementController;
    this.notificationService = notificationService;
    this.errorReportingService = errorReportingService;
    this.debugService = debugService;
    this.stateStreamingService = stateStreamingService;
    this.logger = logger;
    
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
      // Configuration is already loaded by ApplicationCompositionRoot.configureServices()
      // No need to reload it here - this was causing duplicate container bindings
      this.logger.info(this.config.messages.configurationLoaded);

      // Step 0.5: Configure HttpService with loaded configuration (breaks circular dependency)
      this.logger.debug(this.config.steps.configureHttpService);
      const httpConfig = this.configService.getConfigSection("http");
      this.httpService.updateConfig(httpConfig.timeout);
      this.logger.info(this.config.messages.httpServiceConfigured);

      // Step 1: Start GameStateStoreService - it must listen to all events
      this.logger.debug(this.config.steps.startGameStateService);
      this.gameStateStoreService.start();
      this.logger.info(this.config.messages.gameStateServiceStarted);

      // Step 2: Update store with config loaded state
      this.gameStateStoreService.updateGameState(this.config.stateUpdates.configLoaded);

      // Step 3: Start transversal services (now that config is loaded)
      this.logger.debug(this.config.steps.startTransversalServices);
      this.errorReportingService.start();
      this.debugService.start();
      this.notificationService.start();
      this.logger.info(this.config.messages.transversalServicesStarted);

      // Step 4: Start state streaming service (needs EventBus to be available)
      await this.stateStreamingService.start();
      this.logger.info("State streaming service started");

      // Step 5: Start game controller service
      this.logger.debug(this.config.steps.startGameController);
      this.gameControllerService.start();
      this.logger.info(this.config.messages.gameControllerStarted);

      // Step 5: Start rhythmic movement controller
      this.logger.debug(this.config.steps.startRhythmicController);
      this.rhythmicMovementController.start();
      this.logger.info(this.config.messages.rhythmicControllerStarted);

      // Step 6: Start backend synchronization
      this.logger.debug(this.config.steps.startBackendSync);
      await this.backendSyncService.start();

      // Step 7: Update backend connection status
      const isConnected = this.backendSyncService.isBackendConnected();
      this.gameStateStoreService.updateGameState({
        backendConnected: isConnected,
      });

      this.isStarted = true;
      this.logger.info(this.config.messages.initializationCompleted, {
        ...this.config.stateUpdates.initializationComplete,
        backendConnected: isConnected,
      });
    } catch (error) {
      this.logger.error(this.config.messages.initializationFailed, error);
      throw error;
    }
  }
}
