import { vi } from 'vitest';
import { IGameStateStoreService } from '../../services/interfaces/IGameStateStoreService';
import { GameState } from '../../state/useGameStore';

const mockInitialState: GameState = {
  isPlaying: false,
  currentTime: 0,
  gameStartTime: 0,
  isConfigLoaded: false,
  backendConnected: false,
  player: {
    position: { x: 4, y: 4 },
    health: 100,
    combo: 0,
    score: 0,
    isMoving: false,
    lastRhythmHit: 0,
  },
  combatData: null,
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
  notifications: [],
};

export const mockGameStateStoreService: IGameStateStoreService = {
  initialize: vi.fn().mockResolvedValue(undefined),
  cleanup: vi.fn().mockResolvedValue(undefined),
  updateGameState: vi.fn().mockResolvedValue(undefined),
  updateQualiaState: vi.fn().mockResolvedValue(undefined),
  getStatus: vi.fn().mockReturnValue('stopped'),
  isRunning: vi.fn().mockReturnValue(false),
  getGameState: vi.fn().mockReturnValue(mockInitialState),
  setStoreSetter: vi.fn().mockResolvedValue(undefined),
};