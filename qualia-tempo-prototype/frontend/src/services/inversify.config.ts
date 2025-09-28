/**
 * QUALIA.CODE v1.1 - InversifyJS Configuration
 * Service binding configuration for the IoC container.
 *
 * CRITICAL MANDATE: This file replaces the manual CompositionRoot.
 * All service instantiation happens here through container bindings.
 */

import { container } from "./inversify.container";
import { TYPES } from "./inversify.types";

// ===== IMPORT CONFIGURATION CONTRACTS =====
import type { FullGameConfig } from "../types/config";
import type { AppInitializerConfig } from "./contracts/IApplicationInitializerService.contracts";
import type { AudioServiceConfig } from "./contracts/IAudioService.contracts";
import type { BackendSyncConfig } from "./contracts/IBackendSyncService.contracts";
import type { CompositionRootConfig, VisualEffectsConfig } from "./contracts/IApplicationCompositionRoot.contracts";
import type { DebugServiceConfig } from "./contracts/IDebugService.contracts";
import type { ErrorReportingConfig } from "./contracts/IErrorReportingService.contracts";
import type { EventBusConfig } from "./contracts/IEventBus.contracts";
import type { GameControllerConfig } from "./contracts/IGameControllerService.contracts";
import type { HttpConfig } from "./contracts/IHttpService.contracts";
import type { LoggerConfig } from "./contracts/ILogger.contracts";
import type { NotificationServiceConfig } from "./contracts/INotificationService.contracts";
import type { QualiaCalculatorConfig } from "./contracts/IQualiaStateCalculatorService.contracts";
import type { RhythmicMovementConfig } from "./contracts/IRhythmicMovementController.contracts";

// ===== IMPORT ALL INTERFACES =====
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { IConfigurationService } from "./interfaces/IConfigurationService";
import type { IHttpService } from "./interfaces/IHttpService";
import type { ITimerService, IPerformanceService } from "./interfaces/ITimerService";
import type { IQualiaStateCalculatorService } from "./interfaces/IQualiaStateCalculatorService";
import type { IBackendSyncService } from "./interfaces/IBackendSyncService";
import type { IAudioService } from "./interfaces/IAudioService";
import type { IGameControllerService } from "./interfaces/IGameControllerService";
import type { IGameStateStoreService } from "./interfaces/IGameStateStoreService";
// QUALIA.CODE: Complete service imports - All services implemented
import type { INotificationService } from "./interfaces/INotificationService";
import type { IErrorReportingService } from "./interfaces/IErrorReportingService";
import type { IDebugService } from "./interfaces/IDebugService";
import type { IRhythmicMovementController } from "./interfaces/IRhythmicMovementController";
import type { IOntologicalAudioEngine } from "../audio/IOntologicalAudioEngine";
import type { IApplicationInitializerService } from "./interfaces/IApplicationInitializerService";
import type { IWebAudioAPIService } from "./interfaces/IWebAudioAPIService";
import type { IGameStateStore } from "./interfaces/IGameStateStore";
import type { IStreamingVideoService } from "./interfaces/IStreamingVideoService";

// ===== IMPORT ALL IMPLEMENTATIONS =====
import { EventBus } from "./EventBus";
import { QualiaLogger } from "./Logger";
import { ConfigurationService } from "./ConfigurationService";
import { HttpService } from "./HttpService";
import { TimerService, PerformanceService } from "./TimerService";
import { QualiaStateCalculatorService } from "./QualiaStateCalculatorService";
import { BackendSyncService } from "./BackendSyncService";
import { AudioService } from "./AudioService";
import { GameControllerService } from "./GameControllerService";
import { GameStateStoreService } from "./GameStateStoreService";
// QUALIA.CODE: Complete service implementations - All services implemented
import { NotificationService } from "./NotificationService";
import { ErrorReportingService } from "./ErrorReportingService";
import { DebugService } from "./DebugService";
import { RhythmicMovementController } from "./RhythmicMovementController";
import { OntologicalAudioEngine } from "../audio/OntologicalAudioEngine";
import { ApplicationInitializerService } from "./ApplicationInitializerService";
import { WebAudioAPIService } from "./WebAudioAPIService";
import { GameStateStore } from "./GameStateStore";
import { StreamingVideoService } from "./StreamingVideoService";

