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
import type { JitterServiceConfig } from "./contracts/IJitterService.contracts";
import type { QualiaCalculatorWorkerServiceConfig } from "./contracts/IQualiaCalculatorWorkerService.contracts";

// QUALIA.CODE v2.0: Analysis Services Configuration Imports
import type { AudioAnalysisServiceParams } from "./contracts/IAudioAnalysisService.contracts";
import type { Audio8DServiceParams } from "./contracts/IAudio8DService.contracts";
import type { PhysicsServiceParams } from "./contracts/IPhysicsService.contracts";

// PHASE 5: Kairos Visual Engine Configuration Imports
import type { KairosVisualEngineConfig, KairosVisualEngineParams } from "./contracts/IKairosVisualEngine.contracts";

// NEW SERVICES CONFIGURATION IMPORTS
// Future configuration imports for additional services
// import type { GameplayMechanicsConfig } from "./contracts/IGameplayMechanicsService.contracts";
import type { ViewLogicConfig } from "./contracts/IViewLogicService.contracts";
// import type { SubtitleConfig } from "./contracts/ISubtitleService.contracts";
// import type { DebugOrchestratorConfig } from "./contracts/IDebugOrchestratorService.contracts";
import type { GameStateStoreConfig } from "./contracts/IGameStateStoreService.contracts";
import type { PostProcessingConfig, PostProcessingServiceParams } from "./contracts/IPostProcessingService.contracts";
import type { ProtocolAdapterConfig } from "./contracts/IProtocolAdapter.contracts";
import type { TimerServiceConfig } from "./contracts/ITimerService.contracts";
import type { AudioSessionConfig } from "./contracts/IAudioSystemBridge.contracts";

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
import type { IAudioContextFactory } from "./interfaces/IAudioContextFactory";
import type { IGameStateStore } from "./interfaces/IGameStateStore";
import type { IInputStateService } from "./interfaces/IInputStateService";
import type { IFrontendRenderingService } from "./interfaces/IFrontendRenderingService";
import type { IStateStreamingService } from "./interfaces/IStateStreamingService";
import type { IWebSocketService } from "./interfaces/IWebSocketService";
import type { IWebSocketFactory } from "./interfaces/IWebSocketFactory";
import type { IBrowserEventsService } from "./interfaces/IBrowserEventsService";
import type { ICoordinateSystemService } from "./interfaces/ICoordinateSystemService";
import type { IToneFactoryService } from "../audio/interfaces/IToneFactoryService";
import type { IStateMergerService } from "./interfaces/IStateMergerService";
import type { IAudioSystemBridge } from "./interfaces/IAudioSystemBridge";
import type { IBaseService } from "./interfaces/IBaseService";
import type { IQualiaCalculatorWorkerService } from "./interfaces/IQualiaCalculatorWorkerService";
import type { IKairosVisualEngine } from "./interfaces/IKairosVisualEngine";

// ===== IMPORT ALL IMPLEMENTATIONS =====
import { ConfigurationService } from "./ConfigurationService";
import { HttpService } from "./HttpService";
import { TimerService } from "./TimerService";
import { PerformanceService } from "./PerformanceService";
import { PerformanceProvider } from "./providers/PerformanceProvider";
import { BrowserTimerProvider } from "./providers/BrowserTimerProvider";
import { QualiaStateCalculatorService } from "./QualiaStateCalculatorService";
import { QualiaCalculatorWorkerService } from "./QualiaCalculatorWorkerService";
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
import { BrowserAudioContextFactory } from "./BrowserAudioContextFactory";
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
import { StateMergerService } from "./StateMergerService";
import { AudioSystemBridge } from "./AudioSystemBridge";
import { JitterService } from "./JitterService";
import { KairosVisualEngine } from "./KairosVisualEngine";

// ===== PROTOCOL ADAPTER IMPORTS =====
// QUALIA.CODE v1.2 - Protocol Adapter Bundle
import type { IMessageAdapter } from "./protocol/IMessageAdapter";
import type { IEventTransformer } from "./protocol/IEventTransformer";
import { RawToParticleEventAdapter } from "./protocol/adapters/RawToParticleEventAdapter";
import { KeyToDirectionAdapter } from "./protocol/adapters/KeyToDirectionAdapter";
import type { PlayerInputEvent, PlayerDirectionEvent } from "./contracts/events.contracts";

