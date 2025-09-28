/**
 * QUALIA.CODE v1.1 - GameControllerService Contracts
 * Centralized type definitions for game controller system
 *
 * Purpose: Single source of truth for all game controller data structures
 * Architecture: Contract definitions extracted from service implementation for clarity and reusability
 */

// Game state interface
export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  currentScore: number;
  comboCount: number;
  health: number;
  level: number;
  gameMode: "normal" | "hard" | "qualia";
}

// GameController Configuration - Unified interface (QUALIA.CODE v1.1)
export interface GameControllerConfig {
  gameLifecycle: {
    autoStart: boolean;
    enablePause: boolean;
    enableReset: boolean;
    saveStateOnExit: boolean;
  };
  performance: {
    updateIntervalMs: number;
    maxFrameSkip: number;
    enableFrameRateLimiting: boolean;
  };
  stateManagement: {
    enableStateValidation: boolean;
    enableStatePersistence: boolean;
    stateSaveInterval: number;
    maxSaveSlots: number;
  };
  inputHandling: {
    enableInputBuffering: boolean;
    inputBufferSize: number;
    enableInputFiltering: boolean;
    inputDebounceMs: number;
  };
  scoring: {
    baseScorePerHit: number;
    comboMultiplier: number;
    maxComboMultiplier: number;
    scoreDecayRate: number;
  };
  health: {
    maxHealth: number;
    healthRegenRate: number;
    damageOnMiss: number;
    enableInvincibilityFrames: boolean;
    invincibilityDuration: number;
  };
  difficulty: {
    adaptiveDifficulty: boolean;
    difficultyIncreaseRate: number;
    maxDifficulty: number;
    minDifficulty: number;
  };
  events: {
    enableEventBuffering: boolean;
    maxEventQueueSize: number;
    eventProcessingInterval: number;
  };
  mechanics: {
    fastForwardScoreBoost: number;
  };
  maxPlayers: number; // Maximum number of players supported
  enablePauseResume: boolean; // Enable pause/resume functionality
  enableGameStateValidation: boolean; // Enable game state validation
  enablePerformanceMonitoring: boolean; // Enable performance monitoring
  autoSaveEnabled: boolean; // Enable auto-save functionality
  autoSaveIntervalMs: number; // Auto-save interval
  
  // Messages for logging
  messages: {
    eventsSubscribed: string;
    fastForwardActivated: string;
  };
}