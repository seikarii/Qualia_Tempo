/**
 * QUALIA.CODE v1.1 - IViewLogicService Interface
 * Service responsible for processing game state and transforming it into visual properties.
 * Decouples useFrame logic from React components for better testability and reusability.
 */

import type { 
  BossVisualData, 
  PlayerVisualData, 
  ParticleData, 
  NoteVisualData,
  QualiaFieldVisualData,
  GridVisualData
} from '../contracts/IViewLogicService.contracts';
import type { QualiaState } from '../../types/contracts';

export interface IViewLogicService {
  /**
   * Generate boss visual data based on boss state and time
   * @param bossState Current boss state data
   * @param time Current game time
   * @returns Boss visual properties for rendering
   */
  getBossVisuals(bossState: any, time: number): BossVisualData;

  /**
   * Generate player visual data based on player state, performance, and time
   * @param playerState Current player state data
   * @param performance Current player performance data
   * @param time Current game time
   * @returns Player visual properties for rendering
   */
  getPlayerVisuals(playerState: any, performance: any, time: number): PlayerVisualData;

  /**
   * Generate qualia field visual data based on state and music
   * @param qualiaField Current qualia field state
   * @param musicData Current music analysis data
   * @param time Current game time
   * @returns Qualia field visual properties for rendering
   */
  getQualiaFieldVisuals(qualiaField: any, musicData: any, time: number): QualiaFieldVisualData;

  /**
   * Generate qualia field particle data based on state and music
   * @param qualiaState Current qualia state
   * @param musicData Current music analysis data
   * @param time Current game time
   * @returns Array of particle data for rendering
   */
  getQualiaFieldParticles(qualiaState: QualiaState, musicData: any, time: number): ParticleData[];

  /**
   * Generate musical note visual data for rendering
   * @param notes Array of note data
   * @param time Current game time
   * @returns Array of note visual data for rendering
   */
  getMusicalNoteVisuals(notes: any[], time: number): NoteVisualData[];

  /**
   * Calculate grid visual properties
   * @param playerPosition Current player position
   * @param activePositions Array of active grid positions
   * @param time Current game time
   * @returns Grid visual data
   */
  getGridVisuals(gridSize: number, tileSize: number, playerPosition: { x: number; y: number }, activePositions: [number, number][], time: number): GridVisualData;
}
