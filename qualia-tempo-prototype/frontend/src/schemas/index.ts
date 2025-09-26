// QUALIA.CODE v1.0 - Zod Schemas
// Schema validation definitions for runtime type checking

import { z } from "zod";

/**
 * QualiaState schema - Central data structure representing player mastery
 */
export const QualiaStateSchema = z
  .object({
    intensity: z.number().min(0).max(1).describe("Overall energy level (0-1)"),
    precision: z.number().min(0).max(1).describe("Accuracy streaks (0-1)"),
    aggression: z.number().min(0).max(1).describe("Fast Forward usage (0-1)"),
    flow: z.number().min(0).max(1).describe("Rhythmic consistency (0-1)"),
    chaos: z.number().min(0).max(1).describe("Rhythm failures (0-1)"),
    recovery: z.number().min(0).max(1).describe("Rewind usage (0-1)"),
    transcendence: z.number().min(0).max(1).describe("Ultimate mode (0-1)"),
  })
  .strict();

/**
 * PlayerState schema - Player game state
 */
export const PlayerStateSchema = z
  .object({
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
    health: z.number().min(0).max(100),
    combo: z.number().min(0),
    score: z.number().min(0),
    isMoving: z.boolean(),
    lastRhythmHit: z.number().min(0),
  })
  .strict();

/**
 * CombatData schema - Combat event data
 */
export const CombatDataSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    artist: z.string(),
    audioPath: z.string(),
    bpm: z.number().min(1),
    duration: z.number().min(0),
    noteMap: z.array(
      z.object({
        timestamp: z.number().min(0),
        position: z.object({
          x: z.number(),
          y: z.number(),
        }),
        duration: z.number().min(0),
      }),
    ),
    lyrics: z.array(
      z.object({
        timestamp: z.number().min(0),
        text: z.string(),
      }),
    ),
  })
  .strict();

/**
 * Schema registry for dynamic validation
 */
export const schemaRegistry = {
  QualiaState: QualiaStateSchema,
  PlayerState: PlayerStateSchema,
  CombatData: CombatDataSchema,
} as const;

export type QualiaState = z.infer<typeof QualiaStateSchema>;
export type PlayerState = z.infer<typeof PlayerStateSchema>;
export type CombatData = z.infer<typeof CombatDataSchema>;
