/**
 * GOLD.CODE: Isolated Container Testing Infrastructure
 * Supreme Guardian Directive Compliance
 *
 * This factory implements the CORRECT Isolated Container Architecture for testing,
 * ensuring supreme performance, isolation, and maintainability as per the architect's mandate.
 *
 * ARCHITECTURE OVERVIEW:
 * - The createTestContainer function creates a completely new Container() for each test
 *   to guarantee total isolation and prevent cross-contamination between tests.
 * - All mock services are centralized in src/testing/mocks/ directory for maintainability.
 *
 * MANDATE: NO manual service instantiation. NO API fabrication. NO monkey-patching.
 * OBLIGATION: All Service Under Test (SUT) must be resolved from a correctly created container.
 */

import { vi, type Mock } from "vitest";
import { Container } from "inversify";
import { TYPES } from "../services/inversify.types";

// Import all necessary interfaces for type safety
import type { ILogger } from "../services/interfaces/ILogger";
import type { IEventBus } from "../services/interfaces/IEventBus";
import type { IGameStateStore } from "../services/interfaces/IGameStateStore";
import type { IGameStateStoreService } from "../services/interfaces/IGameStateStoreService";
import type { IHttpService } from "../services/interfaces/IHttpService";
import type { ITimerService } from "../services/interfaces/ITimerService";
import type { IPerformanceService } from "../services/interfaces/IPerformanceService";
import type { IOntologicalAudioEngine } from "../audio/IOntologicalAudioEngine";
import type { IWebSocketService } from "../services/interfaces/IWebSocketService";
import type { IBrowserEventsService } from "../services/interfaces/IBrowserEventsService";
import type { IDebugOrchestratorService } from "../services/interfaces/IDebugOrchestratorService";
import type { IShaderIntrospectionService } from "../services/interfaces/IShaderIntrospectionService";
import type { IColorService } from "../services/interfaces/IColorService";
// DIRECTIVE 003: New interface imports for comprehensive mock coverage
import type { IApplicationInitializerService } from "../services/interfaces/IApplicationInitializerService";
import type { INotificationService } from "../services/interfaces/INotificationService";
import type { IViewLogicService } from "../services/interfaces/IViewLogicService";
import type { IStateStreamingService } from "../services/interfaces/IStateStreamingService";
import type { IGameplayMechanicsService } from "../services/interfaces/IGameplayMechanicsService";
import type { IAudioService } from "../services/interfaces/IAudioService";
import type { IAudioSystemBridge } from "../services/interfaces/IAudioSystemBridge";
import type { IGameControllerService } from "../services/interfaces/IGameControllerService";
import type { IQualiaStateCalculatorService } from "../services/interfaces/IQualiaStateCalculatorService";
import type { IErrorReportingService } from "../services/interfaces/IErrorReportingService";
import type { IDebugService } from "../services/interfaces/IDebugService";
import type { ISubtitleService } from "../services/interfaces/ISubtitleService";
import type { IRhythmicMovementController } from "../services/interfaces/IRhythmicMovementController";
import type { IBackendSyncService } from "../services/interfaces/IBackendSyncService";
// QUALIA.CODE v2.0: Audio Analysis and Physics Services
import type { IAudioAnalysisService } from "../services/interfaces/IAudioAnalysisService";
import type { IPhysicsService } from "../services/interfaces/IPhysicsService";
import type { IInputStateService } from "../services/interfaces/IInputStateService";
import type { IWebAudioAPIService } from "../services/interfaces/IWebAudioAPIService";
// QUALIA.CODE v2.0: v2 Service interfaces (RUTA.md Phase 4 & 5)
import type { IFFTAnalyzerService } from "../services/interfaces/IFFTAnalyzerService";
import type { IAudio8DService } from "../services/interfaces/IAudio8DService";
import type { IMusicalComboDetectorService } from "../services/interfaces/IMusicalComboDetectorService";
import type { IKairosVisualEngine } from "../services/interfaces/IKairosVisualEngine";

// Import real services for pure utilities (no side effects)
import { ColorService } from "../services/ColorService";
// QUALIA.CODE v1.1: StateMergerService - Pure utility, no side effects, use real implementation in tests
import type { IStateMergerService } from "../services/interfaces/IStateMergerService";
import { StateMergerService } from "../services/StateMergerService";
// QUALIA.CODE v2.0: Real service implementations for unit testing
import { PhysicsService } from "../services/PhysicsService";
import { AudioAnalysisService } from "../services/AudioAnalysisService";

