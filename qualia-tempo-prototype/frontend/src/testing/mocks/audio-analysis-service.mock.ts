/**
 * QUALIA.CODE v2.0 - High-Fidelity IAudioAnalysisService Mock
 * Mock implementation for AudioAnalysisService following high-fidelity standards.
 */

import { vi } from 'vitest';
import type { IAudioAnalysisService, AudioAnalysisData } from '../../services/interfaces/IAudioAnalysisService';

export const mockAudioAnalysisService: IAudioAnalysisService = {
  initialize: vi.fn(),
  cleanup: vi.fn(),
  getCurrentAudioData: vi.fn().mockReturnValue({
    tempo: 120,
    beatPosition: 0,
    frequencyBands: [0, 0, 0, 0, 0, 0, 0, 0],
    volume: 0,
  } as AudioAnalysisData),
  isAnalyzing: vi.fn().mockReturnValue(false),
};
