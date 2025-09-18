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
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  setLevel: jest.fn(),
  getLevel: jest.fn().mockReturnValue('info'),
};

/**
 * Mock EventBus Implementation - Complete Interface Coverage
 */
const mockEventBus: IEventBus = {
  subscribe: jest.fn().mockReturnValue('mock-listener-id'),
  unsubscribe: jest.fn(),
  emit: jest.fn(),
  clear: jest.fn(),
  getListenerCount: jest.fn().mockReturnValue(0),
  getAllEvents: jest.fn().mockReturnValue([]),
};

/**
 * Mock Configuration Service Implementation
 */
const mockConfigurationService: IConfigurationService = {
  loadConfig: jest.fn().mockResolvedValue(true),
  getConfig: jest.fn().mockReturnValue({}),
  getGameConfig: jest.fn().mockReturnValue({}),
  getQualiaConfig: jest.fn().mockReturnValue({}),
  getBackendConfig: jest.fn().mockReturnValue({ url: 'mock://backend' }),
  isLoaded: jest.fn().mockReturnValue(true),
  reload: jest.fn().mockResolvedValue(true),
};

/**
 * Mock Game State Store Implementation  
 */
const mockGameStateStore: IGameStateStore = {
  getState: jest.fn().mockReturnValue({
    gameState: 'idle',
    qualiaState: { consciousness: 0, attention: 0, clarity: 0, flow: 0 },
    player: { position: { x: 0, y: 0 }, health: 100 },
    isPlaying: false,
    score: 0
  }),
  setState: jest.fn(),
  subscribe: jest.fn().mockReturnValue(() => {}),
  updateGameState: jest.fn(),
  updateQualiaState: jest.fn(),
  updatePlayerState: jest.fn(),
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
    autoBindInjectable: false, // Explicit binding for test clarity
    defaultScope: 'Singleton' 
  });

  // Bind mock dependencies first (these will be injected into services)
  container.bind<ILogger>(TYPES.ILogger).toConstantValue(mockLogger);
  container.bind<IEventBus>(TYPES.IEventBus).toConstantValue(mockEventBus);
  container.bind<IConfigurationService>(TYPES.IConfigurationService).toConstantValue(mockConfigurationService);
  container.bind<IGameStateStore>(TYPES.IGameStateStore).toConstantValue(mockGameStateStore);

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
  };
}

/**
 * Reset all mocks between tests
 */
export function resetAllMocks() {
  jest.clearAllMocks();
  
  // Reset mock return values to defaults
  (mockLogger.getLevel as jest.Mock).mockReturnValue('info');
  (mockEventBus.subscribe as jest.Mock).mockReturnValue('mock-listener-id');
  (mockEventBus.getListenerCount as jest.Mock).mockReturnValue(0);
  (mockEventBus.getAllEvents as jest.Mock).mockReturnValue([]);
  (mockConfigurationService.isLoaded as jest.Mock).mockReturnValue(true);
  (mockConfigurationService.getBackendConfig as jest.Mock).mockReturnValue({ url: 'mock://backend' });
  (mockGameStateStore.subscribe as jest.Mock).mockReturnValue(() => {});
}
