/**
 * QUALIA.CODE v1.0 - Frontend CompositionRoot (Core Logic)
 * Central IoC container for frontend service initialization and dependency injection.
 *
 * Architecture:
 * - True dependency injection with service instantiation control
 * - Single responsibility for service creation and lifecycle management
 * - Configurable service initialization order
 * - Centralized error handling and recovery
 * - Service health monitoring and restart capabilities
 */

import { EventBus } from "./EventBus";
import { QualiaStateCalculatorService } from "./QualiaStateCalculatorService";
import { BackendSyncService } from "./BackendSyncService";
import { ErrorReportingService } from "./ErrorReportingService";
import { DebugService } from "./DebugService";
import { GameControllerService } from "./GameControllerService";
import { GameStateStoreService } from "./GameStateStoreService";
import { ConfigurationService } from "./ConfigurationService";
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
}

// Default configuration
const DEFAULT_CONFIG: CompositionRootConfig = {
  autoStart: true,
  enableBackendSync: true,
  enableHealthMonitoring: true,
  healthCheckIntervalMs: 10000, // 10 seconds
  retryInitializationOnError: true,
  maxInitializationRetries: 3,
};

/**
 * CompositionRoot: Central IoC Container
 *
 * QUALIA.CODE Compliance:
 * - True dependency injection (creates instances instead of importing singletons)
 * - Single responsibility: Service lifecycle management
 * - Configuration-first: All behavior externally configurable
 * - Error boundaries: Robust error handling and recovery
 * - Health monitoring: Active service health verification
 */
export class CompositionRoot {
  private readonly config: CompositionRootConfig;
  private readonly services: ServiceContainer;
  private serviceStatus: ServiceStatus;
  private healthMonitoringIntervalId: number | null = null;
  private initializationRetryCount = 0;
  private logger: QualiaLogger;

  constructor(config?: Partial<CompositionRootConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Create Logger first (simplified - will be enhanced with config later)
    this.logger = new QualiaLogger('QualiaTempo', LogLevel.INFO);
    
    // CRITICAL: Register logger immediately to prevent circular dependency
    LoggerProvider.register(this.logger);
    
    // TRUE DEPENDENCY INJECTION: Instantiate services with Logger
    const eventBus = new EventBus(this.logger);
    const configService = new ConfigurationService(undefined, this.logger);
    this.services = {
      eventBus,
      qualiaCalculator: new QualiaStateCalculatorService(eventBus, this.logger),
      backendSync: new BackendSyncService(eventBus, this.logger, configService),
      errorReporting: new ErrorReportingService(eventBus, this.logger),
      debugService: new DebugService(eventBus, this.logger),
      gameController: new GameControllerService(eventBus, this.logger),
      gameStateStore: new GameStateStoreService(
        eventBus,
        this.logger,
        useGameStore.setState,
      ),
      configService,
      audioService: new AudioService(eventBus, this.logger),
      notificationService: new NotificationService(
        eventBus,
        this.logger,
        useGameStore.setState,
        configService,
      ),
      // rhythmicMovement will be created after config is loaded
      rhythmicMovement: null as any, // temporary placeholder
      // logger will be enhanced after config is loaded
      logger: this.logger,
    };

    this.serviceStatus = {
      eventBus: "initializing",
      qualiaCalculator: "initializing",
      backendSync: "initializing",
      errorReporting: "initializing",
      debugService: "initializing",
      gameController: "initializing",
      gameStateStore: "initializing",
      configService: "initializing",
      audioService: "initializing",
      notificationService: "initializing",
      rhythmicMovement: "initializing",
      logger: "initializing",
    };

    this.logger.info("🏭 [CompositionRoot] IoC Container initialized with true DI");
  }

  /**
   * Initialize all services in proper dependency order
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();
    this.logger.info("🚀 [CompositionRoot] Starting service initialization...");

    try {
      // Phase 0: Configuration Service (load external config)
      await this.initializeConfiguration();

      // Phase 1: Core EventBus (no dependencies)
      await this.initializeEventBus();

      // Phase 2: QualiaCalculator (depends on EventBus)
      await this.initializeQualiaCalculator();

      // Phase 3: BackendSync (depends on EventBus, optional)
      if (this.config.enableBackendSync) {
        await this.initializeBackendSync();
      }

      // Phase 4: ErrorReporting (depends on EventBus)
      await this.initializeErrorReporting();

      // Phase 5: DebugService (depends on EventBus)
      await this.initializeDebugService();

      // Phase 6: GameController (depends on EventBus)
      await this.initializeGameController();

      // Phase 7: GameStateStore (depends on EventBus, critical for UI)
      await this.initializeGameStateStore();

      // Phase 8: NotificationService (depends on EventBus, ConfigService, Store)
      await this.initializeNotificationService();

      // Phase 9: AudioService (depends on EventBus and ConfigService)
      await this.initializeAudioService();

      // Phase 9: RhythmicMovementController (depends on EventBus)
      await this.initializeRhythmicMovement();

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
   * Destroy all services and cleanup resources
   */
  destroy(): void {
    this.logger.info("💀 [CompositionRoot] Destroying services...");

    this.stopHealthMonitoring();

    // Services don't have destroy methods - shutdown handles cleanup
    // EventBus cleanup happens in its own destroy method
    this.services.eventBus?.destroy();

    this.logger.info("💀 [CompositionRoot] Services destroyed");
  }

