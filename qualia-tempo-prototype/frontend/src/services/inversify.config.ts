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
import type { ApplicationInitializerServiceParams } from "./contracts/IApplicationInitializerService.contracts";
import type { AudioServiceConfig } from "./contracts/IAudioService.contracts";
import type { BackendSyncConfig } from "./contracts/IBackendSyncService.contracts";
import type { CompositionRootConfig } from "./contracts/IApplicationCompositionRoot.contracts";
import type { DebugServiceConfig, DebugServiceParams } from "./contracts/IDebugService.contracts";
import type { ErrorReportingConfig, ErrorReportingServiceParams } from "./contracts/IErrorReportingService.contracts";
import type { EventBusConfig } from "./contracts/IEventBus.contracts";
import type { GameControllerConfig } from "./contracts/IGameControllerService.contracts";
import type { HttpConfig } from "./contracts/IHttpService.contracts";
import type { LoggerConfig } from "./contracts/ILogger.contracts";
import type { NotificationServiceConfig } from "./contracts/INotificationService.contracts";
import type { NotificationServiceParams } from "./contracts/INotificationService.contracts";
import type { QualiaCalculatorConfig } from "./contracts/IQualiaStateCalculatorService.contracts";
import type { RhythmicMovementConfig } from "./contracts/IRhythmicMovementController.contracts";
import type { RhythmicMovementControllerParams } from "./contracts/IRhythmicMovementController.contracts";
import type { StreamingConfig } from "./contracts/IStateStreamingService.contracts";
import type { FrontendRenderingConfig } from "./contracts/IFrontendRenderingService.contracts";
import type { FrontendRenderingServiceParams } from "./contracts/IFrontendRenderingService.contracts";
import type { GameControllerServiceParams } from "./contracts/IGameControllerService.contracts";
import type { QualiaStateCalculatorServiceParams } from "./contracts/IQualiaStateCalculatorService.contracts";
import type { StateStreamingServiceParams } from "./contracts/IStateStreamingService.contracts";
import type { DebugOrchestratorServiceParams } from "./contracts/IDebugOrchestratorService.contracts";
import type { AudioServiceParams } from "./contracts/IAudioService.contracts";
import type { BackendSyncServiceParams } from "./contracts/IBackendSyncService.contracts";
import type { WebSocketServiceParams } from "./contracts/IWebSocketService.contracts";
import type { CoordinateSystemConfig } from "./contracts/ICoordinateSystemService.contracts";

// NEW SERVICES CONFIGURATION IMPORTS
// Future configuration imports for additional services
// import type { GameplayMechanicsConfig } from "./contracts/IGameplayMechanicsService.contracts";
import type { ViewLogicConfig } from "./contracts/IViewLogicService.contracts";
// import type { SubtitleConfig } from "./contracts/ISubtitleService.contracts";
// import type { DebugOrchestratorConfig } from "./contracts/IDebugOrchestratorService.contracts";
import type { GameStateStoreConfig } from "./contracts/IGameStateStoreService.contracts";
import type { PostProcessingConfig } from "./contracts/IPostProcessingService.contracts";
import type { ProtocolAdapterConfig } from "./contracts/IProtocolAdapter.contracts";
import type { TimerServiceConfig } from "./contracts/ITimerService.contracts";

// ===== IMPORT EVENT CONTRACTS =====
import type { ConfigurationLoadedEvent } from "./contracts/events.contracts";

// ===== IMPORT ALL INTERFACES =====
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import { EventBus } from "./EventBus";
import { QualiaLogger } from "./Logger";
import type { IConfigurationService } from "./interfaces/IConfigurationService";
import type { IHttpService } from "./interfaces/IHttpService";
import type { ITimerService } from "./interfaces/ITimerService";
import type { IPerformanceService } from "./interfaces/IPerformanceService";
import type { IPerformanceProvider } from "./interfaces/IPerformanceProvider";
import type { ITimerProvider } from "./interfaces/ITimerProvider";
import type { IQualiaStateCalculatorService } from "./interfaces/IQualiaStateCalculatorService";
import type { IBackendSyncService } from "./interfaces/IBackendSyncService";
import type { IAudioService } from "./interfaces/IAudioService";
import type { IGameControllerService } from "./interfaces/IGameControllerService";
import type { IGameInputControllerService } from "./interfaces/IGameInputControllerService";
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
import type { IWebSocketFactory } from "./interfaces/IWebSocketFactory";
import type { IBrowserEventsService } from "./interfaces/IBrowserEventsService";
import type { ICoordinateSystemService } from "./interfaces/ICoordinateSystemService";
import type { IToneFactoryService } from "../audio/interfaces/IToneFactoryService";

