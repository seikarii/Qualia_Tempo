/**
 * QUALIA.CODE v2.0 - AudioAnalysisService Configuration Contract
 * Configuration interface for audio analysis parameters.
 */

import type { IEventBus } from "../interfaces/IEventBus";
import type { ILogger } from "../interfaces/ILogger";
import type { ITimerService } from "../interfaces/ITimerService";
import type { IWebAudioAPIService } from "../interfaces/IWebAudioAPIService";

/**
 * Dependency injection parameters for AudioAnalysisService
 * Used to comply with max-params ESLint rule
 */
export interface AudioAnalysisServiceParams {
  eventBus: IEventBus;
  logger: ILogger;
  timerService: ITimerService;
  webAudioService: IWebAudioAPIService;
  config: AudioAnalysisServiceConfig;
}

export interface AudioAnalysisServiceConfig {
  /** Number of frequency bands to analyze (default: 8) */
  frequencyBands: number;
  
  /** FFT size for frequency analysis (powers of 2: 256, 512, 1024, etc.) */
  fftSize: number;
  
  /** Smoothing time constant for frequency data (0-1) */
  smoothingTimeConstant: number;
  
  /** Minimum decibel level for frequency analysis */
  minDecibels: number;
  
  /** Maximum decibel level for frequency analysis */
  maxDecibels: number;
  
  /** Beat detection threshold (0-1) */
  beatThreshold: number;
  
  /** Minimum time between beats in milliseconds */
  minBeatInterval: number;
  
  /** Update interval in milliseconds (typically 1000/60 for 60fps) */
  updateInterval: number;
  
  /** Enable beat detection */
  enableBeatDetection: boolean;
  
  /** Enable tempo estimation */
  enableTempoEstimation: boolean;
  
  /** Messages for logging */
  messages: {
    initialized: string;
    audioReady: string;
    analysisStarted: string;
    analysisStopped: string;
    beatDetected: string;
  };
}
