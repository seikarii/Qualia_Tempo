/**
 * QUALIA.CODE v1.1 - ApplicationInitializerService
 * Orchestrates the application initialization sequence.
 */

/**
 * QUALIA.CODE v2.0 - ApplicationInitializerService
 * Orchestrates the application initialization sequence with AUTOMATED service lifecycle management.
 * 
 * ARCHITECTURAL UPGRADE: Eliminates manual service lists using InversifyJS multi-injection.
 * Services implementing IBaseService are automatically discovered and managed.
 */

import { injectable, inject, multiInject } from "inversify";
import { TYPES } from "./inversify.types";
import type { IBackendSyncService } from "./interfaces/IBackendSyncService";
import type { IGameStateStoreService } from "./interfaces/IGameStateStoreService";
import type { IRhythmicMovementController } from "./interfaces/IRhythmicMovementController";
import type { INotificationService } from "./interfaces/INotificationService";
import type { IErrorReportingService } from "./interfaces/IErrorReportingService";
import type { IDebugService } from "./interfaces/IDebugService";
import type { IStateStreamingService } from "./interfaces/IStateStreamingService";
import type { ILogger } from "./interfaces/ILogger";
import type { IApplicationInitializerService } from "./interfaces/IApplicationInitializerService";
import type { AppInitializerConfig } from "./contracts/IApplicationInitializerService.contracts";
import type { ApplicationInitializerServiceParams } from "./contracts/IApplicationInitializerService.contracts";
import type { IEventBus } from "./interfaces/IEventBus";
import { logMethod, catchError, IBaseService, initializeEventSubscriptions, cleanupEventSubscriptions } from "../utils/decorators";

