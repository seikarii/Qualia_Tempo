import { ISongData } from '../../../types/ISongData';

export const createMockSongData = (overrides?: Partial<ISongData>): ISongData => ({
  id: 'song-001',
  title: 'Test Song',
  artist: 'Test Artist',
  bpm: 120,
  durationSec: 180,
  audioFilePath: '/test/song.mp3',
  timeSignature: { numerator: 4, denominator: 4 },
  beatMap: [
    { timestamp: 0, beatNumber: 1, barNumber: 1, isDownbeat: true },
    { timestamp: 0.5, beatNumber: 2, barNumber: 1, isDownbeat: false },
    { timestamp: 1.0, beatNumber: 3, barNumber: 1, isDownbeat: false },
    { timestamp: 1.5, beatNumber: 4, barNumber: 1, isDownbeat: false },
  ],
  difficulty: 'medium',
  ...overrides,
});

export const createComplexSongData = (overrides?: Partial<ISongData>): ISongData => ({
  ...createMockSongData(),
  id: 'song-complex-001',
  title: 'Complex Symphony',
  bpm: 180,
  durationSec: 240,
  timeSignature: { numerator: 7, denominator: 8 },
  key: 'D minor',
  sections: [
    { name: 'intro', startTimeSec: 0, endTimeSec: 20 },
    { name: 'verse', startTimeSec: 20, endTimeSec: 60 },
    { name: 'chorus', startTimeSec: 60, endTimeSec: 100 },
    { name: 'bridge', startTimeSec: 100, endTimeSec: 140 },
    { name: 'outro', startTimeSec: 140, endTimeSec: 180 },
  ],
  difficulty: 'expert',
  ...overrides,
});