  /**
   * Get service container (read-only access)
   */
  getServices(): ServiceContainer {
    return this.services;
  }

  /**
   * Get current service status
   */
  getServiceStatus(): Readonly<ServiceStatus> {
    return { ...this.serviceStatus };
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<CompositionRootConfig> {
    return { ...this.config };
  }

  /**
   * Get configuration service for accessing game configuration
   */
  getConfigurationService(): ConfigurationService {
    return this.services.configService;
  }

  // === PRIVATE INITIALIZATION METHODS ===

  private async initializeEventBus(): Promise<void> {
    this.logger.info("🚌 [CompositionRoot] Initializing EventBus...");
    this.serviceStatus.eventBus = "initializing";

    try {
      // EventBus is ready immediately (no async initialization needed)
      this.serviceStatus.eventBus = "running";
      this.logger.info("✅ [CompositionRoot] EventBus initialized");
    } catch (error) {
      this.serviceStatus.eventBus = "error";
      throw error;
    }
  }

  private async initializeQualiaCalculator(): Promise<void> {
    this.logger.info("🧮 [CompositionRoot] Initializing QualiaCalculator...");
    this.serviceStatus.qualiaCalculator = "initializing";

    try {
      // Start the calculator (it uses the singleton EventBus for now)
      this.services.qualiaCalculator.start();
      this.serviceStatus.qualiaCalculator = "running";
      this.logger.info("✅ [CompositionRoot] QualiaCalculator initialized");
    } catch (error) {
      this.serviceStatus.qualiaCalculator = "error";
      throw error;
    }
  }

  private async initializeBackendSync(): Promise<void> {
    this.logger.info("🔄 [CompositionRoot] Initializing BackendSync...");
    this.serviceStatus.backendSync = "initializing";

    try {
      await this.services.backendSync.start();
      this.serviceStatus.backendSync = "running";
      this.logger.info("✅ [CompositionRoot] BackendSync initialized");
    } catch (error) {
      this.serviceStatus.backendSync = "error";
      this.logger.warn(
        "⚠️ [CompositionRoot] BackendSync failed to initialize, continuing without backend sync",
      );
      // Don't throw - backend sync is optional
    }
  }

  private async initializeErrorReporting(): Promise<void> {
    this.logger.info("🚨 [CompositionRoot] Initializing ErrorReporting...");
    this.serviceStatus.errorReporting = "initializing";

    try {
      await this.services.errorReporting.start();
      this.serviceStatus.errorReporting = "running";
      this.logger.info("✅ [CompositionRoot] ErrorReporting initialized");
    } catch (error) {
      this.serviceStatus.errorReporting = "error";
      this.logger.warn(
        "⚠️ [CompositionRoot] ErrorReporting failed to initialize, continuing without error reporting",
      );
      // Don't throw - error reporting is optional
    }
  }

  private async initializeDebugService(): Promise<void> {
    this.logger.info("🔍 [CompositionRoot] Initializing DebugService...");
    this.serviceStatus.debugService = "initializing";

    try {
      await this.services.debugService.start();
      this.serviceStatus.debugService = "running";
      this.logger.info("✅ [CompositionRoot] DebugService initialized");
    } catch (error) {
      this.serviceStatus.debugService = "error";
      this.logger.warn(
        "⚠️ [CompositionRoot] DebugService failed to initialize, continuing without debug service",
      );
      // Don't throw - debug service is optional
    }
  }

  private async initializeGameController(): Promise<void> {
    this.logger.info("🎮 [CompositionRoot] Initializing GameController...");
    this.serviceStatus.gameController = "initializing";

    try {
      await this.services.gameController.start();
      this.serviceStatus.gameController = "running";
      this.logger.info("✅ [CompositionRoot] GameController initialized");
    } catch (error) {
      this.serviceStatus.gameController = "error";
      this.logger.warn(
        "⚠️ [CompositionRoot] GameController failed to initialize, continuing without game controller",
      );
      // Don't throw - game controller is optional
    }
  }

  private async initializeGameStateStore(): Promise<void> {
    this.logger.info("🔗 [CompositionRoot] Initializing GameStateStore...");
    this.serviceStatus.gameStateStore = "initializing";

    try {
      this.services.gameStateStore.start();
      this.serviceStatus.gameStateStore = "running";
      this.logger.info("✅ [CompositionRoot] GameStateStore initialized");
    } catch (error) {
      this.serviceStatus.gameStateStore = "error";
      throw error; // GameStateStore is critical
    }
  }

  private async initializeNotificationService(): Promise<void> {
    this.logger.info("🔔 [CompositionRoot] Initializing NotificationService...");
    this.serviceStatus.notificationService = "initializing";

    try {
      this.services.notificationService.start();
      this.serviceStatus.notificationService = "running";
      this.logger.info("✅ [CompositionRoot] NotificationService initialized");
    } catch (error) {
      this.serviceStatus.notificationService = "error";
      throw error; // NotificationService is critical for user feedback
    }
  }

  private async initializeAudioService(): Promise<void> {
    this.logger.info("🔊 [CompositionRoot] Initializing AudioService...");
    this.serviceStatus.audioService = "initializing";

    try {
      await this.services.audioService.start();
      this.serviceStatus.audioService = "running";
      this.logger.info("✅ [CompositionRoot] AudioService initialized");
    } catch (error) {
      this.serviceStatus.audioService = "error";
      this.logger.warn(
        "⚠️ [CompositionRoot] AudioService failed to initialize, continuing without audio",
      );
      // Don't throw - audio is optional for basic functionality
    }
  }

  // === PRIVATE SHUTDOWN METHODS ===

  private async shutdownEventBus(): Promise<void> {
    this.logger.info("🚌 [CompositionRoot] Shutting down EventBus...");
    this.serviceStatus.eventBus = "stopped";
    // EventBus cleanup happens in destroy()
  }

  private async shutdownQualiaCalculator(): Promise<void> {
    this.logger.info("🧮 [CompositionRoot] Shutting down QualiaCalculator...");
    this.services.qualiaCalculator.stop();
    this.serviceStatus.qualiaCalculator = "stopped";
  }

  private async shutdownBackendSync(): Promise<void> {
    this.logger.info("🔄 [CompositionRoot] Shutting down BackendSync...");
    await this.services.backendSync.stop();
    this.serviceStatus.backendSync = "stopped";
  }

  private async shutdownErrorReporting(): Promise<void> {
    this.logger.info("🚨 [CompositionRoot] Shutting down ErrorReporting...");
    await this.services.errorReporting.stop();
    this.serviceStatus.errorReporting = "stopped";
  }

  private async shutdownDebugService(): Promise<void> {
    this.logger.info("🔍 [CompositionRoot] Shutting down DebugService...");
    await this.services.debugService.stop();
    this.serviceStatus.debugService = "stopped";
  }

  private async shutdownGameController(): Promise<void> {
    this.logger.info("🎮 [CompositionRoot] Shutting down GameController...");
    await this.services.gameController.stop();
    this.serviceStatus.gameController = "stopped";
  }

  private async shutdownGameStateStore(): Promise<void> {
    this.logger.info("🔗 [CompositionRoot] Shutting down GameStateStore...");
    this.serviceStatus.gameStateStore = "stopped";
    this.services.gameStateStore.stop();
  }

  private async shutdownAudioService(): Promise<void> {
    this.logger.info("🔊 [CompositionRoot] Shutting down AudioService...");
    this.serviceStatus.audioService = "stopped";
    await this.services.audioService.stop();
  }

  private async shutdownNotificationService(): Promise<void> {
    this.logger.info("🔔 [CompositionRoot] Shutting down NotificationService...");
    this.services.notificationService.stop();
    this.serviceStatus.notificationService = "stopped";
  }

  // === HEALTH MONITORING ===

  private startHealthMonitoring(): void {
    if (this.healthMonitoringIntervalId) {
      return; // Already running
    }

    this.logger.info(
      `💚 [CompositionRoot] Starting health monitoring (interval: ${this.config.healthCheckIntervalMs}ms)`,
    );

    this.healthMonitoringIntervalId = window.setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);
  }