// ===== CORE SERVICE BINDINGS =====
// These services have no dependencies and can be bound directly
container.bind<IEventBus>(TYPES.IEventBus).to(EventBus).inSingletonScope();
container.bind<ILogger>(TYPES.ILogger).to(QualiaLogger).inSingletonScope();

// Bind configuration values for ConfigurationService
container.bind<string>(TYPES.ConfigBasePath).toConstantValue("/config/");
container.bind<Record<string, string>>(TYPES.ConfigManifest).toConstantValue({
  "compositionRoot": "composition-root.yaml",
  "applicationInitializer": "application-initializer.yaml",
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
  "timerService": "timer-service.yaml",
  "audioSession": "audio-session.yaml",
  // QUALIA.CODE v2.0: New analysis services
  "audioAnalysis": "audio-analysis-service.yaml",
  "audio8D": "audio-8d.yaml",
  "musicalComboDetector": "musical-combo-detector.yaml",
  "physics": "physics-service.yaml",
  // PHASE 4: Temporal Effects & Post-Processing Passes
  "jitterService": "jitter-service.yaml",
  "bloomPass": "bloom-pass.yaml",
  "taaPass": "taa-pass.yaml",
  "motionBlurPass": "motion-blur-pass.yaml",
  "dofPass": "dof-pass.yaml",
  // PHASE 3: Web Worker Services
  "qualiaCalculatorWorker": "qualia-calculator-worker.yaml",
  // PHASE 5: Kairos Visual Engine
  "kairosVisual": "kairos-visual.yaml"
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
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.IQualiaStateCalculatorService);

// PHASE 3: Web Worker-based Qualia Calculator (ARCHITECTURE.GOLD.CODE - DOMINIO 2)
container
  .bind<IQualiaCalculatorWorkerService>(TYPES.IQualiaCalculatorWorkerService)
  .to(QualiaCalculatorWorkerService)
  .inSingletonScope();
container
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.IQualiaCalculatorWorkerService);

container
  .bind<IBackendSyncService>(TYPES.IBackendSyncService)
  .to(BackendSyncService)
  .inSingletonScope();
container
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.IBackendSyncService);
container
  .bind<IAudioService>(TYPES.IAudioService)
  .to(AudioService)
  .inSingletonScope();
container
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.IAudioService);
container
  .bind<IGameControllerService>(TYPES.IGameControllerService)
  .to(GameControllerService)
  .inSingletonScope();
container
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.IGameControllerService);
container
  .bind<IGameInputControllerService>(TYPES.IGameInputControllerService)
  .to(GameInputControllerService)
  .inSingletonScope();
container
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.IGameInputControllerService);
container
  .bind<IGameStateStoreService>(TYPES.IGameStateStoreService)
  .to(GameStateStoreService)
  .inSingletonScope();
container
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.IGameStateStoreService);
// QUALIA.CODE: Complete service bindings - All services implemented and bound
container
  .bind<INotificationService>(TYPES.INotificationService)
  .to(NotificationService)
  .inSingletonScope();
container
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.INotificationService);
// QUALIA.CODE v1.1: StateMergerService - Deep merge for state integrity
container
  .bind<IStateMergerService>(TYPES.IStateMergerService)
  .to(StateMergerService)
  .inSingletonScope();
container
  .bind<IErrorReportingService>(TYPES.IErrorReportingService)
  .to(ErrorReportingService)
  .inSingletonScope();
container
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.IErrorReportingService);
container
  .bind<IDebugService>(TYPES.IDebugService)
  .to(DebugService)
  .inSingletonScope();
container
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.IDebugService);
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

// QUALIA.CODE v1.2: Factory Pattern for Platform Abstraction
container
  .bind<IAudioContextFactory>(TYPES.IAudioContextFactory)
  .to(BrowserAudioContextFactory)
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
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.IFrontendRenderingService);

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

// ===== AUDIO SYSTEM BRIDGE BINDING =====
// QUALIA.CODE v1.1: Audio session management bridge to Electron main process
container
  .bind<IAudioSystemBridge>(TYPES.IAudioSystemBridge)
  .to(AudioSystemBridge)
  .inSingletonScope();

// ===== COORDINATE SYSTEM SERVICE BINDING =====
container
  .bind<ICoordinateSystemService>(TYPES.ICoordinateSystemService)
  .to(CoordinateSystemService)
  .inSingletonScope();

