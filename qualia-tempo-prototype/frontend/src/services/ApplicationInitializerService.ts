/**
 * QUALIA.CODE v1.1 - ApplicationInitializerService
 * Orchestrates the application initialization sequence.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IConfigurationService } from './interfaces/IConfigurationService';
import type { IBackendSyncService } from './interfaces/IBackendSyncService';
import type { IGameStateStoreService } from './interfaces/IGameStateStoreService';
import type { IGameControllerService } from './interfaces/IGameControllerService';
import type { IRhythmicMovementController } from './interfaces/IRhythmicMovementController';
import type { INotificationService } from './interfaces/INotificationService';
import type { IErrorReportingService } from './interfaces/IErrorReportingService';
import type { IDebugService } from './interfaces/IDebugService';
import type { ILogger } from './interfaces/ILogger';
import type { IApplicationInitializerService } from './interfaces/IApplicationInitializerService';
import { logMethod, catchError } from '../utils/decorators';

@injectable()
export class ApplicationInitializerService implements IApplicationInitializerService {
  private readonly configService: IConfigurationService;
  private readonly backendSyncService: IBackendSyncService;
  private readonly gameStateStoreService: IGameStateStoreService;
  private readonly gameControllerService: IGameControllerService;
  private readonly rhythmicMovementController: IRhythmicMovementController;
  private readonly notificationService: INotificationService;
  private readonly errorReportingService: IErrorReportingService;
  private readonly debugService: IDebugService;
  private readonly logger: ILogger;

  constructor(
    @inject(TYPES.IConfigurationService) configService: IConfigurationService,
    @inject(TYPES.IBackendSyncService) backendSyncService: IBackendSyncService,
    @inject(TYPES.IGameStateStoreService) gameStateStoreService: IGameStateStoreService,
    @inject(TYPES.IGameControllerService) gameControllerService: IGameControllerService,
    @inject(TYPES.IRhythmicMovementController) rhythmicMovementController: IRhythmicMovementController,
    @inject(TYPES.INotificationService) notificationService: INotificationService,
    @inject(TYPES.IErrorReportingService) errorReportingService: IErrorReportingService,
    @inject(TYPES.IDebugService) debugService: IDebugService,
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.configService = configService;
    this.backendSyncService = backendSyncService;
    this.gameStateStoreService = gameStateStoreService;
    this.gameControllerService = gameControllerService;
    this.rhythmicMovementController = rhythmicMovementController;
    this.notificationService = notificationService;
    this.errorReportingService = errorReportingService;
    this.debugService = debugService;
    this.logger = logger;
    this.logger.info('ApplicationInitializerService initialized with all core services');
  }

  @logMethod()
  @catchError()
  public async start(): Promise<void> {
    this.logger.info('Starting application initialization sequence');

    try {
      // Step 0: Start transversal services FIRST
      this.logger.debug('Starting transversal services');
      this.errorReportingService.start();
      this.debugService.start();
      this.notificationService.start();
      this.logger.info('Transversal services started successfully');

      // Step 1: Start GameStateStoreService - it must listen to all events
      this.logger.debug('Starting GameStateStoreService');
      this.gameStateStoreService.start();
      this.logger.info('GameStateStoreService started - now listening to events');

      // Step 2: Load configuration
      this.logger.debug('Loading application configuration');
      await this.configService.loadConfig();
      
      // Step 3: Update store with config loaded state
      this.gameStateStoreService.updateGameState({ isConfigLoaded: true });
      this.logger.info('Configuration loaded successfully');

      // Step 4: Start game controller service
      this.logger.debug('Starting game controller service');
      this.gameControllerService.start();
      this.logger.info('Game controller service started successfully');

      // Step 5: Start rhythmic movement controller
      this.logger.debug('Starting rhythmic movement controller');
      this.rhythmicMovementController.start();
      this.logger.info('Rhythmic movement controller started successfully');

      // Step 6: Start backend synchronization
      this.logger.debug('Starting backend synchronization');
      await this.backendSyncService.start();
      
      // Step 7: Update backend connection status
      const isConnected = this.backendSyncService.isBackendConnected();
      this.gameStateStoreService.updateGameState({ backendConnected: isConnected });
      
      this.logger.info('Application initialization completed successfully', {
        configLoaded: true,
        backendConnected: isConnected,
        allServicesStarted: true
      });

    } catch (error) {
      this.logger.error('Application initialization failed', error);
      throw error;
    }
  }
}
