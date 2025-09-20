import { createWithEqualityFn } from "zustand/traditional";
import { subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { QualiaState, PlayerState, CombatData } from "../types/contracts";

// Notification types
export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: number;
  autoHide?: boolean;
  duration?: number;
}

// Type-safe event names
export const GAME_EVENTS = {
  STATE_CHANGED: "GameStateChanged",
  QUALIA_UPDATED: "QualiaStateUpdated",
  PLAYER_ACTION: "PlayerAction",
} as const;

interface GameState {
  // Core game state
  isPlaying: boolean;
  currentTime: number;
  gameStartTime: number;

  // Application initialization state
  isConfigLoaded: boolean;
  backendConnected: boolean;

  // Player state
  player: PlayerState;

  // Combat data
  combatData: CombatData | null;

  // Qualia state - the heart of the visual system
  qualiaState: QualiaState;

  // Performance tracking
  totalNotes: number;
  notesHit: number;
  notesMissed: number;
  currentStreak: number;
  maxStreak: number;

  // Abilities
  pauseCooldownRemaining: number;

  // Notifications
  notifications: Notification[];
}

const initialPlayerState: PlayerState = {
  position: { x: 4, y: 4 },
  health: 100,
  combo: 0,
  score: 0,
  isMoving: false,
  lastRhythmHit: 0,
};

const initialQualiaState: QualiaState = {
  intensity: 0,
  precision: 0,
  aggression: 0,
  flow: 0,
  chaos: 0,
  recovery: 0,
  transcendence: 0,
};

// Store implementation - PASSIVE CONTAINER ONLY
const initialState: GameState = {
  isPlaying: false,
  currentTime: 0,
  gameStartTime: 0,
  isConfigLoaded: false,
  backendConnected: false,
  player: { ...initialPlayerState },
  combatData: null,
  qualiaState: { ...initialQualiaState },
  totalNotes: 0,
  notesHit: 0,
  notesMissed: 0,
  currentStreak: 0,
  maxStreak: 0,
  pauseCooldownRemaining: 0,
  notifications: [],
};

// Create the store
export const useGameStore = createWithEqualityFn<GameState>()(
  subscribeWithSelector(() => initialState),
);

// Selectors
export const useQualiaState = () => useGameStore((state) => state.qualiaState);
export const usePlayerState = () => useGameStore((state) => state.player);
export const useGameStats = () =>
  useGameStore(
    (state) => ({
      notesHit: state.notesHit,
      notesMissed: state.notesMissed,
      accuracy:
        state.totalNotes > 0 ? (state.notesHit / state.totalNotes) * 100 : 0,
      currentStreak: state.currentStreak,
      maxStreak: state.maxStreak,
    }),
    shallow,
  );