// ===== COLOR SERVICE BINDING =====
// QUALIA.CODE v1.1 Remediation: Centralized color conversion service
// Replaces ad-hoc "simplified" implementations with industry-standard library
import { ColorService } from './ColorService';
import type { IColorService } from './interfaces/IColorService';

container
  .bind<IColorService>(TYPES.IColorService)
  .to(ColorService)
  .inSingletonScope();

// ===== NEW ARCHITECTURAL SERVICES =====
// QUALIA.CODE v1.1 - Business Logic Extraction Services
import { GameplayMechanicsService } from './GameplayMechanicsService';
import { ViewLogicService } from './ViewLogicService';
import { SubtitleService } from './SubtitleService';
import { DebugOrchestratorService } from './DebugOrchestratorService';
import { ShaderLoaderService } from './ShaderLoaderService';
import { JsGlslParserService } from './JsGlslParserService';
import { ShaderIntrospectionService } from './ShaderIntrospectionService';
import { PostProcessingService } from './PostProcessingService';
import { RenderTargetPoolService } from './RenderTargetPoolService';
import type { IGameplayMechanicsService } from './interfaces/IGameplayMechanicsService';
import type { IViewLogicService } from './interfaces/IViewLogicService';
import type { ISubtitleService } from './interfaces/ISubtitleService';
import type { IDebugOrchestratorService } from './interfaces/IDebugOrchestratorService';
import type { IShaderLoaderService } from './interfaces/IShaderLoaderService';
import type { IGlslParser } from './interfaces/IGlslParser';
import type { IShaderIntrospectionService } from './interfaces/IShaderIntrospectionService';
import type { IPostProcessingService } from './interfaces/IPostProcessingService';
import type { IRenderTargetPoolService } from './interfaces/IRenderTargetPoolService';

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
container
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.IDebugOrchestratorService);

// ===== QUALIA.CODE v2.0: AUDIO ANALYSIS AND PHYSICS SERVICES =====
import { AudioAnalysisService } from './AudioAnalysisService';
import { PhysicsService } from './PhysicsService';
import type { IAudioAnalysisService } from './interfaces/IAudioAnalysisService';
import type { IPhysicsService } from './interfaces/IPhysicsService';

// ===== PHASE 4: AUDIO ADVANCED SERVICES =====
import { Audio8DService } from './Audio8DService';
import type { IAudio8DService } from './interfaces/IAudio8DService';
import { MusicalComboDetectorService } from './MusicalComboDetectorService';
import type { IMusicalComboDetectorService } from './interfaces/IMusicalComboDetectorService';
import type { MusicalComboDetectorServiceParams } from './contracts/IMusicalComboDetectorService.contracts';

container
  .bind<IAudioAnalysisService>(TYPES.IAudioAnalysisService)
  .to(AudioAnalysisService)
  .inSingletonScope();
container
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.IAudioAnalysisService);

container
  .bind<IAudio8DService>(TYPES.IAudio8DService)
  .to(Audio8DService)
  .inSingletonScope();
container
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.IAudio8DService);

container
  .bind<IMusicalComboDetectorService>(TYPES.IMusicalComboDetectorService)
  .to(MusicalComboDetectorService)
  .inSingletonScope();
container
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.IMusicalComboDetectorService);

container
  .bind<IPhysicsService>(TYPES.IPhysicsService)
  .to(PhysicsService)
  .inSingletonScope();

// ===== SHADER AND POST-PROCESSING SERVICES =====
container
  .bind<IShaderLoaderService>(TYPES.IShaderLoaderService)
  .to(ShaderLoaderService)
  .inSingletonScope();

// CRISALIDA.CODE v1.1: GLSL Parser Service (Tactical JS Implementation)
// This binding enables zero-impact replacement with Wasm parser in the future
container
  .bind<IGlslParser>(TYPES.IGlslParser)
  .to(JsGlslParserService)
  .inSingletonScope();

container
  .bind<IShaderIntrospectionService>(TYPES.IShaderIntrospectionService)
  .to(ShaderIntrospectionService)
  .inSingletonScope();

container
  .bind<IPostProcessingService>(TYPES.IPostProcessingService)
  .to(PostProcessingService)
  .inSingletonScope();

container
  .bind<IRenderTargetPoolService>(TYPES.IRenderTargetPoolService)
  .to(RenderTargetPoolService)
  .inSingletonScope();

