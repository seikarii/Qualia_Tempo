import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestContainer, resetAllMocks } from '../../testing/test-container-factory';
import { IGameStateStoreService } from '../interfaces/IGameStateStoreService';
import { GameStateStoreService } from '../GameStateStoreService';
import { IEventBus } from '../interfaces/IEventBus';
import { EventBus } from '../EventBus';
import { TYPES } from '../inversify.types';
import type { PlayerActionEvent } from '../contracts/events.contracts';
import type { Container } from 'inversify';
import { mockLogger } from '../../testing/mocks/logger.mock';

/**
 * ARCHITECTURE COMPLIANCE:
 * - Uses createTestContainer() for isolation
 * - Replaces mock EventBus and GameStateStoreService with real implementations
 * - Tests integration between real EventBus and real GameStateStoreService
 * - Follows EventBus.test.ts pattern: unbind mock, bind real implementation
 */
describe('GameStateStoreService - PlayerAction Handling', () => {
  let gameStateStoreService: IGameStateStoreService;
  let eventBus: IEventBus;
  let container: Container;

  let mockStoreSetter: any;

  beforeEach(() => {
    // STEP 1: Create isolated test container with mocks
    container = createTestContainer();
    
    // STEP 2: Bind GameStateStoreConfig (required by real service)
    container.bind(TYPES.GameStateStoreConfig).toConstantValue({
      resetValues: {
        player: { position: { x: 0, y: 0 }, health: 100, combo: 0, score: 0, isMoving: false, lastRhythmHit: 0 },
        qualiaState: { intensity: 0, precision: 0, aggression: 0, flow: 0, chaos: 0, recovery: 0, transcendence: 0 },
        gameStats: { totalNotes: 0, notesHit: 0, notesMissed: 0, currentStreak: 0, maxStreak: 0, pauseCooldownRemaining: 0 },
        timing: { currentTime: 0, gameStartTime: 0 }
      },
      eventPriorities: { particleData: 'high' },
      messages: {
        initialized: 'initialized', alreadyStarted: 'alreadyStarted', startingListeners: 'startingListeners',
        listenersActive: 'listenersActive', notStarted: 'notStarted', stoppingListeners: 'stoppingListeners',
        listenersStopped: 'listenersStopped', stateUpdated: 'stateUpdated', qualiaUpdated: 'qualiaUpdated',
        rhythmicDash: 'rhythmicDash', constructed: 'constructed', processingGameStateChanged: 'processingGameStateChanged',
        processingQualiaUpdated: 'processingQualiaUpdated', gameOver: 'gameOver', unhandledState: 'unhandledState',
        storeSetter: 'storeSetter'
      }
    });
    
    // STEP 3: Replace mock EventBus with real implementation
    container.unbind(TYPES.IEventBus);
    container.bind<IEventBus>(TYPES.IEventBus).to(EventBus).inSingletonScope();
    
    // STEP 4: Replace mock GameStateStoreService with real implementation
    container.unbind(TYPES.IGameStateStoreService);
    container.bind<IGameStateStoreService>(TYPES.IGameStateStoreService).to(GameStateStoreService).inSingletonScope();
    
    // STEP 5: Get real instances from container
    eventBus = container.get<IEventBus>(TYPES.IEventBus);
    gameStateStoreService = container.get<IGameStateStoreService>(TYPES.IGameStateStoreService);
    
    // STEP 6: Setup test infrastructure
    // Create a mock store setter that tracks calls
    mockStoreSetter = vi.fn((updater: any) => {
      // Call the updater to simulate Zustand behavior
      // The actual state is managed by each test
      return updater({});
    });
    gameStateStoreService.setStoreSetter(mockStoreSetter);
    
    gameStateStoreService.initialize(); // Initialize service and event subscriptions
  });

  afterEach(() => {
    gameStateStoreService.cleanup(); // Clean up event subscriptions
    resetAllMocks();
  });

  it('should update note state on HitNote event', async () => {
    // Setup test state with a note
    let testState: any = {
      combatData: {
        noteMap: [
          { id: 'note_1', timestamp: 1.0, position: { x: 0, y: 0 }, duration: 0.5, qualia_signature: 'ORDER', state: 'active' }
        ]
      }
    };

    // Replace mock store setter with a stateful version that:
    // 1. Executes the updater function with current state
    // 2. Captures the new state
    // 3. Returns the new state
    const statefulStoreSetter = vi.fn((updater: any) => {
      const newState = updater(testState);
      testState = newState;
      return newState;
    });
    gameStateStoreService.setStoreSetter(statefulStoreSetter);

    // Initialize internal combat data by calling updateGameState
    gameStateStoreService.updateGameState({ combatData: testState.combatData });
    statefulStoreSetter.mockClear(); // Clear mock to test only the PlayerAction update

    // Emit PlayerAction HitNote event
    await eventBus.emit({
      type: 'PlayerAction',
      action: 'HitNote',
      context: { noteId: 'note_1', accuracy: 0.9, result: 'perfect', score: 100 },
      timestamp: new Date()
    } as PlayerActionEvent);

    // High-fidelity mock timer executes callbacks immediately - no wait needed
    
    // Verify store setter was called (state was updated)
    expect(statefulStoreSetter).toHaveBeenCalled();
    
    // Verify the state transformation is correct
    expect(testState.combatData.noteMap[0].state).toBe('hit');
  });

  it('should update note state on MissNote event', async () => {
    // Setup test state with a note
    let testState: any = {
      combatData: {
        noteMap: [
          { id: 'note_2', timestamp: 2.0, position: { x: 1, y: 1 }, duration: 0.5, qualia_signature: 'CHAOS', state: 'active' }
        ]
      }
    };

    // Replace mock store setter with a stateful version
    const statefulStoreSetter = vi.fn((updater: any) => {
      const newState = updater(testState);
      testState = newState;
      return newState;
    });
    gameStateStoreService.setStoreSetter(statefulStoreSetter);

    // Initialize internal combat data by calling updateGameState
    gameStateStoreService.updateGameState({ combatData: testState.combatData });
    statefulStoreSetter.mockClear(); // Clear mock to test only the PlayerAction update
 
    // Emit PlayerAction MissNote event
    await eventBus.emit({
      type: 'PlayerAction',
      action: 'MissNote',
      context: { noteId: 'note_2', reason: 'poor_timing' },
      timestamp: new Date()
    } as PlayerActionEvent);

    // High-fidelity mock timer executes callbacks immediately - no wait needed

    // Verify store setter was called (state was updated)
    expect(statefulStoreSetter).toHaveBeenCalled();
    
    // Verify the state transformation is correct
    expect(testState.combatData.noteMap[0].state).toBe('missed');
  });

  it('should handle PlayerAction gracefully when currentCombatData is not initialized', async () => {
    // Do NOT call updateGameState - simulate race condition where PlayerAction arrives before CombatDataUpdated

    // Emit PlayerAction HitNote event on uninitialized service
    await eventBus.emit({
      type: 'PlayerAction',
      action: 'HitNote',
      context: { noteId: 'note_1', accuracy: 0.9, result: 'perfect', score: 100 },
      timestamp: new Date()
    } as PlayerActionEvent);

    // Verify no exception was thrown (test passes if we reach this point)
    expect(true).toBe(true); // Placeholder assertion - the test passing means no exception

    // Verify the warning was logged
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'GameStateStoreService: Se ignoró PlayerAction para la nota note_1 porque currentCombatData aún no ha sido inicializado. Esto \npuede ser normal durante el arranque.'
    );

    // Verify store setter was NOT called (no state update occurred)
    expect(mockStoreSetter).not.toHaveBeenCalled();
  });
});