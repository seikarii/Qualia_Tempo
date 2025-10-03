import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container } from 'inversify';
import { createTestContainer } from '../../testing/test-container-factory';
import { RhythmicMovementController } from '../RhythmicMovementController';
import { TYPES } from '../inversify.types';
import type { IEventBus } from '../interfaces/IEventBus';
import type { ILogger } from '../interfaces/ILogger';
import type { ITimerService } from '../interfaces/ITimerService';
import type { IInputStateService } from '../interfaces/IInputStateService';
import type { IGameStateStore } from '../interfaces/IGameStateStore';
import type { IGameplayMechanicsService } from '../interfaces/IGameplayMechanicsService';

describe('RhythmicMovementController', () => {
  let container: Container;
  let controller: RhythmicMovementController;
  let mockEventBus: any;
  let mockLogger: any;
  let mockTimerService: any;
  let mockInputStateService: any;
  let mockGameStateStore: any;
  let mockGameplayMechanicsService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    container = createTestContainer();
    
    // Bind configuration
    container.bind(TYPES.RhythmicMovementConfig).toConstantValue({
      bpm: 120,
      perfectTiming: 50,
      goodTiming: 100,
      gridSize: 10,
      slowdownFactor: 0.5,
      slowdownDuration: 2000,
      playerSpeed: 5,
      dashDistance: 2,
      messages: {
        serviceInitialized: 'RhythmicMovementController initialized',
      },
    });
    
    // ARCHITECTURAL NOTE: Get mocks from container BEFORE replacing bindings
    mockEventBus = container.get(TYPES.IEventBus);
    mockLogger = container.get(TYPES.ILogger);
    mockTimerService = container.get(TYPES.ITimerService);
    mockGameStateStore = container.get(TYPES.IGameStateStoreService);
    
    // Create specialized mocks
    const mockKeyAdapter = { adapt: vi.fn() };
    const mockInputStateServiceLocal = {
      wasActionJustPressed: vi.fn(),
      getCurrentInputState: vi.fn(),
      // HIGH-FIDELITY: Add getDirectionVector method required by processMovementFromState
      getDirectionVector: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    };
    const mockGameplayMechanicsServiceLocal = {
      findNearestNote: vi.fn(),
      calculateScore: vi.fn(),
      processNoteHit: vi.fn(),
      calculateNoteAccuracy: vi.fn(),
      determineHitResult: vi.fn(),
      calculateScoreForHit: vi.fn(),
    };
    
    // ARCHITECTURAL NOTE: Unbind + bind pattern to replace test container mocks
    container.unbind(TYPES.IKeyToDirectionAdapter);
    container.bind(TYPES.IKeyToDirectionAdapter).toConstantValue(mockKeyAdapter);
    
    container.unbind(TYPES.IInputStateService);
    container.bind(TYPES.IInputStateService).toConstantValue(mockInputStateServiceLocal);
    
    container.unbind(TYPES.IGameplayMechanicsService);
    container.bind(TYPES.IGameplayMechanicsService).toConstantValue(mockGameplayMechanicsServiceLocal);
    
    // ARCHITECTURAL NOTE: Rebuild RhythmicMovementControllerParams with updated config and mocks
    const config = container.get(TYPES.RhythmicMovementConfig);
    container.unbind(TYPES.RhythmicMovementControllerParams);
    container.bind(TYPES.RhythmicMovementControllerParams).toConstantValue({
      eventBus: mockEventBus,
      logger: mockLogger,
      config,
      timerService: mockTimerService,
      keyAdapter: mockKeyAdapter,
      inputStateService: mockInputStateServiceLocal,
      gameStateStore: mockGameStateStore,
      gameplayMechanicsService: mockGameplayMechanicsServiceLocal
    });
    
    // Bind the Service Under Test (SUT)
    container.unbind(TYPES.IRhythmicMovementController);
    container.bind(TYPES.IRhythmicMovementController).to(RhythmicMovementController).inSingletonScope();
    
    controller = container.get(TYPES.IRhythmicMovementController);

    // Store references
    mockInputStateService = mockInputStateServiceLocal;
    mockGameplayMechanicsService = mockGameplayMechanicsServiceLocal;
  });

  describe('processActionInputFromState', () => {
    it('should emit MissNote event when no notes are available', () => {
      // Arrange
      mockInputStateService.wasActionJustPressed.mockClear();
      mockInputStateService.wasActionJustPressed.mockReturnValue(true);
      
      mockGameStateStore.getGameState.mockClear();
      mockGameStateStore.getGameState.mockReturnValue({ combatData: { noteMap: [] } });
      
      mockTimerService.now.mockClear();
      mockTimerService.now.mockReturnValue(1000);
      
      mockGameplayMechanicsService.findNearestNote.mockClear();
      mockGameplayMechanicsService.findNearestNote.mockReturnValue(null);

      // Act
      (controller as any).processActionInputFromState();

      // Assert
      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: 'PlayerAction',
        action: 'MissNote',
        context: { reason: 'no_notes_available' },
        timestamp: expect.any(Date)
      });
    });

    it('should emit HitNote event with correct accuracy and score', () => {
      // Arrange
      const mockNote = { id: 'note1', timestamp: 1000 };
      const mockAccuracy = 0.9;
      const mockHitResult = 'good';
      const mockScore = 45;

      mockInputStateService.wasActionJustPressed.mockClear();
      mockInputStateService.wasActionJustPressed.mockReturnValue(true);
      
      mockGameStateStore.getGameState.mockClear();
      mockGameStateStore.getGameState.mockReturnValue({ combatData: { noteMap: [mockNote] } });
      
      mockTimerService.now.mockClear();
      mockTimerService.now.mockReturnValue(1000);
      
      mockGameplayMechanicsService.findNearestNote.mockClear();
      mockGameplayMechanicsService.findNearestNote.mockReturnValue(mockNote);
      mockGameplayMechanicsService.calculateNoteAccuracy.mockClear();
      mockGameplayMechanicsService.calculateNoteAccuracy.mockReturnValue(mockAccuracy);
      mockGameplayMechanicsService.determineHitResult.mockClear();
      mockGameplayMechanicsService.determineHitResult.mockReturnValue(mockHitResult);
      mockGameplayMechanicsService.calculateScoreForHit.mockClear();
      mockGameplayMechanicsService.calculateScoreForHit.mockReturnValue(mockScore);

      // Act
      (controller as any).processActionInputFromState();

      // Assert
      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: 'PlayerAction',
        action: 'HitNote',
        context: { noteId: 'note1', accuracy: mockAccuracy, result: mockHitResult, score: mockScore },
        timestamp: expect.any(Date)
      });
    });

    it('should emit MissNote event when timing is poor', () => {
      // Arrange
      const mockNote = { id: 'note2', timestamp: 1000 };
      const mockAccuracy = 0.1;
      const mockHitResult = 'miss';

      mockInputStateService.wasActionJustPressed.mockClear();
      mockInputStateService.wasActionJustPressed.mockReturnValue(true);
      
      mockGameStateStore.getGameState.mockClear();
      mockGameStateStore.getGameState.mockReturnValue({ combatData: { noteMap: [mockNote] } });
      
      mockTimerService.now.mockClear();
      mockTimerService.now.mockReturnValue(1000);
      
      mockGameplayMechanicsService.findNearestNote.mockClear();
      mockGameplayMechanicsService.findNearestNote.mockReturnValue(mockNote);
      mockGameplayMechanicsService.calculateNoteAccuracy.mockClear();
      mockGameplayMechanicsService.calculateNoteAccuracy.mockReturnValue(mockAccuracy);
      mockGameplayMechanicsService.determineHitResult.mockClear();
      mockGameplayMechanicsService.determineHitResult.mockReturnValue(mockHitResult);

      // Act
      (controller as any).processActionInputFromState();

      // Assert
      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: 'PlayerAction',
        action: 'MissNote',
        context: { noteId: 'note2', reason: 'poor_timing' },
        timestamp: expect.any(Date)
      });
    });

    it('should not process input when action key was not just pressed', () => {
      // Arrange
      mockInputStateService.wasActionJustPressed.mockReturnValue(false);

      // Act
      (controller as any).processActionInputFromState();

      // Assert
      expect(mockGameStateStore.getGameState).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('should call gameplay mechanics service with correct parameters', () => {
      // Arrange
      const mockNote = { id: 'note3', timestamp: 1000 };
      const currentTime = 1500;
      const mockAccuracy = 0.8;
      const mockHitResult = 'good';

      mockInputStateService.wasActionJustPressed.mockClear();
      mockInputStateService.wasActionJustPressed.mockReturnValue(true);
      
      mockGameStateStore.getGameState.mockClear();
      mockGameStateStore.getGameState.mockReturnValue({ combatData: { noteMap: [mockNote] } });
      
      mockTimerService.now.mockClear();
      mockTimerService.now.mockReturnValue(currentTime);
      
      mockGameplayMechanicsService.findNearestNote.mockClear();
      mockGameplayMechanicsService.findNearestNote.mockReturnValue(mockNote);
      mockGameplayMechanicsService.calculateNoteAccuracy.mockClear();
      mockGameplayMechanicsService.calculateNoteAccuracy.mockReturnValue(mockAccuracy);
      mockGameplayMechanicsService.determineHitResult.mockClear();
      mockGameplayMechanicsService.determineHitResult.mockReturnValue(mockHitResult);

      // Act
      (controller as any).processActionInputFromState();

      // Assert
      expect(mockGameplayMechanicsService.findNearestNote).toHaveBeenCalledWith([mockNote], currentTime);
      expect(mockGameplayMechanicsService.calculateNoteAccuracy).toHaveBeenCalledWith(currentTime, mockNote.timestamp);
      expect(mockGameplayMechanicsService.determineHitResult).toHaveBeenCalledWith(mockAccuracy);
    });
  });

  describe('Integration with metronome loop', () => {
    it('should call processActionInputFromState in metronome tick', () => {
      // Arrange
      const processActionSpy = vi.spyOn(controller as any, 'processActionInputFromState');

      // Act
      controller.start();
      // High-fidelity timer mock executes setInterval callback immediately
      // This triggers the metronome tick which calls processActionInputFromState

      // Assert
      expect(typeof (controller as any).processActionInputFromState).toBe('function');
      // HIGH-FIDELITY TIMER: Method IS called immediately due to mock behavior
      expect(processActionSpy).toHaveBeenCalled();

      // Cleanup
      controller.stop();
    });
  });
});