// ===== PHASE 5: KAIROS VISUAL ENGINE =====
container
  .bind<IKairosVisualEngine>(TYPES.IKairosVisualEngine)
  .to(KairosVisualEngine)
  .inSingletonScope();

container
  .bind<IBaseService>(TYPES.ManagedService)
  .toService(TYPES.IKairosVisualEngine);

// ===== PHASE 4: TEMPORAL EFFECTS SERVICES =====
import type { IJitterService } from './interfaces/IJitterService';

container
  .bind<IJitterService>(TYPES.IJitterService)
  .to(JitterService)
  .inSingletonScope();

// ===== PROTOCOL ADAPTER BINDINGS =====
// QUALIA.CODE v1.2 - Protocol Adapter Bundle
container
  .bind<IMessageAdapter>(TYPES.IRawToParticleEventAdapter)
  .to(RawToParticleEventAdapter)
  .inSingletonScope();

container
  .bind<IEventTransformer<PlayerInputEvent, PlayerDirectionEvent>>(TYPES.IKeyToDirectionAdapter)
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

/**
 * Creates bootstrap configurations for core infrastructure services.
 * These are minimal configs that enable ConfigurationService to load the full config.
 * They get replaced with real configs after ConfigurationService loads.
 * 
 * NOTE: Bootstrap values are intentionally hardcoded to break circular dependency.
 * ESLint suppression justified: These bootstrap configs are temporary and get replaced.
 */
/* eslint-disable @qualia-tempo/qualia-code/no-hardcoded-config */
function createBootstrapConfigs(): { http: HttpConfig; timer: TimerServiceConfig } {
  const bootstrapHttpConfig: HttpConfig = {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    headers: {},
    baseUrl: "",
    enableCompression: false,
    enableCaching: false
  };
  
  const bootstrapTimerConfig: TimerServiceConfig = {
    messages: {
      timerServiceInitialized: "[BOOTSTRAP] TimerService initialized (minimal config)",
      performanceServiceInitialized: "[BOOTSTRAP] PerformanceService initialized (minimal config)"
    },
    timer: {
      performance: { enableTracking: false, slowTimerThreshold: 1000 },
      cleanup: { cleanupInterval: 60000, maxTrackedTimers: 1000 },
      debug: { enableDebugLogging: false, logTimerLifecycle: false }
    }
  };

  return { http: bootstrapHttpConfig, timer: bootstrapTimerConfig };
}
/* eslint-enable @qualia-tempo/qualia-code/no-hardcoded-config */

/**
 * Emits ConfigurationLoadedEvent to notify all services that configuration is ready.
 */