// Import centralized mocks
import { mockLogger } from "./mocks/logger.mock";
import { createMockEventBus } from "./mocks/event-bus.mock";
import { mockOntologicalAudioEngine } from "./mocks/ontological-audio-engine.mock";
import { mockGameStateStore } from "./mocks/game-state-store.mock";
import { mockGameStateStoreService } from "./mocks/game-state-store-service.mock";
import { mockHttpService } from "./mocks/http-service.mock";
import { mockTimerService } from "./mocks/timer-service.mock";
import { mockPerformanceService } from "./mocks/performance-service.mock";
import { mockWebSocketService } from "./mocks/web-socket-service.mock";
import { mockBrowserEventsService } from "./mocks/browser-events-service.mock";
import { mockDebugOrchestratorService } from "./mocks/debug-orchestrator-service.mock";
import { mockShaderIntrospectionService } from "./mocks/shader-introspection-service.mock";
// DIRECTIVE 003: New mock imports for comprehensive coverage
import { mockApplicationInitializerService } from "./mocks/application-initializer-service.mock";
import { mockNotificationService } from "./mocks/notification-service.mock";
import { mockViewLogicService } from "./mocks/view-logic-service.mock";
import { mockStateStreamingService } from "./mocks/state-streaming-service.mock";
import { mockGameplayMechanicsService } from "./mocks/gameplay-mechanics-service.mock";
import { mockAudioService } from "./mocks/audio-service.mock";
import { mockAudioSystemBridge } from "./mocks/audio-system-bridge.mock";
import { mockGameControllerService } from "./mocks/game-controller-service.mock";
import { mockQualiaStateCalculatorService } from "./mocks/qualia-state-calculator-service.mock";
import { mockErrorReportingService } from "./mocks/error-reporting-service.mock";
import { mockWebAudioAPIService } from "./mocks/web-audio-api-service.mock";
import { mockDebugService } from "./mocks/debug-service.mock";
import { mockSubtitleService } from "./mocks/subtitle-service.mock";
import { mockRhythmicMovementController } from "./mocks/rhythmic-movement-controller.mock";
import { mockBackendSyncService } from "./mocks/backend-sync-service.mock";
import { mockInputStateService } from "./mocks/input-state-service.mock";
// mockKeyAdapter removed - @AdaptAndEmit decorator not used in RhythmicMovementController
// QUALIA.CODE v2.0: v2 Services (RUTA.md Phase 4 & 5)
import { mockFFTAnalyzerService } from "./mocks/fft-analyzer-service.mock";
import { mockAudio8DService } from "./mocks/audio-8d-service.mock";
import { mockMusicalComboDetectorService } from "./mocks/musical-combo-detector-service.mock";
import { mockKairosVisualEngine } from "./mocks/kairos-visual-engine.mock";

// ===================================================================================
// DIRECTIVE 006: DEFAULT TEST CONFIGURATION BINDINGS
// These default configs are essential for allowing the test container to
// construct real service instances that depend on configuration objects.
// ===================================================================================

import type { EventBusConfig } from '../services/contracts/IEventBus.contracts';
import type { AppInitializerConfig, ApplicationInitializerServiceParams } from '../services/contracts/IApplicationInitializerService.contracts';
import type { BackendSyncConfig, BackendSyncServiceParams } from '../services/contracts/IBackendSyncService.contracts';
import type { GameControllerConfig, GameControllerServiceParams } from '../services/contracts/IGameControllerService.contracts';
import type { QualiaCalculatorConfig, QualiaStateCalculatorServiceParams } from '../services/contracts/IQualiaStateCalculatorService.contracts';
import type { RhythmicMovementConfig, RhythmicMovementControllerParams } from '../services/contracts/IRhythmicMovementController.contracts';
import type { PhysicsServiceConfig, PhysicsServiceParams } from '../services/contracts/IPhysicsService.contracts';
import type { AudioAnalysisServiceConfig, AudioAnalysisServiceParams } from '../services/contracts/IAudioAnalysisService.contracts';