@injectable()
export class ApplicationInitializerService
  implements IApplicationInitializerService
{
  // QUALIA.CODE v2.0: Hybrid Injection Pattern
  // Infrastructure services
  private readonly config: AppInitializerConfig;
  private readonly logger: ILogger;
  private readonly eventBus: IEventBus;

  // Orchestration services - explicit sequencing required
  private readonly gameStateStoreService: IGameStateStoreService;
  private readonly backendSyncService: IBackendSyncService;
  private readonly rhythmicMovementController: IRhythmicMovementController;
  private readonly errorReportingService: IErrorReportingService;
  private readonly debugService: IDebugService;
  private readonly notificationService: INotificationService;
  private readonly stateStreamingService: IStateStreamingService;

  // QUALIA.CODE v2.0: AUTOMATED SERVICE DISCOVERY
  // All services implementing IBaseService are automatically injected here
  // No manual list maintenance required - InversifyJS multi-injection handles it
  private readonly managedServices: IBaseService[];

  private isStarted = false;

  constructor(
    @inject(TYPES.ApplicationInitializerServiceParams) params: ApplicationInitializerServiceParams,
    @multiInject(TYPES.ManagedService) managedServices: IBaseService[]
  ) {
    // QUALIA.CODE v2.0: Hybrid dependency injection
    // Infrastructure services
    this.config = params.config;
    this.logger = params.logger;
    this.eventBus = params.eventBus;
    
    // Orchestration services - explicit sequencing
    this.gameStateStoreService = params.gameStateStoreService;
    this.backendSyncService = params.backendSyncService;
    this.rhythmicMovementController = params.rhythmicMovementController;
    this.errorReportingService = params.errorReportingService;
    this.debugService = params.debugService;
    this.notificationService = params.notificationService;
    this.stateStreamingService = params.stateStreamingService;
    
    // QUALIA.CODE v2.0: AUTOMATED SERVICE DISCOVERY
    // All managed services are automatically discovered via multi-injection
    this.managedServices = managedServices;
    
    // Configuration is injected and available immediately
    this.logger.info(this.config.messages.serviceConstructed);
    this.logger.info(`🤖 Automatically discovered ${managedServices.length} managed services via IoC multi-injection`);
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
      this.logger.error(this.config.messages.initializationFailed, error as Record<string, unknown>);
      throw error;
    }
  }

  // @catchError-exempt: Private method called from start() which has try-catch
  private async initializeServices(): Promise<void> {
    // Configuration is already loaded by ApplicationCompositionRoot.configureServices()
    this.logger.info(this.config.messages.configurationLoaded);

    await this.startCoreServices();
    await this.startGameServices();
    await this.startBackendServices();
  }

  // @catchError-exempt: Private method called from initializeServices which is wrapped in start()'s try-catch
  private async startCoreServices(): Promise<void> {
    // Step 0: Initialize EventBus - fundamental dependency for all services
    this.logger.debug("Initializing EventBus with status monitoring");
    this.eventBus.initialize();

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

    // Step 4: QUALIA.CODE v2.0 - Initialize ALL managed services with @OnEvent lifecycle
    // This is now fully automated via multi-injection - no manual list maintenance
    this.initializeManagedServices();

    // Step 5: Start state streaming service (needs EventBus to be available)
    await this.stateStreamingService.start();
    this.logger.info("State streaming service started");
  }

  /**
   * QUALIA.CODE v2.0: AUTOMATED SERVICE LIFECYCLE INITIALIZATION
   * 
   * This method replaces the manual service list with automatic discovery.
   * All services implementing IBaseService are automatically injected and initialized.
   * 
   * ARCHITECTURAL BENEFITS:
   * - Zero manual maintenance: Add a service, bind it to ManagedService, done.
   * - No risk of forgetting to add services to initialization lists
   * - Scales infinitely without code changes
   * - Single Responsibility: Only manages lifecycle, doesn't know specific services
   */
  private initializeManagedServices(): void {
    this.logger.debug(`🤖 Initializing ${this.managedServices.length} auto-discovered managed services...`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const service of this.managedServices) {
      try {
        // Initialize @OnEvent subscriptions
        initializeEventSubscriptions(service);
        
        // Call service initialize method
        service.initialize();
        
        this.logger.debug(`✅ Initialized: ${service.constructor.name}`);
        successCount++;
      } catch (error) {
        this.logger.error(`❌ Failed to initialize: ${service.constructor.name}`, { error });
        failureCount++;
      }
    }

    this.logger.info(
      `🚀 Service initialization complete: ${successCount} succeeded, ${failureCount} failed (${this.managedServices.length} total)`
    );
    
    if (failureCount > 0) {
      throw new Error(`Failed to initialize ${failureCount} managed service(s). Check logs for details.`);
    }
  }

  // @catchError-exempt: Private method called from initializeServices which is wrapped in start()'s try-catch
  private async startGameServices(): Promise<void> {
    // Step 6: Start rhythmic movement controller
    this.logger.debug(this.config.steps.startRhythmicController);
    this.rhythmicMovementController.start();
    this.logger.info(this.config.messages.rhythmicControllerStarted);
  }

  // @catchError-exempt: Private method called from initializeServices which is wrapped in start()'s try-catch
  private async startBackendServices(): Promise<void> {
    // Step 7: Start backend synchronization
    this.logger.debug(this.config.steps.startBackendSync);
    await this.backendSyncService.start();

    // Step 8: Update backend connection status
    const isConnected = this.backendSyncService.isBackendConnected();
    this.gameStateStoreService.updateGameState({
      backendConnected: isConnected,
    });
  }

  /**
   * QUALIA.CODE v2.0: AUTOMATED SERVICE LIFECYCLE CLEANUP
   * 
   * Cleanup is now fully automated using the same multi-injected service array.
   * All services are cleaned up in reverse order for dependency safety.
   * @async-exempt: Cleanup must be synchronous for lifecycle management. Simple loop, not heavy computation.
   */
  @logMethod
  @catchError
  public cleanup(): void {
    this.logger.info('🧹 Starting application cleanup...');

    let successCount = 0;
    let failureCount = 0;
    
    // Cleanup in reverse order to respect dependencies
    const servicesReversed = [...this.managedServices].reverse();
    
    for (const service of servicesReversed) {
      try {
        // Cleanup @OnEvent subscriptions
        cleanupEventSubscriptions(service);
        
        // Call service cleanup method
        service.cleanup();
        
        this.logger.debug(`✅ Cleaned up: ${service.constructor.name}`);
        successCount++;
      } catch (error) {
        this.logger.error(`❌ Failed to cleanup: ${service.constructor.name}`, { error });
        failureCount++;
      }
    }

    this.logger.info(
      `🧹 Service cleanup complete: ${successCount} succeeded, ${failureCount} failed (${this.managedServices.length} total)`
    );
    
    // Cleanup EventBus
    try {
      this.eventBus.cleanup();
      this.logger.debug('✅ Cleaned up EventBus');
    } catch (error) {
      this.logger.error('❌ Failed to cleanup EventBus', { error });
    }
    
    this.isStarted = false;
  }
}
