import { MusicalComboData } from '../../../types/MusicalComboData';

export const createMockMusicalComboData = (overrides?: Partial<MusicalComboData>): MusicalComboData => ({
  id: 'combo-001',
  name: 'Test Combo',
  sequence: [
    { action: 'hit', timing: 'exact', maxDelayMs: 500 },
    { action: 'dash', timing: 'exact', maxDelayMs: 500 },
  ],
  bonusMultiplier: 1.5,
  qualiaModifiers: {
    intensity: 0.1,
    precision: 0.15,
    aggression: 0.05,
    flow: 0.1,
    chaos: -0.05,
    recovery: 0,
    transcendence: 0.05,
  },
  difficulty: 'medium',
  ...overrides,
});

export const createHarmonicCombo = (overrides?: Partial<MusicalComboData>): MusicalComboData => ({
  ...createMockMusicalComboData(),
  id: 'combo-harmonic-001',
  name: 'Harmonic Vortex',
  sequence: [
    { action: 'hit', timing: 'exact', maxDelayMs: 300 },
    { action: 'hit', timing: 'exact', maxDelayMs: 300 },
    { action: 'dash', timing: 'exact', maxDelayMs: 500 },
  ],
  bonusMultiplier: 2.0,
  visualEffectId: 'vortex-01',
  audioEffectId: 'harmonic-pulse',
  difficulty: 'hard',
  ...overrides,
});
