/**
 * QUALIA.CODE v1.0 - Frontend CompositionRoot (Core Logic)
 * Central IoC container for frontend service initialization and dependency injection.
 *
 * ARCHITECTURAL INNOVATION: No Race Conditions
 * - Configuration is loaded BEFORE CompositionRoot instantiation
 * - All services receive their configuration in constructor (PURE DI)
 * - No async configuration loading during service creation
 * - Eliminates the race condition that plagued the previous implementation
 */

import { EventBus } from "./EventBus";
import { QualiaStateCalculatorService } from "./QualiaStateCalculatorService";
import { BackendSyncService } from "./BackendSyncService";
import { ErrorReportingService } from "./ErrorReportingService";
import { DebugService } from "./DebugService";
import { GameControllerService } from "./GameControllerService";
import { GameStateStoreService } from "./GameStateStoreService";
import { ConfigurationService, QualiaCalculatorConfig, BackendSyncConfig, ErrorReportingConfig, AudioServiceConfig, RhythmicMovementConfig, NotificationServiceConfig } from "./ConfigurationService";
import { AudioService } from "./AudioService";
import { RhythmicMovementController } from "./RhythmicMovementController";
import { NotificationService } from "./NotificationService";
import { QualiaLogger, LogLevel, LoggerProvider } from "./Logger";
import { useGameStore } from "../state/useGameStore";

// Service container interface
export interface ServiceContainer {
  eventBus: EventBus;
  qualiaCalculator: QualiaStateCalculatorService;
  backendSync: BackendSyncService;
  errorReporting: ErrorReportingService;
  debugService: DebugService;
  gameController: GameControllerService;
  gameStateStore: GameStateStoreService;
  configService: ConfigurationService;
  audioService: AudioService;
  rhythmicMovement: RhythmicMovementController;
  notificationService: NotificationService;
  logger: QualiaLogger;
}

// Service status tracking
export interface ServiceStatus {
  eventBus: "initializing" | "running" | "stopped" | "error";
  qualiaCalculator: "initializing" | "running" | "stopped" | "error";
  backendSync: "initializing" | "running" | "stopped" | "error";
  errorReporting: "initializing" | "running" | "stopped" | "error";
  debugService: "initializing" | "running" | "stopped" | "error";
  gameController: "initializing" | "running" | "stopped" | "error";
  gameStateStore: "initializing" | "running" | "stopped" | "error";
  configService: "initializing" | "running" | "stopped" | "error";
  audioService: "initializing" | "running" | "stopped" | "error";
  rhythmicMovement: "initializing" | "running" | "stopped" | "error";
  notificationService: "initializing" | "running" | "stopped" | "error";
  logger: "initializing" | "running" | "stopped" | "error";
}

// Configuration for CompositionRoot
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
}

/**
 * CompositionRoot: Central IoC Container
 *
 * QUALIA.CODE Compliance:
 * - True dependency injection (creates instances instead of importing singletons)
 * - Single responsibility: Service lifecycle management
 * - Configuration-first: All behavior externally configurable
 * - Error boundaries: Robust error handling and recovery
 * - Health monitoring: Active service health verification
 * - RACE CONDITION FREE: Configuration must be loaded before instantiation
 */
