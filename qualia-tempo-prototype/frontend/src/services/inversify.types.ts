/**
 * QUALIA.CODE v1.1 - InversifyJS Service Types
 * Symbol-based service identifiers for dependency injection.
 *
 * CRITICAL: These symbols are the ONLY way to identify services in the IoC container.
 * Using strings or other identifiers is PROHIBITED.
 */

export const TYPES = {
  // ===== CORE SERVICES =====
  IEventBus: Symbol.for("IEventBus"),
  ILogger: Symbol.for("ILogger"),
  IConfigurationService: Symbol.for("IConfigurationService"),
  IHttpService: Symbol.for("IHttpService"),
  ITimerService: Symbol.for("ITimerService"),
  IPerformanceService: Symbol.for("IPerformanceService"),
  IPerformanceProvider: Symbol.for("IPerformanceProvider"),
  ITimerProvider: Symbol.for("ITimerProvider"),
  
  // ===== QUALIA.CODE v2.0: NEW ANALYSIS SERVICES =====
  IAudioAnalysisService: Symbol.for("IAudioAnalysisService"),
  IPhysicsService: Symbol.for("IPhysicsService"),
  AudioAnalysisServiceConfig: Symbol.for("AudioAnalysisServiceConfig"),
  AudioAnalysisServiceParams: Symbol.for("AudioAnalysisServiceParams"),
  PhysicsServiceConfig: Symbol.for("PhysicsServiceConfig"),
  PhysicsServiceParams: Symbol.for("PhysicsServiceParams"),

  // ===== FEATURE SERVICES =====
  IQualiaStateCalculatorService: Symbol.for("IQualiaStateCalculatorService"),
  IBackendSyncService: Symbol.for("IBackendSyncService"),
  IAudioService: Symbol.for("IAudioService"),
  IGameControllerService: Symbol.for("IGameControllerService"),
  IGameInputControllerService: Symbol.for("IGameInputControllerService"),
  IGameStateStoreService: Symbol.for("IGameStateStoreService"),
  INotificationService: Symbol.for("INotificationService"),
  IErrorReportingService: Symbol.for("IErrorReportingService"),
  IDebugService: Symbol.for("IDebugService"),
  IRhythmicMovementController: Symbol.for("IRhythmicMovementController"),
  IOntologicalAudioEngine: Symbol.for("IOntologicalAudioEngine"),
  IApplicationInitializerService: Symbol.for("IApplicationInitializerService"),
  IInputStateService: Symbol.for("IInputStateService"),
  IWebAudioAPIService: Symbol.for("IWebAudioAPIService"),
  IAudioContextFactory: Symbol.for("IAudioContextFactory"),
  IFrontendRenderingService: Symbol.for("IFrontendRenderingService"),
  IStateStreamingService: Symbol.for("IStateStreamingService"),
  IWebSocketService: Symbol.for("IWebSocketService"),
  IWebSocketFactory: Symbol.for("IWebSocketFactory"),
  WebSocketServiceParams: Symbol.for("WebSocketServiceParams"),
  IBrowserEventsService: Symbol.for("IBrowserEventsService"),

  // ===== NEW SERVICES =====
  IShaderLoaderService: Symbol.for("IShaderLoaderService"),
  IGlslParser: Symbol.for("IGlslParser"),
  IShaderIntrospectionService: Symbol.for("IShaderIntrospectionService"),
  IPostProcessingService: Symbol.for("IPostProcessingService"),
  PostProcessingServiceParams: Symbol.for("PostProcessingServiceParams"),
  IGameplayMechanicsService: Symbol.for("IGameplayMechanicsService"),
  IViewLogicService: Symbol.for("IViewLogicService"),
  ISubtitleService: Symbol.for("ISubtitleService"),
  IDebugOrchestratorService: Symbol.for("IDebugOrchestratorService"),
  IStateMergerService: Symbol.for("IStateMergerService"),

  // ===== PROTOCOL ADAPTERS =====
  IKeyToDirectionAdapter: Symbol.for("IKeyToDirectionAdapter"),
  IRawToParticleEventAdapter: Symbol.for("IRawToParticleEventAdapter"),

  // ===== COORDINATE SYSTEM SERVICES =====
  ICoordinateSystemService: Symbol.for("ICoordinateSystemService"),

  // ===== COLOR SERVICES =====
  IColorService: Symbol.for("IColorService"),

  // ===== AUDIO SYSTEM BRIDGE =====
  IAudioSystemBridge: Symbol.for("IAudioSystemBridge"),

  // ===== SPECIAL TYPES =====
  IGameStateStore: Symbol.for("IGameStateStore"),
  ThrottlingManager: Symbol.for("ThrottlingManager"),
  ThrottlingConfig: Symbol.for("ThrottlingConfig"),
  
  // ===== LIFECYCLE MANAGEMENT =====
  // QUALIA.CODE v2.0: Multi-injection symbol for automatic service lifecycle management
  // All services implementing IBaseService are bound to this symbol for automated discovery
  ManagedService: Symbol.for("ManagedService"),

  // Configuration values for services
  ConfigBasePath: Symbol.for("ConfigBasePath"),
  ConfigManifest: Symbol.for("ConfigManifest"),
  CoordinateSystemConfig: Symbol.for("CoordinateSystemConfig"),

  // ===== CONFIGURATION CONTRACTS =====
  // Direct injection of typed configuration objects - eliminates Service Locator antipattern
  FullGameConfig: Symbol.for("FullGameConfig"),
  CompositionRootConfig: Symbol.for("CompositionRootConfig"),
  AppInitializerConfig: Symbol.for("AppInitializerConfig"),
  LoggerConfig: Symbol.for("LoggerConfig"),
  HttpConfig: Symbol.for("HttpConfig"),
  EventBusConfig: Symbol.for("EventBusConfig"),
  BackendSyncConfig: Symbol.for("BackendSyncConfig"),
  GameControllerConfig: Symbol.for("GameControllerConfig"),
  QualiaCalculatorConfig: Symbol.for("QualiaCalculatorConfig"),
  RhythmicMovementConfig: Symbol.for("RhythmicMovementConfig"),
  RhythmicMovementControllerParams: Symbol.for("RhythmicMovementControllerParams"),
  AudioServiceConfig: Symbol.for("AudioServiceConfig"),
  NotificationServiceConfig: Symbol.for("NotificationServiceConfig"),

  // QUALIA.CODE v1.1: Constructor Parameter Objects
  NotificationServiceParams: Symbol.for("NotificationServiceParams"),
  ErrorReportingConfig: Symbol.for("ErrorReportingConfig"),
  ErrorReportingServiceParams: Symbol.for("ErrorReportingServiceParams"),
  DebugServiceConfig: Symbol.for("DebugServiceConfig"),
  DebugServiceParams: Symbol.for("DebugServiceParams"),
  FrontendRenderingConfig: Symbol.for("FrontendRenderingConfig"),

  // QUALIA.CODE v1.1: Constructor Parameter Objects
  FrontendRenderingServiceParams: Symbol.for("FrontendRenderingServiceParams"),
  GameControllerServiceParams: Symbol.for("GameControllerServiceParams"),
  QualiaStateCalculatorServiceParams: Symbol.for("QualiaStateCalculatorServiceParams"),
  StateStreamingServiceParams: Symbol.for("StateStreamingServiceParams"),
  GBufferPassParams: Symbol.for("GBufferPassParams"),
  ApplicationInitializerServiceParams: Symbol.for("ApplicationInitializerServiceParams"),
  DebugOrchestratorServiceParams: Symbol.for("DebugOrchestratorServiceParams"),
  AudioServiceParams: Symbol.for("AudioServiceParams"),
  BackendSyncServiceParams: Symbol.for("BackendSyncServiceParams"),
  IToneFactoryService: Symbol.for("IToneFactoryService"),
  VisualEffectsConfig: Symbol.for("VisualEffectsConfig"),
  StreamingConfig: Symbol.for("StreamingConfig"),

  // ===== NEW SERVICES CONFIGURATION =====
  GameplayMechanicsConfig: Symbol.for("GameplayMechanicsConfig"),
  ViewLogicConfig: Symbol.for("ViewLogicConfig"),
  SubtitleConfig: Symbol.for("SubtitleConfig"),
  DebugOrchestratorConfig: Symbol.for("DebugOrchestratorConfig"),
  GameStateStoreConfig: Symbol.for("GameStateStoreConfig"),
  PostProcessingConfig: Symbol.for("PostProcessingConfig"),
  ProtocolAdapterConfig: Symbol.for("ProtocolAdapterConfig"),
  TimerServiceConfig: Symbol.for("TimerServiceConfig"),
  AudioSessionConfig: Symbol.for("AudioSessionConfig"),

  // ===== RENDER TARGET POOLING =====
  IRenderTargetPoolService: Symbol.for("IRenderTargetPoolService"),
  RenderTargetPoolConfig: Symbol.for("RenderTargetPoolConfig"),

  // ===== TEMPORAL EFFECTS (PHASE 4) =====
  IJitterService: Symbol.for("IJitterService"),
  JitterServiceConfig: Symbol.for("JitterServiceConfig"),
} as const;

// Type-safe access to TYPES
export type ServiceTypes = (typeof TYPES)[keyof typeof TYPES];
