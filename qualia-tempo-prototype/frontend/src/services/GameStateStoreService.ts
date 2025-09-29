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
  QualiaParticleDataReceivedEvent,
} from "./contracts/events.contracts";
import {
  logMethod,
  catchError,
} from "../utils/decorators";
import type { IGameStateStoreService } from "./interfaces/IGameStateStoreService";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";

// Store setter type (from Zustand)
type StoreSetter = (_state: any) => void;

// Event types
const GAME_EVENTS = {
  STATE_CHANGED: "GameStateChanged",
  PARTICLE_DATA_RECEIVED: "QualiaParticleDataReceived",
} as const;

// QUALIA.CODE: Externalized message constants
const SERVICE_MESSAGES = {
  INITIALIZED: "🔗 [GameStateStoreService] Bridge service initialized",
  ALREADY_STARTED: "⚠️ [GameStateStoreService] Service already started",
  STARTING_LISTENERS: "🎧 [GameStateStoreService] Starting event listeners...",
  LISTENERS_ACTIVE: "✅ [GameStateStoreService] Event listeners active",
  NOT_STARTED: "⚠️ [GameStateStoreService] Service not started",
  STOPPING_LISTENERS: "🔇 [GameStateStoreService] Stopping event listeners...",
  LISTENERS_STOPPED: "✅ [GameStateStoreService] Event listeners stopped",
  STATE_UPDATED: "🔄 [GameStateStoreService] Game state updated",
  QUALIA_UPDATED: "✨ [GameStateStoreService] Qualia state updated",
  RHYTHMIC_DASH: "� [GameStateStoreService] Processing RhythmicDash:",
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
  private setStore!: StoreSetter; // Will be set by setStoreSetter method

  constructor(
    @inject(TYPES.IEventBus) private readonly eventBus: IEventBus,
    @inject(TYPES.ILogger) private readonly logger: ILogger,
  ) {
    this.logger.info("GameStateStoreService constructed. Awaiting store setter.");
  }

  // --- IGameStateStoreService Interface Implementation ---

  /**
   * Start listening to events and updating the store
   */
  @logMethod
  @catchError
  start(): void {
    if (this.isStarted) {
      this.logger.warn(SERVICE_MESSAGES.ALREADY_STARTED);
      return;
    }

    this.logger.info(SERVICE_MESSAGES.STARTING_LISTENERS);

    // Subscribe to GameStateChanged events
    const gameStateListenerId = this.eventBus.subscribe(
      GAME_EVENTS.STATE_CHANGED,
      this.handleGameStateChange.bind(this),
    );
    this.listenerIds.push(gameStateListenerId);

    // Subscribe to QualiaParticleDataReceived events
    const particleListenerId = this.eventBus.subscribe(
      "QualiaParticleDataReceived",
      (event) => {
        if (event.type === "QualiaParticleDataReceived") {
          this.handleParticleDataReceived(event as QualiaParticleDataReceivedEvent);
        }
      },
      { priority: "normal" },
    );
    this.listenerIds.push(particleListenerId);

    // Subscribe to RhythmicDash events to update player position
    const rhythmicDashListenerId = this.eventBus.subscribe(
      "RhythmicDash",
      this.handleRhythmicDash.bind(this),
    );
    this.listenerIds.push(rhythmicDashListenerId);

    this.isStarted = true;
    this.logger.info(SERVICE_MESSAGES.LISTENERS_ACTIVE);
  }

  /**
   * Stop listening to events
   */
  @logMethod
  @catchError
  stop(): void {
    if (!this.isStarted) {
      this.logger.warn(SERVICE_MESSAGES.NOT_STARTED);
      return;
    }

    this.logger.info(SERVICE_MESSAGES.STOPPING_LISTENERS);

    // Unsubscribe from all events
    this.listenerIds.forEach((listenerId) => {
      this.eventBus.unsubscribe(listenerId);
    });
    this.listenerIds = [];

    this.isStarted = false;
    this.logger.info(SERVICE_MESSAGES.LISTENERS_STOPPED);
  }

  @logMethod
  @catchError
  updateGameState(state: any): void {
    this.setStore((currentState: any) => ({
      ...currentState,
      ...state,
    }));
  }

  @logMethod
  @catchError
  updateQualiaState(state: any): void {
    this.setStore((currentState: any) => ({
      ...currentState,
      qualiaState: { ...state },
    }));
  }

  @logMethod
  getStatus(): "running" | "stopped" {
    return this.isStarted ? "running" : "stopped";
  }

  @logMethod
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
   * Handle QualiaParticleDataReceived events - Binary Protocol
   * NOTE: Binary protocol delivers particle data via ArrayBuffer, 
   * no direct qualiaState reconstruction in store service
   */
  private handleParticleDataReceived(event: QualiaParticleDataReceivedEvent): void {
    this.logger.info(
      "🌟 [GameStateStoreService] Processing QualiaStateUpdated (Binary):",
      { particleDataSize: event.particleData.byteLength, timestamp: event.timestamp },
    );

    // Binary protocol: Store particle data buffer directly
    // QualiaState reconstruction is handled by specialized particle processing services
    this.setStore((state: any) => ({
      ...state,
      particleData: {
        buffer: event.particleData,
        timestamp: event.timestamp,
        size: event.particleData.byteLength,
      },
    }));
  }

  /**
   * Handle RhythmicDash events to update player position
   */
  private handleRhythmicDash(event: any): void {
    this.logger.info(SERVICE_MESSAGES.RHYTHMIC_DASH, {
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
   * CRITICAL: Allows the Composition Root to provide the UI dependency after construction,
   * preventing React context collisions during service layer initialization.
   */
  @logMethod
  public setStoreSetter(setStore: StoreSetter): void {
    this.setStore = setStore;
    this.logger.info("Zustand store setter has been provided to GameStateStoreService.");
  }
}