export class CompositionRoot {
  private config: CompositionRootConfig;
  private readonly services: ServiceContainer;
  private serviceStatus: ServiceStatus;
  private healthMonitoringIntervalId: number | null = null;
  private initializationRetryCount = 0;
  private logger: QualiaLogger;
  private compositionRootConfig: any;

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly _configService: ConfigurationService,
    logger?: QualiaLogger
  ) {
    // 1. CRITICAL: Validar que la configuración esté cargada ANTES de proceder
    if (!this._configService.isLoaded()) {
      throw new Error(
        'QUALIA.CODE VIOLATION: ConfigurationService must be loaded before creating CompositionRoot. ' +
        'Call configService.loadConfig() first in index.tsx.'
      );
    }

    // 2. Crear y registrar el logger
    this.logger = logger || new QualiaLogger('QualiaTempo', LogLevel.INFO);
    LoggerProvider.register(this.logger);
    if (!LoggerProvider.isRegistered()) {
      throw new Error('Failed to register logger in LoggerProvider');
    }

    // 3. Obtener configuración básica (disponible sincrónicamente - NO RACE CONDITION)
    this.config = this._configService.getCompositionRootConfig();

    // 4. Inicializar estado de servicios como no inicializado
    this.serviceStatus = {
      eventBus: "initializing",
      qualiaCalculator: "initializing", 
      backendSync: "initializing",
      errorReporting: "initializing",
      debugService: "initializing",
      gameController: "initializing",
      gameStateStore: "initializing",
      configService: "running",
      logger: "running",
      audioService: "initializing",
      rhythmicMovement: "initializing",
      notificationService: "initializing"
    };

    // 5. Los servicios se crearán en initialize()
    this.services = {} as ServiceContainer;
  }

  /**
   * Initialize all services in proper dependency order
   * NOTE: Configuration is loaded. This method creates and starts all services.
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();
    
    // Obtener configuración específica de CompositionRoot
    this.compositionRootConfig = this._configService.getConfigSection<any>('compositionRoot');
    
    // Obtener configuraciones específicas para cada servicio
    const qualiaConfig = this._configService.getConfigSection<QualiaCalculatorConfig>('qualiaCalculator');
    const audioConfig = this._configService.getConfigSection<AudioServiceConfig>('audioService');
    const backendConfig = this._configService.getConfigSection<BackendSyncConfig>('backendSync');
    const errorConfig = this._configService.getConfigSection<ErrorReportingConfig>('errorReporting');
    const rhythmicConfig = this._configService.getConfigSection<RhythmicMovementConfig>('rhythmicMovement');
    const notificationConfig = this._configService.getConfigSection<NotificationServiceConfig>('notificationService');

    // Crear servicios base sin dependencias de configuración
    const eventBus = new EventBus(this.logger);

    // Crear todos los servicios con configuración inyectada (PURE DI)
    this.services.eventBus = eventBus;
    this.services.configService = this._configService;
    this.services.logger = this.logger;
    this.services.debugService = new DebugService(eventBus, this.logger);
    this.services.gameController = new GameControllerService(eventBus, this.logger);
    this.services.gameStateStore = new GameStateStoreService(
      eventBus,
      this.logger,
      useGameStore.setState
    );
    this.services.qualiaCalculator = new QualiaStateCalculatorService(
      eventBus,
      this.logger,
      qualiaConfig
    );
    this.services.backendSync = new BackendSyncService(
      eventBus,
      this.logger,
      backendConfig
    );
    this.services.errorReporting = new ErrorReportingService(
      eventBus,
      this.logger,
      errorConfig
    );
    this.services.audioService = new AudioService(
      eventBus,
      this.logger,
      audioConfig
    );
    this.services.rhythmicMovement = new RhythmicMovementController(
      eventBus,
      this.logger,
      rhythmicConfig
    );
    this.services.notificationService = new NotificationService(
      eventBus,
      this.logger,
      useGameStore.setState,
      notificationConfig
    );

    // Actualizar estado de servicios como "running" (ya están creados correctamente)
    this.serviceStatus = {
      eventBus: "running",
      qualiaCalculator: "running",
      backendSync: "running",
      errorReporting: "running",
      debugService: "running",
      gameController: "running",
      gameStateStore: "running",
      configService: "running",
      audioService: "running",
      notificationService: "running",
      rhythmicMovement: "running",
      logger: "running",
    };

    this.logger.info(this.compositionRootConfig.logMessages?.servicesCreatedSuccessfully || "CompositionRoot: All services created successfully");
    this.logger.info(this.compositionRootConfig.logMessages?.startingServiceInitialization || "Starting service initialization");

    try {
      // Start services that have async start() methods
      // Note: EventBus, DebugService, GameStateStore, etc. are stateless and don't need start()
      
      // Phase 1: Start GameController (depends on EventBus)
      await this.startService('gameController', () => this.services.gameController.start());

      // Phase 2: Start BackendSync (depends on EventBus, optional)
      if (this.config.enableBackendSync) {
        await this.startService('backendSync', () => this.services.backendSync.start());
      }

      // Phase 3: Start AudioService (depends on EventBus and ConfigService)
      await this.startService('audioService', () => this.services.audioService.start());

      // Services without async start(): EventBus, QualiaCalculator, ErrorReporting, 
      // DebugService, GameStateStore, NotificationService, RhythmicMovement
      // These are already functional after construction.

      // Start health monitoring if enabled
      if (this.config.enableHealthMonitoring) {
        this.startHealthMonitoring();
      }

      const duration = performance.now() - startTime;
      this.logger.info(
        `✅ [CompositionRoot] All services initialized successfully - ${duration.toFixed(2)}ms`,
      );

      this.initializationRetryCount = 0; // Reset retry count on success
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `❌ [CompositionRoot] Initialization failed - ${duration.toFixed(2)}ms:`,
        { error: error instanceof Error ? error.message : String(error) },
      );

      if (
        this.config.retryInitializationOnError &&
        this.initializationRetryCount < this.config.maxInitializationRetries
      ) {
        this.initializationRetryCount++;
        this.logger.info(
          `🔄 [CompositionRoot] Retrying initialization (attempt ${this.initializationRetryCount}/${this.config.maxInitializationRetries})`,
        );

        // Exponential backoff
        const retryDelay =
          Math.pow(2, this.initializationRetryCount - 1) * 1000;
        setTimeout(() => this.initialize(), retryDelay);
      } else {
        throw error;
      }
    }
  }

  /**
   * Helper method to start individual services with error handling
   */
  private async startService(serviceName: keyof ServiceStatus, startFn: () => Promise<void> | void): Promise<void> {
    try {
      this.serviceStatus[serviceName] = 'initializing';
      await startFn();
      this.serviceStatus[serviceName] = 'running';
      this.logger.info(`✅ [CompositionRoot] ${serviceName} started successfully`);
    } catch (error) {
      this.serviceStatus[serviceName] = 'error';
      this.logger.error(`❌ [CompositionRoot] Failed to start ${serviceName}:`, { error });
      throw error;
    }
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown(): Promise<void> {
    const startTime = performance.now();
    this.logger.info("🛑 [CompositionRoot] Starting graceful shutdown...");

    try {
      // Stop health monitoring
      this.stopHealthMonitoring();

      // Shutdown in reverse dependency order
      if (this.services.backendSync) {
        await this.shutdownBackendSync();
      }

      if (this.services.debugService) {
        await this.shutdownDebugService();
      }

      if (this.services.gameController) {
        await this.shutdownGameController();
      }

      if (this.services.gameStateStore) {
        await this.shutdownGameStateStore();
      }

      if (this.services.audioService) {
        await this.shutdownAudioService();
      }

      if (this.services.notificationService) {
        await this.shutdownNotificationService();
      }

      if (this.services.errorReporting) {
        await this.shutdownErrorReporting();
      }

      if (this.services.qualiaCalculator) {
        await this.shutdownQualiaCalculator();
      }

      if (this.services.eventBus) {
        await this.shutdownEventBus();
      }

      const duration = performance.now() - startTime;
      this.logger.info(
        `✅ [CompositionRoot] Graceful shutdown completed - ${duration.toFixed(2)}ms`,
      );
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `❌ [CompositionRoot] Shutdown failed - ${duration.toFixed(2)}ms:`,
        { error: error instanceof Error ? error.message : String(error) },
      );
      throw error;
    }
  }

  /**
   * Get all services
   */
  getServices(): ServiceContainer {
    return this.services;
  }

  /**
   * Get service status
   */
  getServiceStatus(): ServiceStatus {
    return { ...this.serviceStatus };
  }

  /**
   * Restart a specific service
   */
  async restartService(serviceName: keyof ServiceStatus): Promise<void> {
    this.logger.info(`🔄 [CompositionRoot] Restarting service: ${serviceName}`);
    
    // Implementation would depend on the specific service
    this.logger.warn(`🚧 [CompositionRoot] Service restart not yet implemented for: ${serviceName}`);
  }

  /**
   * Perform health check
   */
  performHealthCheck(): boolean {
    // Basic health check for now
    const isHealthy = this.services.eventBus && this.services.qualiaCalculator;
    
    if (isHealthy) {
      this.logger.debug(
        this.compositionRootConfig.logMessages?.healthCheckPassed || "Health check passed",
      );
    } else {
      this.logger.error("Health check failed: Core services not available");
    }
    
    return !!isHealthy;
  }

  // === PRIVATE METHODS ===

  private startHealthMonitoring(): void {
    if (this.healthMonitoringIntervalId !== null) {
      return; // Already running
    }

    this.logger.info("🩺 [CompositionRoot] Starting health monitoring...");

    this.healthMonitoringIntervalId = window.setInterval(
      () => this.performHealthCheck(),
      this.config.healthCheckIntervalMs,
    );
  }

  private stopHealthMonitoring(): void {
    if (this.healthMonitoringIntervalId !== null) {
      clearInterval(this.healthMonitoringIntervalId);
      this.healthMonitoringIntervalId = null;
      this.logger.info("🩺 [CompositionRoot] Health monitoring stopped");
    }
  }

  // === SHUTDOWN METHODS ===

  private async shutdownEventBus(): Promise<void> {
    try {
      await this.services.eventBus.clear();
      this.logger.info("✅ [CompositionRoot] EventBus shutdown complete");
    } catch (error) {
      this.logger.error("❌ [CompositionRoot] EventBus shutdown failed:", { error });
    }
  }

  private async shutdownQualiaCalculator(): Promise<void> {
    try {
      this.services.qualiaCalculator.stop();
      this.logger.info(this.compositionRootConfig.logMessages?.qualiaCalculatorShutdownComplete || "QualiaCalculator shutdown complete");
    } catch (error) {
      this.logger.error(this.compositionRootConfig.logMessages?.qualiaCalculatorShutdownFailed || "QualiaCalculator shutdown failed:", { error });
    }
  }

  private async shutdownBackendSync(): Promise<void> {
    try {
      this.services.backendSync.stop();
      this.logger.info(this.compositionRootConfig.logMessages?.backendSyncShutdownComplete || "BackendSync shutdown complete");
    } catch (error) {
      this.logger.error(this.compositionRootConfig.logMessages?.backendSyncShutdownFailed || "BackendSync shutdown failed:", { error });
    }
  }

  private async shutdownErrorReporting(): Promise<void> {
    try {
      this.services.errorReporting.stop();
      this.logger.info(this.compositionRootConfig.logMessages?.errorReportingShutdownComplete || "ErrorReporting shutdown complete");
    } catch (error) {
      this.logger.error(this.compositionRootConfig.logMessages?.errorReportingShutdownFailed || "ErrorReporting shutdown failed:", { error });
    }
  }

  private async shutdownDebugService(): Promise<void> {
    try {
      this.services.debugService.stop();
      this.logger.info(this.compositionRootConfig.logMessages?.debugServiceShutdownComplete || "DebugService shutdown complete");
    } catch (error) {
      this.logger.error(this.compositionRootConfig.logMessages?.debugServiceShutdownFailed || "DebugService shutdown failed:", { error });
    }
  }

  private async shutdownGameController(): Promise<void> {
    try {
      this.services.gameController.stop();
      this.logger.info(this.compositionRootConfig.logMessages?.gameControllerShutdownComplete || "GameController shutdown complete");
    } catch (error) {
      this.logger.error(this.compositionRootConfig.logMessages?.gameControllerShutdownFailed || "GameController shutdown failed:", { error });
    }
  }

  private async shutdownGameStateStore(): Promise<void> {
    try {
      this.services.gameStateStore.stop();
      this.logger.info(this.compositionRootConfig.logMessages?.gameStateStoreShutdownComplete || "GameStateStore shutdown complete");
    } catch (error) {
      this.logger.error(this.compositionRootConfig.logMessages?.gameStateStoreShutdownFailed || "GameStateStore shutdown failed:", { error });
    }
  }

  private async shutdownAudioService(): Promise<void> {
    try {
      this.services.audioService.stop();
      this.logger.info(this.compositionRootConfig.logMessages?.audioServiceShutdownComplete || "AudioService shutdown complete");
    } catch (error) {
      this.logger.error(this.compositionRootConfig.logMessages?.audioServiceShutdownFailed || "AudioService shutdown failed:", { error });
    }
  }

  private async shutdownNotificationService(): Promise<void> {
    try {
      this.services.notificationService.stop();
      this.logger.info(this.compositionRootConfig.logMessages?.notificationServiceShutdownComplete || "NotificationService shutdown complete");
    } catch (error) {
      this.logger.error(this.compositionRootConfig.logMessages?.notificationServiceShutdownFailed || "NotificationService shutdown failed:", { error });
    }
  }
}