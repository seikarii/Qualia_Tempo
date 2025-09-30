/**
 * QUALIA.CODE v1.1 - RhythmicMovementController Contracts
 * Centralized type definitions for rhythmic movement system
 *
 * Purpose: Single source of truth for all rhythmic movement data structures
 * Architecture: Contract definitions extracted from service implementation for clarity and reusability
 */

import type { CoordinateSystemConfig } from "./ICoordinateSystemService.contracts";

// Configuration interface for RhythmicMovementController
export interface RhythmicMovementConfig {
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
}