// --- Default Config Objects ---

const defaultEventBusConfig: EventBusConfig = {
  performance: { maxEventHistory: 100, maxConcurrentEvents: 50, statusUpdateInterval: 60000, throttle: { enable: false, windowMs: 1000, maxEventsPerWindow: 100 }, cleanupInterval: 5000 },
  errorHandling: { maxRetries: 3, retryDelayMs: 100, continueOnError: true, errorLogLevel: 'error' },
  priority: { highPriorityQueueSize: 100, normalPriorityQueueSize: 100, lowPriorityQueueSize: 100, priorityProcessing: true },
  development: { enableEventLogging: false, enablePerformanceMetrics: false, enableEventHistory: true, enableEventValidation: true },
  production: { enableEventLogging: false, enablePerformanceMetrics: false, enableEventHistory: false, enableEventValidation: false },
  idPrefix: 'test_event', randomBase: 36, idStart: 2, idLength: 9,
  priorities: { high: 100, normal: 50, low: 10, default: 50 },
  messages: { destroyedEventBusWarning: 'EventBus is destroyed.' }
};

const defaultAppInitializerConfig: AppInitializerConfig = {
  messages: { serviceConstructed: '', serviceInitialized: '', alreadyRunning: 'Already running', initializationStarted: '', configurationLoaded: '', httpServiceConfigured: '', gameStateServiceStarted: '', transversalServicesStarted: '', gameControllerStarted: '', rhythmicControllerStarted: '', backendSyncStarted: '', initializationComplete: '', initializationFailed: 'Init failed' },
  steps: { loadConfiguration: '', configureHttpService: '', startGameStateService: '', startTransversalServices: '', startGameController: '', startRhythmicController: '', startBackendSync: '' },
  stateUpdates: { configLoaded: { isConfigLoaded: true }, initializationComplete: { initializationComplete: true, timestamp: null, duration: null, servicesStarted: [] } },
  errors: { configurationLoadFailed: '', serviceStartFailed: '', initializationFailed: '' },
  timing: { maxInitializationTime: 5000, serviceStartupDelay: 10, healthCheckDelay: 1000 },
  features: { enableDetailedLogging: true, enablePerformanceMonitoring: true, enableHealthChecks: true, enableErrorReporting: true }
};

const defaultBackendSyncConfig: BackendSyncConfig = {
  api: { baseUrl: 'http://test.host', qualiaEndpoint: '/qualia', healthEndpoint: '/health', timeout: 1000 },
  sync: { throttleDelay: 50, batchSize: 1, maxRetries: 3, retryDelay: 100 },
  connection: { healthCheckInterval: 5000, connectionTimeout: 1000, maxFailedAttempts: 3 },
  messages: { backendNotConnected: 'Not connected', serviceAlreadyRunning: 'Already running', qualiaStateCalculated: 'Qualia state calculated', serviceInitialized: 'Service initialized' }
} as BackendSyncConfig; // Cast to avoid filling all properties

const defaultGameControllerConfig: GameControllerConfig = {
  health: { maxHealth: 100, damageOnMiss: 10, healthRecoveryOnHit: 5 },
  scoring: { baseScorePerHit: 100, perfectHitBonusMultiplier: 1.5 },
  mechanics: { dashScoreBonus: 50, fastForwardScoreBoost: 20, rewindHealthBonus: 10 },
  performance: { updateIntervalMs: 16 },
  gameStates: { initial: { isPlaying: false, isPaused: false, currentScore: 0, comboCount: 0, level: 1, gameMode: 'normal' } }
} as GameControllerConfig;

const defaultQualiaCalculatorConfig: QualiaCalculatorConfig = {
  baseQualiaState: { intensity: 0, precision: 0.5, aggression: 0, flow: 0, chaos: 0, recovery: 0, transcendence: 0 },
  performanceMultipliers: { perfect: 0.1, good: 0.05, miss: -0.1, combo: 0.02 },
  precision: { hitBonus: 0.05, missPenalty: -0.1, decayRate: 0.01 },
  flow: { perfectHitBonus: 0.05, missPenalty: -0.05, decayRate: 0.02 },
  chaos: { missIncrease: 0.1, decayAmount: 0.05, decayRate: 0.03 },
  aggression: { comboMultiplier: 0.02, decayRate: 0.01 },
  transcendenceThresholds: { intensity: 0.9, precision: 0.9, flow: 0.9 },
  updateIntervalMs: 50, minValue: 0, maxValue: 1,
  transcendenceActivationValue: 1, millisecondsToSecondsConversion: 1000, transcendenceDecayRate: 0.05, transcendenceCheckValue: 0
} as QualiaCalculatorConfig;

