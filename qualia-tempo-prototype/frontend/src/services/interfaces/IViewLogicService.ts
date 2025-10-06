/**
 * QUALIA.CODE v1.1 - IViewLogicService Interface
 * Game state to visual properties transformation service.
 */

import type { QualiaState, NoteData } from "../../types/contracts";
import type {
  BossVisualData,
  PlayerVisualData,
  NoteVisualData,
  GridVisualData,
  QualiaFieldVisualData,
  GetGridVisualsParams,
  ParticleData
} from "../contracts/IViewLogicService.contracts";

// Local type definitions for music data
export interface MusicData {
  tempo: number;
  beat_position: number;
  intensity: number;
  frequency_bands: number[];
  order_influence: number;
  chaos_influence: number;
  emotional_valence: number;
  harmony: number;
}

// Local type definitions for state processing
export interface BossState {
  stress_level: number;
  phase: number;
  position: [number, number, number];
  qualia_state?: { emotional_valence: number };
  power_level: number;
}

export interface PlayerState {
  position: [number, number, number];
  velocity: [number, number, number];
  health: number;
  power_level: number;
  consciousness_level: number;
  qualia_state: {
    emotional_valence: number;
    arousal: number;
    coherence: number;
  };
}

export interface PerformanceData {
  accuracy: number;
  rhythm_score: number;
  combo_multiplier: number;
  rhythm_sync: number;
  qualia_coherence: number;
}

export interface IViewLogicService {
  /**
   * Generate boss visual data based on boss state and time
   * @param bossState Current boss state data
   * @param time Current game time
   * @returns Boss visual properties for rendering
   */
  getBossVisuals(bossState: BossState, time: number): BossVisualData;

  /**
   * Generate player visual data based on player state, performance, and time
   * @param playerState Current player state data
   * @param performance Current player performance data
   * @param time Current game time
   * @returns Player visual properties for rendering
   */
  getPlayerVisuals(playerState: PlayerState, performance: PerformanceData, time: number): PlayerVisualData;

  /**
   * Generate qualia field visual data based on state and music
   * @param qualiaField Current qualia field state
   * @param musicData Current music analysis data
   * @param time Current game time
   * @returns Qualia field visual properties for rendering
   */
  getQualiaFieldVisuals(qualiaField: QualiaState, musicData: MusicData, time: number): QualiaFieldVisualData;

  /**
   * Generate qualia field particle data based on state and music
   * @param qualiaState Current qualia state
   * @param musicData Current music analysis data
   * @param time Current game time
   * @returns Array of particle data for rendering
   */
  getQualiaFieldParticles(qualiaState: QualiaState, musicData: MusicData, time: number): ParticleData[];

  /**
   * Generate musical note visual data for rendering
   * @param notes Array of note data
   * @param time Current game time
   * @returns Array of note visual data for rendering
   */
  getMusicalNoteVisuals(notes: NoteData[], time: number): NoteVisualData[];

  /**
   * Calculate grid visual properties
   * QUALIA.CODE COMPLIANT: Parameter Object Pattern (max 4 params)
   * @param params - GetGridVisualsParams object containing all required parameters
   * @returns Grid visual data
   */
  getGridVisuals(params: GetGridVisualsParams): GridVisualData;

  /**
   * Calculate player accuracy based on hits and total notes
   * @param notesHit - Number of notes successfully hit
   * @param totalNotes - Total number of notes
   * @returns Accuracy value between 0 and 1
   */
  calculateAccuracy(notesHit: number, totalNotes: number): number;

  /**
   * Calculate boss power level based on chaos
   * @param chaos - Chaos value from qualia state
   * @returns Boss power level
   */
  calculateBossPowerLevel(chaos: number): number;

  /**
   * Calculate boss phase based on chaos
   * @param chaos - Chaos value from qualia state
   * @returns Boss phase number
   */
  calculateBossPhase(chaos: number): number;

  /**
   * Build player render properties from game state
   * @param gameState - Partial game state with player data
   * @returns Player and performance props for rendering
   */
  buildPlayerRenderProps(gameState: {
    player: { position: { x: number; y: number }; health: number; score: number; combo: number };
    velocity: { x: number; y: number; z: number };
    qualiaState: QualiaState;
    notesHit: number;
    totalNotes: number;
  }): {
    player: {
      id: string;
      name: string;
      position: [number, number, number];
      velocity: [number, number, number];
      health: number;
      power_level: number;
      consciousness_level: number;
      qualia_state: {
        emotional_valence: number;
        arousal: number;
        coherence: number;
      };
    };
    performance: {
      accuracy: number;
      rhythm_score: number;
      combo_multiplier: number;
      rhythm_sync: number;
      qualia_coherence: number;
    };
  };

  /**
   * Build boss render properties from qualia state
   * @param qualiaState - Current qualia state
   * @returns Boss props for rendering
   */
  buildBossRenderProps(qualiaState: QualiaState): {
    id: string;
    name: string;
    position: [number, number, number];
    power_level: number;
    phase: number;
    stress_level: number;
    qualia_state: {
      consciousness_density: number;
      emotional_valence: number;
      arousal: number;
      coherence: number;
    };
  };

  /**
   * Build qualia field render properties from game state
   * @param gameState - Partial game state with qualia and audio data
   * @returns Qualia field props for rendering
   */
  buildQualiaFieldRenderProps(gameState: {
    qualiaState: QualiaState;
    tempo: number;
    beatPosition: number;
    frequencyBands: number[];
  }): {
    qualiaState: QualiaState;
    musicData: MusicData;
  };
}
