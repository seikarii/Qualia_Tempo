/**
 * DIRECTIVE 005 - PHASE 1: GameControllerService Critical Test Coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestContainer } from '../../testing/test-container-factory';
import type { Container } from 'inversify';
import { TYPES } from '../inversify.types';
import type { IGameControllerService } from '../interfaces/IGameControllerService';
import type { IEventBus } from '../interfaces/IEventBus';
import type { IAudioService } from '../interfaces/IAudioService';
import type { ILogger } from '../interfaces/ILogger';
import type { PlayerActionEvent, GameStateChangedEvent } from '../contracts/events.contracts';
import { GameControllerService } from '../GameControllerService';

describe('GameControllerService - Critical Test Coverage', () => {
  let container: Container;
  let gameController: IGameControllerService;
  let mockEventBus: IEventBus;
  let mockAudioService: IAudioService;

  beforeEach(() => {
    container = createTestContainer();
    mockEventBus = container.get<IEventBus>(TYPES.IEventBus);
    mockAudioService = container.get<IAudioService>(TYPES.IAudioService);

    container.bind<IGameControllerService>(TYPES.IGameControllerService)
      .to(GameControllerService)
      .inSingletonScope();
    gameController = container.get<IGameControllerService>(TYPES.IGameControllerService);
  });

  describe('1. State Machine Transitions', () => {
    it('should emit GameStateChanged to Playing on StartGame action', async () => {
      // Arrange
      const gameStateHandler = vi.fn();
      mockEventBus.subscribe<GameStateChangedEvent>('GameStateChanged', gameStateHandler);
      gameController.start();
      gameController.initialize();

      const startEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'StartGame'
      };

      // Act
      await mockEventBus.emit(startEvent);

      // Assert
      expect(gameStateHandler).toHaveBeenCalled();
      const emittedEvent = gameStateHandler.mock.calls[0][0] as GameStateChangedEvent;
      expect(emittedEvent.newState).toBe('Playing');
    });

    it('should emit GameStateChanged to Paused on PauseGame action', async () => {
      // Arrange
      const gameStateHandler = vi.fn();
      mockEventBus.subscribe<GameStateChangedEvent>('GameStateChanged', gameStateHandler);
      gameController.start();
      gameController.initialize();

      const startEvent: Omit<PlayerActionEvent, 'timestamp'> = { type: 'PlayerAction', action: 'StartGame' };
      const pauseEvent: Omit<PlayerActionEvent, 'timestamp'> = { type: 'PlayerAction', action: 'PauseGame' };

      // Act
      await mockEventBus.emit(startEvent);
      await mockEventBus.emit(pauseEvent);

      // Assert
      expect(gameStateHandler).toHaveBeenCalledTimes(2);
      const pauseEmittedEvent = gameStateHandler.mock.calls[1][0] as GameStateChangedEvent;
      expect(pauseEmittedEvent.newState).toBe('Paused');
    });
  });

  describe('2. Scoring and Combo Logic', () => {
    it('should increase score and combo on HitNote', async () => {
      // Arrange
      gameController.start();
      gameController.initialize();
      
      const startEvent: Omit<PlayerActionEvent, 'timestamp'> = { type: 'PlayerAction', action: 'StartGame' };
      const hitEvent: Omit<PlayerActionEvent, 'timestamp'> = { 
        type: 'PlayerAction', 
        action: 'HitNote',
        context: { accuracy: 0.95, noteId: 'note-1' }
      };

      // Act
      await mockEventBus.emit(startEvent);
      await mockEventBus.emit(hitEvent);
      const state = gameController.getGameState();

      // Assert
      expect(state.currentScore).toBeGreaterThan(0);
      expect(state.comboCount).toBeGreaterThan(0);
    });
  });

  describe('3. Damage and Game Over Logic', () => {
    it('should decrease health and reset combo on MissNote', async () => {
      // Arrange
      gameController.start();
      gameController.initialize();
      
      const startEvent: Omit<PlayerActionEvent, 'timestamp'> = { type: 'PlayerAction', action: 'StartGame' };
      const missEvent: Omit<PlayerActionEvent, 'timestamp'> = { type: 'PlayerAction', action: 'MissNote' };

      // Act
      await mockEventBus.emit(startEvent);
      await mockEventBus.emit(missEvent);
      const state = gameController.getGameState();

      // Assert
      expect(state.health).toBeLessThan(100);
      expect(state.comboCount).toBe(0);
    });

    it('should emit GameOver state when health reaches zero', async () => {
      // Arrange
      const gameStateHandler = vi.fn();
      mockEventBus.subscribe<GameStateChangedEvent>('GameStateChanged', gameStateHandler);
      gameController.start();
      gameController.initialize();

      const startEvent: Omit<PlayerActionEvent, 'timestamp'> = { type: 'PlayerAction', action: 'StartGame' };
      const missEvent: Omit<PlayerActionEvent, 'timestamp'> = { type: 'PlayerAction', action: 'MissNote' };

      // Act
      await mockEventBus.emit(startEvent);
      for (let i = 0; i < 10; i++) {
        await mockEventBus.emit(missEvent);
      }

      // Assert
      const gameOverCall = gameStateHandler.mock.calls.find(call => 
        (call[0] as GameStateChangedEvent).newState === 'GameOver'
      );
      expect(gameOverCall).toBeDefined();
    });
  });

  describe('4. Audio Dependency', () => {
    it('should wait for audio context initialization before starting game', async () => {
      // Arrange
      const audioInitSpy = vi.spyOn(mockAudioService, 'initializeAudioContext');
      gameController.start();
      gameController.initialize();

      // Act
      await gameController.startGame();

      // Assert
      expect(audioInitSpy).toHaveBeenCalled();
    });
  });
});
