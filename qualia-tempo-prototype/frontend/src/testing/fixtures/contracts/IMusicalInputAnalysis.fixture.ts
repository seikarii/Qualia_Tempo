import { IMusicalInputAnalysis } from '../../../types/IMusicalInputAnalysis';

export const createMockMusicalInputAnalysis = (overrides?: Partial<IMusicalInputAnalysis>): IMusicalInputAnalysis => ({
  timestamp: Date.now(),
  recentInputs: [
    { action: 'hit', timestamp: Date.now() - 100, timingOffset: 5, accuracy: 'perfect' },
    { action: 'hit', timestamp: Date.now() - 50, timingOffset: -10, accuracy: 'good' },
  ],
  rhythmicConsistency: 0.85,
  detectedPattern: 'steady',
  harmonicAlignment: 0.8,
  phraseCompletion: 0.9,
  dynamicRange: 0.6,
  suggestedQualiaShift: {
    intensity: 0.1,
    precision: 0.05,
    aggression: 0,
    flow: 0.15,
    chaos: -0.05,
  },
  ...overrides,
});

export const createChaoticInputAnalysis = (overrides?: Partial<IMusicalInputAnalysis>): IMusicalInputAnalysis => ({
  ...createMockMusicalInputAnalysis(),
  rhythmicConsistency: 0.3,
  detectedPattern: 'chaotic',
  harmonicAlignment: 0.2,
  phraseCompletion: 0.4,
  dynamicRange: 0.9,
  suggestedQualiaShift: {
    intensity: -0.1,
    precision: -0.2,
    aggression: 0.15,
    flow: -0.15,
    chaos: 0.3,
  },
  ...overrides,
});
