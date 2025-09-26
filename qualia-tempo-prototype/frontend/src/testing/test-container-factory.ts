/**
 * GOLD.CODE: IoC Testing Infrastructure
 * Supreme Guardian Directive Compliance
 * 
 * This factory creates pre-configured InversifyJS containers for testing,
 * ensuring all services are resolved with properly mocked dependencies.
 * 
 * MANDATE: NO manual service instantiation in tests.
 * OBLIGATION: All Service Under Test (SUT) must be resolved from container.
 */

// Vitest imports for mock functions
import { vi, type Mock } from 'vitest';
import { merge } from 'lodash-es';

import { Container } from 'inversify';
import { TYPES } from '../services/inversify.types';

// Import all interfaces for proper typing
import type { ILogger } from '../services/interfaces/ILogger';
import type { IEventBus } from '../services/interfaces/IEventBus';
import type { IConfigurationService } from '../services/interfaces/IConfigurationService';
import type { IGameStateStore } from '../services/interfaces/IGameStateStore';
import type { IGameStateStoreService } from '../services/interfaces/IGameStateStoreService';
import type { IDebugService } from '../services/interfaces/IDebugService';
import type { IErrorReportingService } from '../services/interfaces/IErrorReportingService';
import type { INotificationService } from '../services/interfaces/INotificationService';
import type { IRhythmicMovementController } from '../services/interfaces/IRhythmicMovementController';
import type { IHttpService } from '../services/interfaces/IHttpService';
import type { ITimerService } from '../services/interfaces/ITimerService';
import type { IOntologicalAudioEngine } from '../audio/IOntologicalAudioEngine';
import type { IStreamingVideoService } from '../services/interfaces/IStreamingVideoService';
import type { IGameControllerService } from '../services/interfaces/IGameControllerService';
import type { IBackendSyncService } from '../services/interfaces/IBackendSyncService';
import type { IAudioService } from '../services/interfaces/IAudioService';
import type { IQualiaStateCalculatorService } from '../services/interfaces/IQualiaStateCalculatorService';
import type { IWebAudioAPIService } from '../services/interfaces/IWebAudioAPIService';

// Import concrete service classes for binding
import { DebugService } from '../services/DebugService';
import { ErrorReportingService } from '../services/ErrorReportingService';
import { NotificationService } from '../services/NotificationService';
import { GameStateStoreService } from '../services/GameStateStoreService';
import { RhythmicMovementController } from '../services/RhythmicMovementController';
import { OntologicalAudioEngine } from '../audio/OntologicalAudioEngine';
import { GameControllerService } from '../services/GameControllerService';
import { BackendSyncService } from '../services/BackendSyncService';
import { AudioService } from '../services/AudioService';
import { QualiaStateCalculatorService } from '../services/QualiaStateCalculatorService';
import { WebAudioAPIService } from '../services/WebAudioAPIService';

/**
 * Mock Logger Implementation - Complete Interface Coverage
 */
const mockLogger: ILogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  setLevel: vi.fn(),
  getLevel: vi.fn().mockReturnValue('info'),
  child: vi.fn().mockImplementation((_prefix: string) => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn().mockReturnValue('info'),
    child: vi.fn()
  }))
};

/**
 * Mock EventBus Implementation - Complete Interface Coverage
 * QUALIA.CODE: Functional mock for fast synchronous testing
 */
const mockEventBus: IEventBus = (() => {
  const subscribers: Map<string, Array<{ handler: Function; id: string }>> = new Map();
  let nextId = 1;

  return {
    subscribe: vi.fn().mockImplementation((eventType: string, handler: Function) => {
      if (!subscribers.has(eventType)) {
        subscribers.set(eventType, []);
      }
      const id = `listener-${nextId++}`;
      subscribers.get(eventType)!.push({ handler, id });
      return id;
    }),

    unsubscribe: vi.fn().mockImplementation((listenerId: string) => {
      for (const [_eventType, handlers] of subscribers.entries()) {
        const index = handlers.findIndex(h => h.id === listenerId);
        if (index !== -1) {
          handlers.splice(index, 1);
          return true;
        }
      }
      return false;
    }),

    emit: vi.fn().mockImplementation(async (event: any) => {
      const eventType = event.type;
      const handlers = subscribers.get(eventType) || [];

      // SIMULA EL EVENT LOOP CON MEJOR SINCRONIZACION PARA NESTED EVENTS
      await Promise.resolve();

      for (const { handler } of handlers) {
        try {
          // LOS HANDLERS PUEDEN SER ASÍNCRONOS, POR ESO EL AWAIT
          await handler(event);
        } catch (error) {
          console.error(`Error in async event handler for ${eventType}:`, error);
        }
      }
    }),

    clear: vi.fn().mockImplementation(() => {
      subscribers.clear();
    }),

    destroy: vi.fn().mockImplementation(() => {
      subscribers.clear();
    }),

    getStats: vi.fn().mockImplementation(() => ({
      totalListeners: Array.from(subscribers.values()).reduce((sum, handlers) => sum + handlers.length, 0),
      eventTypes: Array.from(subscribers.keys()),
      historySize: 0,
      isDestroyed: false
    }))
  };
})();

