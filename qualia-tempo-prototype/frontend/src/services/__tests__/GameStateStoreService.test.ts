/**
 * Tests for GameStateStoreService
 * Bridge service between EventBus and Zustand store for passive state management
 */

import { GameStateStoreService } from '../GameStateStoreService';
import { EventBus } from '../EventBus';
import { QualiaLogger } from '../Logger';

// Mock decorators
jest.mock('../../utils/decorators', () => ({
  logMethod: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  catchError: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

describe('GameStateStoreService', () => {
  let gameStateStoreService: GameStateStoreService;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockLogger: Partial<QualiaLogger>;
  let mockSetStore: jest.Mock;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create mock EventBus
    mockEventBus = {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      emit: jest.fn(),
      clear: jest.fn(),
      getListeners: jest.fn(),
      getEventHistory: jest.fn(),
    } as any;

    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Create mock store setter
    mockSetStore = jest.fn();

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    gameStateStoreService = new GameStateStoreService(mockEventBus, mockLogger as QualiaLogger, mockSetStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Constructor', () => {
    it('should initialize with EventBus and store setter', () => {
      expect(gameStateStoreService).toBeInstanceOf(GameStateStoreService);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔗 [GameStateStoreService] Bridge service initialized'
      );
    });
  });

  describe('Service Lifecycle', () => {
    it('should start service and subscribe to events', () => {
      // Mock subscribe to return listener IDs
      mockEventBus.subscribe.mockReturnValueOnce('listener-1').mockReturnValueOnce('listener-2');

      gameStateStoreService.start();

      expect(mockEventBus.subscribe).toHaveBeenCalledTimes(2);
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'GameStateChanged',
        expect.any(Function)
      );
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'QualiaStateUpdated',
        expect.any(Function)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎧 [GameStateStoreService] Starting event listeners...'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ [GameStateStoreService] Event listeners active'
      );
    });

    it('should not start if already started', () => {
      mockEventBus.subscribe.mockReturnValue('listener-1');
      
      gameStateStoreService.start();
      gameStateStoreService.start();

      expect(mockEventBus.subscribe).toHaveBeenCalledTimes(2); // Only from first start
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ [GameStateStoreService] Service already started'
      );
    });

    it('should stop service and unsubscribe from events', () => {
      // Start first
      mockEventBus.subscribe.mockReturnValueOnce('listener-1').mockReturnValueOnce('listener-2');
      gameStateStoreService.start();

      // Then stop
      gameStateStoreService.stop();

      expect(mockEventBus.unsubscribe).toHaveBeenCalledTimes(2);
      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith('listener-1');
      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith('listener-2');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔇 [GameStateStoreService] Stopping event listeners...'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ [GameStateStoreService] Event listeners stopped'
      );
    });

    it('should not stop if not started', () => {
      gameStateStoreService.stop();

      expect(mockEventBus.unsubscribe).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ [GameStateStoreService] Service not started'
      );
    });

    it('should return correct status', () => {
      expect(gameStateStoreService.getStatus()).toBe('stopped');

      mockEventBus.subscribe.mockReturnValue('listener-1');
      gameStateStoreService.start();
      expect(gameStateStoreService.getStatus()).toBe('running');

      gameStateStoreService.stop();
      expect(gameStateStoreService.getStatus()).toBe('stopped');
    });
  });

  describe('Game State Change Handling', () => {
    let gameStateHandler: Function;

    beforeEach(() => {
      // Start service and capture the game state handler
      mockEventBus.subscribe.mockImplementation((eventType, handler) => {
        if (eventType === 'GameStateChanged') {
          gameStateHandler = handler;
        }
        return 'listener-id';
      });
      gameStateStoreService.start();
    });

    it('should handle "Playing" state change', () => {
      const gameStateChangedEvent = {
        newState: 'Playing'
      };

      gameStateHandler(gameStateChangedEvent);

      expect(mockSetStore).toHaveBeenCalledWith(expect.any(Function));
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎮 [GameStateStoreService] Processing GameStateChanged:',
        'Playing'
      );

      // Test the store update function
      const storeUpdateFn = mockSetStore.mock.calls[0][0];
      const previousState = { player: { score: 50 } };
      const newState = storeUpdateFn(previousState);

      expect(newState.isPlaying).toBe(true);
      expect(newState.gameStartTime).toBeGreaterThan(0);
    });

    it('should handle "Paused" state change', () => {
      const gameStateChangedEvent = {
        newState: 'Paused'
      };

      gameStateHandler(gameStateChangedEvent);

      expect(mockSetStore).toHaveBeenCalledWith(expect.any(Function));

      // Test the store update function
      const storeUpdateFn = mockSetStore.mock.calls[0][0];
      const previousState = { isPlaying: true };
      const newState = storeUpdateFn(previousState);

      expect(newState.isPlaying).toBe(false);
    });

    it('should handle "GameOver" state change and reset state', () => {
      const gameStateChangedEvent = {
        newState: 'GameOver'
      };

      gameStateHandler(gameStateChangedEvent);

      expect(mockSetStore).toHaveBeenCalledWith(expect.any(Function));
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '💀 [GameStateStoreService] Game Over - State reset'
      );

      // Test the store update function
      const storeUpdateFn = mockSetStore.mock.calls[0][0];
      const previousState = {
        isPlaying: true,
        player: { score: 100, health: 50 }
      };
      const newState = storeUpdateFn(previousState);

      expect(newState.isPlaying).toBe(false);
      expect(newState.currentTime).toBe(0);
      expect(newState.gameStartTime).toBe(0);
      expect(newState.player.health).toBe(100);
      expect(newState.player.combo).toBe(0);
      expect(newState.player.score).toBe(0);
      expect(newState.qualiaState.intensity).toBe(0);
    });

    it('should handle "Menu" state change and reset state', () => {
      const gameStateChangedEvent = {
        newState: 'Menu'
      };

      gameStateHandler(gameStateChangedEvent);

      expect(mockSetStore).toHaveBeenCalledWith(expect.any(Function));

      // Test the store update function
      const storeUpdateFn = mockSetStore.mock.calls[0][0];
      const previousState = {
        isPlaying: true,
        player: { score: 100 }
      };
      const newState = storeUpdateFn(previousState);

      expect(newState.isPlaying).toBe(false);
      expect(newState.currentTime).toBe(0);
      expect(newState.player.position).toEqual({ x: 0, y: 0 });
      expect(newState.player.health).toBe(100);
    });

    it('should warn on unhandled game state', () => {
      const gameStateChangedEvent = {
        newState: 'UnknownState'
      };

      gameStateHandler(gameStateChangedEvent);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ [GameStateStoreService] Unhandled game state:',
        'UnknownState'
      );
    });
  });

  describe('Qualia State Update Handling', () => {
    let qualiaStateHandler: Function;

    beforeEach(() => {
      // Start service and capture the qualia state handler
      mockEventBus.subscribe.mockImplementation((eventType, handler) => {
        if (eventType === 'QualiaStateUpdated') {
          qualiaStateHandler = handler;
        }
        return 'listener-id';
      });
      gameStateStoreService.start();
    });

    it('should handle QualiaStateUpdated events', () => {
      const qualiaStateUpdatedEvent = {
        qualiaState: {
          intensity: 0.8,
          precision: 0.9,
          aggression: 0.5,
          flow: 0.7,
          chaos: 0.2,
          recovery: 0.3,
          transcendence: 0.1
        }
      };

      qualiaStateHandler(qualiaStateUpdatedEvent);

      expect(mockSetStore).toHaveBeenCalledWith(expect.any(Function));
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🌟 [GameStateStoreService] Processing QualiaStateUpdated:',
        qualiaStateUpdatedEvent.qualiaState
      );

      // Test the store update function
      const storeUpdateFn = mockSetStore.mock.calls[0][0];
      const previousState = {
        qualiaState: { intensity: 0.5 },
        player: { score: 100 }
      };
      const newState = storeUpdateFn(previousState);

      expect(newState.qualiaState).toEqual(qualiaStateUpdatedEvent.qualiaState);
      expect(newState.player.score).toBe(100); // Should preserve other state
    });

    it('should create a copy of qualia state to avoid mutations', () => {
      const originalQualiaState = {
        intensity: 0.8,
        precision: 0.9,
        aggression: 0.5,
        flow: 0.7,
        chaos: 0.2,
        recovery: 0.3,
        transcendence: 0.1
      };

      const qualiaStateUpdatedEvent = {
        qualiaState: originalQualiaState
      };

      qualiaStateHandler(qualiaStateUpdatedEvent);

      // Test the store update function
      const storeUpdateFn = mockSetStore.mock.calls[0][0];
      const previousState = { qualiaState: { intensity: 0.1 } };
      const newState = storeUpdateFn(previousState);

      // Should be a copy, not the same reference
      expect(newState.qualiaState).not.toBe(originalQualiaState);
      expect(newState.qualiaState).toEqual(originalQualiaState);
    });
  });

  describe('Integration Testing', () => {
    it('should handle multiple event types in sequence', () => {
      mockEventBus.subscribe.mockReturnValue('listener-id');
      gameStateStoreService.start();

      // Simulate GameStateChanged event
      const gameStateCallArgs = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'GameStateChanged'
      );
      const gameStateHandler = gameStateCallArgs![1];

      gameStateHandler({ 
        type: 'GameStateChanged',
        newState: 'Playing',
        previousState: 'Idle',
        timestamp: new Date()
      });
      expect(mockSetStore).toHaveBeenCalledTimes(1);

      // Simulate QualiaStateUpdated event
      const qualiaStateCallArgs = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'QualiaStateUpdated'
      );
      const qualiaStateHandler = qualiaStateCallArgs![1];

      qualiaStateHandler({
        type: 'QualiaStateUpdated',
        qualiaState: { intensity: 0.8, precision: 0.9, aggression: 0.5, flow: 0.7, chaos: 0.2, recovery: 0.3, transcendence: 0.1 },
        timestamp: new Date()
      });
      expect(mockSetStore).toHaveBeenCalledTimes(2);
    });

    it('should maintain separate listener tracking', () => {
      mockEventBus.subscribe.mockReturnValueOnce('game-listener').mockReturnValueOnce('qualia-listener');
      
      gameStateStoreService.start();
      gameStateStoreService.stop();

      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith('game-listener');
      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith('qualia-listener');
    });
  });

  describe('Error Resilience', () => {
    it('should propagate store setter errors', () => {
      mockEventBus.subscribe.mockReturnValue('listener-id');
      mockSetStore.mockImplementation(() => {
        throw new Error('Store update failed');
      });

      gameStateStoreService.start();

      // Get the game state handler
      const gameStateHandler = mockEventBus.subscribe.mock.calls[0][1];

      // This should throw because the service doesn't handle store errors
      expect(() => {
        gameStateHandler({ 
          type: 'GameStateChanged',
          newState: 'Playing',
          previousState: 'Idle',
          timestamp: new Date()
        });
      }).toThrow('Store update failed');
    });
  });
});