// ===== IMPORT ZUSTAND STORE =====
import { useGameStore } from "../state/useGameStore";

// ===== CORE SERVICE BINDINGS =====
// These services have no dependencies and can be bound directly
container.bind<IEventBus>(TYPES.IEventBus).to(EventBus).inSingletonScope();
container.bind<ILogger>(TYPES.ILogger).to(QualiaLogger).inSingletonScope();

// Bind configuration values for ConfigurationService
container.bind<string>(TYPES.ConfigBasePath).toConstantValue("/config/");
container.bind<Record<string, string>>(TYPES.ConfigManifest).toConstantValue({
  "gameController": "game-controller.yaml",
  "audioService": "audio-service.yaml",
  "debugService": "debug-service.yaml",
  "errorReporting": "error-reporting.yaml",
  "qualiaCalculator": "qualia-calculator.yaml",
  "backendSync": "backend-sync.yaml",
  "notificationService": "notification-service.yaml",
  "rhythmicMovement": "rhythmic-movement.yaml",
  "visualEffects": "visual-effects.yaml",
  "compositionRoot": "composition-root.yaml",
  "eventbus": "eventbus.yaml",
  "applicationInitializer": "application-initializer.yaml",
  "mainMenu": "main-menu.yaml",
  "httpService": "http-service.yaml",
  "timerService": "timer-service.yaml"
});

// Bind ConfigurationService after its dependencies
container
  .bind<IConfigurationService>(TYPES.IConfigurationService)
  .to(ConfigurationService)
  .inSingletonScope();

// Bind HttpService with proper IoC pattern
container
  .bind<IHttpService>(TYPES.IHttpService)
  .to(HttpService)
  .inSingletonScope();

container
  .bind<ITimerService>(TYPES.ITimerService)
  .to(TimerService)
  .inSingletonScope();

container
  .bind<IPerformanceService>(TYPES.IPerformanceService)
  .to(PerformanceService)
  .inSingletonScope();

// ===== SPECIAL BINDINGS =====
// Bind Zustand store setter for GameStateStoreService
container.bind(TYPES.StoreSetter).toConstantValue(useGameStore.setState);

// Bind GameStateStore for services that need store access
container
  .bind<IGameStateStore>(TYPES.IGameStateStore)
  .to(GameStateStore)
  .inSingletonScope();

// ===== FEATURE SERVICE BINDINGS =====
// These services depend on core services and will be injected automatically
container
  .bind<IQualiaStateCalculatorService>(TYPES.IQualiaStateCalculatorService)
  .to(QualiaStateCalculatorService)
  .inSingletonScope();
container
  .bind<IBackendSyncService>(TYPES.IBackendSyncService)
  .to(BackendSyncService)
  .inSingletonScope();
container
  .bind<IAudioService>(TYPES.IAudioService)
  .to(AudioService)
  .inSingletonScope();
container
  .bind<IGameControllerService>(TYPES.IGameControllerService)
  .to(GameControllerService)
  .inSingletonScope();
container
  .bind<IGameStateStoreService>(TYPES.IGameStateStoreService)
  .to(GameStateStoreService)
  .inSingletonScope();
// QUALIA.CODE: Complete service bindings - All services implemented and bound
container
  .bind<INotificationService>(TYPES.INotificationService)
  .to(NotificationService)
  .inSingletonScope();
container
  .bind<IErrorReportingService>(TYPES.IErrorReportingService)
  .to(ErrorReportingService)
  .inSingletonScope();
container
  .bind<IDebugService>(TYPES.IDebugService)
  .to(DebugService)
  .inSingletonScope();