function emitConfigurationLoadedEvent(): void {
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

export async function configureServices(): Promise<void> {
  // CRITICAL: Use container.isBound() instead of static flags for React.StrictMode immunity
  if (container.isBound(TYPES.FullGameConfig)) {
    return; // Configuration already loaded
  }

  // BOOTSTRAP PHASE: Bind minimal configs for core infrastructure services
  // This breaks the circular dependency: ConfigurationService → HttpService → (TimerService, Config)
  const bootstrapConfigs = createBootstrapConfigs();
  
  if (!container.isBound(TYPES.HttpConfig)) {
    container.bind<HttpConfig>(TYPES.HttpConfig).toConstantValue(bootstrapConfigs.http);
  }
  if (!container.isBound(TYPES.TimerServiceConfig)) {
    container.bind<TimerServiceConfig>(TYPES.TimerServiceConfig).toConstantValue(bootstrapConfigs.timer);
  }

  // 1. Get ConfigurationService instance to load configuration
  const configService = container.get<IConfigurationService>(TYPES.IConfigurationService);
  
  // 2. Load all configuration ONE TIME
  const fullConfig = await configService.loadConfig();
  
  // 3. Unbind bootstrap configs and bind full configuration objects
  if (container.isBound(TYPES.HttpConfig)) {
    container.unbind(TYPES.HttpConfig);
  }
  if (container.isBound(TYPES.TimerServiceConfig)) {
    container.unbind(TYPES.TimerServiceConfig);
  }
  bindBasicConfigurations(fullConfig);
  bindServiceParameterObjects(fullConfig);

  // 4. Emit configuration loaded event
  emitConfigurationLoadedEvent();
}

// ===== HELPER FUNCTIONS FOR CONFIGURATION BINDING =====

/**
 * Binds all basic configuration objects to the container.
 * This function handles the core configuration bindings that are required by most services.
 */
function bindBasicConfigurations(fullConfig: FullGameConfig): void {
  // Bind each configuration object using safe binding pattern
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
  safeBindConstant<QualiaCalculatorWorkerServiceConfig>(TYPES.QualiaCalculatorWorkerServiceConfig, fullConfig.qualiaCalculatorWorker);
  safeBindConstant<RhythmicMovementConfig>(TYPES.RhythmicMovementConfig, fullConfig.rhythmicMovement);
  safeBindConstant<AudioServiceConfig>(TYPES.AudioServiceConfig, fullConfig.audioService);
  safeBindConstant<NotificationServiceConfig>(TYPES.NotificationServiceConfig, fullConfig.notificationService);
  safeBindConstant<ErrorReportingConfig>(TYPES.ErrorReportingConfig, fullConfig.errorReporting);
  safeBindConstant<DebugServiceConfig>(TYPES.DebugServiceConfig, fullConfig.debugService);
  safeBindConstant<FrontendRenderingConfig>(TYPES.FrontendRenderingConfig, fullConfig.frontendRendering);
  safeBindConstant<StreamingConfig>(TYPES.StreamingConfig, fullConfig.backendSync.streaming);
  safeBindConstant<TimerServiceConfig>(TYPES.TimerServiceConfig, fullConfig.timerService);
  safeBindConstant<AudioSessionConfig>(TYPES.AudioSessionConfig, fullConfig.audioSession);
  
  // QUALIA.CODE v2.0: New analysis services configurations
  safeBindConstant(TYPES.AudioAnalysisServiceConfig, fullConfig.audioAnalysis);
  safeBindConstant(TYPES.Audio8DServiceConfig, fullConfig.audio8D);
  safeBindConstant(TYPES.MusicalComboDetectorServiceConfig, fullConfig.musicalComboDetector);
  safeBindConstant(TYPES.PhysicsServiceConfig, fullConfig.physics);
  
  // PHASE 4: Temporal Effects configurations
  safeBindConstant<JitterServiceConfig>(TYPES.JitterServiceConfig, fullConfig.jitterService);
  
  // PHASE 5: Kairos Visual Engine configuration
  safeBindConstant<KairosVisualEngineConfig>(TYPES.KairosVisualEngineConfig, fullConfig.kairosVisual);
  
  // Bind ThrottlingConfig from NotificationService config
  safeBindConstant(TYPES.ThrottlingConfig, fullConfig.notificationService.throttling);
  
  // Bind CoordinateSystemConfig from RhythmicMovement config
  safeBindConstant<CoordinateSystemConfig>(TYPES.CoordinateSystemConfig, fullConfig.rhythmicMovement.coordinate_system);
}

/**
 * Binds all service parameter objects to the container using a topological sort approach.
 * 
 * ARCHITECTURAL PATTERN: Two-Phase Binding with Dependency Levels
 * ================================================================
 * This function implements a topological sort of service dependencies to prevent circular
 * dependency errors during IoC container resolution. Services are bound in "levels" where
 * each level only depends on services from previous levels.
 * 
 * Phase 1: Direct Configs (Level 0)
 *   - Bind simple config objects that services can inject directly
 *   - No container.get() calls, just config object binding
 * 
 * Phase 2: Service Params by Dependency Level
 *   - Level 2: Services that depend only on Level 0/1 (infrastructure + simple services)
 *   - Level 3: Services that depend on Level 2 services
 *   - Level 4: Services that depend on Level 3 services
 *   - Level 5: Orchestrator services that depend on everything
 * 
 * CRITICAL: Each level MUST be bound before the next level to ensure that when
 * container.get<IService>() is called in a Params binding, that service's own Params
 * have already been bound.
 * 
 * See: /docs/reports/DEPENDENCY_GRAPH_ANALYSIS_2025-10-05.md for full dependency analysis
 */
function bindServiceParameterObjects(fullConfig: FullGameConfig): void {
  // Phase 1: Direct config binding (no service dependencies)
  bindDirectConfigs(fullConfig);
  
  // Phase 2: Service Params binding in dependency order
  bindLevel2ServiceParams(fullConfig); // Services depending on infrastructure only
  bindLevel3ServiceParams(fullConfig); // Services depending on Level 2
  bindLevel4ServiceParams(fullConfig); // Services depending on Level 3
  bindLevel5ServiceParams(fullConfig); // Orchestrator services depending on all
}

// ============================================================================
// LEVEL 2: Services depending on infrastructure + simple config services
// ============================================================================
/**
 * Level 2 Service Params Binding
 * Dependencies: EventBus, Logger, TimerService, HttpService, PerformanceService (Level 0/1)
 *               OntologicalAudioEngine, WebAudioAPIService, ShaderLoader, ShaderIntrospection (Level 1)
 */
function bindLevel2ServiceParams(fullConfig: FullGameConfig): void {
  // Audio Service - needs OntologicalAudioEngine, WebAudioAPIService (both Level 1)
  safeBindConstant<AudioServiceParams>(TYPES.AudioServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    config: fullConfig.audioService,
    audioEngine: container.get<IOntologicalAudioEngine>(TYPES.IOntologicalAudioEngine),
    webAudioAPIService: container.get<IWebAudioAPIService>(TYPES.IWebAudioAPIService),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
  });

  // Qualia Calculator - needs only PerformanceService (Level 0)
  safeBindConstant<QualiaStateCalculatorServiceParams>(TYPES.QualiaStateCalculatorServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    config: fullConfig.qualiaCalculator,
    performanceService: container.get<IPerformanceService>(TYPES.IPerformanceService),
  });

  // PostProcessing Service - needs ShaderLoader, ShaderIntrospection, JitterService, Performance (all Level 1)
  safeBindConstant<PostProcessingServiceParams>(TYPES.PostProcessingServiceParams, {
    logger: container.get<ILogger>(TYPES.ILogger),
    shaderLoader: container.get<IShaderLoaderService>(TYPES.IShaderLoaderService),
    shaderIntrospection: container.get<IShaderIntrospectionService>(TYPES.IShaderIntrospectionService),
    performanceService: container.get<IPerformanceService>(TYPES.IPerformanceService),
    // eslint-disable-next-line @qualia-tempo/qualia-code/enforce-ioc-binding-order -- JitterService uses direct config injection (QUALIA.CODE v4.0), not params object
    jitterService: container.get<IJitterService>(TYPES.IJitterService),
    config: {
      enabled: fullConfig.postProcessing.enabled,
      renderTargetWidth: fullConfig.postProcessing.renderTargetWidth,
      renderTargetHeight: fullConfig.postProcessing.renderTargetHeight,
      orchestration: fullConfig.postProcessing.orchestration,
      bloom: fullConfig.bloomPass,
      taa: fullConfig.taaPass,
      motionBlur: fullConfig.motionBlurPass,
      dof: fullConfig.dofPass,
      jitter: fullConfig.jitterService,
    },
  });

  // WebSocket Service - needs WebSocketFactory (Level 1)
  safeBindConstant<WebSocketServiceParams>(TYPES.WebSocketServiceParams, {
    logger: container.get<ILogger>(TYPES.ILogger),
    webSocketFactory: container.get<IWebSocketFactory>(TYPES.IWebSocketFactory),
    config: fullConfig.backendSync,
  });
  
  // PHASE 5: Kairos Visual Engine - needs only base services (Level 0)
  safeBindConstant<KairosVisualEngineParams>(TYPES.KairosVisualEngineParams, {
    config: fullConfig.kairosVisual,
    logger: container.get<ILogger>(TYPES.ILogger),
    gameStateStore: container.get<IGameStateStore>(TYPES.IGameStateStore),
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
  });
}

