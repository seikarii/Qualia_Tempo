/**
 * QUALIA.CODE v1.1 - GameInputControllerService
 * Service responsible for processing game input and emitting appropriate game events.
 * Decouples input handling logic from React components for better testability.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IGameInputControllerService } from './interfaces/IGameInputControllerService';
import type { IInputStateService } from './interfaces/IInputStateService';
import type { IBrowserEventsService } from './interfaces/IBrowserEventsService';
import type { IEventBus } from './interfaces/IEventBus';
import type { ILogger } from './interfaces/ILogger';
import type { PlayerActionEvent } from './contracts/events.contracts';
import { logMethod } from '../utils/decorators';

@injectable()
export class GameInputControllerService implements IGameInputControllerService {
  private readonly inputStateService: IInputStateService;
  private readonly browserEventsService: IBrowserEventsService;
  private readonly eventBus: IEventBus;
  private readonly logger: ILogger;

  private keyPressHandler?: (event: KeyboardEvent) => void;
  private keyReleaseHandler?: (event: KeyboardEvent) => void;
  private isActive = false;

  constructor(
    @inject(TYPES.IInputStateService) inputStateService: IInputStateService,
    @inject(TYPES.IBrowserEventsService) browserEventsService: IBrowserEventsService,
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.ILogger) logger: ILogger
  ) {
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
      const actionKeys = [' ', 'enter']; // Teclas de acción

      if (movementKeys.includes(key) || actionKeys.includes(key)) {
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
    };
  }

  private createKeyReleaseHandler(): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent) => {
      if (!this.isActive) return;

      const key = event.key.toLowerCase();
      const keysToTrack = ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', ' ', 'enter'];

      if (keysToTrack.includes(key)) {
        this.inputStateService.releaseKey(event.key);
      }
    };
  }
}