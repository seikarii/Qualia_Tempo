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
import {
  EventBus,
  EventHandler,
  PlayerActionEvent,
  GameStateChangedEvent,
} from "./EventBus";
import { logMethod, catchError } from "../utils/decorators";
import { QualiaLogger } from "./Logger";
import type { GameState, GameControllerConfig } from "./contracts/IGameControllerService.contracts";
import type { IGameControllerService } from "./interfaces/IGameControllerService";
import type { IGameStateStoreService } from "./interfaces/IGameStateStoreService";
import type { ITimerService } from "./interfaces/ITimerService";

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
export class GameControllerService implements IGameControllerService {
  private eventBus: EventBus;
  private gameStateStoreService: IGameStateStoreService;
  private timerService: ITimerService;
  private eventListenerIds: string[] = [];
  private isRunning = false;
  private logger: QualiaLogger;
  private gameClockInterval: number | null = null;

  // Internal game state
  private gameState: GameState = {
    isPlaying: false,
    isPaused: false,
    currentScore: 0,
    comboCount: 0,
    health: 100,
    level: 1,
    gameMode: "normal",
  };

  constructor(
    @inject(TYPES.IEventBus) eventBus: EventBus,
    @inject(TYPES.ILogger) logger: QualiaLogger,
    @inject(TYPES.GameControllerConfig) config: GameControllerConfig,
    @inject(TYPES.IGameStateStoreService)
    gameStateStoreService: IGameStateStoreService,
    @inject(TYPES.ITimerService) timerService: ITimerService,
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.config = config;
    this.gameStateStoreService = gameStateStoreService;
    this.timerService = timerService;
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
  public startGame(): void {
    this.logger.info("🎮 [GameController] Starting game");
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
      health: this.config.maxHealth,
      level: 1,
      gameMode: "normal",
    };
    this.emitGameStateChanged("Menu");
  }

  @logMethod
  @catchError
  public getGameState(): any {
    return { ...this.gameState };
  }

  @logMethod
  @catchError
  public isPlaying(): boolean {
    return this.gameState.isPlaying && !this.gameState.isPaused;
  }

  @logMethod
  @catchError
  public isPaused(): boolean {
    return this.gameState.isPaused;
  }

  // === ORIGINAL METHODS (PRESERVED) ===

  /**
   * Get configuration
   */
  @logMethod
  @catchError
  public getConfig(): Readonly<GameControllerConfig> {
    return { ...this.config };
  }

  // === PRIVATE METHODS ===

  private subscribeToEvents(): void {
    // Subscribe to PlayerAction events
    const playerActionHandler: EventHandler<PlayerActionEvent> = (event) => {
      this.handlePlayerAction(event);
    };

    const playerActionListenerId = this.eventBus.subscribe(
      "PlayerAction",
      playerActionHandler,
      { priority: "high" },
    );
    this.eventListenerIds.push(playerActionListenerId);

    // Subscribe to GameStateChanged events for game clock management
    const gameStateChangedHandler: EventHandler<GameStateChangedEvent> = (
      event,
    ) => {
      this.handleGameStateChanged(event);
    };

    const gameStateListenerId = this.eventBus.subscribe(
      "GameStateChanged",
      gameStateChangedHandler,
      { priority: "normal" },
    );
    this.eventListenerIds.push(gameStateListenerId);

    const config = this.config;
    this.logger.info(config.messages.eventsSubscribed);
  }

  private unsubscribeFromEvents(): void {
    for (const listenerId of this.eventListenerIds) {
      this.eventBus.unsubscribe(listenerId);
    }
    this.eventListenerIds = [];

    this.logger.info("📡 [GameController] Unsubscribed from all events");
  }

  private handlePlayerAction(event: PlayerActionEvent): void {
    this.logger.info(
      `🎮 [GameController] Handling PlayerAction: ${event.action}`,
    );

    switch (event.action) {
      case "StartGame":
        this.startGame();
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
    this.gameState.currentScore += 5;
    this.emitGameStateChanged("Playing");
  }

  private handleHitNote(context?: Record<string, any>): void {
    if (!this.gameState.isPlaying || this.gameState.isPaused) return;

    const points = context?.points || 10;
    const isPerfect = context?.perfect || false;

    // Update score
    this.gameState.currentScore += points;

    // Update combo
    this.gameState.comboCount += 1;

    // Bonus for perfect hits
    if (isPerfect) {
      this.gameState.currentScore += Math.floor(points * 0.5);
    }

    // Health recovery for good hits
    this.gameState.health = Math.min(
      this.config.maxHealth,
      this.gameState.health + 2,
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
    this.gameState.health = Math.max(0, this.gameState.health - 5);

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
      this.config.maxHealth,
      this.gameState.health + 10,
    );
    this.emitGameStateChanged("Playing");
  }

  private handleGameStateChanged(event: GameStateChangedEvent): void {
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
    }, 100); // Update every 100ms
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
}
