/**
 * QUALIA.CODE v1.1 - GameControllerService
 * Service responsible for game state management and control logic.
 *
 * - Event-driven game state management
 * - Receives PlayerAction events (StartGame, PauseGame, ResetGame, etc.)
 * - Emits GameStateChanged events with updated state
 * - Maintains internal game state (isPlaying, currentScore, etc.)
 * - Integrates with EventBus for decoupled communication
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type {
  PlayerActionEvent,
  GameStateChangedEvent,
} from "./EventBus";
import { EventBus } from "./EventBus";
import { logMethod, catchError, OnEvent, IBaseService } from "../utils/decorators";
import { QualiaLogger } from "./Logger";
import type { GameState, GameControllerConfig } from "./contracts/IGameControllerService.contracts";
import type { IGameControllerService } from "./interfaces/IGameControllerService";
import type { IGameStateStoreService } from "./interfaces/IGameStateStoreService";
import type { ITimerService } from "./interfaces/ITimerService";
import type { IAudioService } from "./interfaces/IAudioService";

/**
 * GameControllerService: Manages game state and control logic
 *
 * QUALIA.CODE Compliance:
 * - Event-driven architecture
 * - Single responsibility: Game state management
 * - Dependency injection via EventBus
 * - No direct UI coupling
 */
@injectable()
export class GameControllerService implements IGameControllerService, IBaseService {
  private eventBus: EventBus;
  private gameStateStoreService: IGameStateStoreService;
  private timerService: ITimerService;
  private audioService: IAudioService;
  private config: GameControllerConfig;
  // @ts-expect-error - Used by @OnEvent decorator lifecycle
  private _eventListeners: string[] = []; // QUALIA.CODE v1.1: Required for @OnEvent lifecycle
  private isRunning = false;
  private logger: QualiaLogger;
  private gameClockInterval: number | null = null;

  // Internal game state - initialized in constructor with defaults, updated in initialize()
  private gameState: GameState;

  constructor(
    @inject(TYPES.IEventBus) eventBus: EventBus,
    @inject(TYPES.ILogger) logger: QualiaLogger,
    @inject(TYPES.GameControllerConfig) config: GameControllerConfig,
    @inject(TYPES.IGameStateStoreService)
    gameStateStoreService: IGameStateStoreService,
    @inject(TYPES.ITimerService) timerService: ITimerService,
    @inject(TYPES.IAudioService) audioService: IAudioService,
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.config = config;
    this.gameStateStoreService = gameStateStoreService;
    this.timerService = timerService;
    this.audioService = audioService;
    // Initialize game state with defaults, will be updated in initialize()
    this.gameState = {
      isPlaying: false,
      isPaused: false,
      currentScore: 0,
      comboCount: 0,
      health: this.config.health.maxHealth,
      level: 1,
      gameMode: "normal",
    };
    this.logger.info("🎮 [GameController] Service initialized");
  }

  /**
   * Get current configuration from ConfigurationService
   */

