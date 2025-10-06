import { IActiveEffect } from '../../../types/IActiveEffect';

export const createMockActiveEffect = (overrides?: Partial<IActiveEffect>): IActiveEffect => ({
  id: 'effect-001',
  effectType: 'particle_burst',
  startTime: Date.now() / 1000,
  durationSec: 2.0,
  position: { x: 0, y: 0, z: 0 },
  intensity: 0.8,
  color: { r: 1.0, g: 0.5, b: 0.2, a: 1.0 },
  scale: 1.0,
  ...overrides,
});

export const createBloomPulseEffect = (overrides?: Partial<IActiveEffect>): IActiveEffect => ({
  ...createMockActiveEffect(),
  id: 'bloom-pulse-01',
  effectType: 'bloom_pulse',
  intensity: 0.9,
  color: { r: 1.0, g: 0.9, b: 0.3, a: 1.0 },
  fadeInSec: 0.1,
  fadeOutSec: 0.5,
  ...overrides,
});

export const createGodRaysEffect = (overrides?: Partial<IActiveEffect>): IActiveEffect => ({
  ...createMockActiveEffect(),
  id: 'god-rays-01',
  effectType: 'god_rays',
  durationSec: 5.0,
  intensity: 0.7,
  color: { r: 1.0, g: 1.0, b: 0.8, a: 0.6 },
  customParameters: {
    numRays: 32,
    rayLength: 10,
    decay: 0.95,
  },
  ...overrides,
});
