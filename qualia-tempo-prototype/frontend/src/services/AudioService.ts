import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import { EventBus } from "./EventBus";
import type { QualiaStateCalculatedEvent } from "./contracts/events.contracts";
import type { IOntologicalAudioEngine } from "../audio/IOntologicalAudioEngine";
import type { QualiaState } from "../types/contracts";
import { logMethod, catchError, measureTime } from "../utils/decorators";
import { QualiaLogger } from "./Logger";

import type { IAudioService } from "./interfaces/IAudioService";
import type { AudioServiceConfig } from "./contracts/IAudioService.contracts";
import type { IWebAudioAPIService } from "./interfaces/IWebAudioAPIService";
import type { ITimerService } from "./interfaces/ITimerService";

/**
 * AudioService - QUALIA.CODE compliant service for audio management
 */
@injectable()
export class AudioService implements IAudioService {
  private audioEngine: IOntologicalAudioEngine;
  private eventBus: EventBus;
  private logger: QualiaLogger;
  private config: AudioServiceConfig;
  private webAudioAPIService: IWebAudioAPIService;
  private timerService: ITimerService;
  private qualiaStateListenerId: string | null = null;
  private isInitialized: boolean = false;

  constructor(
    @inject(TYPES.IEventBus) eventBus: EventBus,
    @inject(TYPES.ILogger) logger: QualiaLogger,
    @inject(TYPES.AudioServiceConfig) config: AudioServiceConfig,
    @inject(TYPES.IOntologicalAudioEngine) audioEngine: IOntologicalAudioEngine,
    @inject(TYPES.IWebAudioAPIService) webAudioAPIService: IWebAudioAPIService,
    @inject(TYPES.ITimerService) timerService: ITimerService,
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.config = config;
    this.audioEngine = audioEngine;
    this.webAudioAPIService = webAudioAPIService;
    this.timerService = timerService;
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

    const listenerId = this.eventBus.subscribe<QualiaStateCalculatedEvent>(
      "QualiaStateCalculated",
      this.handleQualiaStateUpdate.bind(this),
    );
    this.qualiaStateListenerId = listenerId;

    this.isInitialized = true;
    this.logger.info("✅ AudioService initialized successfully");
  }

  @logMethod
  @catchError
  public async stop(): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn("AudioService not initialized, nothing to stop");
      return;
    }

    // Unsubscribe from events
    if (this.qualiaStateListenerId) {
      this.eventBus.unsubscribe(this.qualiaStateListenerId);
      this.qualiaStateListenerId = null;
    }

    // Clean up audio engine
    this.isInitialized = false;

    this.logger.info("✅ AudioService stopped successfully");
  }

  @logMethod
  public isRunning(): boolean {
    return this.isInitialized;
  }

  @logMethod
  @catchError
  public getStatus(): { running: boolean; engine: boolean } {
    return {
      running: this.isInitialized,
      engine: this.isInitialized && this.audioEngine !== null,
    };
  }

  @logMethod
  @catchError
  private handleQualiaStateUpdate(event: QualiaStateCalculatedEvent): void {
    // Use the real qualiaState from frontend calculation
    const { qualiaState } = event;

    this.audioEngine.updateEntitySound("player", qualiaState);
    
    this.logger.debug(
      "🎵 [AudioService] QualiaState calculated from player actions:",
      qualiaState
    );

    // Patrón emergente basado en el estado
    if (qualiaState.transcendence > 0.8) {
      const emergentBehavior = {
        type: "NARRATIVE_EVENT" as const,
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
      intensity: 0.5,
      precision: 0.5,
      aggression: 0.0,
      flow: 0.5,
      chaos: 0.0,
      recovery: 0.0,
      transcendence: 0.0,
    };

    this.audioEngine.createEntityVoice("player", baseState);
    this.audioEngine.createEntityVoice("boss", baseState);
    this.audioEngine.createEntityVoice("environment", baseState);

    // Setup rhythmic feedback listeners
    this.setupRhythmicFeedback();
  }

  @logMethod
  @catchError
  private setupRhythmicFeedback(): void {
    // Listen for rhythmic dash events to provide audio feedback
    this.eventBus.subscribe<any>("RhythmicDash", (event) => {
      this.playRhythmicFeedback(event.timing);
    });

    // Listen for metronome ticks for beat audio
    this.eventBus.subscribe<any>("MetronomeTick", (_event) => {
      this.playMetronomeTick();
    });
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
        feedbackConfig.duration / 1000, // duration in seconds
        feedbackConfig.gain,
        "sine"
      );

      this.logger.info(`🔊 Rhythmic feedback: ${timing}`);
    } catch (error) {
      this.logger.error("Failed to play rhythmic feedback:", { error });
    }
  }

  @logMethod
  @catchError
  public playMetronomeTick(): void {
    if (!this.audioEngine || !this.isInitialized) {
      return; // Silent fail for metronome - not critical
    }

    try {
      this.webAudioAPIService.playTone(
        this.config.metronome.frequency,
        this.config.metronome.duration,
        this.config.metronome.gain,
        "square"
      );
    } catch (error) {
      // Silent fail for metronome
    }
  }

  @logMethod
  @catchError
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

    const volume = options?.volume ?? 1.0;
    const loop = options?.loop ?? false;

    try {
      const frequency = this.getSoundFrequency(soundId);
      const gain = volume * this.config.volume;
      const duration = loop ? 0 : this.config.defaultSoundDuration; // For loop, duration is ignored

      this.webAudioAPIService.playTone(
        frequency,
        duration,
        gain,
        "sine",
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
  @catchError
  public setMasterVolume(volume: number): void {
    // Update the configuration service with new volume
    this.logger.warn(
      `Attempted to set master volume to ${volume}. This is a read-only value. Please modify the volume in audio-service.yaml and restart.`
    );
    // DO NOT MODIFY this.config.volume
  }

  @logMethod
  @catchError
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
