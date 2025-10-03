import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestContainer } from '../../testing/test-container-factory';
import { IGameStateStoreService } from '../interfaces/IGameStateStoreService';
import { IEventBus } from '../interfaces/IEventBus';
import { TYPES } from '../inversify.types';
import type { PlayerActionEvent } from '../contracts/events.contracts';

describe('GameStateStoreService - PlayerAction Handling', () => {
  let gameStateStoreService: IGameStateStoreService;
  let eventBus: IEventBus;
  let container: any;

  beforeEach(() => {
    container = createTestContainer();
    gameStateStoreService = container.get(TYPES.IGameStateStoreService) as IGameStateStoreService;
    eventBus = container.get(TYPES.IEventBus) as IEventBus;
    
    // Create a mock store setter that tracks calls
    const mockStoreSetter = vi.fn((updater: any) => {
      // Call the updater to simulate Zustand behavior
      // The actual state is managed by each test
      return updater({});
    });
    gameStateStoreService.setStoreSetter(mockStoreSetter);
    
    gameStateStoreService.initialize(); // Initialize service and event subscriptions
  });

  afterEach(() => {
    gameStateStoreService.cleanup(); // Clean up event subscriptions
  });

  it('should update note state on HitNote event', () => {
    // Setup initial state with a note
    const initialState = {
      combatData: {
        noteMap: [
          { id: 'note_1', timestamp: 1.0, position: { x: 0, y: 0 }, duration: 0.5, qualia_signature: 'ORDER', state: 'active' }
        ]
      }
    };

    // Mock getGameState to return initial state
    vi.spyOn(gameStateStoreService as any, 'getGameState').mockReturnValue(initialState);

    // Mock updateGameState
    const updateSpy = vi.spyOn(gameStateStoreService as any, 'updateGameState');

    // Emit PlayerAction HitNote event
    eventBus.emit({
      type: 'PlayerAction',
      action: 'HitNote',
      context: { noteId: 'note_1', accuracy: 0.9, result: 'perfect', score: 100 },
      timestamp: new Date()
    } as PlayerActionEvent);

    // Verify updateGameState was called with correct state
    expect(updateSpy).toHaveBeenCalledWith({
      ...initialState,
      combatData: {
        ...initialState.combatData,
        noteMap: [
          { id: 'note_1', timestamp: 1.0, position: { x: 0, y: 0 }, duration: 0.5, qualia_signature: 'ORDER', state: 'hit' }
        ]
      }
    });
  });

  it('should update note state on MissNote event', () => {
    // Similar test for MissNote
    const initialState = {
      combatData: {
        noteMap: [
          { id: 'note_2', timestamp: 2.0, position: { x: 1, y: 1 }, duration: 0.5, qualia_signature: 'CHAOS', state: 'active' }
        ]
      }
    };

    vi.spyOn(gameStateStoreService as any, 'getGameState').mockReturnValue(initialState);
    const updateSpy = vi.spyOn(gameStateStoreService as any, 'updateGameState');

    // Emit PlayerAction MissNote event
    eventBus.emit({
      type: 'PlayerAction',
      action: 'MissNote',
      context: { noteId: 'note_2', reason: 'poor_timing' },
      timestamp: new Date()
    } as PlayerActionEvent);

    expect(updateSpy).toHaveBeenCalledWith({
      ...initialState,
      combatData: {
        ...initialState.combatData,
        noteMap: [
          { id: 'note_2', timestamp: 2.0, position: { x: 1, y: 1 }, duration: 0.5, qualia_signature: 'CHAOS', state: 'missed' }
        ]
      }
    });
  });
});