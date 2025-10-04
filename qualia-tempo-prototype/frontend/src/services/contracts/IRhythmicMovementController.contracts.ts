/**
 * QUALIA.CODE v1.1 - RhythmicMovementController Contracts
 * Centralized type definitions for rhythmic movement system
 *
 * Purpose: Single source of truth for all rhythmic movement data structures
 * Architecture: Contract definitions extracted from service implementation for clarity and reusability
 */

import type { CoordinateSystemConfig } from "./ICoordinateSystemService.contracts";
import type { IEventBus } from "../interfaces/IEventBus";
import type { ILogger } from "../interfaces/ILogger";
import type { ITimerService } from "../interfaces/ITimerService";
import type { IEventTransformer } from "../protocol/IEventTransformer";
import type { IInputStateService } from "../interfaces/IInputStateService";
import type { IGameplayMechanicsService } from "../interfaces/IGameplayMechanicsService";
import type { PlayerInputEvent, PlayerDirectionEvent } from "./events.contracts";

// QUALIA.CODE v1.1: Constructor Parameter Object
// Consolidates 7 constructor parameters into a single object to comply with IoC limits
// CRISALIDA.CODE Phase 2: Removed gameStateStore dependency for pure reactive architecture
export interface RhythmicMovementControllerParams {
  eventBus: IEventBus;
  logger: ILogger;
  config: RhythmicMovementConfig;
  timerService: ITimerService;
  keyAdapter: IEventTransformer<PlayerInputEvent, PlayerDirectionEvent>;
  inputStateService: IInputStateService;
  gameplayMechanicsService: IGameplayMechanicsService;
}

// Configuration interface for RhythmicMovementController
export interface RhythmicMovementConfig {
  secondsPerMinute: number;
  millisecondsPerSecond: number;
  bpm: number;
  perfectTiming: number;
  goodTiming: number;
  gridSize: number;
  slowdownFactor: number;
  slowdownDuration: number;
  keyThrottleMs: number; // CRISALIDA.CODE: Configuration-driven throttling
  
  // QUALIA.CODE v1.1: Coordinate system configuration
  // This provides the CoordinateSystemService with its required configuration
  coordinate_system: CoordinateSystemConfig;
  
  // Messages for logging
  messages: {
    serviceInitialized: string;
    invalidTimeWarning: string;
  };

  // Externalized hardcoded values
  audioBeatDetectionThreshold: number;
  availableMovements: string[];
  optimalTimingPredictionConfidencePlaying: number;
  optimalTimingPredictionConfidenceNotPlaying: number;
  sequenceDifficultyBaseComplexityMultiplier: number;
  sequenceDifficultyVarietyBonusMultiplier: number;
  initialPlayerPositionOffset?: [number, number]; // Optional offset from center
  flowBpmMultiplier: number; // Multiplier for qualiaState.flow in dynamic BPM calculation
}