/**
 * Mock Configuration Service Implementation - Complete with Default Config Structure
 */
const mockConfigurationService: IConfigurationService = {
  loadConfig: vi.fn().mockResolvedValue(undefined),
  getConfig: vi.fn().mockReturnValue({
    gameController: { 
      maxHealth: 100, 
      initialScore: 0,
      tickRate: 60
    },
    errorReporting: { 
      enabled: true, 
      batchSize: 5,
      batchTimeout: 1000,
      maxRetries: 3,
      rateLimitWindow: 60000,
      rateLimitMax: 100
    },
    debug: { 
      enableAIAnalysis: false,
      logLevel: 'info',
      performanceTracking: true
    },
    backend: {
      url: 'http://localhost:8000',
      timeout: 5000,
      retryAttempts: 3
    },
    backendSync: {
      api: {
        baseUrl: 'http://localhost:8000',
        qualiaEndpoint: '/api/qualia',
        healthEndpoint: '/api/health',
        timeout: 5000
      },
      streaming: {
        websocket: {
          url: 'ws://127.0.0.1:8000/ws/video_stream',
          maxReconnectAttempts: 10,
          reconnectDelay: 1000,
          pingInterval: 30000,
          pingTimeout: 5000,
          connectionTimeout: 10000
        }
      },
      sync: {
        throttleDelay: 100,
        batchSize: 10,
        maxRetries: 3,
        retryDelay: 1000
      },
      connection: {
        healthCheckInterval: 30000,
        connectionTimeout: 10000,
        maxFailedAttempts: 5
      },
      validation: {
        enableSchemaValidation: true,
        strictMode: false,
        logValidationErrors: true
      },
      performance: {
        enableMetrics: true,
        metricsInterval: 5000
      }
    },
    audio: {
      masterVolume: 0.7,
      enableSpatialAudio: true,
      bufferSize: 2048
    },
    rhythm: {
      bpm: 120,
      syncTolerance: 100,
      adaptive: true
    },
    notifications: {
      enabled: true,
      maxConcurrent: 5,
      defaultDuration: 3000
    }
  }),
  getGameConfig: vi.fn().mockReturnValue({
    maxHealth: 100,
    initialScore: 0,
    tickRate: 60
  }),
  getQualiaConfig: vi.fn().mockReturnValue({
    decayRate: 0.01,
    intensityMultiplier: 1.2,
    flowThreshold: 0.7
  }),
  getBackendConfig: vi.fn().mockReturnValue({ 
    url: 'http://localhost:8000',
    timeout: 5000,
    retryAttempts: 3
  }),
  getAudioConfig: vi.fn().mockReturnValue({
    masterVolume: 0.7,
    enableSpatialAudio: true,
    bufferSize: 2048
  }),
  getErrorReportingConfig: vi.fn().mockReturnValue({
    enabled: true,
    batchSize: 5,
    batchTimeout: 1000,
    maxRetries: 3
  }),
  getRhythmicMovementConfig: vi.fn().mockReturnValue({
    bpm: 120,
    syncTolerance: 100,
    adaptive: true
  }),
  getNotificationConfig: vi.fn().mockReturnValue({
    enabled: true,
    maxConcurrent: 5,
    defaultDuration: 3000
  }),
  getHttpConfig: vi.fn().mockReturnValue({
    defaultTimeout: 30000,
    maxRetries: 3,
    retryDelay: 1000
  }),
  getVisualEffectsConfig: vi.fn().mockReturnValue({
    particles: { count: 120, minSize: 1, maxSize: 4, speed: 0.35, drift: 0.5 },
    bloom: { intensity: 1.0, pulseSpeed: 6 },
    gradients: {
      cycleDuration: 16,
      layers: [
        'radial-gradient(circle at 20% 30%, rgba(0,255,255,0.15), transparent 60%)',
        'radial-gradient(circle at 80% 70%, rgba(255,0,255,0.12), transparent 65%)'
      ]
    },
    noise: { enabled: true, opacity: 0.06, scale: 2, speed: 0.25 },
    palette: ['#00ffff', '#ff00ff', '#ffff00', '#ff0080', '#00ff80'],
    aura: { rings: 4, rotationSpeed: 22, pulseDuration: 9 }
  }),
  getConfigSection: vi.fn().mockImplementation((section: string) => {
    const defaultConfig: any = {
      gameController: { maxHealth: 100, initialScore: 0, tickRate: 60 },
      errorReporting: { enabled: true, batchSize: 5, batchTimeout: 1000, maxRetries: 3 },
      debug: { enableAIAnalysis: false, logLevel: 'info', performanceTracking: true },
      backend: { url: 'http://localhost:8000', timeout: 5000, retryAttempts: 3 },
      backendSync: {
        api: {
          baseUrl: 'http://localhost:8000',
          qualiaEndpoint: '/api/qualia',
          healthEndpoint: '/api/health',
          timeout: 5000
        },
        streaming: {
          websocket: {
            url: 'ws://127.0.0.1:8000/ws/video_stream',
            maxReconnectAttempts: 10,
            reconnectDelay: 1000,
            pingInterval: 30000,
            pingTimeout: 5000,
            connectionTimeout: 10000
          }
        },
        sync: {
          throttleDelay: 100,
          batchSize: 10,
          maxRetries: 3,
          retryDelay: 1000
        },
        connection: {
          healthCheckInterval: 30000,
          connectionTimeout: 10000,
          maxFailedAttempts: 5
        },
        validation: {
          enableSchemaValidation: true,
          strictMode: false,
          logValidationErrors: true
        },
        performance: {
          enableMetrics: true,
          metricsInterval: 5000
        }
      },
      audio: { masterVolume: 0.7, enableSpatialAudio: true, bufferSize: 2048 },
      rhythm: { bpm: 120, syncTolerance: 100, adaptive: true },
      notifications: { enabled: true, maxConcurrent: 5, defaultDuration: 3000 },
      qualia: { decayRate: 0.01, intensityMultiplier: 1.2, flowThreshold: 0.7 },
      qualiaCalculator: {
        baseQualiaState: {
          intensity: 0.3,
          precision: 0.5,
          aggression: 0.0,
          flow: 0.4,
          chaos: 0.0,
          recovery: 0.0,
          transcendence: 0.0,
        },
        performanceMultipliers: {
          perfectHit: 1.2,
          goodHit: 1.0,
          missHit: 0.8,
          comboBonus: 1.5,
        },
        decayRates: {
          intensity: 0.001,
          precision: 0.001,
          aggression: 0.001,
          flow: 0.001,
          chaos: 0.001,
          recovery: 0.001,
          transcendence: 0.001,
        },
        thresholds: {
          highIntensity: 0.8,
          lowPrecision: 0.2,
          chaosThreshold: 0.7,
          transcendenceThreshold: 0.9,
        },
        comboSystem: {
          maxComboMultiplier: 2.0,
          comboDecayTime: 5000,
          perfectComboBonus: 1.1,
        },
        recoveryMechanics: {
          recoveryRate: 0.01,
          maxRecovery: 1.0,
          recoveryCooldown: 1000,
        },
        updateIntervalMs: 100,
        historySize: 100,
        hitNoteMultipliers: { intensity: 0.1, precision: 0.05, flow: 0.08 },
        missNoteMultipliers: { chaos: 0.1, precision: -0.05, flow: -0.03 },
        dashMultipliers: { aggression: 0.1, intensity: 0.05 },
        fastForwardMultipliers: { aggression: 0.15, intensity: 0.08 },
        rewindMultipliers: { recovery: 0.1, precision: 0.05 },
        updateInterval: 100,
        intensityDecay: 0.001,
        precisionDecay: 0.001,
        aggressionDecay: 0.001,
        flowDecay: 0.001,
        chaosDecay: 0.001,
        recoveryDecay: 0.001,
        transcendenceDecay: 0.001,
      },
    };
    return defaultConfig[section] || {};
  }),
  isLoaded: vi.fn().mockReturnValue(true),
  reload: vi.fn().mockResolvedValue(undefined)
};

