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
import type { CompositionRootConfig } from "./contracts/IApplicationCompositionRoot.contracts";
import type { DebugServiceConfig } from "./contracts/IDebugService.contracts";
import type { ErrorReportingConfig } from "./contracts/IErrorReportingService.contracts";
import type { EventBusConfig } from "./contracts/IEventBus.contracts";
import type { GameControllerConfig } from "./contracts/IGameControllerService.contracts";
import type { HttpConfig } from "./contracts/IHttpService.contracts";
import type { LoggerConfig } from "./contracts/ILogger.contracts";
import type { NotificationServiceConfig } from "./contracts/INotificationService.contracts";
import type { QualiaCalculatorConfig } from "./contracts/IQualiaStateCalculatorService.contracts";
import type { RhythmicMovementConfig } from "./contracts/IRhythmicMovementController.contracts";
import type { StreamingConfig } from "./contracts/IStateStreamingService.contracts";
import type { FrontendRenderingConfig } from "./contracts/IFrontendRenderingService.contracts";
import type { CoordinateSystemConfig } from "./contracts/ICoordinateSystemService.contracts";

// NEW SERVICES CONFIGURATION IMPORTS
import type { GameplayMechanicsConfig } from "./contracts/IGameplayMechanicsService.contracts";
import type { ViewLogicConfig } from "./contracts/IViewLogicService.contracts";
import type { SubtitleConfig } from "./contracts/ISubtitleService.contracts";
import type { DebugOrchestratorConfig } from "./contracts/IDebugOrchestratorService.contracts";

// ===== IMPORT ALL INTERFACES =====
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { IConfigurationService } from "./interfaces/IConfigurationService";
import type { IHttpService } from "./interfaces/IHttpService";
import type { ITimerService, IPerformanceService } from "./interfaces/ITimerService";
import type { ITimerProvider } from "./interfaces/ITimerProvider";
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
import type { IInputStateService } from "./interfaces/IInputStateService";
import type { IFrontendRenderingService } from "./interfaces/IFrontendRenderingService";
import type { IStateStreamingService } from "./interfaces/IStateStreamingService";
import type { IWebSocketService } from "./interfaces/IWebSocketService";
import type { IBrowserEventsService } from "./interfaces/IBrowserEventsService";
import type { ICoordinateSystemService } from "./interfaces/ICoordinateSystemService";

// ===== IMPORT ALL IMPLEMENTATIONS =====
import { EventBus } from "./EventBus";
import { QualiaLogger } from "./Logger";
import { ConfigurationService } from "./ConfigurationService";
import { HttpService } from "./HttpService";
import { TimerService, PerformanceService } from "./TimerService";
import { BrowserTimerProvider } from "./providers/BrowserTimerProvider";
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
import { FrontendRenderingService } from "./FrontendRenderingService";
import { StateStreamingService } from "./StateStreamingService";
import { WebSocketService } from "./WebSocketService";
import { BrowserEventsService } from "./BrowserEventsService";
import { ThrottlingManager } from "./utils/ThrottlingManager";
import { InputStateService } from "./InputStateService";
import { CoordinateSystemService } from "./CoordinateSystemService";

// ===== PROTOCOL ADAPTER IMPORTS =====
// QUALIA.CODE v1.2 - Protocol Adapter Bundle
import type { IMessageAdapter } from "./protocol/IMessageAdapter";
import { RawToParticleEventAdapter } from "./protocol/adapters/RawToParticleEventAdapter";
import { KeyToDirectionAdapter } from "./protocol/adapters/KeyToDirectionAdapter";

// ===== CORE SERVICE BINDINGS =====
// These services have no dependencies and can be bound directly
container.bind<IEventBus>(TYPES.IEventBus).to(EventBus).inSingletonScope();
container.bind<ILogger>(TYPES.ILogger).to(QualiaLogger).inSingletonScope();

