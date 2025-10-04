/**
 * QUALIA.CODE v2.0 - IAudioAnalysisService Interface
 * Real-time audio analysis service for tempo, beat detection, and frequency analysis.
 *
 * Architecture:
 * - Implements IBaseService for lifecycle management
 * - Listens to System.Audio.Ready event before starting analysis
 * - Uses IWebAudioAPIService for AudioContext access
 * - Uses ITimerService for requestAnimationFrame loop
 * - Emits AudioDataUpdatedEvent on EventBus
 */

import type { IBaseService } from "../../utils/decorators";

export interface AudioAnalysisData {
  tempo: number;
  beatPosition: number;
  frequencyBands: number[];
  volume: number;
}

export interface IAudioAnalysisService extends IBaseService {
  /**
   * Initialize the service and start listening for System.Audio.Ready event
   */
  initialize(): void;

  /**
   * Clean up resources and stop analysis loop
   */
  cleanup(): void;

  /**
   * Get current audio analysis data
   * @returns Current audio data or null if not ready
   */
  getCurrentAudioData(): AudioAnalysisData | null;

  /**
   * Check if analysis is currently running
   */
  isAnalyzing(): boolean;
}
