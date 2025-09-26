import { vi } from "vitest";

export class OntologicalAudioEngine {
  updateEntitySound = vi.fn();
  playEmergentPattern = vi.fn();
  createEntityVoice = vi.fn();
  removeEntityVoice = vi.fn();
}

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
