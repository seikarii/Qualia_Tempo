/**
 * QUALIA.CODE v1.1 - GameControllerService Contracts
 * Centralized type definitions for game controller system
 *
 * Purpose: Single source of truth for all game controller data structures
 * Architecture: Contract definitions extracted from service implementation for clarity and reusability
 */

import type { IEventBus } from '../interfaces/IEventBus';
import type { ILogger } from '../interfaces/ILogger';
import type { IGameStateStoreService } from '../interfaces/IGameStateStoreService';
import type { ITimerService } from '../interfaces/ITimerService';
import type { IPerformanceService } from '../interfaces/IPerformanceService';
import type { IAudioService } from '../interfaces/IAudioService';

// QUALIA.CODE v1.1: Constructor parameter object pattern (max 4 parameters rule)
// ARCHITECTURAL FIX: Explicit dependency injection - no Service Locator anti-pattern
export interface GameControllerServiceParams {
  eventBus: IEventBus;
  logger: ILogger;
  config: GameControllerConfig;
  gameStateStoreService: IGameStateStoreService;
  timerService: ITimerService;
  performanceService: IPerformanceService;
  audioService: IAudioService;
}

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
    perfectHitBonusMultiplier: number;
  };
  health: {
    maxHealth: number;
    healthRegenRate: number;
    damageOnMiss: number;
    healthRecoveryOnHit: number;
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
    rewindHealthBonus: number;
    dashScoreBonus: number;
  };
  gameStates: {
    initial: {
      isPlaying: boolean;
      isPaused: boolean;
      currentScore: number;
      comboCount: number;
      level: number;
      gameMode: string;
    };
    statusMessages: {
      playing: string;
      paused: string;
      gameOver: string;
    };
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

// Event context interfaces for type safety
export interface HitNoteContext {
  points?: number;
  perfect?: boolean;
}

export interface PlayerActionContext {
  [key: string]: unknown;
}