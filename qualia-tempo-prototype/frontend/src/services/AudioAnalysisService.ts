/**
 * QUALIA.CODE v2.0 - AudioAnalysisService
 * Real-time audio analysis service for tempo, beat detection, and frequency analysis.
 *
 * Architecture:
 * - Listens to System.Audio.Ready event to initialize audio analysis
 * - Uses Web Audio API AnalyserNode for frequency analysis
 * - Implements simple beat detection algorithm
 * - Emits AudioDataUpdatedEvent with analysis results
 * - Follows IBaseService pattern for lifecycle management
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { IAudioAnalysisService, AudioAnalysisData } from "./interfaces/IAudioAnalysisService";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { ITimerService } from "./interfaces/ITimerService";
import type { IWebAudioAPIService } from "./interfaces/IWebAudioAPIService";
import type { AudioAnalysisServiceConfig, AudioAnalysisServiceParams } from "./contracts/IAudioAnalysisService.contracts";
import type { AudioDataUpdatedEvent, SystemAudioReadyEvent } from "./contracts/events.contracts";
import {
  logMethod,
  catchError,
  OnEvent,
  IBaseService,
  initializeEventSubscriptions,
  cleanupEventSubscriptions,
} from "../utils/decorators";

@injectable()
export class AudioAnalysisService implements IAudioAnalysisService, IBaseService {
  private readonly config: AudioAnalysisServiceConfig;
  private readonly eventBus: IEventBus;
  private readonly logger: ILogger;
  private readonly timerService: ITimerService;
  private readonly webAudioService: IWebAudioAPIService;

  // @ts-expect-error - Reserved for @OnEvent decorator lifecycle management
  private _eventListeners: string[] = [];
  
  // Audio analysis state
  private analyserNode: AnalyserNode | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private isAudioReady = false;
  private analysisLoopId: number | null = null;
  
  // Beat detection state
  private lastBeatTime = 0;
  private beatHistory: number[] = [];
  private currentTempo = 120;
  private currentBeatPosition = 0;
  private lastUpdateTime = 0;

  constructor(
    @inject(TYPES.AudioAnalysisServiceParams) params: AudioAnalysisServiceParams
  ) {
    this.eventBus = params.eventBus;
    this.logger = params.logger;
    this.timerService = params.timerService;
    this.webAudioService = params.webAudioService;
    this.config = params.config;
    this.logger.info(this.config.messages.initialized);
  }

  @logMethod
  @catchError
  public initialize(): void {
    initializeEventSubscriptions(this);
    this.logger.info("AudioAnalysisService initialized and waiting for System.Audio.Ready event");
  }

  @logMethod
  @catchError
  public cleanup(): void {
    this.stopAnalysis();
    cleanupEventSubscriptions(this);
    this.logger.info("AudioAnalysisService cleaned up");
  }

  @logMethod
  public getCurrentAudioData(): AudioAnalysisData | null {
    if (!this.isAudioReady || !this.frequencyData) {
      return null;
    }

    return {
      tempo: this.currentTempo,
      beatPosition: this.currentBeatPosition,
      frequencyBands: this.getFrequencyBands(),
      volume: this.getVolume(),
    };
  }

  @logMethod
  public isAnalyzing(): boolean {
    return this.isAudioReady && this.analysisLoopId !== null;
  }

  // === PRIVATE METHODS ===

  /**
   * Event handler for System.Audio.Ready
   * Sets up audio analysis when audio context is ready
   */
  @OnEvent("System.Audio.Ready")
  @catchError
  // @ts-expect-error - Method used by @OnEvent decorator, false positive unused warning
  private onAudioReady(_event: SystemAudioReadyEvent): void {
    this.logger.info(this.config.messages.audioReady);
    this.setupAudioAnalysis();
  }

  /**
   * Setup AnalyserNode and start analysis loop
   */
  @catchError
  private setupAudioAnalysis(): void {
    try {
      const audioContext = this.webAudioService.getAudioContext();
      
      // Create analyser node
      this.analyserNode = audioContext.createAnalyser();
      this.analyserNode.fftSize = this.config.fftSize;
      this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
      this.analyserNode.minDecibels = this.config.minDecibels;
      this.analyserNode.maxDecibels = this.config.maxDecibels;

      // Create frequency data array
      const bufferLength = this.analyserNode.frequencyBinCount;
      this.frequencyData = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;

      // Connect analyser to audio context destination
      // Note: In a real implementation, you'd connect to your audio source
      // For now, we'll create a dummy source for demonstration
      const oscillator = audioContext.createOscillator();
      oscillator.connect(this.analyserNode);
      this.analyserNode.connect(audioContext.destination);
      oscillator.start();

      this.isAudioReady = true;
      this.startAnalysis();
    } catch (error) {
      this.logger.error("Failed to setup audio analysis:", error as Record<string, unknown>);
    }
  }

  /**
   * Start the analysis loop
   */
  @catchError
  private startAnalysis(): void {
    if (this.analysisLoopId !== null) {
      return; // Already running
    }

    this.logger.info(this.config.messages.analysisStarted);
    this.lastUpdateTime = performance.now();
    this.runAnalysisLoop();
  }

  /**
   * Stop the analysis loop
   */
  @catchError
  private stopAnalysis(): void {
    if (this.analysisLoopId !== null) {
      this.timerService.cancelAnimationFrame(this.analysisLoopId);
      this.analysisLoopId = null;
      this.logger.info(this.config.messages.analysisStopped);
    }
  }

  /**
   * Main analysis loop - runs on requestAnimationFrame
   */
  @catchError
  private runAnalysisLoop(): void {
    if (!this.isAudioReady || !this.analyserNode || !this.frequencyData) {
      return;
    }

    // Get frequency data
    this.analyserNode.getByteFrequencyData(this.frequencyData);

    // Detect beats
    if (this.config.enableBeatDetection) {
      this.detectBeat();
    }

    // Update beat position
    this.updateBeatPosition();

    // Emit event
    this.emitAudioDataEvent();

    // Schedule next frame
    this.analysisLoopId = this.timerService.requestAnimationFrame(() => {
      this.runAnalysisLoop();
    });
  }

  /**
   * Simple beat detection algorithm
   * Detects energy spikes in the frequency data
   */
  @catchError
  private detectBeat(): void {
    if (!this.frequencyData) return;

    const currentTime = performance.now();
    
    // Calculate average energy
    let sum = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
    }
    const average = sum / this.frequencyData.length;

    // Detect beat if energy is above threshold
    const normalizedEnergy = average / 255;
    const timeSinceLastBeat = currentTime - this.lastBeatTime;

    if (
      normalizedEnergy > this.config.beatThreshold &&
      timeSinceLastBeat > this.config.minBeatInterval
    ) {
      this.lastBeatTime = currentTime;
      this.beatHistory.push(currentTime);
      
      // Keep only recent beats
      const cutoffTime = currentTime - 5000; // Last 5 seconds
      this.beatHistory = this.beatHistory.filter(time => time > cutoffTime);

      // Estimate tempo
      if (this.config.enableTempoEstimation && this.beatHistory.length > 2) {
        this.estimateTempo();
      }

      this.currentBeatPosition = 0; // Reset beat position on beat
      this.logger.debug(this.config.messages.beatDetected);
    }
  }

  /**
   * Estimate tempo from beat history
   */
  @catchError
  private estimateTempo(): void {
    if (this.beatHistory.length < 2) return;

    // Calculate average interval between beats
    let totalInterval = 0;
    for (let i = 1; i < this.beatHistory.length; i++) {
      totalInterval += this.beatHistory[i] - this.beatHistory[i - 1];
    }
    const avgInterval = totalInterval / (this.beatHistory.length - 1);

    // Convert to BPM
    const bpm = 60000 / avgInterval;
    
    // Smooth the tempo change
    this.currentTempo = this.currentTempo * 0.9 + bpm * 0.1;
  }

  /**
   * Update beat position based on elapsed time
   */
  @catchError
  private updateBeatPosition(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    // Calculate beat duration in ms
    const beatDuration = 60000 / this.currentTempo;

    // Update beat position (0-1)
    this.currentBeatPosition += deltaTime / beatDuration;
    this.currentBeatPosition %= 1; // Wrap to 0-1
  }

  /**
   * Get frequency bands for visualization
   */
  @catchError
  private getFrequencyBands(): number[] {
    if (!this.frequencyData) {
      return new Array(this.config.frequencyBands).fill(0);
    }

    const bands: number[] = [];
    const binCount = this.frequencyData.length;
    const binsPerBand = Math.floor(binCount / this.config.frequencyBands);

    for (let i = 0; i < this.config.frequencyBands; i++) {
      let sum = 0;
      const start = i * binsPerBand;
      const end = start + binsPerBand;
      
      for (let j = start; j < end && j < binCount; j++) {
        sum += this.frequencyData[j];
      }
      
      // Normalize to 0-1
      bands.push(sum / (binsPerBand * 255));
    }

    return bands;
  }

  /**
   * Calculate current volume level
   */
  @catchError
  private getVolume(): number {
    if (!this.frequencyData) {
      return 0;
    }

    let sum = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
    }
    
    return sum / (this.frequencyData.length * 255);
  }

  /**
   * Emit audio data event
   */
  @catchError
  private emitAudioDataEvent(): void {
    const event: AudioDataUpdatedEvent = {
      type: "AudioDataUpdated",
      tempo: this.currentTempo,
      beatPosition: this.currentBeatPosition,
      frequencyBands: this.getFrequencyBands(),
      volume: this.getVolume(),
      source: "AudioAnalysisService",
      timestamp: new Date(),
    };

    this.eventBus.emit(event);
  }
}
