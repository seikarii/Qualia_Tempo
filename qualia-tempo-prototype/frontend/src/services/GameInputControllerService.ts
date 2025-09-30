/**
 * QUALIA.CODE v1.1 - GameInputControllerService
 * Service responsible for processing game input and emitting appropriate game events.
 * Decouples input handling logic from React components for better testability.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IGameInputControllerService, GameInputControllerConfig } from './interfaces/IGameInputControllerService';
import type { IInputStateService } from './interfaces/IInputStateService';
import type { IBrowserEventsService } from './interfaces/IBrowserEventsService';
import type { IEventBus } from './interfaces/IEventBus';
import type { ILogger } from './interfaces/ILogger';
import type { NoteData } from '../types/contracts';
import type { PlayerActionEvent } from './contracts/events.contracts';
import { logMethod, catchError } from '../utils/decorators';

@injectable()
export class GameInputControllerService implements IGameInputControllerService {
  private readonly config: GameInputControllerConfig;
  private readonly inputStateService: IInputStateService;
  private readonly browserEventsService: IBrowserEventsService;
  private readonly eventBus: IEventBus;
  private readonly logger: ILogger;

  private keyPressHandler?: (event: KeyboardEvent) => void;
  private keyReleaseHandler?: (event: KeyboardEvent) => void;
  private isActive = false;

  constructor(
    @inject(TYPES.GameInputControllerConfig) config: GameInputControllerConfig,
    @inject(TYPES.IInputStateService) inputStateService: IInputStateService,
    @inject(TYPES.IBrowserEventsService) browserEventsService: IBrowserEventsService,
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.config = config;
    this.inputStateService = inputStateService;
    this.browserEventsService = browserEventsService;
    this.eventBus = eventBus;
    this.logger = logger;

    this.logger.info('GameInputControllerService initialized');
  }

  @logMethod
  public initializeInputHandling(isActive: boolean): void {
    this.isActive = isActive;

    if (!isActive) {
      this.cleanupInputHandling();
      return;
    }

    // Create event handlers
    this.keyPressHandler = this.createKeyPressHandler();
    this.keyReleaseHandler = this.createKeyReleaseHandler();

    // Register event listeners
    this.browserEventsService.addWindowEventListener('keydown', this.keyPressHandler);
    this.browserEventsService.addWindowEventListener('keyup', this.keyReleaseHandler);

    this.logger.debug('Input handling initialized');
  }

  @logMethod
  public cleanupInputHandling(): void {
    if (this.keyPressHandler) {
      this.browserEventsService.removeWindowEventListener('keydown', this.keyPressHandler);
      this.keyPressHandler = undefined;
    }

    if (this.keyReleaseHandler) {
      this.browserEventsService.removeWindowEventListener('keyup', this.keyReleaseHandler);
      this.keyReleaseHandler = undefined;
    }

    this.logger.debug('Input handling cleaned up');
  }

  @logMethod
  @catchError
  public calculateNoteAccuracy(currentTime: number, noteTimestamp: number): number {
    const timeDiff = Math.abs(currentTime - noteTimestamp);

    if (timeDiff <= this.config.timingWindows.perfect) return 1.0;
    if (timeDiff <= this.config.timingWindows.good) {
      return Math.max(0.5, 1.0 - timeDiff / this.config.timingWindows.good);
    }
    return 0.0; // Miss
  }

    @logMethod
  @catchError
  public processNoteHit(combatNotes: NoteData[], currentTime: number): void {
    if (combatNotes.length === 0) {
      // No notes available - emit miss
      this.eventBus.emit<PlayerActionEvent>({
        type: 'PlayerAction',
        action: 'MissNote',
        source: 'GameInputControllerService',
        context: { reason: 'no_notes_available' },
      });
      return;
    }

    // Find the closest note by timestamp
    const nearestNote = combatNotes.reduce((closest, note) => {
      const currentDiff = Math.abs(currentTime - note.timestamp);
      const closestDiff = Math.abs(currentTime - closest.timestamp);
      return currentDiff < closestDiff ? note : closest;
    });

    const timingAccuracy = this.calculateNoteAccuracy(
      currentTime * 1000, // Convert to milliseconds
      nearestNote.timestamp * 1000
    );

    if (timingAccuracy > 0) {
      // Hit note with calculated accuracy
      this.eventBus.emit<PlayerActionEvent>({
        type: 'PlayerAction',
        action: 'HitNote',
        source: 'GameInputControllerService',
        context: {
          noteTimestamp: nearestNote.timestamp,
          accuracy: timingAccuracy,
          points: Math.floor(timingAccuracy * 100),
          perfect: timingAccuracy > 0.9,
        },
      });
    } else {
      // Poor timing - miss
      this.eventBus.emit<PlayerActionEvent>({
        type: 'PlayerAction',
        action: 'MissNote',
        source: 'GameInputControllerService',
        context: {
          reason: 'poor_timing',
          noteTimestamp: nearestNote.timestamp,
        },
      });
    }
  }

  @logMethod
  public processPauseGame(): void {
    this.eventBus.emit<PlayerActionEvent>({
      type: 'PlayerAction',
      action: 'PauseGame',
      source: 'GameInputControllerService',
    });
  }

  private createKeyPressHandler(): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent) => {
      if (!this.isActive) return;

      const key = event.key.toLowerCase();
      const movementKeys = ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'];

      // Handle movement keys
      if (movementKeys.includes(key)) {
        event.preventDefault();
        this.inputStateService.pressKey(event.key);
        return;
      }

      // Handle global game controls
      if (key === 'p' || key === 'escape') {
        event.preventDefault();
        this.processPauseGame();
        return;
      }

      // Handle note hitting
      if (key === ' ' || key === 'enter') {
        event.preventDefault();
        // Note: The combat notes will be passed from the component
        // This is handled in the component's useEffect
        return;
      }
    };
  }

  private createKeyReleaseHandler(): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent) => {
      if (!this.isActive) return;

      const key = event.key.toLowerCase();
      const movementKeys = ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'];

      if (movementKeys.includes(key)) {
        this.inputStateService.releaseKey(event.key);
      }
    };
  }
}