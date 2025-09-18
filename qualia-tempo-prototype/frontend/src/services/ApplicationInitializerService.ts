/**
 * QUALIA.CODE v1.1 - ApplicationInitializerService
 * Orchestrates the application initialization sequence.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IConfigurationService } from './interfaces/IConfigurationService';
import type { IBackendSyncService } from './interfaces/IBackendSyncService';
import type { IGameStateStoreService } from './interfaces/IGameStateStoreService';
import type { ILogger } from './interfaces/ILogger';
import type { IApplicationInitializerService } from './interfaces/IApplicationInitializerService';
import { logMethod, catchError } from '../utils/decorators';

@injectable()
export class ApplicationInitializerService implements IApplicationInitializerService {
  private readonly configService: IConfigurationService;
  private readonly backendSyncService: IBackendSyncService;
  private readonly gameStateStoreService: IGameStateStoreService;
  private readonly logger: ILogger;

  constructor(
    @inject(TYPES.IConfigurationService) configService: IConfigurationService,
    @inject(TYPES.IBackendSyncService) backendSyncService: IBackendSyncService,
    @inject(TYPES.IGameStateStoreService) gameStateStoreService: IGameStateStoreService,
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.configService = configService;
    this.backendSyncService = backendSyncService;
    this.gameStateStoreService = gameStateStoreService;
    this.logger = logger;
    this.logger.info('ApplicationInitializerService initialized');
  }

  @logMethod()
  @catchError()
  public async start(): Promise<void> {
    this.logger.info('Starting application initialization sequence');

    try {
      // Step 1: Load configuration
      this.logger.debug('Loading application configuration');
      await this.configService.loadConfig();
      
      // Step 2: Update store with config loaded state
      this.gameStateStoreService.updateGameState({ isConfigLoaded: true });
      this.logger.info('Configuration loaded successfully');

      // Step 3: Start backend synchronization
      this.logger.debug('Starting backend synchronization');
      await this.backendSyncService.start();
      
      // Step 4: Update backend connection status
      const isConnected = this.backendSyncService.isBackendConnected();
      this.gameStateStoreService.updateGameState({ backendConnected: isConnected });
      
      this.logger.info('Application initialization completed successfully', {
        configLoaded: true,
        backendConnected: isConnected
      });

    } catch (error) {
      this.logger.error('Application initialization failed', error);
      throw error;
    }
  }
}
