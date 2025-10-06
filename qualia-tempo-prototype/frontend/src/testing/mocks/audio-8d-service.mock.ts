/**
 * HIGH-FIDELITY MOCK: IAudio8DService
 * COMPLIANCE: QUALIA.CODE v1.1 Section 10.3.1
 * 
 * CRITICAL RULE: NO bare vi.fn() for non-void return types.
 * ALL methods MUST have mockReturnValue/mockResolvedValue.
 */

import { vi } from 'vitest';
import type { IAudio8DService, AudioSource3D } from '../../services/interfaces/IAudio8DService';

const defaultAudioSources: AudioSource3D[] = [];

export const mockAudio8DService: IAudio8DService = {
  // Lifecycle methods (async, return void)
  initialize: vi.fn().mockResolvedValue(undefined),
  addSource: vi.fn().mockResolvedValue(undefined),
  removeSource: vi.fn().mockResolvedValue(undefined),
  updateConfig: vi.fn().mockResolvedValue(undefined),

  // Synchronous update methods (return void)
  updateSourcePosition: vi.fn().mockReturnValue(undefined),
  updateListenerPosition: vi.fn().mockReturnValue(undefined),

  // Getters (MUST have mockReturnValue - HIGH FIDELITY)
  getActiveSources: vi.fn().mockReturnValue(defaultAudioSources),
};
