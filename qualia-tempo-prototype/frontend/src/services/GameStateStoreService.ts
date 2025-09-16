/**
 * QUALIA.CODE v1.0 - GameStateStoreService
 * Bridge service between EventBus and Zustand store for passive state management.
 *
 * Architecture:
 * - Single responsibility: Update Zustand store based on EventBus events
 * - Passive state management: Store is a simple data container
 * - Unidirectional data flow: EventBus -> Service -> Store -> UI
 * - Decoupled from UI components: No direct component knowledge
 */

import { EventBus } from "./EventBus";
import type { GameStateChangedEvent, QualiaStateUpdatedEvent } from "./EventBus";
import { logMethod, catchError, validateEventProperty } from '../utils/decorators';
import { QualiaLogger } from './Logger';

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
export class GameStateStoreService {
  private readonly eventBus: EventBus;
  private readonly setStore: StoreSetter;
  private readonly logger: QualiaLogger;
  private isStarted = false;
  private listenerIds: string[] = [];

  constructor(eventBus: EventBus, logger: QualiaLogger, setStore: StoreSetter) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.setStore = setStore;
    this.logger.info("🔗 [GameStateStoreService] Bridge service initialized");
  }

  /**
   * Start listening to events and updating the store
   */
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

    this.isStarted = true;
    this.logger.info("✅ [GameStateStoreService] Event listeners active");
  }

  /**
   * Stop listening to events
   */
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
              precision: 0,
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
          this.logger.info("💀 [GameStateStoreService] Game Over - State reset");
        }
        break;

      case "Menu":
        this.setStore((state: any) => ({
          ...state,
          isPlaying: false,
          currentTime: 0,
          gameStartTime: 0,
          player: {
            position: { x: 0, y: 0 },
            health: 100,
            combo: 0,
            score: 0,
            isMoving: false,
            lastRhythmHit: 0,
          },
          qualiaState: {
            intensity: 0,
            precision: 0,
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
  @validateEventProperty('qualiaState', 'QualiaState')
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
   * Get service status
   */
  @logMethod()
  @catchError()
  getStatus(): "stopped" | "running" {
    return this.isStarted ? "running" : "stopped";
  }
}