/**
 * Mock Game State Store Implementation - Complete Interface Coverage
 */
const mockGameStateStore: any = {
  setNotifications: vi.fn(),
  getNotifications: vi.fn().mockReturnValue([]),
  updateGameState: vi.fn(),
  getGameState: vi.fn().mockReturnValue({
    gameState: 'idle',
    isPlaying: false,
    score: 0,
    health: 100
  }),
  updateQualiaState: vi.fn(),
  getQualiaState: vi.fn().mockReturnValue({
    consciousness: 0,
    attention: 0,
    clarity: 0,
    flow: 0,
    intensity: 0,
    precision: 0,
    aggression: 0,
    recovery: 0,
    chaos: 0
  }),
  setState: vi.fn() // Add setState method for test compatibility
};

/**
 * Mock Game State Store Service Implementation - QUALIA.CODE v1.1 Compliance
 */
const mockGameStateStoreService: any = {
  start: vi.fn(),
  stop: vi.fn(),
  updateGameState: vi.fn(),
  updateQualiaState: vi.fn(),
  getStatus: vi.fn().mockReturnValue('stopped'),
  isRunning: vi.fn().mockReturnValue(false),
};

/**
 * Mock HttpService Implementation - QUALIA.CODE v1.1 Compliance
 */
const mockHttpService: IHttpService = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

