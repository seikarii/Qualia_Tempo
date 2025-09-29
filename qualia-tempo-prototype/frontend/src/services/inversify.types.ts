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

  // ===== FEATURE SERVICES =====
  IQualiaStateCalculatorService: Symbol.for("IQualiaStateCalculatorService"),
  IBackendSyncService: Symbol.for("IBackendSyncService"),
  IAudioService: Symbol.for("IAudioService"),
  IGameControllerService: Symbol.for("IGameControllerService"),
  IGameStateStoreService: Symbol.for("IGameStateStoreService"),
  INotificationService: Symbol.for("INotificationService"),
  IErrorReportingService: Symbol.for("IErrorReportingService"),
  IDebugService: Symbol.for("IDebugService"),
  IRhythmicMovementController: Symbol.for("IRhythmicMovementController"),
  IOntologicalAudioEngine: Symbol.for("IOntologicalAudioEngine"),
  IApplicationInitializerService: Symbol.for("IApplicationInitializerService"),
  IWebAudioAPIService: Symbol.for("IWebAudioAPIService"),
  IFrontendRenderingService: Symbol.for("IFrontendRenderingService"),
  IStateStreamingService: Symbol.for("IStateStreamingService"),

  // ===== SPECIAL TYPES =====
  // Used for injecting Zustand store setter function
  StoreSetter: Symbol.for("StoreSetter"),
  IGameStateStore: Symbol.for("IGameStateStore"),

  // Configuration values for services
  ConfigBasePath: Symbol.for("ConfigBasePath"),
  ConfigManifest: Symbol.for("ConfigManifest"),

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
  AudioServiceConfig: Symbol.for("AudioServiceConfig"),
  NotificationServiceConfig: Symbol.for("NotificationServiceConfig"),
  ErrorReportingConfig: Symbol.for("ErrorReportingConfig"),
  DebugServiceConfig: Symbol.for("DebugServiceConfig"),
  VisualEffectsConfig: Symbol.for("VisualEffectsConfig"),
} as const;

// Type-safe access to TYPES
export type ServiceTypes = (typeof TYPES)[keyof typeof TYPES];
