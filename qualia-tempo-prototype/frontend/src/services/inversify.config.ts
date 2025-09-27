/**
 * QUALIA.CODE v1.1 - InversifyJS Configuration
 * Service binding configuration for the IoC container.
 *
 * CRITICAL MANDATE: This file replaces the manual CompositionRoot.
 * All service instantiation happens here through container bindings.
 */

import { container } from "./inversify.container";
import { TYPES } from "./inversify.types";

// ===== IMPORT ALL INTERFACES =====
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { IConfigurationService } from "./interfaces/IConfigurationService";
import type { IHttpService } from "./interfaces/IHttpService";
import type { ITimerService } from "./interfaces/ITimerService";
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
import { TimerService } from "./TimerService";
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
  "game": "game-config.yaml",
  "audio": "audio-service.yaml",
  "debug": "debug-service.yaml",
  "error-reporting": "error-reporting.yaml",
  "qualia-calculator": "qualia-calculator.yaml",
  "backend-sync": "backend-sync-service.yaml",
  "game-controller": "game-controller.yaml",
  "notification": "notification-service.yaml",
  "rhythmic-movement": "rhythmic-movement.yaml",
  "visual-effects": "visual-effects.yaml",
  "http": "http-service.yaml",
  "timer": "timer-service.yaml",
  "application-initializer": "application-initializer-service.yaml"
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

// ===== CONTAINER VERIFICATION =====
// Container is configured and ready

export { container };
