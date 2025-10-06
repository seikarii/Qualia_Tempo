import { QualiaState } from '../../../types/contracts';

export const createMockQualiaState = (overrides?: Partial<QualiaState>): QualiaState => ({
  intensity: 0.5,
  precision: 0.7,
  aggression: 0.3,
  flow: 0.6,
  chaos: 0.3,
  recovery: 0.4,
  transcendence: 0.7,
  collectionWindowEnd: Date.now() / 1000 + 5.0, // 5 seconds from now
  ...overrides,
});

export const createMaxQualiaState = (overrides?: Partial<QualiaState>): QualiaState => ({
  ...createMockQualiaState(),
  intensity: 1.0,
  precision: 1.0,
  aggression: 1.0,
  flow: 1.0,
  chaos: 1.0,
  recovery: 1.0,
  transcendence: 1.0,
  collectionWindowEnd: Date.now() / 1000 + 10.0,
  ...overrides,
});

export const createMinQualiaState = (overrides?: Partial<QualiaState>): QualiaState => ({
  ...createMockQualiaState(),
  intensity: 0.0,
  precision: 0.0,
  aggression: 0.0,
  flow: 0.0,
  chaos: 0.0,
  recovery: 0.0,
  transcendence: 0.0,
  collectionWindowEnd: Date.now() / 1000 + 3.0,
  ...overrides,
});

export const createBalancedQualiaState = (overrides?: Partial<QualiaState>): QualiaState => ({
  ...createMockQualiaState(),
  intensity: 0.5,
  precision: 0.5,
  aggression: 0.5,
  flow: 0.5,
  chaos: 0.5,
  recovery: 0.5,
  transcendence: 0.5,
  collectionWindowEnd: Date.now() / 1000 + 5.0,
  ...overrides,
});

export const createIntenseQualiaState = (overrides?: Partial<QualiaState>): QualiaState => ({
  ...createMockQualiaState(),
  intensity: 0.9,
  precision: 0.8,
  aggression: 0.7,
  flow: 0.6,
  chaos: 0.4,
  recovery: 0.3,
  transcendence: 0.6,
  collectionWindowEnd: Date.now() / 1000 + 8.0,
  ...overrides,
});

export const createChaoticQualiaState = (overrides?: Partial<QualiaState>): QualiaState => ({
  ...createMockQualiaState(),
  intensity: 0.6,
  precision: 0.2,
  aggression: 0.8,
  flow: 0.3,
  chaos: 0.95,
  recovery: 0.4,
  transcendence: 0.3,
  collectionWindowEnd: Date.now() / 1000 + 4.0,
  ...overrides,
});

export const createTranscendentQualiaState = (overrides?: Partial<QualiaState>): QualiaState => ({
  ...createMockQualiaState(),
  intensity: 0.7,
  precision: 0.9,
  aggression: 0.5,
  flow: 0.9,
  chaos: 0.2,
  recovery: 0.6,
  transcendence: 0.95,
  collectionWindowEnd: Date.now() / 1000 + 12.0,
  ...overrides,
});
