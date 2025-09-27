/**
 * QUALIA.CODE v1.1 - GameStateStoreService
 * Bridge service between EventBus and Zustand store for passive state management.
 *
 * Architecture:
 * - Single responsibility: Update Zustand store based on EventBus events
 * - Passive state management: Store is a simple data container
 * - Unidirectional data flow: EventBus -> Service -> Store -> UI
 * - Decoupled from UI components: No direct component knowledge
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type {
  GameStateChangedEvent,
  QualiaStateUpdatedEvent,
} from "./EventBus";
import {
  logMethod,
  catchError,
  validateEventProperty,
} from "../utils/decorators";
import type { IGameStateStoreService } from "./interfaces/IGameStateStoreService";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";

// Store setter type (from Zustand)
type StoreSetter = (_state: any) => void;

// Event types
const GAME_EVENTS = {
  STATE_CHANGED: "GameStateChanged",
  QUALIA_UPDATED: "QualiaStateUpdated",
} as const;

/**
 * GameStateStoreService: Bridge between EventBus and Zustand Store
 *
 * QUALIA.CODE Compliance:
 * - Single responsibility: Event-to-store translation
 * - Dependency injection: Receives EventBus and store setter
 * - Event-driven: Reacts to events, doesn't emit them
 * - Passive store: Store is just a data container
 */
@injectable()
export class GameStateStoreService implements IGameStateStoreService {
  private isStarted = false;
  private listenerIds: string[] = [];

  constructor(
    @inject(TYPES.IEventBus) private readonly eventBus: IEventBus,
    @inject(TYPES.ILogger) private readonly logger: ILogger,
    @inject(TYPES.StoreSetter) private readonly setStore: StoreSetter,
  ) {
    this.logger.info("🔗 [GameStateStoreService] Bridge service initialized");
  }

  // --- IGameStateStoreService Interface Implementation ---

  /**
   * Start listening to events and updating the store
   */
  @logMethod()
  @catchError()
  start(): void {
    if (this.isStarted) {
      this.logger.warn("⚠️ [GameStateStoreService] Service already started");
      return;
    }

    this.logger.info("🎧 [GameStateStoreService] Starting event listeners...");

    // Subscribe to GameStateChanged events
    const gameStateListenerId = this.eventBus.subscribe(
      GAME_EVENTS.STATE_CHANGED,
      this.handleGameStateChange.bind(this),
    );
    this.listenerIds.push(gameStateListenerId);

    // Subscribe to QualiaStateUpdated events
    const qualiaStateListenerId = this.eventBus.subscribe(
      GAME_EVENTS.QUALIA_UPDATED,
      this.handleQualiaStateUpdate.bind(this),
    );
    this.listenerIds.push(qualiaStateListenerId);

    // Subscribe to RhythmicDash events to update player position
    const rhythmicDashListenerId = this.eventBus.subscribe(
      "RhythmicDash",
      this.handleRhythmicDash.bind(this),
    );
    this.listenerIds.push(rhythmicDashListenerId);

    this.isStarted = true;
    this.logger.info("✅ [GameStateStoreService] Event listeners active");
  }

  /**
   * Stop listening to events
   */
  @logMethod()
  @catchError()
  stop(): void {
    if (!this.isStarted) {
      this.logger.warn("⚠️ [GameStateStoreService] Service not started");
      return;
    }

    this.logger.info("🔇 [GameStateStoreService] Stopping event listeners...");

    // Unsubscribe from all events
    this.listenerIds.forEach((listenerId) => {
      this.eventBus.unsubscribe(listenerId);
    });
    this.listenerIds = [];

    this.isStarted = false;
    this.logger.info("✅ [GameStateStoreService] Event listeners stopped");
  }

  @logMethod()
  @catchError()
  updateGameState(state: any): void {
    this.setStore((currentState: any) => ({
      ...currentState,
      ...state,
    }));
  }

