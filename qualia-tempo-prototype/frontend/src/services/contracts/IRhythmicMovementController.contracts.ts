/**
 * QUALIA.CODE v1.1 - IRhythmicMovementController Contracts
 * Single Source of Truth for RhythmicMovementController data structures.
 * This file is manually maintained for RhythmicMovementController-specific contracts.
 */

// RhythmicMovement Configuration - PURE DI TARGET - Migrated from ConfigurationService.ts
export interface RhythmicMovementConfig {
  bpm: number;
  perfectTiming: number;
  goodTiming: number;
  gridSize: number;
  slowdownFactor: number;
  slowdownDuration: number;
  keyThrottleMs: number; // CRISALIDA.CODE: Configuration-driven throttling
}