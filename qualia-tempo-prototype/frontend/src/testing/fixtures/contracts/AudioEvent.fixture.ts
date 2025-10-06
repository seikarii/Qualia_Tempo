import { AudioEvent } from '../../../types/AudioEvent';

export const createMockAudioEvent = (overrides?: Partial<AudioEvent>): AudioEvent => ({
  id: 'audio-event-001',
  type: 'play_sfx',
  timestamp: Date.now() / 1000,
  ...overrides,
});

export const createPlayMusicEvent = (overrides?: Partial<AudioEvent>): AudioEvent => ({
  ...createMockAudioEvent(),
  id: 'music-play-01',
  type: 'play_music',
  audioClipId: 'song-001',
  layerId: 'music-layer',
  parameters: {
    volume: 0.8,
    loop: true,
    fadeInSec: 2.0,
  },
  ...overrides,
});

export const createSpatialAudioEvent = (overrides?: Partial<AudioEvent>): AudioEvent => ({
  ...createMockAudioEvent(),
  id: 'spatial-sfx-01',
  type: 'play_sfx',
  audioClipId: 'impact-sound',
  layerId: 'sfx-layer',
  parameters: {
    volume: 1.0,
    priority: 5,
  },
  spatialData: {
    position: { x: 5, y: 3, z: 0 },
    maxDistance: 20,
    rolloffFactor: 1.5,
  },
  ...overrides,
});

export const createFilteredAudioEvent = (overrides?: Partial<AudioEvent>): AudioEvent => ({
  ...createMockAudioEvent(),
  id: 'filtered-music-01',
  type: 'apply_filter',
  layerId: 'music-layer',
  filterSettings: {
    type: 'lowpass',
    frequency: 800,
    resonance: 0.7,
    wetDryMix: 0.5,
  },
  triggerCondition: {
    qualiaThreshold: 0.8,
    beatSynced: true,
  },
  ...overrides,
});
