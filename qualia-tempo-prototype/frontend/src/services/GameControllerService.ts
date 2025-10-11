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
import type { IEventBus } from "./interfaces/IEventBus";
import { logMethod, catchError, OnEvent, IBaseService, initializeEventSubscriptions, cleanupEventSubscriptions } from "../utils/decorators";
import type { ILogger } from "./interfaces/ILogger";
import type { GameState, GameControllerConfig, GameControllerServiceParams, HitNoteContext } from "./contracts/IGameControllerService.contracts";
import { EVENT_TYPES, GAME_STATES, PLAYER_ACTIONS } from "./contracts/constants";
import type { IGameControllerService } from "./interfaces/IGameControllerService";
import type { IGameStateStoreService } from "./interfaces/IGameStateStoreService";
import type { ITimerService } from "./interfaces/ITimerService";
import type { IPerformanceService } from "./interfaces/IPerformanceService";
import type { IAudioService } from "./interfaces/IAudioService";
import type { IAudioSystemBridge } from "./interfaces/IAudioSystemBridge";

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
  private eventBus: IEventBus;
  private gameStateStoreService: IGameStateStoreService;
  private timerService: ITimerService;
  private performanceService: IPerformanceService;
  private audioService: IAudioService;
  private audioSystemBridge: IAudioSystemBridge;
  private config: GameControllerConfig;
  // @ts-expect-error - Used by @OnEvent decorator lifecycle
  private _eventListeners: string[] = []; // QUALIA.CODE v1.1: Required for @OnEvent lifecycle
  private isRunning = false;
  private logger: ILogger;
  private gameClockInterval: number | null = null;

  // Internal game state - initialized in initialize()
  private gameState!: GameState;

  constructor(
    @inject(TYPES.GameControllerServiceParams) params: GameControllerServiceParams
  ) {
    this.eventBus = params.eventBus;
    this.logger = params.logger;
    this.config = params.config;
    this.gameStateStoreService = params.gameStateStoreService;
    this.timerService = params.timerService;
    this.performanceService = params.performanceService;
    this.audioService = params.audioService;
    this.audioSystemBridge = params.audioSystemBridge;
    // gameState is initialized in initialize() to avoid redundancy
    this.logger.info("🎮 [GameController] Service initialized with explicit dependencies");
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
    const startTime = this.performanceService.now();
    this.logger.info("🚀 [GameController] Starting service...");

    try {
      if (this.isRunning) {
        this.logger.warn("⚠️ [GameController] Service already running");
        return;
      }

      this.isRunning = true;

      const duration = this.performanceService.now() - startTime;
      this.logger.info(
        `🎮 [GameController] Service started successfully - ${duration.toFixed(2)}ms`,
      );
    } catch (error) {
      const duration = this.performanceService.now() - startTime;
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
    const startTime = this.performanceService.now();
    this.logger.info("🛑 [GameController] Stopping service...");

    try {
      if (!this.isRunning) {
        this.logger.warn("⚠️ [GameController] Service not running");
        return;
      }

      this.stopGameClock();
      this.isRunning = false;

      const duration = this.performanceService.now() - startTime;
      this.logger.info(
        `✅ [GameController] Service stopped - ${duration.toFixed(2)}ms`,
      );
    } catch (error) {
      const duration = this.performanceService.now() - startTime;
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

    // PASO 1: Configure audio session BEFORE initializing audio context
    // This ensures optimal audio performance on Windows
    await this.audioSystemBridge.initializeAudioSession();

    // PASO 2: Wait for AudioContext to initialize. This is CRITICAL.
    await this.audioService.initializeAudioContext();

    this.logger.info("AudioContext ready. Proceeding to start game state.");

    // PASO 3: Proceed with original logic once audio is ready
    this.gameState.isPlaying = true;
    this.gameState.isPaused = false;
    this.emitGameStateChanged(GAME_STATES.PLAYING);
  }

  @logMethod
  @catchError
  public pauseGame(): void {
    if (!this.gameState.isPlaying) return;

    this.logger.info("⏸️ [GameController] Pausing game");
    this.gameState.isPaused = true;
    this.emitGameStateChanged(GAME_STATES.PAUSED);
  }

  @logMethod
  @catchError
  public resumeGame(): void {
    if (!this.gameState.isPlaying || !this.gameState.isPaused) return;

    this.logger.info("▶️ [GameController] Resuming game");
    this.gameState.isPaused = false;
    this.emitGameStateChanged(GAME_STATES.PLAYING);
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
    this.emitGameStateChanged(GAME_STATES.MENU);
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

  // === PRIVATE METHODS ===

  @catchError
  @OnEvent('PlayerAction')
  // @ts-expect-error - Reserved for future player action handling
  private async _handlePlayerAction(event: PlayerActionEvent): Promise<void> {
    this.logger.info(
      `🎮 [GameController] Handling PlayerAction: ${event.action}`,
    );

    switch (event.action) {
      case PLAYER_ACTIONS.START_GAME:
        await this.startGame();
        break;
      case PLAYER_ACTIONS.PAUSE_GAME:
        this.pauseGame();
        break;
      case PLAYER_ACTIONS.RESET_GAME:
        this.resetGame();
        break;
      case PLAYER_ACTIONS.DASH:
        this.handleDash(event.context);
        break;
      case PLAYER_ACTIONS.HIT_NOTE:
        this.handleHitNote(event.context);
        break;
      case PLAYER_ACTIONS.MISS_NOTE:
        this.handleMissNote();
        break;
      case PLAYER_ACTIONS.FAST_FORWARD:
        this.handleFastForward(event.context);
        break;
      case PLAYER_ACTIONS.REWIND:
        this.handleRewind(event.context);
        break;
      default:
        this.logger.warn(`⚠️ [GameController] Unknown action: ${event.action}`);
    }
  }

  private handleDash(_context?: Record<string, unknown>): void {
    if (!this.gameState.isPlaying || this.gameState.isPaused) return;

    this.logger.info("💨 [GameController] Dash action performed");
    // Dash could give a temporary speed boost or score multiplier
    this.gameState.currentScore += this.config.mechanics.dashScoreBonus;
    this.emitGameStateChanged(GAME_STATES.PLAYING);
  }

  private handleHitNote(context?: HitNoteContext): void {
    if (!this.gameState.isPlaying || this.gameState.isPaused) return;

    const points = context?.points ?? this.config.scoring.baseScorePerHit;
    const isPerfect = context?.perfect ?? false;

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
    this.emitGameStateChanged(GAME_STATES.PLAYING);
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
    this.emitGameStateChanged(GAME_STATES.PLAYING);

    // Check for game over
    if (this.gameState.health <= 0) {
      this.emitGameStateChanged(GAME_STATES.GAME_OVER);
    }
  }

  private handleFastForward(_context?: Record<string, unknown>): void {
    if (!this.gameState.isPlaying || this.gameState.isPaused) return;

    const config = this.config;
    this.logger.info(config.messages.fastForwardActivated);
    // Fast forward could give temporary score boost
    this.gameState.currentScore += config.mechanics.fastForwardScoreBoost;
    this.emitGameStateChanged(GAME_STATES.PLAYING);
  }

  private handleRewind(_context?: Record<string, unknown>): void {
    if (!this.gameState.isPlaying || this.gameState.isPaused) return;

    this.logger.info("⏪ [GameController] Rewind activated");
    // Rewind could restore some health
    this.gameState.health = Math.min(
      this.config.health.maxHealth,
      this.gameState.health + this.config.mechanics.rewindHealthBonus,
    );
    this.emitGameStateChanged(GAME_STATES.PLAYING);
  }

  @OnEvent('GameStateChanged')
  // @ts-expect-error - Reserved for future game state change handling
  private _handleGameStateChanged(event: GameStateChangedEvent): void {
    this.logger.debug(
      `🎮 [GameController] Game state changed: ${event.previousState} -> ${event.newState}`,
    );

    // Manage game clock based on state changes
    if (event.newState === GAME_STATES.PLAYING) {
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
      const currentTime = this.performanceService.now();
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
      type: EVENT_TYPES.GAME_STATE_CHANGED,
      newState,
      oldState: currentState,
      previousState: currentState,
      source: "GameController",
    });
  }

  private getCurrentStateString(): string {
    if (!this.gameState.isPlaying) return GAME_STATES.MENU;
    if (this.gameState.isPaused) return GAME_STATES.PAUSED;
    if (this.gameState.health <= 0) return GAME_STATES.GAME_OVER;
    return GAME_STATES.PLAYING;
  }

  // QUALIA.CODE v1.1: IBaseService implementation
  @logMethod
  public initialize(): void {
    this.logger.info('🚀 [GameController] Initializing service with @OnEvent lifecycle...');
    // Initialize game state from config
    this.gameState = {
      isPlaying: this.config.gameStates.initial.isPlaying,
      isPaused: this.config.gameStates.initial.isPaused,
      currentScore: this.config.gameStates.initial.currentScore,
      comboCount: this.config.gameStates.initial.comboCount,
      health: this.config.health.maxHealth,
      level: this.config.gameStates.initial.level,
      gameMode: this.config.gameStates.initial.gameMode as "normal" | "hard" | "qualia",
    };
    // Activa todas las suscripciones de eventos declaradas con @OnEvent
    initializeEventSubscriptions(this);
  }

  @logMethod
  public cleanup(): void {
    this.logger.info('🧹 [GameController] Cleaning up service...');
    // Limpia todas las suscripciones de eventos para prevenir memory leaks
    cleanupEventSubscriptions(this);
    
    // Clean up game clock
    if (this.gameClockInterval !== null) {
      this.timerService.clearInterval(this.gameClockInterval);
      this.gameClockInterval = null;
    }
    
    this.isRunning = false;
  }
}