// ===== IMPORT ALL IMPLEMENTATIONS =====
import { ConfigurationService } from "./ConfigurationService";
import { HttpService } from "./HttpService";
import { TimerService } from "./TimerService";
import { PerformanceService } from "./PerformanceService";
import { PerformanceProvider } from "./providers/PerformanceProvider";
import { BrowserTimerProvider } from "./providers/BrowserTimerProvider";
import { QualiaStateCalculatorService } from "./QualiaStateCalculatorService";
import { BackendSyncService } from "./BackendSyncService";
import { AudioService } from "./AudioService";
import { GameControllerService } from "./GameControllerService";
import { GameInputControllerService } from "./GameInputControllerService";
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
import { BrowserWebSocketFactory } from "./BrowserWebSocketFactory";
import { BrowserEventsService } from "./BrowserEventsService";
import { ThrottlingManager } from "./utils/ThrottlingManager";
import { InputStateService } from "./InputStateService";
import { CoordinateSystemService } from "./CoordinateSystemService";
import { ToneFactoryService } from "../audio/ToneFactoryService";

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
  "appInitializer": "application-initializer.yaml",
  "logger": "logger.yaml",
  "http": "http-service.yaml",
  "eventBus": "eventbus.yaml",
  "backendSync": "backend-sync.yaml",
  "gameController": "game-controller.yaml",
  "qualiaCalculator": "qualia-calculator.yaml",
  "rhythmicMovement": "rhythmic-movement.yaml",
  "audioService": "audio-service.yaml",
  "notificationService": "notification-service.yaml",
  "errorReporting": "error-reporting.yaml",
  "debugService": "debug-service.yaml",
  "frontendRendering": "frontend-rendering.yaml",
  "gameplayMechanics": "gameplay-mechanics.yaml",
  "viewLogic": "view-logic.yaml",
  "subtitle": "subtitle.yaml",
  "debugOrchestrator": "debug-orchestrator.yaml",
  "gameStateStore": "game-state-store.yaml",
  "postProcessing": "post-processing.yaml",
  "streaming": "backend-sync.yaml",
  "visualEffects": "visual-effects.yaml",
  "coordinateSystem": "game-config.yaml",
  "protocolAdapter": "protocol-adapter.yaml",
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

container
  .bind<IPerformanceProvider>(TYPES.IPerformanceProvider)
  .to(PerformanceProvider)
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
  .bind<IGameInputControllerService>(TYPES.IGameInputControllerService)
  .to(GameInputControllerService)
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
  .bind<IToneFactoryService>(TYPES.IToneFactoryService)
  .to(ToneFactoryService)
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

// QUALIA.CODE v1.1: Platform Abstraction - WebSocket Factory
container
  .bind<IWebSocketFactory>(TYPES.IWebSocketFactory)
  .to(BrowserWebSocketFactory)
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
import { ShaderLoaderService } from './ShaderLoaderService';
import { ShaderIntrospectionService } from './ShaderIntrospectionService';
import { PostProcessingService } from './PostProcessingService';
import type { IGameplayMechanicsService } from './interfaces/IGameplayMechanicsService';
import type { IViewLogicService } from './interfaces/IViewLogicService';
import type { ISubtitleService } from './interfaces/ISubtitleService';
import type { IDebugOrchestratorService } from './interfaces/IDebugOrchestratorService';
import type { IShaderLoaderService } from './interfaces/IShaderLoaderService';
import type { IShaderIntrospectionService } from './interfaces/IShaderIntrospectionService';
import type { IPostProcessingService } from './interfaces/IPostProcessingService';

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

// ===== SHADER AND POST-PROCESSING SERVICES =====
container
  .bind<IShaderLoaderService>(TYPES.IShaderLoaderService)
  .to(ShaderLoaderService)
  .inSingletonScope();

container
  .bind<IShaderIntrospectionService>(TYPES.IShaderIntrospectionService)
  .to(ShaderIntrospectionService)
  .inSingletonScope();