const defaultPhysicsServiceConfig: PhysicsServiceConfig = {
  maxVelocity: 10,
  accelerationRate: 5,
  frictionCoefficient: 0.8,
  velocityThreshold: 0.01,
  updateInterval: 16,
  enableDamping: true,
  messages: {
    initialized: 'PhysicsService initialized',
    started: 'PhysicsService started',
    stopped: 'PhysicsService stopped',
    velocityUpdated: 'Velocity updated'
  }
};

const defaultAudioAnalysisServiceConfig: AudioAnalysisServiceConfig = {
  frequencyBands: 8,
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
  beatThreshold: 0.7,
  minBeatInterval: 300,
  updateInterval: 16,
  enableBeatDetection: true,
  enableTempoEstimation: true,
  messages: {
    initialized: 'AudioAnalysisService initialized',
    audioReady: 'Audio system ready',
    analysisStarted: 'Analysis started',
    analysisStopped: 'Analysis stopped',
    beatDetected: 'Beat detected'
  }
};

const defaultRhythmicMovementConfig: RhythmicMovementConfig = {
  secondsPerMinute: 60,
  millisecondsPerSecond: 1000,
  bpm: 120,
  perfectTiming: 50,
  goodTiming: 100,
  gridSize: 100,
  slowdownFactor: 0.5,
  slowdownDuration: 2000,
  keyThrottleMs: 100,
  coordinate_system: {
    gridSize: 100,
    tileSize: 1.0,
    gridPlaneTolerance: 0.1,
    messages: {
      serviceInitialized: '',
      gridToWorldCalculated: '',
      worldToGridCalculated: '',
      worldToScreenCalculated: '',
      invalidGridCoordinates: '',
      invalidWorldCoordinates: '',
      cameraProjectionFailed: '',
      worldYOutOfPlane: ''
    }
  },
  messages: { serviceInitialized: 'Service initialized', invalidTimeWarning: 'Invalid time warning' },
  audioBeatDetectionThreshold: 0.5,
  availableMovements: ['up', 'down', 'left', 'right'],
  optimalTimingPredictionConfidencePlaying: 0.9,
  optimalTimingPredictionConfidenceNotPlaying: 0.5,
  sequenceDifficultyBaseComplexityMultiplier: 1.0,
  sequenceDifficultyVarietyBonusMultiplier: 0.5,
  flowBpmMultiplier: 1.2
} as RhythmicMovementConfig;

// ============================================================================
// QUALIA.CODE v2.0: v2 Services Default Configurations (RUTA.md Phase 4 & 5)
// ============================================================================

// FFT Analyzer Default Config
const defaultFFTAnalyzerConfig: Record<string, unknown> = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  minDecibels: -100,
  maxDecibels: -30,
  frequencyBands: {
    bass: { start: 0, end: 4 },
    mid: { start: 5, end: 20 },
    treble: { start: 21, end: 31 },
  },
  updateInterval: 16, // 60fps
  messages: {
    fftInitialized: 'FFT Initialized',
    analysisStarted: 'Analysis Started',
    analysisStopped: 'Analysis Stopped',
  },
};

// Audio 8D Default Config
const defaultAudio8DConfig: Record<string, unknown> = {
  maxDistance: 50,
  rolloffFactor: 1.0,
  refDistance: 1.0,
  coneInnerAngle: 360,
  coneOuterAngle: 0,
  coneOuterGain: 0,
  panningModel: 'HRTF',
  distanceModel: 'inverse',
  messages: {
    serviceInitialized: '8D Audio Initialized',
    sourceAdded: 'Audio Source Added',
    sourceRemoved: 'Audio Source Removed',
  },
};

