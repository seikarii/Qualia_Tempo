/**
 * IFFTAnalyzerService
 * Real-time FFT audio analysis (Phase 4)
 * 
 * PURPOSE: Analyze audio frequency spectrum for visual reactivity
 * STATUS: 🔮 FUTURE (v2 - RUTA.md Phase 4)
 * IMPLEMENTATION: Pending Phase 4
 */

export interface FFTData {
  bass: Float32Array;
  mid: Float32Array;
  treble: Float32Array;
  timestamp: number;
}

export interface IFFTAnalyzerService {
  /**
   * Initialize FFT analyzer with Web Audio API
   */
  initialize(): Promise<void>;

  /**
   * Start real-time FFT analysis
   */
  start(): Promise<void>;

  /**
   * Stop FFT analysis
   */
  stop(): Promise<void>;

  /**
   * Check if analyzer is currently active
   */
  isAnalyzing(): boolean;

  /**
   * Get current FFT data (frequency bands)
   */
  getCurrentFFTData(): FFTData;

  /**
   * Get energy level for specific frequency band
   * @param band - 'bass' | 'mid' | 'treble'
   */
  getFrequencyBandEnergy(band: 'bass' | 'mid' | 'treble'): number;

  /**
   * Get beat detection confidence (0-1)
   */
  getBeatDetectionConfidence(): number;

  /**
   * Update analyzer configuration
   */
  updateConfig(config: Partial<Record<string, unknown>>): Promise<void>;
}
