import { AudioLayer } from '../../../types/AudioLayer';

export const createMockAudioLayer = (overrides?: Partial<AudioLayer>): AudioLayer => ({
  id: 'layer-001',
  name: 'Test Layer',
  type: 'music',
  volume: 0.8,
  muted: false,
  solo: false,
  activeSources: [],
  effects: [],
  ...overrides,
});

export const createMusicLayer = (overrides?: Partial<AudioLayer>): AudioLayer => ({
  ...createMockAudioLayer(),
  id: 'music-layer',
  name: 'Music Layer',
  type: 'music',
  volume: 0.9,
  activeSources: [
    {
      sourceId: 'music-src-01',
      audioClipId: 'song-001',
      startTime: Date.now() / 1000 - 10,
      volume: 1.0,
      isLooping: true,
    },
  ],
  effects: [
    {
      effectId: 'reverb-01',
      type: 'reverb',
      enabled: true,
      parameters: { roomSize: 0.5, wetMix: 0.3 },
    },
  ],
  qualiaModulation: {
    volumeByIntensity: true,
    filterByTranscendence: true,
    pitchByChaos: false,
  },
  ...overrides,
});

export const createSFXLayer = (overrides?: Partial<AudioLayer>): AudioLayer => ({
  ...createMockAudioLayer(),
  id: 'sfx-layer',
  name: 'SFX Layer',
  type: 'sfx',
  volume: 1.0,
  activeSources: [
    {
      sourceId: 'sfx-src-01',
      audioClipId: 'impact-01',
      startTime: Date.now() / 1000 - 0.5,
      volume: 0.8,
      isLooping: false,
    },
    {
      sourceId: 'sfx-src-02',
      audioClipId: 'dash-whoosh',
      startTime: Date.now() / 1000 - 0.2,
      volume: 0.9,
      isLooping: false,
    },
  ],
  effects: [
    {
      effectId: 'compressor-01',
      type: 'compressor',
      enabled: true,
      parameters: { threshold: -20, ratio: 4 },
    },
  ],
  ...overrides,
});