// Musical Combo Detector Default Config
const defaultMusicalComboDetectorConfig: Record<string, unknown> = {
  maxSequenceLength: 7, // Q-E-R-T-F-G-C
  sequenceTimeoutMs: 3000,
  cooldownMs: 5000,
  validKeys: ['q', 'e', 'r', 't', 'f', 'g', 'c'],
  noteMapping: {
    q: 'C4', e: 'D4', r: 'E4', t: 'F4',
    f: 'G4', g: 'A4', c: 'B4',
  },
  messages: {
    comboStarted: 'Combo Started',
    comboCompleted: 'Combo Completed',
    comboFailed: 'Combo Failed',
  },
};

// Kairos Visual Engine Default Config
const defaultKairosVisualEngineConfig: Record<string, unknown> = {
  renderer: {
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
  },
  camera: {
    fov: 75,
    near: 0.1,
    far: 1000,
    position: { x: 0, y: 10, z: 20 },
  },
  postProcessing: {
    bloom: { enabled: true, strength: 1.5, threshold: 0.8 },
    taa: { enabled: true },
    hbao: { enabled: true, radius: 0.5 },
    godRays: { enabled: false }, // Phase 6
  },
  performance: {
    targetFPS: 60,
    adaptiveQuality: true,
    shadowMapSize: 2048,
  },
  messages: {
    engineInitialized: 'Kairos Engine Initialized',
    sceneUpdated: 'Scene Updated',
    renderError: 'Render Error',
  },
};

// --- Default Params Factory Functions ---

/**
 * QUALIA.CODE v2.0: Simplified factory for ApplicationInitializerServiceParams
 * Reflects the hybrid injection pattern where orchestration services are explicitly
 * injected while managed services (IBaseService implementers) are auto-discovered.
 * 
 * Uses configuration object pattern to avoid max-params violation.
 */
interface AppInitializerParamsDeps {
  eventBus: IEventBus;
  logger: ILogger;
  gameStateStoreService: IGameStateStoreService;
  backendSyncService: IBackendSyncService;
  rhythmicMovementController: IRhythmicMovementController;
  errorReportingService: IErrorReportingService;
  debugService: IDebugService;
  notificationService: INotificationService;
  stateStreamingService: IStateStreamingService;
}

const createDefaultAppInitializerParams = (
  deps: AppInitializerParamsDeps
): ApplicationInitializerServiceParams => ({
  config: defaultAppInitializerConfig,
  logger: deps.logger,
  eventBus: deps.eventBus,
  gameStateStoreService: deps.gameStateStoreService,
  backendSyncService: deps.backendSyncService,
  rhythmicMovementController: deps.rhythmicMovementController,
  errorReportingService: deps.errorReportingService,
  debugService: deps.debugService,
  notificationService: deps.notificationService,
  stateStreamingService: deps.stateStreamingService,
});

const createDefaultBackendSyncParams = (
  eventBus: IEventBus,
  logger: ILogger,
  httpService: IHttpService,
  timerService: ITimerService,
  performanceService: IPerformanceService
): BackendSyncServiceParams => ({ // eslint-disable-line max-params
  eventBus,
  logger,
  config: defaultBackendSyncConfig,
  httpService,
  timerService,
  performanceService
});

const createDefaultGameControllerParams = (
  eventBus: IEventBus,
  logger: ILogger,
  gameStateStoreService: IGameStateStoreService,
  timerService: ITimerService,
  performanceService: IPerformanceService,
  audioService: IAudioService,
  audioSystemBridge: IAudioSystemBridge
): GameControllerServiceParams => ({ // eslint-disable-line max-params
  eventBus,
  logger,
  config: defaultGameControllerConfig,
  gameStateStoreService,
  timerService,
  performanceService,
  audioService,
  audioSystemBridge
});

const createDefaultQualiaCalculatorParams = (
  eventBus: IEventBus,
  logger: ILogger,
  performanceService: IPerformanceService
): QualiaStateCalculatorServiceParams => ({
  eventBus,
  logger,
  config: defaultQualiaCalculatorConfig,
  performanceService
});

const createDefaultPhysicsServiceParams = (
  eventBus: IEventBus,
  logger: ILogger,
  timerService: ITimerService,
  inputStateService: IInputStateService
): PhysicsServiceParams => ({
  eventBus,
  logger,
  timerService,
  inputStateService,
  config: defaultPhysicsServiceConfig
});