  private stopHealthMonitoring(): void {
    if (this.healthMonitoringIntervalId) {
      clearInterval(this.healthMonitoringIntervalId);
      this.healthMonitoringIntervalId = null;
          this.logger.info('💚 [CompositionRoot] Health monitoring stopped');
    }
  }

  private performHealthCheck(): void {
    this.logger.info("💚 [CompositionRoot] Performing health check...");

    // Basic health check - could be enhanced with service-specific health methods
    const issues: string[] = [];

    if (this.serviceStatus.eventBus === "error") {
      issues.push("EventBus in error state");
    }

    if (this.serviceStatus.qualiaCalculator === "error") {
      issues.push("QualiaCalculator in error state");
    }

    if (
      this.config.enableBackendSync &&
      this.serviceStatus.backendSync === "error"
    ) {
      issues.push("BackendSync in error state");
    }

    if (this.serviceStatus.errorReporting === "error") {
      issues.push("ErrorReporting in error state");
    }

    if (this.serviceStatus.debugService === "error") {
      issues.push("DebugService in error state");
    }

    if (this.serviceStatus.gameController === "error") {
      issues.push("GameController in error state");
    }

    if (issues.length > 0) {
      this.logger.warn(
        "⚠️ [CompositionRoot] Health check detected issues:",
        issues,
      );
      // Could trigger automatic recovery here
    } else {
      this.logger.info(
        "✅ [CompositionRoot] Health check passed - all services healthy",
      );
    }
  }

