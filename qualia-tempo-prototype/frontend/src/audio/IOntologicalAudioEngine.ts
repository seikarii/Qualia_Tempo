/**
 * QUALIA.CODE v1.1 - IOntologicalAudioEngine Interface
 * Ontological audio engine interface for sound generation.
 */

import type { QualiaState } from "../types/contracts";

export interface EmergentBehavior {
  type:
    | "CLUSTERING"
    | "SYNCHRONIZATION"
    | "STATE_PROPAGATOR"
    | "NARRATIVE_EVENT";
  entities: any[];
  strength?: number;
  description?: string;
  timestamp?: number;
}

export interface IOntologicalAudioEngine {
  /**
   * Create a musical voice for an entity based on its qualia state.
   */
  createEntityVoice(_entityId: string, _qualiaState: QualiaState): void;

  /**
   * Update the sound of an entity based on its qualia state.
   */
  updateEntitySound(_entityId: string, _qualiaState: Record<string, unknown>): void;

  /**
   * Remove an entity's voice from the audio engine.
   */
  removeEntityVoice(_entityId: string): void;

  /**
   * Play an emergent pattern based on behavior.
   */
  playEmergentPattern(_behavior: EmergentBehavior): void;

  /**
   * Get the current master volume.
   */
  getMasterVolume(): number;

  /**
   * Set the master volume.
   */
  setMasterVolume(_volume: number): void;
}
