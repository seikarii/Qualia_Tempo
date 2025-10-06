/**
 * IAudio8DService
 * Spatial 8D audio positioning (Phase 4)
 * 
 * PURPOSE: Position audio sources in 3D space for immersive experience
 * STATUS: 🔮 FUTURE (v2 - RUTA.md Phase 4)
 * IMPLEMENTATION: Pending Phase 4
 */

export interface AudioSourcePosition {
  x: number;
  y: number;
  z?: number;
}

export interface AudioSource3D {
  id: string;
  position: AudioSourcePosition;
  maxDistance: number;
  rolloffFactor: number;
}

export interface IAudio8DService {
  /**
   * Initialize spatial audio system
   */
  initialize(): Promise<void>;

  /**
   * Add a new 3D audio source
   */
  addSource(sourceId: string, position: AudioSourcePosition): Promise<void>;

  /**
   * Remove a 3D audio source
   */
  removeSource(sourceId: string): Promise<void>;

  /**
   * Update position of existing audio source
   */
  updateSourcePosition(sourceId: string, position: AudioSourcePosition): void;

  /**
   * Update listener (player) position
   */
  updateListenerPosition(position: AudioSourcePosition): void;

  /**
   * Get all active 3D audio sources
   */
  getActiveSources(): AudioSource3D[];

  /**
   * Update spatial audio configuration
   */
  updateConfig(config: Partial<Record<string, unknown>>): Promise<void>;
}