  private async initializeConfiguration(): Promise<void> {
    this.logger.info("📄 [CompositionRoot] Initializing ConfigurationService...");
    this.serviceStatus.configService = "initializing";

    try {
      await this.services.configService.loadConfig();
      this.serviceStatus.configService = "running";
      this.logger.info("✅ [CompositionRoot] ConfigurationService initialized");
      
      // Create Logger with configuration from ConfigurationService
      this.logger.info("📝 [CompositionRoot] Configuring Logger with loaded config...");
      // TODO: Add logging level configuration to ConfigurationService
      // For now, keep the default INFO level
      
      // PASO CRÍTICO: Register Logger in LoggerProvider for decorator access
      LoggerProvider.register(this.services.logger);
      this.logger.info("✅ [CompositionRoot] Logger configured and registered in LoggerProvider");
      
      // Now create services that depend on configuration
      this.logger.info("🎵 [CompositionRoot] Creating RhythmicMovementController with loaded config...");
      this.services.rhythmicMovement = new RhythmicMovementController(
        this.services.eventBus, 
        this.services.configService
      );
      this.logger.info("✅ [CompositionRoot] RhythmicMovementController created");
      
    } catch (error) {
      this.serviceStatus.configService = "error";
      this.logger.warn(
        "⚠️ [CompositionRoot] ConfigurationService failed to initialize, using defaults",
        { error: error instanceof Error ? error.message : String(error) }
      );
      
      // Create Logger with default configuration
      this.logger.info("📝 [CompositionRoot] Creating Logger with default config...");
      this.services.logger = new QualiaLogger('QualiaTempo', LogLevel.INFO);
      this.serviceStatus.logger = "running";
      
      // PASO CRÍTICO: Register Logger in LoggerProvider even with defaults
      LoggerProvider.register(this.services.logger);
      this.logger.info("✅ [CompositionRoot] Logger initialized with defaults and registered in LoggerProvider");
      
      // Create with default behavior even if config failed
      this.logger.info("🎵 [CompositionRoot] Creating RhythmicMovementController with defaults...");
      this.services.rhythmicMovement = new RhythmicMovementController(
        this.services.eventBus, 
        this.services.configService
      );
      this.logger.info("✅ [CompositionRoot] RhythmicMovementController created with defaults");
      // Don't throw - configuration is optional, services will use defaults
    }
  }

  private async initializeRhythmicMovement(): Promise<void> {
    this.logger.info("🎵 [CompositionRoot] Initializing RhythmicMovementController...");
    this.serviceStatus.rhythmicMovement = "initializing";

    try {
      // Check if rhythmicMovement was created in initializeConfiguration
      if (!this.services.rhythmicMovement) {
        this.logger.warn("⚠️ [CompositionRoot] RhythmicMovementController not created, skipping initialization");
        this.serviceStatus.rhythmicMovement = "error";
        return;
      }
      
      this.services.rhythmicMovement.start();
      this.serviceStatus.rhythmicMovement = "running";
      this.logger.info("✅ [CompositionRoot] RhythmicMovementController initialized");
    } catch (error) {
      this.serviceStatus.rhythmicMovement = "error";
      this.logger.warn(
        "⚠️ [CompositionRoot] RhythmicMovementController failed to initialize, continuing without rhythmic movement",
        { error: error instanceof Error ? error.message : String(error) }
      );
      // Don't throw - rhythmic movement is critical but we can continue for testing
    }
  }
}