/**
 * Mock TimerService Implementation - QUALIA.CODE v1.1 Compliance
 */
const mockTimerService: ITimerService = {
  setTimeout: vi.fn().mockReturnValue(12345), // Return a mock timer ID
  clearTimeout: vi.fn(),
  setInterval: vi.fn().mockReturnValue(54321), // Return a mock interval ID
  clearInterval: vi.fn(),
  debounce: vi.fn().mockImplementation((func: any) => func),
  throttle: vi.fn().mockImplementation((func: any) => func),
};

/**
 * Mock StreamingVideoService Implementation
 */
const mockStreamingVideoService: IStreamingVideoService = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn(),
  subscribeToFrames: vi.fn().mockReturnValue('mock-subscription-id'),
  unsubscribeFromFrames: vi.fn(),
  getConnectionStatus: vi.fn().mockReturnValue({
    connected: false,
    url: 'ws://127.0.0.1:8000/ws/video_stream',
    lastConnected: null,
    reconnectAttempts: 0,
    error: null,
  }),
  getStatistics: vi.fn().mockReturnValue({
    framesReceived: 0,
    framesPerSecond: 0,
    bytesReceived: 0,
    connectionUptime: 0,
    averageLatency: 0,
    currentFps: 0,
    averageFrameSize: 0,
    lastFrameTimestamp: 0,
    latency: 0,
    droppedFrames: 0,
  }),
  requestQualityChange: vi.fn(),
  requestFpsChange: vi.fn(),
  ping: vi.fn().mockResolvedValue(50),
};

/**
 * GOLD.CODE Test Container Factory
 * 
 * Creates a fresh InversifyJS container with all dependencies properly mocked.
 * Services Under Test are bound to their concrete implementations.
 * All dependencies are bound to mock implementations for isolation.
 */
