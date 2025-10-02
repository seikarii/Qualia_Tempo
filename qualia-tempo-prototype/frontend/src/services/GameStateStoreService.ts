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
  PlayerActionEvent,
  RhythmicDashEvent,
} from "./contracts/events.contracts";
import type { EventTypes } from "./EventBus";
import type { QualiaState } from "../types/contracts";
import {
  logMethod,
  catchError,
  OnEvent,
  IBaseService,
  initializeEventSubscriptions,
  cleanupEventSubscriptions,
} from "../utils/decorators";
import type { IGameStateStoreService } from "./interfaces/IGameStateStoreService";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { GameStateStoreConfig } from "./contracts/IGameStateStoreService.contracts";
import type { GameState } from "../state/useGameStore";

// Store setter type (from Zustand)
// Note: Parameters prefixed with _ to indicate they are part of callback signature
type StoreSetter = (_updater: (_state: GameState) => GameState) => void;

// QUALIA.CODE: Externalized message constants - REMOVED, now in config

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
export class GameStateStoreService implements IGameStateStoreService, IBaseService {
  private setStore!: StoreSetter; // Will be set by setStoreSetter method
  private config: GameStateStoreConfig;
  // @ts-expect-error - Reserved for @OnEvent decorator lifecycle management
  private _eventListeners: string[] = [];

  constructor(
    @inject(TYPES.IEventBus) private readonly _eventBus: IEventBus,
    @inject(TYPES.ILogger) private readonly _logger: ILogger,
    @inject(TYPES.GameStateStoreConfig) config: GameStateStoreConfig,
  ) {
    this.config = config;
    this._logger.info(this.config.messages.constructed);
  }

  // --- IGameStateStoreService Interface Implementation ---

  /**
   * Initialize the service and set up event listeners
   */
  @logMethod
  @catchError
  initialize(): void {
    this._logger.info(this.config.messages.startingListeners);
    // Activa todas las suscripciones de eventos declaradas con @OnEvent
    initializeEventSubscriptions(this);
    this._logger.info(this.config.messages.listenersActive);
  }

  /**
   * Clean up the service and remove event listeners
   */
  @logMethod
  @catchError
  cleanup(): void {
    this._logger.info(this.config.messages.stoppingListeners);
    // Limpia todas las suscripciones de eventos para prevenir memory leaks
    cleanupEventSubscriptions(this);
    this._logger.info(this.config.messages.listenersStopped);
  }

  @logMethod
  @catchError
  updateGameState(state: Partial<GameState>): void {
    this.setStore((currentState: GameState) => ({
      ...currentState,
      ...state,
    }));
  }

  @logMethod
  @catchError
  updateQualiaState(state: QualiaState): void {
    this.setStore((currentState: GameState) => ({
      ...currentState,
      qualiaState: { ...state },
    }));
  }

  @logMethod
  getStatus(): "running" | "stopped" {
    return "running"; // Service is always running after initialize
  }

  @logMethod
  isRunning(): boolean {
    return true; // Service is always running after initialize
  }

  @logMethod
  getGameState(): GameState {
    // Access the store state through the setter function
    // This is a bit of a hack, but necessary due to the passive store pattern
    let currentState: GameState;
    this.setStore((state: GameState) => {
      currentState = state;
      return state; // No-op, just to get the current state
    });
    return currentState!;
  }

  // === PRIVATE EVENT HANDLERS ===