// ============================================================================
// LEVEL 3: Services depending on Level 2 services
// ============================================================================
/**
 * Level 3 Service Params Binding
 * Dependencies: Level 2 services (AudioService, PostProcessingService, WebSocketService)
 */
function bindLevel3ServiceParams(fullConfig: FullGameConfig): void {
  // QUALIA.CODE v1.2: keyAdapter removed - @AdaptAndEmit decorator was never used in this service
  // Rhythmic Movement - needs InputStateService (Level 1), GameplayMechanicsService (Level 1)
  safeBindConstant<RhythmicMovementControllerParams>(TYPES.RhythmicMovementControllerParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    config: fullConfig.rhythmicMovement,
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    inputStateService: container.get<IInputStateService>(TYPES.IInputStateService),
    gameplayMechanicsService: container.get<IGameplayMechanicsService>(TYPES.IGameplayMechanicsService),
  });

  // Audio Analysis - needs WebAudioAPIService (Level 1)
  safeBindConstant<AudioAnalysisServiceParams>(TYPES.AudioAnalysisServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    webAudioService: container.get<IWebAudioAPIService>(TYPES.IWebAudioAPIService),
    config: fullConfig.audioAnalysis,
  });

  // Audio 8D Spatial - needs WebAudioAPIService (Level 1)
  safeBindConstant<Audio8DServiceParams>(TYPES.Audio8DServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    webAudioService: container.get<IWebAudioAPIService>(TYPES.IWebAudioAPIService),
    config: fullConfig.audio8D,
  });

  // Musical Combo Detector - needs EventBus, Logger, TimerService (Level 1)
  safeBindConstant<MusicalComboDetectorServiceParams>(TYPES.MusicalComboDetectorServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    config: fullConfig.musicalComboDetector,
  });

  // Physics Service - needs InputStateService (Level 1)
  safeBindConstant<PhysicsServiceParams>(TYPES.PhysicsServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    inputStateService: container.get<IInputStateService>(TYPES.IInputStateService),
    config: fullConfig.physics,
  });

  // State Streaming - needs WebSocketService (Level 2)
  // QUALIA.CODE v1.2: messageAdapter removed - now resolved via IoC in @AdaptAndEmit decorator
  safeBindConstant<StateStreamingServiceParams>(TYPES.StateStreamingServiceParams, {
    webSocketService: container.get<IWebSocketService>(TYPES.IWebSocketService),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    config: fullConfig.backendSync.streaming,
    logger: container.get<ILogger>(TYPES.ILogger),
  });
}

