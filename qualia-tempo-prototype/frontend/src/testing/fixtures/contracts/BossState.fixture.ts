/**
 * Test fixtures for BossState contract
 * Used in unit and integration tests for boss-related functionality
 * 
 * @see /shared_contracts/BossState.json
 */

import { BossState } from '../../../types/BossState';

/**
 * Standard boss state for mid-combat scenarios
 */
export const createMockBossState = (overrides?: Partial<BossState>): BossState => ({
  id: 'boss-001',
  name: 'Test Boss',
  position: { x: 0, y: 0 },
  health: 100,
  maxHealth: 100,
  currentPhase: 0,
  activePatterns: [],
  buffs: [],
  debuffs: [],
  currentAggressionLevel: 0.5,
  ...overrides,
});

/**
 * Boss in critical health state
 */
export const createCriticalBossState = (overrides?: Partial<BossState>): BossState => ({
  ...createMockBossState(),
  health: 20,
  currentPhase: 2,
  activePatterns: ['pattern-critical-01', 'pattern-critical-02'],
  currentAggressionLevel: 0.9,
  buffs: ['enraged'],
  ...overrides,
});

/**
 * Boss at full health, starting state
 */
export const createInitialBossState = (overrides?: Partial<BossState>): BossState => ({
  ...createMockBossState(),
  health: 100,
  currentPhase: 0,
  activePatterns: [],
  currentAggressionLevel: 0.3,
  ...overrides,
});

/**
 * Boss with multiple debuffs applied
 */
export const createDebuffedBossState = (overrides?: Partial<BossState>): BossState => ({
  ...createMockBossState(),
  health: 60,
  currentPhase: 1,
  debuffs: ['weakened', 'slowed', 'harmony-disrupted'],
  currentAggressionLevel: 0.7,
  ...overrides,
});
