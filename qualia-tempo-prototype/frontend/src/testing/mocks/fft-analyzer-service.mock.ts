/**
 * HIGH-FIDELITY MOCK: IFFTAnalyzerService
 * COMPLIANCE: QUALIA.CODE v1.1 Section 10.3.1
 * 
 * CRITICAL RULE: NO bare vi.fn() for non-void return types.
 * ALL methods MUST have mockReturnValue/mockResolvedValue.
 */

import { vi } from 'vitest';
import type { IFFTAnalyzerService, FFTData } from '../../services/interfaces/IFFTAnalyzerService';

const defaultFFTData: FFTData = {
  bass: new Float32Array(4).fill(0.5),
  mid: new Float32Array(16).fill(0.3),
  treble: new Float32Array(11).fill(0.2),
  timestamp: Date.now(),
};

export const mockFFTAnalyzerService: IFFTAnalyzerService = {
  // Lifecycle methods (async, return void)
  initialize: vi.fn().mockResolvedValue(undefined),
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  updateConfig: vi.fn().mockResolvedValue(undefined),

  // Getters (MUST have mockReturnValue - HIGH FIDELITY)
  isAnalyzing: vi.fn().mockReturnValue(false),
  getCurrentFFTData: vi.fn().mockReturnValue(defaultFFTData),
  getFrequencyBandEnergy: vi.fn().mockReturnValue(0.5),
  getBeatDetectionConfidence: vi.fn().mockReturnValue(0.7),
};
