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

// Mock decorators BEFORE importing any services - Using Vitest
import { vi, type Mock } from 'vitest';

vi.mock('../utils/decorators', () => ({
  logMethod: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  catchError: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  validate: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  throttle: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  validateEventProperty: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

import { Container } from 'inversify';
import { TYPES } from '../services/inversify.types';

// Import all interfaces for proper typing
import type { ILogger } from '../services/interfaces/ILogger';
import type { IEventBus } from '../services/interfaces/IEventBus';
import type { IConfigurationService } from '../services/interfaces/IConfigurationService';
import type { IGameStateStore } from '../services/interfaces/IGameStateStore';
import type { IDebugService } from '../services/interfaces/IDebugService';
import type { IErrorReportingService } from '../services/interfaces/IErrorReportingService';
import type { INotificationService } from '../services/interfaces/INotificationService';
import type { IRhythmicMovementController } from '../services/interfaces/IRhythmicMovementController';

// Import concrete service classes for binding
import { DebugService } from '../services/DebugService';
import { ErrorReportingService } from '../services/ErrorReportingService';
import { NotificationService } from '../services/NotificationService';
import { GameStateStoreService } from '../services/GameStateStoreService';
import { RhythmicMovementController } from '../services/RhythmicMovementController';

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
 */
const mockEventBus: IEventBus = {
  subscribe: vi.fn().mockReturnValue('mock-listener-id'),
  unsubscribe: vi.fn().mockReturnValue(true),
  emit: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn(),
  destroy: vi.fn(),
  getStats: vi.fn().mockReturnValue({
    totalListeners: 0,
    eventTypes: [],
    historySize: 0,
    isDestroyed: false
  })
};

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
  getConfigSection: vi.fn().mockImplementation((section: string) => {
    const defaultConfig: any = {
      gameController: { maxHealth: 100, initialScore: 0, tickRate: 60 },
      errorReporting: { enabled: true, batchSize: 5, batchTimeout: 1000, maxRetries: 3 },
      debug: { enableAIAnalysis: false, logLevel: 'info', performanceTracking: true },
      backend: { url: 'http://localhost:8000', timeout: 5000, retryAttempts: 3 },
      audio: { masterVolume: 0.7, enableSpatialAudio: true, bufferSize: 2048 },
      rhythm: { bpm: 120, syncTolerance: 100, adaptive: true },
      notifications: { enabled: true, maxConcurrent: 5, defaultDuration: 3000 },
      qualia: { decayRate: 0.01, intensityMultiplier: 1.2, flowThreshold: 0.7 }
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
    focus_level: 0,
    aggression: 0,
    recovery: 0,
    chaos: 0
  }),
  setState: vi.fn() // Add setState method for test compatibility
};

/**
 * GOLD.CODE Test Container Factory
 * 
 * Creates a fresh InversifyJS container with all dependencies properly mocked.
 * Services Under Test are bound to their concrete implementations.
 * All dependencies are bound to mock implementations for isolation.
 */
export function createTestContainer(): Container {
  const container = new Container({ 
    defaultScope: 'Singleton' 
  });

  // Bind mock dependencies first (these will be injected into services)
  container.bind<ILogger>(TYPES.ILogger).toConstantValue(mockLogger);
  container.bind<IEventBus>(TYPES.IEventBus).toConstantValue(mockEventBus);
  container.bind<IConfigurationService>(TYPES.IConfigurationService).toConstantValue(mockConfigurationService);
  container.bind<IGameStateStore>(TYPES.IGameStateStore).toConstantValue(mockGameStateStore);

  // Mock StoreSetter (Zustand store setter function)
  const mockStoreSetter = vi.fn();
  container.bind<(_state: any) => void>(TYPES.StoreSetter).toConstantValue(mockStoreSetter);

  // Bind concrete service implementations (Services Under Test)
  container.bind<IDebugService>(TYPES.IDebugService).to(DebugService).inSingletonScope();
  container.bind<IErrorReportingService>(TYPES.IErrorReportingService).to(ErrorReportingService).inSingletonScope();
  container.bind<INotificationService>(TYPES.INotificationService).to(NotificationService).inSingletonScope();
  container.bind<GameStateStoreService>(GameStateStoreService).toSelf().inSingletonScope();
  container.bind<IRhythmicMovementController>(TYPES.IRhythmicMovementController).to(RhythmicMovementController).inSingletonScope();

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
    mockStoreSetter: container.get<(_state: any) => void>(TYPES.StoreSetter),
  };
}

/**
 * QUALIA.CODE v1.0 - Test Reset Utility
 * Centralized mock reset functionality for consistent test isolation.
 */
export function resetAllMocks() {
  vi.clearAllMocks();
  
  // Reset mock return values to defaults
  (mockLogger.getLevel as Mock).mockReturnValue('info');
  (mockEventBus.subscribe as Mock).mockReturnValue('mock-listener-id');
  (mockEventBus.unsubscribe as Mock).mockReturnValue(true);
  (mockEventBus.getStats as Mock).mockReturnValue({
    totalListeners: 0,
    eventTypes: [],
    historySize: 0,
    isDestroyed: false
  });
  (mockConfigurationService.isLoaded as Mock).mockReturnValue(true);
  (mockConfigurationService.getBackendConfig as Mock).mockReturnValue({ 
    url: 'http://localhost:8000',
    timeout: 5000,
    retryAttempts: 3
  });
}