container
  .bind<IPostProcessingService>(TYPES.IPostProcessingService)
  .to(PostProcessingService)
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
  safeBindConstant<TimerServiceConfig>(TYPES.TimerServiceConfig, fullConfig.timerService);
  
  // Bind ThrottlingConfig from NotificationService config
  safeBindConstant(TYPES.ThrottlingConfig, fullConfig.notificationService.throttling);
  
  // Bind CoordinateSystemConfig from RhythmicMovement config
  safeBindConstant<CoordinateSystemConfig>(TYPES.CoordinateSystemConfig, fullConfig.rhythmicMovement.coordinate_system);

  // QUALIA.CODE v1.1: Bind RhythmicMovementControllerParams factory
  // Consolidates 8 constructor parameters into a single object to comply with IoC limits
  safeBindConstant<RhythmicMovementControllerParams>(TYPES.RhythmicMovementControllerParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    config: fullConfig.rhythmicMovement,
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    keyAdapter: container.get<IMessageAdapter>(TYPES.IKeyToDirectionAdapter),
    inputStateService: container.get<IInputStateService>(TYPES.IInputStateService),
    gameStateStore: container.get<IGameStateStoreService>(TYPES.IGameStateStoreService),
    gameplayMechanicsService: container.get<IGameplayMechanicsService>(TYPES.IGameplayMechanicsService),
  });

  // QUALIA.CODE v1.1: Bind NotificationServiceParams factory
  // Consolidates constructor parameters into a single object to comply with IoC limits
  // UPDATED: Added eventBus for event-driven diagnostics pattern
  safeBindConstant<NotificationServiceParams>(TYPES.NotificationServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    config: fullConfig.notificationService,
    gameStateStore: container.get<IGameStateStore>(TYPES.IGameStateStore),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    throttlingManager: container.get<ThrottlingManager>(TYPES.ThrottlingManager),
  });

  // QUALIA.CODE v1.1: Bind FrontendRenderingServiceParams factory
  // Consolidates 5 constructor parameters into a single object to comply with IoC limits
  safeBindConstant<FrontendRenderingServiceParams>(TYPES.FrontendRenderingServiceParams, {
    logger: container.get<ILogger>(TYPES.ILogger),
    performanceService: container.get<IPerformanceService>(TYPES.IPerformanceService),
    postProcessingService: container.get<IPostProcessingService>(TYPES.IPostProcessingService),
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    config: fullConfig.frontendRendering,
  });

  // QUALIA.CODE v1.1: Bind GameControllerServiceParams factory
  // ARCHITECTURAL FIX: Explicit dependency injection - no Service Locator anti-pattern
  // Each service is injected individually for complete transparency of dependencies
  safeBindConstant<GameControllerServiceParams>(TYPES.GameControllerServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    config: fullConfig.gameController,
    gameStateStoreService: container.get<IGameStateStoreService>(TYPES.IGameStateStoreService),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    performanceService: container.get<IPerformanceService>(TYPES.IPerformanceService),
    audioService: container.get<IAudioService>(TYPES.IAudioService),
  });

  // QUALIA.CODE v1.1: Bind QualiaStateCalculatorServiceParams factory
  // Consolidates 5 constructor parameters into a single object to comply with IoC limits
  safeBindConstant<QualiaStateCalculatorServiceParams>(TYPES.QualiaStateCalculatorServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    config: fullConfig.qualiaCalculator,
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    performanceService: container.get<IPerformanceService>(TYPES.IPerformanceService),
  });

  // QUALIA.CODE v1.1: Bind StateStreamingServiceParams factory
  // Consolidates 5 constructor parameters into a single object to comply with IoC limits
  safeBindConstant<StateStreamingServiceParams>(TYPES.StateStreamingServiceParams, {
    webSocketService: container.get<IWebSocketService>(TYPES.IWebSocketService),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    config: fullConfig.backendSync.streaming,
    logger: container.get<ILogger>(TYPES.ILogger),
    messageAdapter: container.get<IMessageAdapter>(TYPES.IRawToParticleEventAdapter),
  });

  // QUALIA.CODE v1.1: Bind WebSocketServiceParams factory
  // Consolidates constructor parameters into a single object to comply with IoC limits
  safeBindConstant<WebSocketServiceParams>(TYPES.WebSocketServiceParams, {
    logger: container.get<ILogger>(TYPES.ILogger),
    webSocketFactory: container.get<IWebSocketFactory>(TYPES.IWebSocketFactory),
    config: fullConfig.backendSync,
  });

  // NEW SERVICES CONFIGURATION BINDINGS - QUALIA.CODE v1.1 Compliant (no 'as any' casts)
  safeBindConstant(TYPES.GameplayMechanicsConfig, fullConfig.gameplayMechanics);
  safeBindConstant<ViewLogicConfig>(TYPES.ViewLogicConfig, fullConfig.viewLogic);
  safeBindConstant(TYPES.SubtitleConfig, fullConfig.subtitle);
  safeBindConstant(TYPES.DebugOrchestratorConfig, fullConfig.debugOrchestrator);
  safeBindConstant<GameStateStoreConfig>(TYPES.GameStateStoreConfig, fullConfig.gameStateStore);
  safeBindConstant<PostProcessingConfig>(TYPES.PostProcessingConfig, fullConfig.postProcessing);
  safeBindConstant<ProtocolAdapterConfig>(TYPES.ProtocolAdapterConfig, fullConfig.protocolAdapter);

  // QUALIA.CODE v1.1: Bind ApplicationInitializerServiceParams factory
  // Consolidates 14 constructor parameters into a single object to comply with IoC limits
  safeBindConstant<ApplicationInitializerServiceParams>(TYPES.ApplicationInitializerServiceParams, {
    config: fullConfig.applicationInitializer,
    backendSyncService: container.get<IBackendSyncService>(TYPES.IBackendSyncService),
    gameStateStoreService: container.get<IGameStateStoreService>(TYPES.IGameStateStoreService),
    gameControllerService: container.get<IGameControllerService>(TYPES.IGameControllerService),
    rhythmicMovementController: container.get<IRhythmicMovementController>(TYPES.IRhythmicMovementController),
    notificationService: container.get<INotificationService>(TYPES.INotificationService),
    errorReportingService: container.get<IErrorReportingService>(TYPES.IErrorReportingService),
    debugService: container.get<IDebugService>(TYPES.IDebugService),
    stateStreamingService: container.get<IStateStreamingService>(TYPES.IStateStreamingService),
    logger: container.get<ILogger>(TYPES.ILogger),
    gameplayMechanicsService: container.get<IGameplayMechanicsService>(TYPES.IGameplayMechanicsService),
    viewLogicService: container.get<IViewLogicService>(TYPES.IViewLogicService),
    subtitleService: container.get<ISubtitleService>(TYPES.ISubtitleService),
    debugOrchestratorService: container.get<IDebugOrchestratorService>(TYPES.IDebugOrchestratorService),
  });

  // QUALIA.CODE v1.1: Bind DebugOrchestratorServiceParams factory
  // Event-driven pattern: Services no longer injected directly
  // Pattern: Push (event-driven) instead of Pull (method calls)
  // DIRECTIVA 03: eventBus added for getStats() access
  safeBindConstant<DebugOrchestratorServiceParams>(TYPES.DebugOrchestratorServiceParams, {
    config: fullConfig.debugOrchestrator,
    logger: container.get<ILogger>(TYPES.ILogger),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    performanceService: container.get<IPerformanceService>(TYPES.IPerformanceService),
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    // REMOVED: notificationService, errorReportingService
    // Services will emit ServiceStatusUpdateEvent for passive aggregation
  });

  // QUALIA.CODE v1.1: Bind AudioServiceParams factory
  // Consolidates 6 constructor parameters into a single object to comply with IoC limits
  safeBindConstant<AudioServiceParams>(TYPES.AudioServiceParams, {
    eventBus: container.get<EventBus>(TYPES.IEventBus),
    logger: container.get<QualiaLogger>(TYPES.ILogger),
    config: fullConfig.audioService,
    audioEngine: container.get<IOntologicalAudioEngine>(TYPES.IOntologicalAudioEngine),
    webAudioAPIService: container.get<IWebAudioAPIService>(TYPES.IWebAudioAPIService),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
  });

  // QUALIA.CODE v1.1: Bind BackendSyncServiceParams factory
  // Consolidates 6 constructor parameters into a single object to comply with IoC limits
  safeBindConstant<BackendSyncServiceParams>(TYPES.BackendSyncServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    config: fullConfig.backendSync,
    httpService: container.get<IHttpService>(TYPES.IHttpService),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    performanceService: container.get<IPerformanceService>(TYPES.IPerformanceService),
  });

  // QUALIA.CODE v1.1: Bind DebugServiceParams factory
  // Consolidates 5 constructor parameters into a single object to comply with IoC limits
  safeBindConstant<DebugServiceParams>(TYPES.DebugServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    config: fullConfig.debugService,
    performanceService: container.get<IPerformanceService>(TYPES.IPerformanceService),
  });

  // QUALIA.CODE v1.1: Bind ErrorReportingServiceParams factory
  // Consolidates 5 constructor parameters into a single object to comply with IoC limits
  safeBindConstant<ErrorReportingServiceParams>(TYPES.ErrorReportingServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    httpService: container.get<IHttpService>(TYPES.IHttpService),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    config: fullConfig.errorReporting,
  });

  // ===== EMIT CONFIGURATION LOADED EVENT =====
  // CRITICAL: Emit ConfigurationLoadedEvent to notify all services that configuration is ready
  // This breaks the circular dependency by centralizing event emission in IoC setup
  const eventBus = container.get<IEventBus>(TYPES.IEventBus);
  const configManifest = container.get<Record<string, string>>(TYPES.ConfigManifest);
  const loadedConfigs = Object.keys(configManifest);
  const totalConfigs = loadedConfigs.length;

  const configLoadedEvent: ConfigurationLoadedEvent = {
    type: "ConfigurationLoaded",
    timestamp: new Date(),
    source: "ConfigurationService",
    loadedConfigs,
    totalConfigs,
  };

  eventBus.emit(configLoadedEvent);
}

// ===== CONTAINER VERIFICATION =====
// Container is configured and ready
// CRITICAL: Call configureServices() before using any service that requires configuration

export { container };