const createDefaultAudioAnalysisServiceParams = (
  eventBus: IEventBus,
  logger: ILogger,
  timerService: ITimerService,
  webAudioService: IWebAudioAPIService
): AudioAnalysisServiceParams => ({
  eventBus,
  logger,
  timerService,
  webAudioService,
  config: defaultAudioAnalysisServiceConfig
});

const createDefaultRhythmicMovementParams = (
  eventBus: IEventBus,
  logger: ILogger,
  timerService: ITimerService,
  inputStateService: any, // Using any for now since the type might be complex
  gameplayMechanicsService: IGameplayMechanicsService
): RhythmicMovementControllerParams => ({ // eslint-disable-line max-params
  eventBus,
  logger,
  config: defaultRhythmicMovementConfig,
  timerService,
  inputStateService,
  gameplayMechanicsService
});

export interface MockOverride<T = unknown> {
  type: symbol;
  value: T;
}

// --- MOCK IMPLEMENTATIONS ARE NOW CENTRALIZED IN src/testing/mocks/ ---

/**
 * Mock Services Interface
 */
export interface MockServices {
  mockLogger: ILogger;
  mockEventBus: IEventBus;
  mockGameStateStore: IGameStateStore;
  mockGameStateStoreService: IGameStateStoreService;
  mockHttpService: IHttpService;
  mockTimerService: ITimerService;
  mockPerformanceService: IPerformanceService;
  mockOntologicalAudioEngine: IOntologicalAudioEngine;
  mockWebSocketService: IWebSocketService;
  mockBrowserEventsService: IBrowserEventsService;
  mockDebugOrchestratorService: IDebugOrchestratorService;
  mockShaderIntrospectionService: IShaderIntrospectionService;
  // DIRECTIVE 003: New mock services
  mockApplicationInitializerService: IApplicationInitializerService;
  mockNotificationService: INotificationService;
  mockViewLogicService: IViewLogicService;
  mockStateStreamingService: IStateStreamingService;
  mockGameplayMechanicsService: IGameplayMechanicsService;
  mockAudioService: IAudioService;
  mockGameControllerService: IGameControllerService;
  mockQualiaStateCalculatorService: IQualiaStateCalculatorService;
  mockErrorReportingService: IErrorReportingService;
  mockDebugService: IDebugService;
  mockSubtitleService: ISubtitleService;
  mockRhythmicMovementController: IRhythmicMovementController;
  mockBackendSyncService: IBackendSyncService;
  // QUALIA.CODE v2.0: v2 Services (RUTA.md Phase 4 & 5)
  mockFFTAnalyzerService: IFFTAnalyzerService;
  mockAudio8DService: IAudio8DService;
  mockMusicalComboDetectorService: IMusicalComboDetectorService;
  mockKairosVisualEngine: IKairosVisualEngine;
}

/**
 * Create Test Container Factory - FINAL IMPLEMENTATION
 * This is the only correct way to implement this function.
 */