  /**
   * Handle GameStateChanged events
   */
  @OnEvent('GameStateChanged')
  // @ts-expect-error - Method used by @OnEvent decorator but TypeScript cannot detect it
  private handleGameStateChange(event: GameStateChangedEvent): void {
    this._logger.debug(
      this.config.messages.processingGameStateChanged,
      event
    );

    switch (event.newState) {
      case "Playing":
        this.setStore((state: GameState) => ({
          ...state,
          isPlaying: true,
          gameStartTime: Date.now(),
        }));
        break;

      case "Paused":
      case "GameOver":
        this.setStore((state: GameState) => ({
          ...state,
          isPlaying: false,
          ...(event.newState === "GameOver" && {
            // Reset game state on game over
            currentTime: this.config.resetValues.timing.currentTime,
            gameStartTime: this.config.resetValues.timing.gameStartTime,
            player: {
              ...state.player,
              health: this.config.resetValues.player.health,
              combo: this.config.resetValues.player.combo,
              score: this.config.resetValues.player.score,
              isMoving: this.config.resetValues.player.isMoving,
              lastRhythmHit: this.config.resetValues.player.lastRhythmHit,
            },
            qualiaState: {
              intensity: this.config.resetValues.qualiaState.intensity,
              precision: this.config.resetValues.qualiaState.precision, // Updated to match QualiaState schema
              aggression: this.config.resetValues.qualiaState.aggression,
              flow: this.config.resetValues.qualiaState.flow,
              chaos: this.config.resetValues.qualiaState.chaos,
              recovery: this.config.resetValues.qualiaState.recovery,
              transcendence: this.config.resetValues.qualiaState.transcendence,
            },
            totalNotes: this.config.resetValues.gameStats.totalNotes,
            notesHit: this.config.resetValues.gameStats.notesHit,
            notesMissed: this.config.resetValues.gameStats.notesMissed,
            currentStreak: this.config.resetValues.gameStats.currentStreak,
            maxStreak: this.config.resetValues.gameStats.maxStreak,
            pauseCooldownRemaining: this.config.resetValues.gameStats.pauseCooldownRemaining,
          }),
        }));
        if (event.newState === "GameOver") {
          this._logger.info(this.config.messages.gameOver);
        }
        break;

      case "Menu":
        this.setStore((state: GameState) => ({
          ...state,
          isPlaying: false,
          currentTime: this.config.resetValues.timing.currentTime,
          gameStartTime: this.config.resetValues.timing.gameStartTime,
          player: {
            position: this.config.resetValues.player.position,
            health: this.config.resetValues.player.health,
            combo: this.config.resetValues.player.combo,
            score: this.config.resetValues.player.score,
            isMoving: this.config.resetValues.player.isMoving,
            lastRhythmHit: this.config.resetValues.player.lastRhythmHit,
          },
          qualiaState: {
            intensity: this.config.resetValues.qualiaState.intensity,
            precision: this.config.resetValues.qualiaState.precision,
            aggression: this.config.resetValues.qualiaState.aggression,
            flow: this.config.resetValues.qualiaState.flow,
            chaos: this.config.resetValues.qualiaState.chaos,
            recovery: this.config.resetValues.qualiaState.recovery,
            transcendence: this.config.resetValues.qualiaState.transcendence,
          },
          totalNotes: this.config.resetValues.gameStats.totalNotes,
          notesHit: this.config.resetValues.gameStats.notesHit,
          notesMissed: this.config.resetValues.gameStats.notesMissed,
          currentStreak: this.config.resetValues.gameStats.currentStreak,
          maxStreak: this.config.resetValues.gameStats.maxStreak,
          pauseCooldownRemaining: this.config.resetValues.gameStats.pauseCooldownRemaining,
        }));
        break;

      default:
        this._logger.warn(
          this.config.messages.unhandledState,
          event.newState,
        );
    }
  }

  /**
   * Handle QualiaParticleDataReceived events - Binary Protocol
   * NOTE: Binary protocol delivers particle data via ArrayBuffer, 
   * no direct qualiaState reconstruction in store service
   */
  @OnEvent('QualiaParticleDataReceived')
  // @ts-expect-error - Method used by @OnEvent decorator but TypeScript cannot detect it
  private handleParticleDataReceived(event: QualiaParticleDataReceivedEvent): void {
    this._logger.info(
      this.config.messages.processingQualiaUpdated,
      { particleDataSize: event.particleData.byteLength, timestamp: event.timestamp },
    );

    // Binary protocol: Store particle data buffer directly
    // QualiaState reconstruction is handled by specialized particle processing services
    this.setStore((state: GameState) => ({
      ...state,
      particleData: {
        buffer: event.particleData.buffer as ArrayBuffer,
        timestamp: event.timestamp.getTime(),
        size: event.particleData.byteLength,
      },
    }));
  }

  /**
   * Handle RhythmicDash events to update player position
   */
  @OnEvent('RhythmicDash')
  // @ts-expect-error - Method used by @OnEvent decorator but TypeScript cannot detect it
  private handleRhythmicDash(event: RhythmicDashEvent): void {
    this._logger.info(this.config.messages.rhythmicDash, {
      direction: event.direction,
      newPosition: event.newPosition,
      timing: event.timing,
    });

    this.setStore((state: GameState) => ({
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

  /**
   * Handle PlayerAction events to update note states
   */
  @OnEvent('PlayerAction')
  // @ts-expect-error - Method used by @OnEvent decorator but TypeScript cannot detect it
  private handlePlayerAction(event: PlayerActionEvent): void {
    const { action, context } = event;
    const noteId = context?.noteId as string;

    if (!noteId || (action !== 'HitNote' && action !== 'MissNote')) return;

    const currentGameState = this.getGameState();
    const noteIndex = currentGameState.combatData?.noteMap.findIndex((n: { id: string }) => n.id === noteId) ?? -1;

    if (noteIndex > -1 && currentGameState.combatData?.noteMap) {
      const newNoteState = (action === 'HitNote') ? 'hit' : 'missed';

      // Actualización inmutable del estado
      const newNoteMap = [...currentGameState.combatData.noteMap];
      newNoteMap[noteIndex] = { ...newNoteMap[noteIndex], state: newNoteState };

      this.setStore((state: GameState) => ({
        ...state,
        combatData: { ...state.combatData!, noteMap: newNoteMap }
      }));

      // Emitir evento para limpiar la nota de la vista en lugar de usar setTimeout
      this._eventBus.emit({
        type: 'ClearNoteFromViewRequest' as unknown as EventTypes['type'],
        noteId,
        timestamp: Date.now(),
        source: 'GameStateStoreService'
      } as unknown as Omit<EventTypes, "timestamp">);
    }
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
    this._logger.info(this.config.messages.storeSetter);
  }
}
