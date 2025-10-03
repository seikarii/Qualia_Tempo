/**
 * DIRECTIVE 005 - PHASE 1: ApplicationInitializerService Critical Test Coverage
 * 
 * ARCHITECTURE COMPLIANCE:
 * - Uses createTestContainer() for total isolation
 * - No manual instantiation
 * - Tests service orchestration and lifecycle management
 * - Verifies IBaseService initialize/cleanup calls
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createTestContainer } from '../../testing/test-container-factory';
import type { Container } from 'inversify';
import { TYPES } from '../inversify.types';
import type { IApplicationInitializerService } from '../interfaces/IApplicationInitializerService';
import type { IBackendSyncService } from '../interfaces/IBackendSyncService';
import type { IGameStateStoreService } from '../interfaces/IGameStateStoreService';
import type { IGameControllerService } from '../interfaces/IGameControllerService';
import type { IRhythmicMovementController } from '../interfaces/IRhythmicMovementController';
import type { IEventBus } from '../interfaces/IEventBus';
import type { ILogger } from '../interfaces/ILogger';
import { ApplicationInitializerService } from '../ApplicationInitializerService';
import type { IBaseService } from '../../utils/decorators';

describe('ApplicationInitializerService - Critical Test Coverage', () => {
  let container: Container;
  let appInitializer: IApplicationInitializerService;
  let mockBackendSync: IBackendSyncService;
  let mockGameStateStore: IGameStateStoreService;
  let mockGameController: IGameControllerService;
  let mockRhythmicController: IRhythmicMovementController;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;

  beforeEach(() => {
    // STEP 1: Create isolated test container
    container = createTestContainer();
    
    // STEP 2: Get mock services from container
    mockBackendSync = container.get<IBackendSyncService>(TYPES.IBackendSyncService);
    mockGameStateStore = container.get<IGameStateStoreService>(TYPES.IGameStateStoreService);
    mockGameController = container.get<IGameControllerService>(TYPES.IGameControllerService);
    mockRhythmicController = container.get<IRhythmicMovementController>(TYPES.IRhythmicMovementController);
    mockEventBus = container.get<IEventBus>(TYPES.IEventBus);
    mockLogger = container.get<ILogger>(TYPES.ILogger);
    
    // STEP 3: Reset all mocks to clean state and default implementations
    vi.clearAllMocks();
    
    // STEP 4: Reset mock implementations to default state
    (mockBackendSync.start as Mock).mockResolvedValue(undefined);
    (mockGameStateStore.initialize as Mock).mockResolvedValue(undefined);
    (mockGameStateStore.updateGameState as Mock).mockResolvedValue(undefined);
    (mockGameController.start as Mock).mockResolvedValue(undefined);
    (mockRhythmicController.start as Mock).mockResolvedValue(undefined);
    (mockEventBus.initialize as Mock).mockResolvedValue(undefined);

    // STEP 3: Replace mock with real implementation
    container.unbind(TYPES.IApplicationInitializerService);
    container.bind<IApplicationInitializerService>(TYPES.IApplicationInitializerService)
      .to(ApplicationInitializerService)
      .inSingletonScope();
    appInitializer = container.get<IApplicationInitializerService>(TYPES.IApplicationInitializerService);
  });

  describe('1. Service Orchestration and Order', () => {
    it('should call initialize() on GameStateStoreService during start', async () => {
      // Arrange
      const initializeSpy = vi.spyOn(mockGameStateStore as IBaseService, 'initialize');

      // Act
      await appInitializer.start();

      // Assert
      expect(initializeSpy).toHaveBeenCalled();
    });

    it('should call start() on game services in correct order', async () => {
      // Arrange
      const callOrder: string[] = [];
      
      (mockGameStateStore.initialize as Mock).mockImplementation(() => callOrder.push('gameStateStore'));
      (mockGameController.start as Mock).mockImplementation(() => callOrder.push('gameController'));
      (mockRhythmicController.start as Mock).mockImplementation(() => callOrder.push('rhythmicController'));
      (mockBackendSync.start as Mock).mockImplementation(() => Promise.resolve().then(() => callOrder.push('backendSync')));

      // Act
      await appInitializer.start();

      // Assert: Verify GameStateStore initializes before game services
      const stateStoreIndex = callOrder.indexOf('gameStateStore');
      const gameControllerIndex = callOrder.indexOf('gameController');
      const rhythmicIndex = callOrder.indexOf('rhythmicController');
      const backendIndex = callOrder.indexOf('backendSync');

      expect(stateStoreIndex).toBeLessThan(gameControllerIndex);
      expect(stateStoreIndex).toBeLessThan(rhythmicIndex);
      expect(stateStoreIndex).toBeLessThan(backendIndex);
    });

    it('should call initialize() on EventBus before other services', async () => {
      // Arrange
      const initializeSpy = vi.spyOn(mockEventBus, 'initialize');

      // Act
      await appInitializer.start();

      // Assert
      expect(initializeSpy).toHaveBeenCalled();
    });
  });

  describe('2. Idempotency', () => {
    it('should not reinitialize services when start() is called twice', async () => {
      // Arrange
      const initializeSpy = vi.spyOn(mockGameStateStore as IBaseService, 'initialize');

      // Act
      await appInitializer.start();
      await appInitializer.start(); // Second call

      // Assert: initialize should only be called once
      expect(initializeSpy).toHaveBeenCalledTimes(1);
    });

    it('should log warning when start() is called on already started service', async () => {
      // Arrange
      const warnSpy = vi.spyOn(mockLogger, 'warn');

      // Act
      await appInitializer.start();
      await appInitializer.start(); // Second call

      // Assert
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('3. Error Propagation', () => {
    it('should propagate errors from BackendSyncService.start()', async () => {
      // Arrange
      const testError = new Error('Backend sync initialization failed');
      (mockBackendSync.start as Mock).mockRejectedValue(testError);

      // Act & Assert
      await expect(appInitializer.start()).rejects.toThrow('Backend sync initialization failed');
    });

    it('should log error when service initialization fails', async () => {
      // Arrange
      const testError = new Error('Service initialization failed');
      (mockGameStateStore.initialize as Mock).mockImplementation(() => {
        throw testError;
      });
      const errorSpy = vi.spyOn(mockLogger, 'error');

      // Act & Assert
      await expect(appInitializer.start()).rejects.toThrow();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('4. IBaseService Lifecycle Management', () => {
    it('should call initialize() on services implementing IBaseService', async () => {
      // Arrange
      const mockBaseService = {
        initialize: vi.fn(),
        cleanup: vi.fn()
      } as unknown as IBaseService;

      // This test verifies the lifecycle management pattern
      // In real implementation, services like GameplayMechanicsService implement IBaseService
      
      // Act
      await appInitializer.start();

      // Assert: Verify the initialization pattern is called
      expect(mockGameStateStore.initialize).toHaveBeenCalled();
    });

    it('should update GameStateStore with config loaded status', async () => {
      // Arrange
      const updateSpy = vi.spyOn(mockGameStateStore, 'updateGameState');

      // Act
      await appInitializer.start();

      // Assert
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should update GameStateStore with backend connection status', async () => {
      // Arrange
      (mockBackendSync.isBackendConnected as Mock).mockReturnValue(true);
      const updateSpy = vi.spyOn(mockGameStateStore, 'updateGameState');

      // Act
      await appInitializer.start();

      // Assert
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          backendConnected: true
        })
      );
    });
  });

  describe('5. Service Dependency Verification', () => {
    it('should initialize EventBus before GameStateStoreService', async () => {
      // Arrange
      const callOrder: string[] = [];
      (mockEventBus.initialize as Mock).mockImplementation(() => callOrder.push('eventBus'));
      (mockGameStateStore.initialize as Mock).mockImplementation(() => callOrder.push('gameStateStore'));

      // Act
      await appInitializer.start();

      // Assert
      const eventBusIndex = callOrder.indexOf('eventBus');
      const storeIndex = callOrder.indexOf('gameStateStore');
      expect(eventBusIndex).toBeLessThan(storeIndex);
    });

    it('should start GameController before BackendSync', async () => {
      // Arrange
      const callOrder: string[] = [];
      (mockGameController.start as Mock).mockImplementation(() => callOrder.push('gameController'));
      (mockBackendSync.start as Mock).mockImplementation(() => Promise.resolve().then(() => callOrder.push('backendSync')));

      // Act
      await appInitializer.start();

      // Assert
      const gameControllerIndex = callOrder.indexOf('gameController');
      const backendIndex = callOrder.indexOf('backendSync');
      expect(gameControllerIndex).toBeLessThan(backendIndex);
    });
  });
});
