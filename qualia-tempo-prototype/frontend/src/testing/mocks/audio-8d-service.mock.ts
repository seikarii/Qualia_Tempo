/**
 * HIGH-FIDELITY MOCK: IAudio8DService
 * COMPLIANCE: QUALIA.CODE v1.1 Section 10.3.1
 * 
 * CRITICAL RULE: NO bare vi.fn() for non-void return types.
 * ALL methods MUST have mockReturnValue/mockResolvedValue.
 */

import { vi } from 'vitest';
import type { IAudio8DService } from '../../services/interfaces/IAudio8DService';
import type { SpatialSoundSource } from '../../services/contracts/IAudio8DService.contracts';

const defaultSpatialSource: SpatialSoundSource = {
  id: 'mock-source',
  pannerNode: {} as PannerNode,
  gainNode: {} as GainNode,
  position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  active: true,
};

export const mockAudio8DService: IAudio8DService = {
  // Lifecycle methods (synchronous, return void)
  initialize: vi.fn().mockReturnValue(undefined),
  cleanup: vi.fn().mockReturnValue(undefined),

  // Sound source management (create returns SpatialSoundSource)
  createSoundSource: vi.fn().mockReturnValue(defaultSpatialSource),
  removeSoundSource: vi.fn().mockReturnValue(undefined),
  updateSoundSourcePosition: vi.fn().mockReturnValue(undefined),
  updateListenerPosition: vi.fn().mockReturnValue(undefined),

  // Audio connection methods
  connectAudioSource: vi.fn().mockReturnValue(undefined),
  disconnectAudioSource: vi.fn().mockReturnValue(undefined),

  // Directional echo effect
  createDirectionalEcho: vi.fn().mockReturnValue(undefined),

  // Spatial audio state getters
  getActiveSoundSources: vi.fn().mockReturnValue([]),
  isEnabled: vi.fn().mockReturnValue(false),
};
