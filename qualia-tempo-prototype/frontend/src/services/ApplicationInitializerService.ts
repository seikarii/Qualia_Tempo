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
import type { ILogger } from "./interfaces/ILogger";
import type { IApplicationInitializerService } from "./interfaces/IApplicationInitializerService";
import { logMethod, catchError } from "../utils/decorators";

@injectable()
export class ApplicationInitializerService
  implements IApplicationInitializerService
{
  private readonly configService: IConfigurationService;
  private readonly httpService: IHttpService;
  private readonly backendSyncService: IBackendSyncService;
  private readonly gameStateStoreService: IGameStateStoreService;
  private readonly gameControllerService: IGameControllerService;
  private readonly rhythmicMovementController: IRhythmicMovementController;
  private readonly notificationService: INotificationService;
  private readonly errorReportingService: IErrorReportingService;
  private readonly debugService: IDebugService;
  private readonly logger: ILogger;
  private isStarted = false;

  constructor(
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
    @inject(TYPES.ILogger) logger: ILogger,
  ) {
    this.configService = configService;
    this.httpService = httpService;
    this.backendSyncService = backendSyncService;
    this.gameStateStoreService = gameStateStoreService;
    this.gameControllerService = gameControllerService;
    this.rhythmicMovementController = rhythmicMovementController;
    this.notificationService = notificationService;
    this.errorReportingService = errorReportingService;
    this.debugService = debugService;
    this.logger = logger;
    
    // Configuration will be accessed in start() method after it's loaded
    this.logger.info("ApplicationInitializerService constructed - awaiting start()");
  }

  @logMethod
  @catchError
  public async start(): Promise<void> {
    const config = this.configService.getConfigSection<any>("application-initializer");
    
    if (this.isStarted) {
      this.logger.warn(config.messages.alreadyRunning);
      return;
    }

    this.logger.info(config.messages.initializationStarted);

    try {
      // Step 0: Load configuration FIRST - Services need config to start properly
      this.logger.debug(config.steps.loadConfiguration);
      await this.configService.loadConfig();
      this.logger.info(config.messages.configurationLoaded);

      // Step 0.5: Configure HttpService with loaded configuration (breaks circular dependency)
      this.logger.debug(config.steps.configureHttpService);
      const httpConfig = this.configService.getHttpConfig();
      this.httpService.updateConfig(httpConfig.defaultTimeout);
      this.logger.info(config.messages.httpServiceConfigured);

      // Step 1: Start GameStateStoreService - it must listen to all events
      this.logger.debug(config.steps.startGameStateService);
      this.gameStateStoreService.start();
      this.logger.info(config.messages.gameStateServiceStarted);

      // Step 2: Update store with config loaded state
      this.gameStateStoreService.updateGameState(config.stateUpdates.configLoaded);

      // Step 3: Start transversal services (now that config is loaded)
      this.logger.debug(config.steps.startTransversalServices);
      this.errorReportingService.start();
      this.debugService.start();
      this.notificationService.start();
      this.logger.info(config.messages.transversalServicesStarted);

      // Step 4: Start game controller service
      this.logger.debug(config.steps.startGameController);
      this.gameControllerService.start();
      this.logger.info(config.messages.gameControllerStarted);

      // Step 5: Start rhythmic movement controller
      this.logger.debug(config.steps.startRhythmicController);
      this.rhythmicMovementController.start();
      this.logger.info(config.messages.rhythmicControllerStarted);

      // Step 6: Start backend synchronization
      this.logger.debug(config.steps.startBackendSync);
      await this.backendSyncService.start();

      // Step 7: Update backend connection status
      const isConnected = this.backendSyncService.isBackendConnected();
      this.gameStateStoreService.updateGameState({
        backendConnected: isConnected,
      });

      this.isStarted = true;
      this.logger.info(config.messages.initializationCompleted, {
        ...config.stateUpdates.initializationComplete,
        backendConnected: isConnected,
      });
    } catch (error) {
      this.logger.error(config.messages.initializationFailed, error);
      throw error;
    }
  }
}
