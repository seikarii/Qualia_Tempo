import { vi } from "vitest";
import type { IOntologicalAudioEngine } from "../../audio/IOntologicalAudioEngine";

export const mockOntologicalAudioEngine: IOntologicalAudioEngine = {
  createEntityVoice: vi.fn(),
  updateEntitySound: vi.fn(),
  removeEntityVoice: vi.fn(),
  playEmergentPattern: vi.fn(),
  getMasterVolume: vi.fn(),
  setMasterVolume: vi.fn(),
};