export function createTestContainer(overrides: MockOverride[] = []): Container {
  // STEP 1: Create a new isolated container for testing
  const testContainer = new Container();

  // STEP 2: Create fresh mock instances for this test
  const freshMockEventBus = createMockEventBus();

  // STEP 3: Bind all mock services to the test container
  testContainer.bind<ILogger>(TYPES.ILogger).toConstantValue(mockLogger);
  testContainer.bind<IEventBus>(TYPES.IEventBus).toConstantValue(freshMockEventBus);
  testContainer.bind<IGameStateStore>(TYPES.IGameStateStore).toConstantValue(mockGameStateStore);
  testContainer.bind<IGameStateStoreService>(TYPES.IGameStateStoreService).toConstantValue(mockGameStateStoreService);
  testContainer.bind<IHttpService>(TYPES.IHttpService).toConstantValue(mockHttpService);
  // QUALIA.CODE v1.1: StateMergerService for deep merge testing (real service, no mocking needed)
  testContainer.bind<IStateMergerService>(TYPES.IStateMergerService).to(StateMergerService).inSingletonScope();
  testContainer.bind<ITimerService>(TYPES.ITimerService).toConstantValue(mockTimerService);
  testContainer.bind<IPerformanceService>(TYPES.IPerformanceService).toConstantValue(mockPerformanceService);
  testContainer.bind<IOntologicalAudioEngine>(TYPES.IOntologicalAudioEngine).toConstantValue(mockOntologicalAudioEngine);
  testContainer.bind<IWebSocketService>(TYPES.IWebSocketService).toConstantValue(mockWebSocketService);
  testContainer.bind<IBrowserEventsService>(TYPES.IBrowserEventsService).toConstantValue(mockBrowserEventsService);
  testContainer.bind<IDebugOrchestratorService>(TYPES.IDebugOrchestratorService).toConstantValue(mockDebugOrchestratorService);
  testContainer.bind<IShaderIntrospectionService>(TYPES.IShaderIntrospectionService).toConstantValue(mockShaderIntrospectionService);
  
  // DIRECTIVE 003: Bind all newly created high-fidelity mocks
  testContainer.bind<IApplicationInitializerService>(TYPES.IApplicationInitializerService).toConstantValue(mockApplicationInitializerService);
  testContainer.bind<INotificationService>(TYPES.INotificationService).toConstantValue(mockNotificationService);
  testContainer.bind<IViewLogicService>(TYPES.IViewLogicService).toConstantValue(mockViewLogicService);
  testContainer.bind<IStateStreamingService>(TYPES.IStateStreamingService).toConstantValue(mockStateStreamingService);
  testContainer.bind<IGameplayMechanicsService>(TYPES.IGameplayMechanicsService).toConstantValue(mockGameplayMechanicsService);
  testContainer.bind<IAudioService>(TYPES.IAudioService).toConstantValue(mockAudioService);
  testContainer.bind<IAudioSystemBridge>(TYPES.IAudioSystemBridge).toConstantValue(mockAudioSystemBridge);
  testContainer.bind<IGameControllerService>(TYPES.IGameControllerService).toConstantValue(mockGameControllerService);
  testContainer.bind<IQualiaStateCalculatorService>(TYPES.IQualiaStateCalculatorService).toConstantValue(mockQualiaStateCalculatorService);
  testContainer.bind<IErrorReportingService>(TYPES.IErrorReportingService).toConstantValue(mockErrorReportingService);
  testContainer.bind<IDebugService>(TYPES.IDebugService).toConstantValue(mockDebugService);
  testContainer.bind<ISubtitleService>(TYPES.ISubtitleService).toConstantValue(mockSubtitleService);
  testContainer.bind<IRhythmicMovementController>(TYPES.IRhythmicMovementController).toConstantValue(mockRhythmicMovementController);
  testContainer.bind<IBackendSyncService>(TYPES.IBackendSyncService).toConstantValue(mockBackendSyncService);
  testContainer.bind<IInputStateService>(TYPES.IInputStateService).toConstantValue(mockInputStateService);
  testContainer.bind<IWebAudioAPIService>(TYPES.IWebAudioAPIService).toConstantValue(mockWebAudioAPIService);
  
  // QUALIA.CODE v2.0: v2 Services (RUTA.md Phase 4 & 5) - HIGH-FIDELITY MOCKS
  testContainer.bind<IFFTAnalyzerService>(TYPES.IFFTAnalyzerService).toConstantValue(mockFFTAnalyzerService);
  testContainer.bind<IAudio8DService>(TYPES.IAudio8DService).toConstantValue(mockAudio8DService);
  testContainer.bind<IMusicalComboDetectorService>(TYPES.IMusicalComboDetectorService).toConstantValue(mockMusicalComboDetectorService);
  testContainer.bind<IKairosVisualEngine>(TYPES.IKairosVisualEngine).toConstantValue(mockKairosVisualEngine);

  // QUALIA.CODE v2.0: Audio Analysis and Physics Services - BIND REAL SERVICES FOR UNIT TESTING
  // Use .inTransientScope() to create fresh instances for each test, preventing state contamination
  testContainer.bind<IAudioAnalysisService>(TYPES.IAudioAnalysisService).to(AudioAnalysisService).inTransientScope();
  testContainer.bind<IPhysicsService>(TYPES.IPhysicsService).to(PhysicsService).inTransientScope();

  // STEP 2.5: Bind real services for pure utilities (no side effects, no external dependencies)
  // ColorService is a pure utility that only performs mathematical color conversions
  testContainer.bind<IColorService>(TYPES.IColorService).to(ColorService).inSingletonScope();

  // ===================================================================================
  // DIRECTIVE 006: Bind default configs and params for SUT construction
  // ===================================================================================
  testContainer.bind<EventBusConfig>(TYPES.EventBusConfig).toConstantValue(defaultEventBusConfig);

  // Create parameter objects using the same fresh mock instances
  // QUALIA.CODE v2.0: Simplified factory call for hybrid injection pattern
  const appInitializerParams = createDefaultAppInitializerParams({
    eventBus: freshMockEventBus,
    logger: mockLogger,
    gameStateStoreService: mockGameStateStoreService,
    backendSyncService: mockBackendSyncService,
    rhythmicMovementController: mockRhythmicMovementController,
    errorReportingService: mockErrorReportingService,
    debugService: mockDebugService,
    notificationService: mockNotificationService,
    stateStreamingService: mockStateStreamingService,
  });
  const backendSyncParams = createDefaultBackendSyncParams(
    freshMockEventBus,
    mockLogger,
    mockHttpService,
    mockTimerService,
    mockPerformanceService
  );
  const gameControllerParams = createDefaultGameControllerParams(
    freshMockEventBus,
    mockLogger,
    mockGameStateStoreService,
    mockTimerService,
    mockPerformanceService,
    mockAudioService,
    mockAudioSystemBridge
  );
  const qualiaCalculatorParams = createDefaultQualiaCalculatorParams(
    freshMockEventBus,
    mockLogger,
    mockPerformanceService
  );
  const rhythmicMovementParams = createDefaultRhythmicMovementParams(
    freshMockEventBus,
    mockLogger,
    mockTimerService,
    mockInputStateService,
    mockGameplayMechanicsService
  );
  const physicsServiceParams = createDefaultPhysicsServiceParams(
    freshMockEventBus,
    mockLogger,
    mockTimerService,
    mockInputStateService
  );
  const audioAnalysisServiceParams = createDefaultAudioAnalysisServiceParams(
    freshMockEventBus,
    mockLogger,
    mockTimerService,
    mockWebAudioAPIService
  );

  testContainer.bind<ApplicationInitializerServiceParams>(TYPES.ApplicationInitializerServiceParams).toConstantValue(appInitializerParams);
  testContainer.bind<BackendSyncServiceParams>(TYPES.BackendSyncServiceParams).toConstantValue(backendSyncParams);
  testContainer.bind<GameControllerServiceParams>(TYPES.GameControllerServiceParams).toConstantValue(gameControllerParams);
  testContainer.bind<QualiaStateCalculatorServiceParams>(TYPES.QualiaStateCalculatorServiceParams).toConstantValue(qualiaCalculatorParams);
  testContainer.bind<RhythmicMovementControllerParams>(TYPES.RhythmicMovementControllerParams).toConstantValue(rhythmicMovementParams);
  testContainer.bind<PhysicsServiceParams>(TYPES.PhysicsServiceParams).toConstantValue(physicsServiceParams);
  testContainer.bind<AudioAnalysisServiceParams>(TYPES.AudioAnalysisServiceParams).toConstantValue(audioAnalysisServiceParams);

  // QUALIA.CODE v2.0: v2 Services Config Bindings (RUTA.md Phase 4 & 5)
  testContainer.bind<Record<string, unknown>>(TYPES.FFTAnalyzerServiceConfig).toConstantValue(defaultFFTAnalyzerConfig);
  testContainer.bind<Record<string, unknown>>(TYPES.Audio8DServiceConfig).toConstantValue(defaultAudio8DConfig);
  testContainer.bind<Record<string, unknown>>(TYPES.MusicalComboDetectorServiceConfig).toConstantValue(defaultMusicalComboDetectorConfig);
  testContainer.bind<Record<string, unknown>>(TYPES.KairosVisualEngineConfig).toConstantValue(defaultKairosVisualEngineConfig);

  // STEP 3: Apply any test-specific overrides.
  for (const override of overrides) {
    testContainer.bind(override.type).toConstantValue(override.value);
  }

  return testContainer;
}

/**
 * Reset All Mocks
 */
export function resetAllMocks(): void {
  vi.clearAllMocks();
  (mockLogger.getLevel as Mock).mockReturnValue("info");
}
