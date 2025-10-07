/**
 * QUALIA.CODE v2.0 - IAudio8DService
 * Spatial 8D audio positioning service for immersive sound experience.
 *
 * PURPOSE: Position audio sources in 3D space based on 2D game coordinates
 * ARCHITECTURE: Event-driven service following IBaseService pattern
 *
 * RESPONSIBILITIES:
 * - Create and manage PannerNode instances for spatial audio
 * - Update listener position based on player movement
 * - Calculate 3D positions from 2D game coordinates
 * - Apply Doppler effect for moving entities
 * - Create directional echo effects for Qualia collection
 *
 * INTEGRATION POINTS:
 * - Listens to: PlayerMovedEvent, QualiaCollectedEvent, EntitySpawnedEvent
 * - Uses: IWebAudioAPIService for AudioContext and node creation
 * - Uses: ITimerService for position update loop
 */

import type { SpatialSoundSource, ListenerPosition } from '../contracts/IAudio8DService.contracts';

export interface IAudio8DService {
  /**
   * Initialize the spatial audio system
   * Sets up audio listener and prepares node pools
   */
  initialize(): void;

  /**
   * Cleanup the spatial audio system
   * Removes all sound sources and event listeners
   */
  cleanup(): void;

  /**
   * Create a positioned sound source
   * @param id - Unique identifier for the source
   * @param position - Initial position in game coordinates
   * @returns The created spatial sound source
   */
  createSoundSource(id: string, position: { x: number; y: number }): SpatialSoundSource;

  /**
   * Remove a sound source
   * @param id - ID of the source to remove
   */
  removeSoundSource(id: string): void;

  /**
   * Update sound source position
   * @param id - ID of the source to update
   * @param position - New position in game coordinates
   * @param velocity - Optional velocity for Doppler effect
   */
  updateSoundSourcePosition(
    id: string,
    position: { x: number; y: number },
    velocity?: { x: number; y: number }
  ): void;

  /**
   * Update listener (player) position
   * @param position - Listener position data
   */
  updateListenerPosition(position: ListenerPosition): void;

  /**
   * Connect an audio source to a spatial sound node
   * @param sourceId - ID of the spatial sound source
   * @param audioSource - Web Audio API AudioNode to connect
   */
  connectAudioSource(sourceId: string, audioSource: AudioNode): void;

  /**
   * Disconnect an audio source from a spatial sound node
   * @param sourceId - ID of the spatial sound source
   */
  disconnectAudioSource(sourceId: string): void;

  /**
   * Create directional echo effect for a position
   * @param position - Position where the echo originated
   * @param direction - Direction vector for the echo
   * @param intensity - Intensity of the echo (0-1)
   */
  createDirectionalEcho(
    position: { x: number; y: number },
    direction: { x: number; y: number },
    intensity: number
  ): void;

  /**
   * Get all active sound sources
   * @returns Array of active sound sources
   */
  getActiveSoundSources(): SpatialSoundSource[];

  /**
   * Check if spatial audio is enabled
   * @returns True if spatial audio is active
   */
  isEnabled(): boolean;
}
