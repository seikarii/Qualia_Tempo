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
} from "./contracts/events.contracts";
import {
  logMethod,
  catchError,
  OnEvent,
  IBaseService,
} from "../utils/decorators";
import type { IGameStateStoreService } from "./interfaces/IGameStateStoreService";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { GameStateStoreConfig } from "./contracts/IGameStateStoreService.contracts";

// Store setter type (from Zustand)
type StoreSetter = (_state: unknown) => void;

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
export class GameStateStoreService implements IGameStateStoreService, IBaseService {
  private setStore!: StoreSetter; // Will be set by setStoreSetter method
  private config: GameStateStoreConfig;

  constructor(
    @inject(TYPES.IEventBus) private readonly eventBus: IEventBus,
    @inject(TYPES.ILogger) private readonly logger: ILogger,
    @inject(TYPES.GameStateStoreConfig) config: GameStateStoreConfig,
  ) {
    this.config = config;
    this.logger.info("GameStateStoreService constructed. Awaiting store setter.");
  }

  // --- IGameStateStoreService Interface Implementation ---

  /**
   * Initialize the service and set up event listeners
   */
  @logMethod
  @catchError
  initialize(): void {
    this.logger.info(SERVICE_MESSAGES.STARTING_LISTENERS);
    // @OnEvent decorators handle subscriptions automatically
    this.logger.info(SERVICE_MESSAGES.LISTENERS_ACTIVE);
  }

  /**
   * Clean up the service and remove event listeners
   */
  @logMethod
  @catchError
  cleanup(): void {
    this.logger.info(SERVICE_MESSAGES.STOPPING_LISTENERS);
    // @OnEvent lifecycle handles cleanup automatically
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
    return "running"; // Service is always running after initialize
  }

  @logMethod
  isRunning(): boolean {
    return true; // Service is always running after initialize
  }

  @logMethod
  getGameState(): any {
    // Access the store state through the setter function
    // This is a bit of a hack, but necessary due to the passive store pattern
    let currentState: any;
    this.setStore((state: any) => {
      currentState = state;
      return state; // No-op, just to get the current state
    });
    return currentState;
  }

  // === PRIVATE EVENT HANDLERS ===

  /**
   * Handle GameStateChanged events
   */
  @OnEvent('GameStateChanged')
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
  @OnEvent('QualiaParticleDataReceived')
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
  @OnEvent('RhythmicDash')
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

  /**
   * Handle PlayerAction events to update note states
   */
  @OnEvent('PlayerAction')
  private handlePlayerAction(event: PlayerActionEvent): void {
    const { action, context } = event;
    const noteId = context?.noteId as string;

    if (!noteId || (action !== 'HitNote' && action !== 'MissNote')) return;

    const currentGameState = this.getGameState();
    const noteIndex = currentGameState.combatData.noteMap.findIndex((n: any) => n.id === noteId);

    if (noteIndex > -1) {
      const newNoteState = (action === 'HitNote') ? 'hit' : 'missed';

      // Actualización inmutable del estado
      const newNoteMap = [...currentGameState.combatData.noteMap];
      newNoteMap[noteIndex] = { ...newNoteMap[noteIndex], state: newNoteState };

      this.updateGameState({
        ...currentGameState,
        combatData: { ...currentGameState.combatData, noteMap: newNoteMap }
      });

      // Emitir evento para limpiar la nota de la vista en lugar de usar setTimeout
      this.eventBus.emit({
        type: 'ClearNoteFromViewRequest' as any,
        noteId: noteId,
        timestamp: Date.now(),
        source: 'GameStateStoreService'
      } as any);
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
    this.logger.info("Zustand store setter has been provided to GameStateStoreService.");
  }
}
