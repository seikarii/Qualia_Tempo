/**
 * HIGH-FIDELITY MOCK: IMusicalComboDetectorService
 * COMPLIANCE: QUALIA.CODE v1.1 Section 10.3.1
 * 
 * CRITICAL RULE: NO bare vi.fn() for non-void return types.
 * ALL methods MUST have mockReturnValue/mockResolvedValue.
 */

import { vi } from 'vitest';
import type { IMusicalComboDetectorService, MusicalSequence } from '../../services/interfaces/IMusicalComboDetectorService';

const defaultMusicalSequence: MusicalSequence = {
  keys: [],
  timestamp: Date.now(),
  isValid: false,
  harmonicScore: 0,
};

export const mockMusicalComboDetectorService: IMusicalComboDetectorService = {
  // Lifecycle methods (async, return void)
  initialize: vi.fn().mockResolvedValue(undefined),
  updateConfig: vi.fn().mockResolvedValue(undefined),

  // Synchronous action methods (return void)
  recordKeyPress: vi.fn().mockReturnValue(undefined),
  clearSequence: vi.fn().mockReturnValue(undefined),

  // Getters (MUST have mockReturnValue - HIGH FIDELITY)
  getCurrentSequence: vi.fn().mockReturnValue(defaultMusicalSequence),
  isValidCombo: vi.fn().mockReturnValue(false),
  getCooldownRemaining: vi.fn().mockReturnValue(0),
};