  @logMethod()
  @catchError()
  updateQualiaState(state: any): void {
    this.setStore((currentState: any) => ({
      ...currentState,
      qualiaState: { ...state },
    }));
  }

  @logMethod()
  getStatus(): "running" | "stopped" {
    return this.isStarted ? "running" : "stopped";
  }

  @logMethod()
  isRunning(): boolean {
    return this.isStarted;
  }

  // === PRIVATE EVENT HANDLERS ===

  /**
   * Handle GameStateChanged events
   */
  private handleGameStateChange(event: GameStateChangedEvent): void {
    this.logger.info(
      "🎮 [GameStateStoreService] Processing GameStateChanged:",
      { newState: event.newState },
    );

    switch (event.newState) {
      case "Playing":
        this.setStore((state: any) => ({
          ...state,
          isPlaying: true,
          gameStartTime: Date.now(),
        }));
        break;

      case "Paused":
      case "GameOver":
        this.setStore((state: any) => ({
          ...state,
          isPlaying: false,
          ...(event.newState === "GameOver" && {
            // Reset game state on game over
            currentTime: 0,
            gameStartTime: 0,
            player: {
              ...state.player,
              health: 100,
              combo: 0,
              score: 0,
              isMoving: false,
              lastRhythmHit: 0,
            },
            qualiaState: {
              intensity: 0,
              precision: 0, // Updated to match QualiaState schema
              aggression: 0,
              flow: 0,
              chaos: 0,
              recovery: 0,
              transcendence: 0,
            },
            totalNotes: 0,
            notesHit: 0,
            notesMissed: 0,
            currentStreak: 0,
            maxStreak: 0,
            pauseCooldownRemaining: 0,
          }),
        }));
        if (event.newState === "GameOver") {
          this.logger.info(
            "💀 [GameStateStoreService] Game Over - State reset",
          );
        }
        break;

      case "Menu":
        this.setStore((state: any) => ({
          ...state,
          isPlaying: false,
          currentTime: 0,
          gameStartTime: 0,
          player: {
            position: { x: 4, y: 4 },
            health: 100,
            combo: 0,
            score: 0,
            isMoving: false,
            lastRhythmHit: 0,
          },
          qualiaState: {
            intensity: 0,
            precision: 0, // Updated to match QualiaState schema
            aggression: 0,
            flow: 0,
            chaos: 0,
            recovery: 0,
            transcendence: 0,
          },
          totalNotes: 0,
          notesHit: 0,
          notesMissed: 0,
          currentStreak: 0,
          maxStreak: 0,
          pauseCooldownRemaining: 0,
        }));
        break;

      default:
        this.logger.warn(
          "⚠️ [GameStateStoreService] Unhandled game state:",
          event.newState,
        );
    }
  }

  /**
   * Handle QualiaStateUpdated events
   */
  @validateEventProperty("qualiaState", "QualiaState")
  private handleQualiaStateUpdate(event: QualiaStateUpdatedEvent): void {
    this.logger.info(
      "🌟 [GameStateStoreService] Processing QualiaStateUpdated:",
      event.qualiaState,
    );

    this.setStore((state: any) => ({
      ...state,
      qualiaState: { ...event.qualiaState },
    }));
  }

  /**
   * Handle RhythmicDash events to update player position
   */
  private handleRhythmicDash(event: any): void {
    this.logger.info("🏃 [GameStateStoreService] Processing RhythmicDash:", {
      direction: event.direction,
      newPosition: event.newPosition,
      timing: event.timing,
    });

    this.setStore((state: any) => ({
      ...state,
      player: {
        ...state.player,
        position: {
          x: event.newPosition[0],
          y: event.newPosition[1],
        },
      },
    }));
  }

  // === UTILITY METHODS ===

  /**
   * Set the store setter function (for initialization after IoC container setup)
   */
  public setStoreSetter(setStore: StoreSetter): void {
    (this as any).setStore = setStore;
  }
}
