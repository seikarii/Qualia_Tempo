import { describe, test, expect, beforeEach, afterEach, vi, type Mocked } from 'vitest';
/**
 * Tests for GameStateStoreService - GOLD.CODE IoC Compliance
 * Bridge service between EventBus and Zustand store for passive state management
 */

import { createTestContainer, getMocksFromContainer, resetAllMocks } from '../../testing/test-container-factory';
import { GameStateStoreService } from '../GameStateStoreService';
import { IEventBus } from '../interfaces/IEventBus';
import { QualiaLogger } from '../Logger';
import { Container } from 'inversify';

describe('GameStateStoreService - GOLD.CODE IoC Testing', () => {
  let gameStateStoreService: GameStateStoreService;
  let container: Container;
  let mockEventBus: Mocked<IEventBus>;
  let mockLogger: Mocked<QualiaLogger>;
  let mockSetStore: MockedFunction<(_state: any) => void>;

  beforeEach(() => {
    // Reset all mocks to clean state
    resetAllMocks();

    // Create fresh test container with proper IoC bindings
    container = createTestContainer();

    // Get mock instances for assertions - use the same mocks that are injected
    const mocks = getMocksFromContainer(container);
    mockEventBus = mocks.mockEventBus as Mocked<IEventBus>;
    mockLogger = mocks.mockLogger as Mocked<QualiaLogger>;
    mockSetStore = mocks.mockStoreSetter as MockedFunction<(_state: any) => void>;

    // GOLD.CODE COMPLIANCE: Resolve service from IoC container
    gameStateStoreService = container.get<GameStateStoreService>(GameStateStoreService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with EventBus and store setter', () => {
      expect(gameStateStoreService).toBeInstanceOf(GameStateStoreService);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔗 [GameStateStoreService] Bridge service initialized'
      );
    });
  });

  describe('Service Lifecycle', () => {
    it('should start service and subscribe to events', () => {
      // Mock subscribe to return listener IDs
      mockEventBus.subscribe.mockReturnValueOnce('listener-1').mockReturnValueOnce('listener-2');

      gameStateStoreService.start();

      expect(mockEventBus.subscribe).toHaveBeenCalledTimes(3); // GameStateChanged, QualiaStateUpdated, RhythmicDash
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'GameStateChanged',
        expect.any(Function)
      );
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'QualiaStateUpdated',
        expect.any(Function)
      );
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'RhythmicDash',
        expect.any(Function)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🎧 [GameStateStoreService] Starting event listeners...'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ [GameStateStoreService] Event listeners active'
      );
    });

    it('should not start if already started', () => {
      mockEventBus.subscribe.mockReturnValue('listener-1');
      
      gameStateStoreService.start();
      gameStateStoreService.start();

      expect(mockEventBus.subscribe).toHaveBeenCalledTimes(3); // Only from first start
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '⚠️ [GameStateStoreService] Service already started'
      );
    });

    it('should stop service and unsubscribe from events', () => {
      // Start first
      mockEventBus.subscribe.mockReturnValueOnce('listener-1').mockReturnValueOnce('listener-2').mockReturnValueOnce('listener-3');
      gameStateStoreService.start();

      // Then stop
      gameStateStoreService.stop();

      expect(mockEventBus.unsubscribe).toHaveBeenCalledTimes(3);
      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith('listener-1');
      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith('listener-2');
      expect(mockEventBus.unsubscribe).toHaveBeenCalledWith('listener-3');
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔇 [GameStateStoreService] Stopping event listeners...'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ [GameStateStoreService] Event listeners stopped'
      );
    });

    it('should not stop if not started', () => {
      gameStateStoreService.stop();

      expect(mockEventBus.unsubscribe).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
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

      // Clear previous logger calls before testing handler
      vi.clearAllMocks();
      
      gameStateHandler(gameStateChangedEvent);

      expect(mockSetStore).toHaveBeenCalledWith(expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🎮 [GameStateStoreService] Processing GameStateChanged:',
        { newState: 'Playing' }
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
      expect(mockLogger.info).toHaveBeenCalledWith(
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
      expect(newState.player.position).toEqual({ x: 4, y: 4 }); // Service resets to 4,4 not 0,0
      expect(newState.player.health).toBe(100);
    });

    it('should warn on unhandled game state', () => {
      const gameStateChangedEvent = {
        newState: 'UnknownState'
      };

      gameStateHandler(gameStateChangedEvent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
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
      expect(mockLogger.info).toHaveBeenCalledWith(
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
        oldState: 'Idle',
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
          oldState: 'Idle',
          previousState: 'Idle',
          timestamp: new Date()
        });
      }).toThrow('Store update failed');
    });
  });
});