// ============================================================================
// LEVEL 4: Services depending on Level 3 services
// ============================================================================
/**
 * Level 4 Service Params Binding
 * Dependencies: Level 3 services (AudioService, RhythmicMovement, etc.)
 */
/**
 * Binds game controller service parameters
 */
function bindGameControllerParams(fullConfig: FullGameConfig): void {
  safeBindConstant<GameControllerServiceParams>(TYPES.GameControllerServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    config: fullConfig.gameController,
    gameStateStoreService: container.get<IGameStateStoreService>(TYPES.IGameStateStoreService),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    performanceService: container.get<IPerformanceService>(TYPES.IPerformanceService),
    audioService: container.get<IAudioService>(TYPES.IAudioService),
    audioSystemBridge: container.get<IAudioSystemBridge>(TYPES.IAudioSystemBridge),
  });
}

/**
 * Binds rendering-related service parameters
 */
function bindRenderingParams(fullConfig: FullGameConfig): void {
  // Frontend Rendering - CRISALIDA.CODE v1.1: Added shader services for G-Buffer particles
  safeBindConstant<FrontendRenderingServiceParams>(TYPES.FrontendRenderingServiceParams, {
    logger: container.get<ILogger>(TYPES.ILogger),
    performanceService: container.get<IPerformanceService>(TYPES.IPerformanceService),
    postProcessingService: container.get<IPostProcessingService>(TYPES.IPostProcessingService),
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    shaderLoader: container.get<IShaderLoaderService>(TYPES.IShaderLoaderService),
    shaderIntrospection: container.get<IShaderIntrospectionService>(TYPES.IShaderIntrospectionService),
    config: fullConfig.frontendRendering,
  });
}

/**
 * Binds debugging and monitoring service parameters
 */
function bindDebugAndMonitoringParams(fullConfig: FullGameConfig): void {
  // Debug Service
  safeBindConstant<DebugServiceParams>(TYPES.DebugServiceParams, {
    logger: container.get<ILogger>(TYPES.ILogger),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    config: fullConfig.debugService,
    performanceService: container.get<IPerformanceService>(TYPES.IPerformanceService),
  });

  // Debug Orchestrator
  safeBindConstant<DebugOrchestratorServiceParams>(TYPES.DebugOrchestratorServiceParams, {
    config: fullConfig.debugOrchestrator,
    logger: container.get<ILogger>(TYPES.ILogger),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    performanceService: container.get<IPerformanceService>(TYPES.IPerformanceService),
  });

  // Error Reporting
  safeBindConstant<ErrorReportingServiceParams>(TYPES.ErrorReportingServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    httpService: container.get<IHttpService>(TYPES.IHttpService),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    config: fullConfig.errorReporting,
  });
}

