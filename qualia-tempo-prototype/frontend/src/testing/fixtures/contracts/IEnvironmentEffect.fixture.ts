import { IEnvironmentEffect } from '../../../types/IEnvironmentEffect';

export const createMockEnvironmentEffect = (overrides?: Partial<IEnvironmentEffect>): IEnvironmentEffect => ({
  id: 'env-effect-001',
  type: 'gravity_shift',
  startTime: Date.now() / 1000,
  durationSec: 10.0,
  affectedArea: {
    shape: 'circle',
    center: { x: 5, y: 5 },
    radius: 15,
  },
  intensity: 0.7,
  ...overrides,
});

export const createTimeDilationEffect = (overrides?: Partial<IEnvironmentEffect>): IEnvironmentEffect => ({
  ...createMockEnvironmentEffect(),
  id: 'time-dilation-01',
  type: 'time_dilation',
  durationSec: 5.0,
  affectedArea: {
    shape: 'global',
  },
  intensity: 0.5,
  gameplayModifiers: {
    playerSpeedMultiplier: 0.5,
  },
  triggeredByQualiaState: {
    transcendence: 0.9,
  },
  ...overrides,
});

export const createColorFilterEffect = (overrides?: Partial<IEnvironmentEffect>): IEnvironmentEffect => ({
  ...createMockEnvironmentEffect(),
  id: 'color-filter-chaos',
  type: 'color_filter',
  durationSec: -1, // Permanent until removed
  affectedArea: {
    shape: 'global',
  },
  intensity: 0.8,
  visualParameters: {
    color: { r: 1.0, g: 0.2, b: 0.2, a: 0.3 },
  },
  triggeredByQualiaState: {
    chaos: 0.8,
  },
  ...overrides,
});
