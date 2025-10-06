import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { QualiaStateCalculatedEvent, RhythmicDashEvent, MetronomeTickEvent } from "./contracts/events.contracts";
import type { IOntologicalAudioEngine } from "../audio/IOntologicalAudioEngine";
import type { QualiaState } from "../types/contracts";
import { logMethod, catchError, measureTime, validate, IBaseService, OnEvent, initializeEventSubscriptions, cleanupEventSubscriptions } from "../utils/decorators";
import { AUDIO_WAVEFORM_TYPES, AUDIO_EVENT_TYPES, type AudioWaveformType } from "./contracts/constants";

import type { IAudioService } from "./interfaces/IAudioService";
import type { AudioServiceConfig, AudioServiceParams } from "./contracts/IAudioService.contracts";
import type { IWebAudioAPIService } from "./interfaces/IWebAudioAPIService";
import type { ITimerService } from "./interfaces/ITimerService";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";

/**
 * AudioService - QUALIA.CODE compliant service for audio management
 */
@injectable()
export class AudioService implements IAudioService, IBaseService {
  private audioEngine: IOntologicalAudioEngine;
  private eventBus: IEventBus;
  private logger: ILogger;
  private config: AudioServiceConfig;
  private webAudioAPIService: IWebAudioAPIService;
  private timerService: ITimerService;
  private isInitialized: boolean = false;
  private isAudioContextStarted: boolean = false;
  private currentQualiaState: QualiaState | null = null;

  // @ts-expect-error - Utilizado por el ciclo de vida del decorador @OnEvent
  private _eventListeners: string[] = [];

  constructor(
    @inject(TYPES.AudioServiceParams) params: AudioServiceParams,
  ) {
    this.eventBus = params.eventBus;
    this.logger = params.logger;
    this.config = params.config;
    this.audioEngine = params.audioEngine;
    this.webAudioAPIService = params.webAudioAPIService;
    this.timerService = params.timerService;
  }

  @logMethod
  @catchError
  @measureTime
  public async start(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn("AudioService already initialized");
      return;
    }

    // Create entity voices for game entities
    this.createEntityVoices();