export function createTestContainer(configOverrides?: Partial<IConfigurationService>): Container {
  const container = new Container({ 
    defaultScope: 'Singleton' 
  });

  // 1. Cree una copia profunda del mock base
  const localMockConfig = merge({}, mockConfigurationService);

  // 2. Fusione las sobreescrituras de forma profunda
  if (configOverrides) {
    merge(localMockConfig, configOverrides);
  }

  // 3. Vincule el mock fusionado
  container.bind<IConfigurationService>(TYPES.IConfigurationService).toConstantValue(localMockConfig);

  // Bind mock dependencies first (these will be injected into services)
  container.bind<ILogger>(TYPES.ILogger).toConstantValue(mockLogger);
  container.bind<IEventBus>(TYPES.IEventBus).toConstantValue(mockEventBus);
  container.bind<IGameStateStore>(TYPES.IGameStateStore).toConstantValue(mockGameStateStore);
  container.bind<IGameStateStoreService>(TYPES.IGameStateStoreService).toConstantValue(mockGameStateStoreService);

  // --- NUEVOS BINDINGS ---
  container.bind<IHttpService>(TYPES.IHttpService).toConstantValue(mockHttpService);
  container.bind<ITimerService>(TYPES.ITimerService).toConstantValue(mockTimerService);
  // -----------------------

  // Mock StoreSetter (Zustand store setter function)
  const mockStoreSetter = vi.fn();
  container.bind<(_state: any) => void>(TYPES.StoreSetter).toConstantValue(mockStoreSetter);

  // Bind concrete service implementations (Services Under Test)
  container.bind<IDebugService>(TYPES.IDebugService).to(DebugService).inSingletonScope();
  container.bind<IErrorReportingService>(TYPES.IErrorReportingService).to(ErrorReportingService).inSingletonScope();
  container.bind<INotificationService>(TYPES.INotificationService).to(NotificationService).inSingletonScope();
  container.bind<GameStateStoreService>(GameStateStoreService).toSelf().inSingletonScope();
  container.bind<IRhythmicMovementController>(TYPES.IRhythmicMovementController).to(RhythmicMovementController).inSingletonScope();
  container.bind<IOntologicalAudioEngine>(TYPES.IOntologicalAudioEngine).to(OntologicalAudioEngine).inSingletonScope();
  container.bind<IStreamingVideoService>(TYPES.IStreamingVideoService).toConstantValue(mockStreamingVideoService);

  // === CRITICAL MISSING BINDINGS RESTORATION ===
  // QUALIA.CODE M-2024-3-FE-TEST-INFRA COMPLIANCE
  container.bind<IGameControllerService>(TYPES.IGameControllerService).to(GameControllerService).inSingletonScope();
  container.bind<IBackendSyncService>(TYPES.IBackendSyncService).to(BackendSyncService).inSingletonScope();
  container.bind<IAudioService>(TYPES.IAudioService).to(AudioService).inSingletonScope();
  container.bind<IQualiaStateCalculatorService>(TYPES.IQualiaStateCalculatorService).to(QualiaStateCalculatorService).inSingletonScope();
  container.bind<IWebAudioAPIService>(TYPES.IWebAudioAPIService).to(WebAudioAPIService).inSingletonScope();
  // === END CRITICAL RESTORATION ===

  return container;
}

/**
 * Utility function to get mock instances from container for assertions
 */
export function getMocksFromContainer(container: Container) {
  return {
    mockLogger: container.get<ILogger>(TYPES.ILogger),
    mockEventBus: container.get<IEventBus>(TYPES.IEventBus),
    mockConfigurationService: container.get<IConfigurationService>(TYPES.IConfigurationService),
    mockGameStateStore: container.get<IGameStateStore>(TYPES.IGameStateStore),
    mockGameStateStoreService: container.get<IGameStateStoreService>(TYPES.IGameStateStoreService),
    mockStoreSetter: container.get<(_state: any) => void>(TYPES.StoreSetter),
    // --- CORE SERVICE MOCKS ---
    mockHttpService: container.get<IHttpService>(TYPES.IHttpService),
    mockTimerService: container.get<ITimerService>(TYPES.ITimerService),
    mockStreamingVideoService: container.get<IStreamingVideoService>(TYPES.IStreamingVideoService),
  };
}

/**
 * QUALIA.CODE v1.0 - Test Reset Utility
 * Centralized mock reset functionality for consistent test isolation.
 * Ensures synchronous behavior for fast test execution.
 */
export function resetAllMocks() {
  // Clear all mocks except EventBus which has custom implementation
  vi.clearAllMocks();
  
  // Reset mock return values to defaults
  (mockLogger.getLevel as Mock).mockReturnValue('info');
  
  // Reset EventBus subscribers between tests
  const eventBusMock = mockEventBus as any;
  if (eventBusMock.subscribers) {
    eventBusMock.subscribers.clear();
  }
  
  // Don't clear EventBus mocks since they have custom implementations
  (mockEventBus.subscribe as Mock).mockClear();
  (mockEventBus.unsubscribe as Mock).mockClear(); 
  (mockEventBus.emit as Mock).mockClear();
  (mockEventBus.getStats as Mock).mockClear();

  (mockConfigurationService.isLoaded as Mock).mockReturnValue(true);
  (mockConfigurationService.getBackendConfig as Mock).mockReturnValue({ 
    url: 'http://localhost:8000',
    timeout: 5000,
    retryAttempts: 3
  });
}
