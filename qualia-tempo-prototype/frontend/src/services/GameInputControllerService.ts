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
import type { PlayerActionEvent, KeyPressedEvent } from './contracts/events.contracts';
import { logMethod, catchError, IBaseService } from '../utils/decorators';

@injectable()
export class GameInputControllerService implements IGameInputControllerService, IBaseService {
  private readonly inputStateService: IInputStateService;
  private readonly browserEventsService: IBrowserEventsService;
  private readonly eventBus: IEventBus;
  private readonly logger: ILogger;

  private keyPressHandler?: (_event: KeyboardEvent) => void;
  private keyReleaseHandler?: (_event: KeyboardEvent) => void;
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
  @catchError
  public initialize(): void {
    // Initialize input handling as active by default
    this.initializeInputHandling(true);
  }

  @logMethod
  public cleanup(): void {
    this.cleanupInputHandling();
  }

  @logMethod
  @catchError
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
  }

  @logMethod
  public processPauseGame(): void {
    this.eventBus.emit<PlayerActionEvent>({
      type: 'PlayerAction',
      action: 'PauseGame',
      source: 'GameInputControllerService',
    });
  }

  private createKeyPressHandler(): (_event: KeyboardEvent) => void {
    return (_event: KeyboardEvent) => {
      if (!this.isActive) return;

      const key = _event.key.toLowerCase();
      const movementKeys = ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'];
      const actionKeys = [' ', 'enter']; // Teclas de acción
      const musicalKeys = ['q', 'e', 'r', 't', 'f', 'g', 'c']; // PHASE 4: Musical ability keys

      if (movementKeys.includes(key) || actionKeys.includes(key)) {
        _event.preventDefault();
        this.inputStateService.pressKey(_event.key);
        return;
      }

      // PHASE 4 INTEGRATION: Handle musical keys for combo detection
      if (musicalKeys.includes(key)) {
        _event.preventDefault();
        const normalizedKey = key.toUpperCase();
        
        // Emit KeyPressedEvent for MusicalComboDetectorService (timestamp added by EventBus)
        this.eventBus.emit<KeyPressedEvent>({
          type: 'Input.KeyPressed',
          key: normalizedKey,
          source: 'GameInputControllerService',
        });
        
        this.logger.debug(`Musical key pressed: ${normalizedKey}`);
        return;
      }

      // Handle global game controls
      if (key === 'p' || key === 'escape') {
        _event.preventDefault();
        this.processPauseGame();
        return;
      }
    };
  }

  private createKeyReleaseHandler(): (_event: KeyboardEvent) => void {
    return (_event: KeyboardEvent) => {
      if (!this.isActive) return;

      const key = _event.key.toLowerCase();
      const keysToTrack = ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', ' ', 'enter'];

      if (keysToTrack.includes(key)) {
        this.inputStateService.releaseKey(_event.key);
      }
    };
  }
}