// Bind configuration values for ConfigurationService
container.bind<string>(TYPES.ConfigBasePath).toConstantValue("/config/");
container.bind<Record<string, string>>(TYPES.ConfigManifest).toConstantValue({
  "gameController": "game-controller.yaml",
  "gameplay": "gameplay.yaml",
  "audioService": "audio-service.yaml",
  "debugService": "debug-service.yaml",
  "errorReporting": "error-reporting.yaml",
  "qualiaCalculator": "qualia-calculator.yaml",
  "backendSync": "backend-sync.yaml",
  "notificationService": "notification-service.yaml",
  "rhythmicMovement": "rhythmic-movement.yaml",
  "frontendRendering": "frontend-rendering.yaml",
  "visualEffects": "visual-effects.yaml",
  "compositionRoot": "composition-root.yaml",
  "eventBus": "eventbus.yaml",
  "applicationInitializer": "application-initializer.yaml",
  "mainMenu": "main-menu.yaml",
  "http": "http-service.yaml",
  "logger": "logger.yaml",
  
  // NEW SERVICES CONFIGURATION FILES
  "gameplayMechanics": "gameplay-mechanics.yaml",
  "viewLogic": "view-logic.yaml",
  "subtitle": "subtitle.yaml",
  "debugOrchestrator": "debug-orchestrator.yaml"
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

container
  .bind<ITimerProvider>(TYPES.ITimerProvider)
  .to(BrowserTimerProvider)
  .inSingletonScope();

// ===== SPECIAL BINDINGS =====
// Bind GameStateStore for services that need store access
container
  .bind<IGameStateStore>(TYPES.IGameStateStore)
  .to(GameStateStore)
  .inSingletonScope();

// Bind ThrottlingManager as a utility class
container
  .bind<ThrottlingManager>(TYPES.ThrottlingManager)
  .to(ThrottlingManager)
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
  .bind<IInputStateService>(TYPES.IInputStateService)
  .to(InputStateService)
  .inSingletonScope();
container
  .bind<IWebAudioAPIService>(TYPES.IWebAudioAPIService)
  .to(WebAudioAPIService)
  .inSingletonScope();

// ===== STREAMING SERVICE BINDINGS =====
container
  .bind<IFrontendRenderingService>(TYPES.IFrontendRenderingService)
  .to(FrontendRenderingService)
  .inSingletonScope();

container
  .bind<IStateStreamingService>(TYPES.IStateStreamingService)
  .to(StateStreamingService)
  .inSingletonScope();

container
  .bind<IWebSocketService>(TYPES.IWebSocketService)
  .to(WebSocketService)
  .inSingletonScope();

container
  .bind<IBrowserEventsService>(TYPES.IBrowserEventsService)
  .to(BrowserEventsService)
  .inSingletonScope();

// ===== COORDINATE SYSTEM SERVICE BINDING =====
container
  .bind<ICoordinateSystemService>(TYPES.ICoordinateSystemService)
  .to(CoordinateSystemService)
  .inSingletonScope();

// ===== NEW ARCHITECTURAL SERVICES =====
// QUALIA.CODE v1.1 - Business Logic Extraction Services
import { GameplayMechanicsService } from './GameplayMechanicsService';
import { ViewLogicService } from './ViewLogicService';
import { SubtitleService } from './SubtitleService';
import { DebugOrchestratorService } from './DebugOrchestratorService';
import type { IGameplayMechanicsService } from './interfaces/IGameplayMechanicsService';
import type { IViewLogicService } from './interfaces/IViewLogicService';
import type { ISubtitleService } from './interfaces/ISubtitleService';
import type { IDebugOrchestratorService } from './interfaces/IDebugOrchestratorService';

container
  .bind<IGameplayMechanicsService>(TYPES.IGameplayMechanicsService)
  .to(GameplayMechanicsService)
  .inSingletonScope();

container
  .bind<IViewLogicService>(TYPES.IViewLogicService)
  .to(ViewLogicService)
  .inSingletonScope();

container
  .bind<ISubtitleService>(TYPES.ISubtitleService)
  .to(SubtitleService)
  .inSingletonScope();

container
  .bind<IDebugOrchestratorService>(TYPES.IDebugOrchestratorService)
  .to(DebugOrchestratorService)
  .inSingletonScope();

// ===== PROTOCOL ADAPTER BINDINGS =====
// QUALIA.CODE v1.2 - Protocol Adapter Bundle
container
  .bind<IMessageAdapter>(TYPES.IRawToParticleEventAdapter)
  .to(RawToParticleEventAdapter)
  .inSingletonScope();

container
  .bind<IMessageAdapter>(TYPES.IKeyToDirectionAdapter)
  .to(KeyToDirectionAdapter)
  .inSingletonScope();

// ===== CONFIGURATION BINDING FUNCTION =====
/**
 * CRITICAL MISSION: Eliminate Service Locator Antipattern
 * React.StrictMode Safe Configuration Binding
 * 
 * This function loads configuration ONCE and binds each typed configuration 
 * object to its specific Symbol. Services will now inject specific config 
 * objects instead of the ConfigurationService.
 * 
 * QUALIA.CODE v1.1 COMPLIANT: Uses container.isBound() for React.StrictMode immunity
 */

/**
 * Safe binding helper that prevents duplicate bindings
 * Uses InversifyJS native container.isBound() method
 */
function safeBindConstant<T>(identifier: symbol, value: T): void {
  if (!container.isBound(identifier)) {
    container.bind<T>(identifier).toConstantValue(value);
  }
}

export async function configureServices(): Promise<void> {
  // CRITICAL: Use container.isBound() instead of static flags for React.StrictMode immunity
  if (container.isBound(TYPES.FullGameConfig)) {
    return; // Configuration already loaded
  }

  // 1. Get ConfigurationService instance to load configuration
  const configService = container.get<IConfigurationService>(TYPES.IConfigurationService);
  
  // 2. Load all configuration ONE TIME
  await configService.loadConfig();
  const fullConfig = configService.getConfig();
  
  // 3. Bind each configuration object using safe binding pattern
  // This prevents duplicate bindings even under React.StrictMode
  safeBindConstant<FullGameConfig>(TYPES.FullGameConfig, fullConfig);
  safeBindConstant<CompositionRootConfig>(TYPES.CompositionRootConfig, fullConfig.compositionRoot);
  safeBindConstant<AppInitializerConfig>(TYPES.AppInitializerConfig, fullConfig.applicationInitializer);
  safeBindConstant<LoggerConfig>(TYPES.LoggerConfig, fullConfig.logger);
  safeBindConstant<HttpConfig>(TYPES.HttpConfig, fullConfig.http);
  safeBindConstant<EventBusConfig>(TYPES.EventBusConfig, fullConfig.eventBus);
  safeBindConstant<BackendSyncConfig>(TYPES.BackendSyncConfig, fullConfig.backendSync);
  safeBindConstant<GameControllerConfig>(TYPES.GameControllerConfig, fullConfig.gameController);
  safeBindConstant<QualiaCalculatorConfig>(TYPES.QualiaCalculatorConfig, fullConfig.qualiaCalculator);
  safeBindConstant<RhythmicMovementConfig>(TYPES.RhythmicMovementConfig, fullConfig.rhythmicMovement);
  safeBindConstant<AudioServiceConfig>(TYPES.AudioServiceConfig, fullConfig.audioService);
  safeBindConstant<NotificationServiceConfig>(TYPES.NotificationServiceConfig, fullConfig.notificationService);
  safeBindConstant<ErrorReportingConfig>(TYPES.ErrorReportingConfig, fullConfig.errorReporting);
  safeBindConstant<DebugServiceConfig>(TYPES.DebugServiceConfig, fullConfig.debugService);
  safeBindConstant<FrontendRenderingConfig>(TYPES.FrontendRenderingConfig, fullConfig.frontendRendering);
  safeBindConstant<StreamingConfig>(TYPES.StreamingConfig, fullConfig.backendSync.streaming);
  
  // Bind ThrottlingConfig from NotificationService config
  safeBindConstant(TYPES.ThrottlingConfig, fullConfig.notificationService.throttling);
  
  // Bind CoordinateSystemConfig from RhythmicMovement config
  safeBindConstant<CoordinateSystemConfig>(TYPES.CoordinateSystemConfig, fullConfig.rhythmicMovement.coordinate_system);

  // NEW SERVICES CONFIGURATION BINDINGS - Using any for now until FullGameConfig is updated
  safeBindConstant(TYPES.GameplayMechanicsConfig, (fullConfig as any).gameplayMechanics);
  safeBindConstant(TYPES.ViewLogicConfig, (fullConfig as any).viewLogic);
  safeBindConstant(TYPES.SubtitleConfig, (fullConfig as any).subtitle);
  safeBindConstant(TYPES.DebugOrchestratorConfig, (fullConfig as any).debugOrchestrator);
}

// ===== CONTAINER VERIFICATION =====
// Container is configured and ready
// CRITICAL: Call configureServices() before using any service that requires configuration

export { container };