  /**
   * Start the game controller service
   */
  @logMethod
  @catchError
  public start(): void {
    const startTime = performance.now();
    this.logger.info("🚀 [GameController] Starting service...");

    try {
      if (this.isRunning) {
        this.logger.warn("⚠️ [GameController] Service already running");
        return;
      }

      this.subscribeToEvents();
      this.isRunning = true;

      const duration = performance.now() - startTime;
      this.logger.info(
        `🎮 [GameController] Service started successfully - ${duration.toFixed(2)}ms`,
      );
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `🚨 [GameController] Start failed - ${duration.toFixed(2)}ms`,
        { error },
      );
      throw error;
    }
  }

  /**
   * Stop the game controller service
   */
  @logMethod
  @catchError
  public stop(): void {
    const startTime = performance.now();
    this.logger.info("🛑 [GameController] Stopping service...");

    try {
      if (!this.isRunning) {
        this.logger.warn("⚠️ [GameController] Service not running");
        return;
      }

      this.stopGameClock();
      this.unsubscribeFromEvents();
      this.isRunning = false;

      const duration = performance.now() - startTime;
      this.logger.info(
        `✅ [GameController] Service stopped - ${duration.toFixed(2)}ms`,
      );
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `❌ [GameController] Stop failed - ${duration.toFixed(2)}ms:`,
        { error },
      );
      throw error;
    }
  }

  // --- IGameControllerService Interface Implementation ---

  @logMethod
  @catchError
  public async startGame(): Promise<void> {
    this.logger.info("🎮 [GameController] Starting game sequence...");

    // PASO 1: Esperar a que el AudioContext se inicie. ESTO ES CRÍTICO.
    await this.audioService.initializeAudioContext();

    this.logger.info("AudioContext ready. Proceeding to start game state.");

    // PASO 2: Proceder con la lógica original una vez el audio está listo.
    this.gameState.isPlaying = true;
    this.gameState.isPaused = false;
    this.emitGameStateChanged("Playing");
  }

  @logMethod
  @catchError
  public pauseGame(): void {
    if (!this.gameState.isPlaying) return;

    this.logger.info("⏸️ [GameController] Pausing game");
    this.gameState.isPaused = true;
    this.emitGameStateChanged("Paused");
  }

  @logMethod
  @catchError
  public resumeGame(): void {
    if (!this.gameState.isPlaying || !this.gameState.isPaused) return;

    this.logger.info("▶️ [GameController] Resuming game");
    this.gameState.isPaused = false;
    this.emitGameStateChanged("Playing");
  }

  @logMethod
  @catchError
  public resetGame(): void {
    this.logger.info("🔄 [GameController] Resetting game");
    this.gameState = {
      isPlaying: false,
      isPaused: false,
      currentScore: 0,
      comboCount: 0,
      health: this.config.health.maxHealth,
      level: 1,
      gameMode: "normal",
    };
    this.emitGameStateChanged("Menu");
  }

  @logMethod
  public getGameState(): GameState {
    return { ...this.gameState };
  }

  @logMethod
  public isPlaying(): boolean {
    return this.gameState.isPlaying && !this.gameState.isPaused;
  }

  @logMethod
  public isPaused(): boolean {
    return this.gameState.isPaused;
  }

  // === ORIGINAL METHODS (PRESERVED) ===

  /**
   * Get configuration
   */
  @logMethod
  public getConfig(): Readonly<GameControllerConfig> {
    return { ...this.config };
  }

  // === PRIVATE METHODS ===

  private subscribeToEvents(): void {
    // QUALIA.CODE v1.1: Event subscriptions now handled by @OnEvent decorators
    // This method is deprecated but kept for backward compatibility during transition
    this.logger.info('⚠️  [GameController] subscribeToEvents is deprecated - using @OnEvent decorators');
  }

  private unsubscribeFromEvents(): void {
    // QUALIA.CODE v1.1: Event cleanup now handled by @OnEvent lifecycle via cleanupEventSubscriptions
    // This method is deprecated but kept for backward compatibility during transition
    this.logger.info('⚠️  [GameController] unsubscribeFromEvents is deprecated - using @OnEvent lifecycle');
  }

  @OnEvent('PlayerAction')
  // @ts-expect-error - Reserved for future player action handling
  private async _handlePlayerAction(event: PlayerActionEvent): Promise<void> {
    this.logger.info(
      `🎮 [GameController] Handling PlayerAction: ${event.action}`,
    );

    switch (event.action) {
      case "StartGame":
        await this.startGame();
        break;
      case "PauseGame":
        this.pauseGame();
        break;
      case "ResetGame":
        this.resetGame();
        break;
      case "Dash":
        this.handleDash(event.context);
        break;
      case "HitNote":
        this.handleHitNote(event.context);
        break;
      case "MissNote":
        this.handleMissNote();
        break;
      case "FastForward":
        this.handleFastForward(event.context);
        break;
      case "Rewind":
        this.handleRewind(event.context);
        break;
      default:
        this.logger.warn(`⚠️ [GameController] Unknown action: ${event.action}`);
    }
  }

  private handleDash(_context?: Record<string, any>): void {
    if (!this.gameState.isPlaying || this.gameState.isPaused) return;

    this.logger.info("💨 [GameController] Dash action performed");
    // Dash could give a temporary speed boost or score multiplier
    this.gameState.currentScore += this.config.mechanics.dashScoreBonus;
    this.emitGameStateChanged("Playing");
  }

  private handleHitNote(context?: Record<string, any>): void {
    if (!this.gameState.isPlaying || this.gameState.isPaused) return;

    const points = context?.points || this.config.scoring.baseScorePerHit;
    const isPerfect = context?.perfect || false;

    // Update score
    this.gameState.currentScore += points;

    // Update combo
    this.gameState.comboCount += 1;

    // Bonus for perfect hits
    if (isPerfect) {
      this.gameState.currentScore += Math.floor(points * this.config.scoring.perfectHitBonusMultiplier);
    }

    // Health recovery for good hits
    this.gameState.health = Math.min(
      this.config.health.maxHealth,
      this.gameState.health + this.config.health.healthRecoveryOnHit,
    );

    this.logger.info(
      `🎯 [GameController] Note hit! Score: ${this.gameState.currentScore}, Combo: ${this.gameState.comboCount}`,
    );
    this.emitGameStateChanged("Playing");
  }

  private handleMissNote(): void {
    if (!this.gameState.isPlaying || this.gameState.isPaused) return;

    // Reset combo
    this.gameState.comboCount = 0;

    // Health damage
    this.gameState.health = Math.max(0, this.gameState.health - this.config.health.damageOnMiss);

    this.logger.info(
      `❌ [GameController] Note missed! Health: ${this.gameState.health}`,
    );
    this.emitGameStateChanged("Playing");

    // Check for game over
    if (this.gameState.health <= 0) {
      this.emitGameStateChanged("GameOver");
    }
  }

  private handleFastForward(_context?: Record<string, any>): void {
    if (!this.gameState.isPlaying || this.gameState.isPaused) return;

    const config = this.config;
    this.logger.info(config.messages.fastForwardActivated);
    // Fast forward could give temporary score boost
    this.gameState.currentScore += config.mechanics.fastForwardScoreBoost;
    this.emitGameStateChanged("Playing");
  }

  private handleRewind(_context?: Record<string, any>): void {
    if (!this.gameState.isPlaying || this.gameState.isPaused) return;

    this.logger.info("⏪ [GameController] Rewind activated");
    // Rewind could restore some health
    this.gameState.health = Math.min(
      this.config.health.maxHealth,
      this.gameState.health + this.config.mechanics.rewindHealthBonus,
    );
    this.emitGameStateChanged("Playing");
  }

  @OnEvent('GameStateChanged')
  // @ts-expect-error - Reserved for future game state change handling
  private _handleGameStateChanged(event: GameStateChangedEvent): void {
    this.logger.debug(
      `🎮 [GameController] Game state changed: ${event.previousState} -> ${event.newState}`,
    );

    // Manage game clock based on state changes
    if (event.newState === "Playing") {
      this.startGameClock();
    } else {
      this.stopGameClock();
    }
  }

  private startGameClock(): void {
    if (this.gameClockInterval !== null) {
      this.logger.warn("⚠️ [GameController] Game clock already running");
      return;
    }

    this.logger.info("⏰ [GameController] Starting game clock");

    this.gameClockInterval = this.timerService.setInterval(() => {
      // Update game time in the store
      const currentTime = Date.now();
      this.gameStateStoreService.updateGameState({ currentTime });
    }, this.config.performance.updateIntervalMs);
  }

  private stopGameClock(): void {
    if (this.gameClockInterval === null) {
      return;
    }

    this.logger.info("⏰ [GameController] Stopping game clock");

    this.timerService.clearInterval(this.gameClockInterval);
    this.gameClockInterval = null;
  }

  private emitGameStateChanged(
    newState: "Playing" | "Paused" | "GameOver" | "Menu",
  ): void {
    const currentState = this.getCurrentStateString();
    this.eventBus.emit<GameStateChangedEvent>({
      type: "GameStateChanged",
      newState,
      oldState: currentState,
      previousState: currentState,
      source: "GameController",
    });
  }

  private getCurrentStateString(): string {
    if (!this.gameState.isPlaying) return "Menu";
    if (this.gameState.isPaused) return "Paused";
    if (this.gameState.health <= 0) return "GameOver";
    return "Playing";
  }

  // QUALIA.CODE v1.1: IBaseService implementation
  @logMethod
  public initialize(): void {
    this.logger.info('🚀 [GameController] Initializing service with @OnEvent lifecycle...');
    // Initialize game state from config
    this.gameState = {
      isPlaying: false,
      isPaused: false,
      currentScore: this.config.scoring.baseScorePerHit, // or 0?
      comboCount: 0,
      health: this.config.health.maxHealth,
      level: 1,
      gameMode: "normal",
    };
    // @OnEvent subscriptions are handled automatically by initializeEventSubscriptions
    // No manual eventBus.subscribe calls needed
  }

  @logMethod
  public cleanup(): void {
    this.logger.info('🧹 [GameController] Cleaning up service...');
    // @OnEvent subscriptions are cleaned up automatically by cleanupEventSubscriptions
    
    // Clean up game clock
    if (this.gameClockInterval !== null) {
      this.timerService.clearInterval(this.gameClockInterval);
      this.gameClockInterval = null;
    }
    
    this.isRunning = false;
  }
}