function bindLevel4ServiceParams(fullConfig: FullGameConfig): void {
  bindGameControllerParams(fullConfig);
  bindRenderingParams(fullConfig);

  // Backend Sync - needs HttpService (Level 0)
  safeBindConstant<BackendSyncServiceParams>(TYPES.BackendSyncServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    config: fullConfig.backendSync,
    httpService: container.get<IHttpService>(TYPES.IHttpService),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    performanceService: container.get<IPerformanceService>(TYPES.IPerformanceService),
  });

  // Notification Service - needs GameStateStore (Level 1), ThrottlingManager (Level 1)
  safeBindConstant<NotificationServiceParams>(TYPES.NotificationServiceParams, {
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    logger: container.get<ILogger>(TYPES.ILogger),
    config: fullConfig.notificationService,
    gameStateStore: container.get<IGameStateStore>(TYPES.IGameStateStore),
    timerService: container.get<ITimerService>(TYPES.ITimerService),
    throttlingManager: container.get<ThrottlingManager>(TYPES.ThrottlingManager),
  });

  bindDebugAndMonitoringParams(fullConfig);
}

// ============================================================================
// LEVEL 5: Orchestrator services depending on all previous levels
// ============================================================================
/**
 * Level 5 Service Params Binding - Application Orchestrator
 * Dependencies: Infrastructure + Orchestration Services
 * 
 * QUALIA.CODE v2.0: Hybrid Injection Pattern
 * - Infrastructure Services: Logger, EventBus, Config (always needed)
 * - Orchestration Services: Services requiring explicit sequencing (injected here)
 * - Managed Services: IBaseService implementers (auto-discovered via @multiInject)
 * 
 * This hybrid approach:
 * - Keeps explicit control for complex orchestration sequences
 * - Automates @OnEvent lifecycle management via multi-injection
 * - Eliminates manual lists for simple initialize() calls
 */
function bindLevel5ServiceParams(fullConfig: FullGameConfig): void {
  // Application Initializer - receives infrastructure + orchestration services
  // Managed services (for @OnEvent lifecycle) are auto-injected via multi-injection
  safeBindConstant<ApplicationInitializerServiceParams>(TYPES.ApplicationInitializerServiceParams, {
    config: fullConfig.applicationInitializer,
    logger: container.get<ILogger>(TYPES.ILogger),
    eventBus: container.get<IEventBus>(TYPES.IEventBus),
    gameStateStoreService: container.get<IGameStateStoreService>(TYPES.IGameStateStoreService),
    backendSyncService: container.get<IBackendSyncService>(TYPES.IBackendSyncService),
    rhythmicMovementController: container.get<IRhythmicMovementController>(TYPES.IRhythmicMovementController),
    errorReportingService: container.get<IErrorReportingService>(TYPES.IErrorReportingService),
    debugService: container.get<IDebugService>(TYPES.IDebugService),
    notificationService: container.get<INotificationService>(TYPES.INotificationService),
    stateStreamingService: container.get<IStateStreamingService>(TYPES.IStateStreamingService),
  });
}

/**
 * Bind direct configuration objects (not wrapped in parameter objects).
 */
function bindDirectConfigs(fullConfig: FullGameConfig): void {
  safeBindConstant(TYPES.GameplayMechanicsConfig, fullConfig.gameplayMechanics);
  safeBindConstant<ViewLogicConfig>(TYPES.ViewLogicConfig, fullConfig.viewLogic);
  safeBindConstant(TYPES.SubtitleConfig, fullConfig.subtitle);
  safeBindConstant(TYPES.DebugOrchestratorConfig, fullConfig.debugOrchestrator);
  safeBindConstant<GameStateStoreConfig>(TYPES.GameStateStoreConfig, fullConfig.gameStateStore);
  safeBindConstant<PostProcessingConfig>(TYPES.PostProcessingConfig, fullConfig.postProcessing);
  safeBindConstant<ProtocolAdapterConfig>(TYPES.ProtocolAdapterConfig, fullConfig.protocolAdapter);
}

// ===== CONTAINER VERIFICATION =====
// Container is configured and ready
// CRITICAL: Call configureServices() before using any service that requires configuration

export { container };