container
  .bind<IRhythmicMovementController>(TYPES.IRhythmicMovementController)
  .to(RhythmicMovementController)
  .inSingletonScope();
container
  .bind<IOntologicalAudioEngine>(TYPES.IOntologicalAudioEngine)
  .to(OntologicalAudioEngine)
  .inSingletonScope();
container
  .bind<IApplicationInitializerService>(TYPES.IApplicationInitializerService)
  .to(ApplicationInitializerService)
  .inSingletonScope();
container
  .bind<IWebAudioAPIService>(TYPES.IWebAudioAPIService)
  .to(WebAudioAPIService)
  .inSingletonScope();

// ===== STREAMING SERVICE BINDINGS =====
container
  .bind<IStreamingVideoService>(TYPES.IStreamingVideoService)
  .to(StreamingVideoService)
  .inSingletonScope();

// ===== CONFIGURATION BINDING FUNCTION =====
/**
 * CRITICAL MISSION: Eliminate Service Locator Antipattern
 * 
 * This function loads configuration ONCE and binds each typed configuration 
 * object to its specific Symbol. Services will now inject specific config 
 * objects instead of the ConfigurationService.
 * 
 * CALL THIS FUNCTION BEFORE INITIALIZING ANY OTHER SERVICES.
 */
export async function configureServices(): Promise<void> {
  // 1. Get ConfigurationService instance to load configuration
  const configService = container.get<IConfigurationService>(TYPES.IConfigurationService);
  
  // 2. Load all configuration ONE TIME
  await configService.loadConfig();
  const fullConfig = configService.getConfig();
  
  // 3. Bind each configuration object to its specific Symbol
  // This enables direct injection of typed configuration objects
  container.bind<FullGameConfig>(TYPES.FullGameConfig).toConstantValue(fullConfig);
  container.bind<CompositionRootConfig>(TYPES.CompositionRootConfig).toConstantValue(fullConfig.compositionRoot);
  container.bind<AppInitializerConfig>(TYPES.AppInitializerConfig).toConstantValue(fullConfig.applicationInitializer);
  container.bind<LoggerConfig>(TYPES.LoggerConfig).toConstantValue(fullConfig.logger);
  container.bind<HttpConfig>(TYPES.HttpConfig).toConstantValue(fullConfig.http);
  container.bind<EventBusConfig>(TYPES.EventBusConfig).toConstantValue(fullConfig.eventBus);
  container.bind<BackendSyncConfig>(TYPES.BackendSyncConfig).toConstantValue(fullConfig.backendSync);
  container.bind<GameControllerConfig>(TYPES.GameControllerConfig).toConstantValue(fullConfig.gameController);
  container.bind<QualiaCalculatorConfig>(TYPES.QualiaCalculatorConfig).toConstantValue(fullConfig.qualiaCalculator);
  container.bind<RhythmicMovementConfig>(TYPES.RhythmicMovementConfig).toConstantValue(fullConfig.rhythmicMovement);
  container.bind<AudioServiceConfig>(TYPES.AudioServiceConfig).toConstantValue(fullConfig.audioService);
  container.bind<NotificationServiceConfig>(TYPES.NotificationServiceConfig).toConstantValue(fullConfig.notificationService);
  container.bind<ErrorReportingConfig>(TYPES.ErrorReportingConfig).toConstantValue(fullConfig.errorReporting);
  container.bind<DebugServiceConfig>(TYPES.DebugServiceConfig).toConstantValue(fullConfig.debugService);
  
  // Optional configuration with null check
  if (fullConfig.visualEffects) {
    container.bind<VisualEffectsConfig>(TYPES.VisualEffectsConfig).toConstantValue(fullConfig.visualEffects);
  }
}

// ===== CONTAINER VERIFICATION =====
// Container is configured and ready
// CRITICAL: Call configureServices() before using any service that requires configuration

export { container };
