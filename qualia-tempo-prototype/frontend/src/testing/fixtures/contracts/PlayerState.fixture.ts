import { PlayerState } from '../../../types/PlayerState';

export const createMockPlayerState = (overrides?: Partial<PlayerState>): PlayerState => ({
  position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  health: 100,
  combo: 10,
  score: 0,
  isMoving: false,
  lastRhythmHit: Date.now() / 1000,
  abilities: {
    dash: { isReady: true, cooldownRemaining: 0 },
    parry: { isReady: true, cooldownRemaining: 0 },
    ultimate: { isActive: false, charge: 0 },
  },
  buffs: [],
  debuffs: [],
  ...overrides,
});

export const createMovingPlayerState = (overrides?: Partial<PlayerState>): PlayerState => ({
  ...createMockPlayerState(),
  position: { x: 5, y: 3 },
  velocity: { x: 2.5, y: 1.0 },
  health: 100,
  combo: 5,
  isMoving: true,
  ...overrides,
});

export const createCriticalPlayerState = (overrides?: Partial<PlayerState>): PlayerState => ({
  ...createMockPlayerState(),
  position: { x: 10, y: 5 },
  velocity: { x: 0, y: 0 },
  health: 15,
  combo: 0,
  isMoving: false,
  debuffs: [
    { id: 'debuff-poison', name: 'Poison', durationRemaining: 5.0 },
    { id: 'debuff-slow', name: 'Slow', durationRemaining: 3.0 },
  ],
  ...overrides,
});

export const createBuffedPlayerState = (overrides?: Partial<PlayerState>): PlayerState => ({
  ...createMockPlayerState(),
  position: { x: 8, y: 8 },
  velocity: { x: 3.0, y: 2.0 },
  health: 100,
  combo: 25,
  isMoving: true,
  abilities: {
    dash: { isReady: true, cooldownRemaining: 0 },
    parry: { isReady: false, cooldownRemaining: 5.0 },
    ultimate: { isActive: false, charge: 0.5 },
  },
  buffs: [
    { id: 'buff-speed', name: 'Speed Boost', durationRemaining: 10.0 },
    { id: 'buff-damage', name: 'Damage Boost', durationRemaining: 8.0 },
  ],
  ...overrides,
});

export const createComboMasterPlayerState = (overrides?: Partial<PlayerState>): PlayerState => ({
  ...createMockPlayerState(),
  position: { x: 15, y: 12 },
  velocity: { x: 1.5, y: -0.5 },
  health: 95,
  combo: 50,
  score: 50000,
  isMoving: true,
  abilities: {
    dash: { isReady: true, cooldownRemaining: 0 },
    parry: { isReady: true, cooldownRemaining: 0 },
    ultimate: { isActive: false, charge: 1.0 },
  },
  buffs: [
    { id: 'buff-combo', name: 'Combo Sustain', durationRemaining: 15.0 },
  ],
  ...overrides,
});
