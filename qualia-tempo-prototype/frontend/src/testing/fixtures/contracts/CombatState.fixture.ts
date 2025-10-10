/**
 * Test fixtures for CombatState contract
 * @see /shared_contracts/CombatState.json
 */

import { CombatState } from '../../../types/CombatState';

export const createMockCombatState = (overrides?: Partial<CombatState>): CombatState => ({
  gameState: 'idle',
  isActive: true,
  currentPhase: 0,
  elapsedTime: 0,
  songProgress: 0,
  player: {
    health: 100,
    position: { x: 0, y: 0, z: 0 },
    score: 0,
    combo: 0,
    maxCombo: 0,
    moveSpeed: 1.0,
    isInvulnerable: false,
  },
  boss: {
    health: 100,
    position: { x: 0, y: 0, z: 0 },
    currentPhase: 0,
    attackPattern: 'default',
    isVulnerable: true,
    nextPhaseThreshold: 0.75,
  },
  activeEffects: [],
  environmentEffects: [],
  qualiaEventHistory: [],
  ...overrides,
});

export const createActiveCombatState = (overrides?: Partial<CombatState>): CombatState => ({
  ...createMockCombatState(),
  isActive: true,
  currentPhase: 1,
  elapsedTime: 30.5,
  songProgress: 0.3,
  activeEffects: ['bloom-pulse-01', 'particle-burst-02'],
  environmentEffects: ['gravity-shift'],
  qualiaEventHistory: [
    { id: 'qe-001', timestamp: 29.0, position: { x: 1, y: 2 }, value: 10 },
    { id: 'qe-002', timestamp: 29.5, position: { x: 3, y: 4 }, value: 15 },
  ],
  ...overrides,
});

export const createInactiveCombatState = (overrides?: Partial<CombatState>): CombatState => ({
  ...createMockCombatState(),
  isActive: false,
  currentPhase: 0,
  elapsedTime: 0,
  songProgress: 0,
  ...overrides,
});

export const createIntenseCombatState = (overrides?: Partial<CombatState>): CombatState => ({
  ...createMockCombatState(),
  isActive: true,
  currentPhase: 2,
  elapsedTime: 120.0,
  songProgress: 0.8,
  activeEffects: [
    'bloom-pulse-01', 'bloom-pulse-02', 'god-rays-01',
    'particle-burst-01', 'particle-burst-02', 'screen-shake',
  ],
  environmentEffects: ['time-dilation', 'color-filter-chaos'],
  qualiaEventHistory: Array.from({ length: 20 }, (_, i) => ({
    id: `qe-${100 + i}`,
    timestamp: 119 + i * 0.05,
    position: { x: Math.random() * 10, y: Math.random() * 10 },
    value: 5 + Math.floor(Math.random() * 10),
  })),
  ...overrides,
});