    this.isInitialized = true;
  }

  @logMethod
  @catchError
  public async stop(): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn("AudioService not initialized, nothing to stop");
      return;
    }

    // Clean up audio engine
    this.isInitialized = false;
  }

  @logMethod
  public initialize(): void {
    // Activa todas las suscripciones de eventos declaradas con @OnEvent
    initializeEventSubscriptions(this);
  }

  @logMethod
  public cleanup(): void {
    // Limpia todas las suscripciones de eventos para prevenir memory leaks
    cleanupEventSubscriptions(this);
  }

  /**
   * QUALIA.CODE v1.1: Platform Abstraction for Audio Context
   * Uses IWebAudioAPIService.startContext() instead of direct Tone.start()
   * This maintains platform abstraction and enables complete testing.
   */
  @logMethod
  @catchError
  public async initializeAudioContext(): Promise<void> {
    if (this.isAudioContextStarted) return;

    try {
      // QUALIA.CODE v1.1: Use abstracted startContext() method
      await this.webAudioAPIService.startContext();
      this.isAudioContextStarted = true;
      this.logger.info("AudioContext started successfully after user gesture.");
      this.eventBus.emit({ type: 'System.Audio.Ready' });
    } catch (error) {
      this.logger.error("Failed to start AudioContext", { error });
    }
  }

  @logMethod
  public isRunning(): boolean {
    return this.isInitialized;
  }

  @logMethod
  public getStatus(): { running: boolean; engine: boolean } {
    return {
      running: this.isInitialized,
      engine: this.isInitialized && this.audioEngine !== null,
    };
  }

  @catchError
  @OnEvent('QualiaStateCalculated')
  // @ts-expect-error - Method used by @OnEvent decorator but TypeScript cannot detect it
  private handleQualiaStateUpdate(event: QualiaStateCalculatedEvent): void {
    // Use the real qualiaState from frontend calculation
    const { qualiaState } = event;
    const qualiaStateRecord = qualiaState as unknown as Record<string, unknown>;

    // CRITICAL FIX: Store current qualia state for metronome
    this.currentQualiaState = qualiaState;
    this.logger.info(`🔊 [AudioService] Qualia state updated: intensity=${qualiaState.intensity.toFixed(2)}, flow=${qualiaState.flow.toFixed(2)}`);

    this.audioEngine.updateEntitySound("player", qualiaStateRecord);
    
    this.logger.debug(
      "🎵 [AudioService] QualiaState calculated from player actions:",
      qualiaState as unknown as Record<string, unknown>
    );

    // Patrón emergente basado en el estado
    if (qualiaState.transcendence > this.config.transcendenceThreshold) {
      const emergentBehavior = {
        type: this.config.emergentEventType as typeof AUDIO_EVENT_TYPES.NARRATIVE_EVENT,
        entities: [],
        strength: qualiaState.intensity,
        description: "Transcendence achievement",
        timestamp: this.timerService.now(),
      };
      this.audioEngine.playEmergentPattern(emergentBehavior);
    }
  }

  @logMethod
  @catchError
  private createEntityVoices(): void {
    if (!this.audioEngine) return;

    // Crear voces para entidades del juego con estado base
    const baseState: QualiaState = {
      intensity: this.config.baseQualiaState.intensity,
      precision: this.config.baseQualiaState.precision,
      aggression: this.config.baseQualiaState.aggression,
      flow: this.config.baseQualiaState.flow,
      chaos: this.config.baseQualiaState.chaos,
      recovery: this.config.baseQualiaState.recovery,
      transcendence: this.config.baseQualiaState.transcendence,
      collectionWindowEnd: 0, // No collection window for entity voices
    };

    this.audioEngine.createEntityVoice("player", baseState);
    this.audioEngine.createEntityVoice("boss", baseState);
    this.audioEngine.createEntityVoice("environment", baseState);

    // Setup rhythmic feedback listeners - REMOVED: Now handled by @OnEvent decorators
  }

  @catchError
  @OnEvent('RhythmicDash')
  // @ts-expect-error - Method used by @OnEvent decorator but TypeScript cannot detect it
  private _handleRhythmicDash(event: RhythmicDashEvent): void {
    this.playRhythmicFeedback(event.timing);
  }

  @catchError
  @OnEvent('MetronomeTick')
  // @ts-expect-error - Method used by @OnEvent decorator but TypeScript cannot detect it
  private _handleMetronomeTick(_event: MetronomeTickEvent): void {
    this.playMetronomeTick();
  }

  @logMethod
  @catchError
  public playRhythmicFeedback(timing: "perfect" | "good" | "miss"): void {
    if (!this.audioEngine || !this.isInitialized) {
      this.logger.warn(this.config.messages.audioNotInitialized);
      return;
    }

    // Simple audio feedback based on timing
    try {
      const feedbackConfig = this.config.rhythmicFeedback[timing];
      this.webAudioAPIService.playTone(
        feedbackConfig.frequency,
        feedbackConfig.duration / this.config.millisecondsToSecondsConversion, // duration in seconds
        feedbackConfig.gain,
        feedbackConfig.waveform as AudioWaveformType
      );

      this.logger.info(`🔊 Rhythmic feedback: ${timing}`);
    } catch (error) {
      this.logger.error("Failed to play rhythmic feedback:", { error });
    }
  }

  @logMethod
  public playMetronomeTick(): void {
    if (!this.audioEngine || !this.isInitialized) {
      return; // Silent fail for metronome - not critical
    }

    // CRITICAL FIX: Vary metronome frequency based on qualia state
    let frequency = this.config.metronome.frequency;
    
    if (this.currentQualiaState) {
      // Modulate frequency based on intensity (±20%)
      const intensityModulation = 1 + (this.currentQualiaState.intensity - 0.5) * 0.4;
      // Modulate frequency based on flow (pitch variation)
      const flowModulation = 1 + (this.currentQualiaState.flow - 0.5) * 0.3;
      // Combine modulations
      frequency = this.config.metronome.frequency * intensityModulation * flowModulation;
      
      // QUALIA.CODE: Use externalized configuration for frequency limits
      frequency = Math.max(
        this.config.metronome.minFrequency, 
        Math.min(this.config.metronome.maxFrequency, frequency)
      );
      
      this.logger.info(`🎵 [AudioService] Metronome tick: ${frequency.toFixed(0)}Hz (base=${this.config.metronome.frequency}, intensity=${this.currentQualiaState.intensity.toFixed(2)}, flow=${this.currentQualiaState.flow.toFixed(2)})`);
    } else {
      this.logger.warn(`⚠️ [AudioService] No qualia state available, using default ${frequency}Hz`);
    }

    this.webAudioAPIService.playTone(
      frequency,
      this.config.metronome.duration,
      this.config.metronome.gain,
      this.config.metronome.waveform as AudioWaveformType
    );
  }

  @logMethod
  @catchError
  @validate('QualiaState')
  public createEntityVoice(entityId: string, qualiaState: QualiaState): void {
    if (!this.audioEngine || !this.isInitialized) {
      const audioConfig = this.config;
      this.logger.warn(audioConfig.messages.cannotCreateEntityVoice);
      return;
    }

    this.audioEngine.createEntityVoice(entityId, qualiaState);
  }

  @logMethod
  @catchError
  public removeEntityVoice(entityId: string): void {
    if (!this.audioEngine) {
      const audioConfig = this.config;
      this.logger.warn(audioConfig.messages.cannotRemoveEntityVoice);
      return;
    }

    this.audioEngine.removeEntityVoice(entityId);
  }

  @logMethod
  @catchError
  public removeAllEntityVoices(): void {
    if (!this.audioEngine) {
      const audioConfig = this.config;
      this.logger.warn(audioConfig.messages.cannotRemoveEntityVoices);
      return;
    }

    // Remove common entity voices
    const audioConfig = this.config;
    audioConfig.entityVoices.defaultEntities.forEach((entityId: string) => {
      this.removeEntityVoice(entityId);
    });
  }

  // --- IAudioService Interface Implementation ---

  @logMethod
  @catchError
  public playSound(
    soundId: string,
    options?: { volume?: number; loop?: boolean },
  ): void {
    if (!this.isInitialized) {
      this.logger.warn("AudioService not initialized, cannot play sound");
      return;
    }

    const volume = options?.volume ?? this.config.defaultVolume;
    const loop = options?.loop ?? false;

    try {
      const frequency = this.getSoundFrequency(soundId);
      const gain = volume * this.config.volume;
      const duration = loop ? 0 : this.config.defaultSoundDuration; // For loop, duration is ignored

      // Use default waveform from config (sine is a good default for general sounds)
      this.webAudioAPIService.playTone(
        frequency,
        duration,
        gain,
        AUDIO_WAVEFORM_TYPES.SINE as AudioWaveformType,
        loop
      );

      this.logger.debug(`🔊 Playing sound: ${soundId}`, { volume, loop });
    } catch (error) {
      this.logger.error("Failed to play sound:", { soundId, error });
    }
  }

  @logMethod
  @catchError
  public stopSound(soundId: string): void {
    if (!this.isInitialized) {
      this.logger.warn("AudioService not initialized, cannot stop sound");
      return;
    }

    // Basic implementation - in a full implementation, we'd track active sounds
    this.logger.debug(`🔇 Stopping sound: ${soundId}`);
  }

  @logMethod
  public getMasterVolume(): number {
    return this.config.volume;
  }

  @logMethod
  @catchError
  public async preloadSounds(soundIds: string[]): Promise<void> {
    if (!this.isInitialized) {
      const audioConfig = this.config;
      this.logger.warn(audioConfig.messages.cannotPreloadSounds);
      return;
    }

    // Basic implementation - in a full implementation, we'd actually preload audio files
    const audioConfig = this.config;
    this.logger.info(`${audioConfig.messages.preloadingSounds} ${soundIds.join(", ")}`);

    // Simulate preloading
    await new Promise((resolve) => this.timerService.setTimeout(() => resolve(undefined), audioConfig.preloadSimulationDelay));

    this.logger.info(audioConfig.messages.soundsPreloaded);
  }

  // --- Helper Methods ---

  private getSoundFrequency(soundId: string): number {
    const audioConfig = this.config;
    return audioConfig.soundFrequencies[soundId] ?? audioConfig.defaultFrequency;
  }
}
