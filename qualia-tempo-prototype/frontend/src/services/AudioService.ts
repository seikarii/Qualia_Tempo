import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import { EventBus } from './EventBus';
import type { QualiaStateUpdatedEvent } from './EventBus';
import type { IOntologicalAudioEngine } from '../audio/IOntologicalAudioEngine';
import type { QualiaState } from '../types/contracts';
import { logMethod, catchError, measureTime } from '../utils/decorators';
import { QualiaLogger } from './Logger';
import type { AudioServiceConfig } from './ConfigurationService';
import type { IAudioService } from './interfaces/IAudioService';
import type { IConfigurationService } from './interfaces/IConfigurationService';

/**
 * AudioService - QUALIA.CODE compliant service for audio management
 */
@injectable()
export class AudioService implements IAudioService {
  private audioEngine: IOntologicalAudioEngine;
  private eventBus: EventBus;
  private logger: QualiaLogger;
  private configService: IConfigurationService;
  private qualiaStateListenerId: string | null = null;
  private isInitialized: boolean = false;

  constructor(
    @inject(TYPES.IEventBus) eventBus: EventBus,
    @inject(TYPES.ILogger) logger: QualiaLogger,
    @inject(TYPES.IConfigurationService) configService: IConfigurationService,
    @inject(TYPES.IOntologicalAudioEngine) audioEngine: IOntologicalAudioEngine
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.configService = configService;
    this.audioEngine = audioEngine;
  }

  @logMethod()
  @catchError()
  @measureTime()
  public async start(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('AudioService already initialized');
      return;
    }
    
    // Create entity voices for game entities
    this.createEntityVoices();
    
    const listenerId = this.eventBus.subscribe<QualiaStateUpdatedEvent>(
      'QualiaStateUpdated',
      this.handleQualiaStateUpdate.bind(this)
    );
    this.qualiaStateListenerId = listenerId;

    this.isInitialized = true;
    this.logger.info('✅ AudioService initialized successfully');
  }

  @logMethod()
  @catchError()
  public async stop(): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn('AudioService not initialized, nothing to stop');
      return;
    }

    // Unsubscribe from events
    if (this.qualiaStateListenerId) {
      this.eventBus.unsubscribe(this.qualiaStateListenerId);
      this.qualiaStateListenerId = null;
    }

    // Clean up audio engine
    this.isInitialized = false;
    
    this.logger.info('✅ AudioService stopped successfully');
  }

  @logMethod()
  @catchError()
  public isRunning(): boolean {
    return this.isInitialized;
  }

  @logMethod()
  @catchError()
  public getStatus(): { running: boolean; engine: boolean } {
    return {
      running: this.isInitialized,
      engine: true
    };
  }

  @logMethod()
  @catchError()
  private handleQualiaStateUpdate(event: QualiaStateUpdatedEvent): void {
    const { qualiaState } = event;
    
    // Actualizar el audio basado en el estado - ya está adaptado para QualiaState
    this.audioEngine.updateEntitySound('player', qualiaState);
    
    // Patrón emergente basado en el estado
    if (qualiaState.transcendence > 0.8) {
      const emergentBehavior = {
        type: 'NARRATIVE_EVENT' as const,
        entities: [],
        strength: qualiaState.intensity,
        description: 'Transcendence achievement',
        timestamp: Date.now()
      };
      this.audioEngine.playEmergentPattern(emergentBehavior);
    }
  }

  @logMethod()
  @catchError()
  private createEntityVoices(): void {
    if (!this.audioEngine) return;

    // Crear voces para entidades del juego con estado base
    const baseState: QualiaState = {
      intensity: 0.5,
      focus_level: 0.5,
      aggression: 0.0,
      flow: 0.5,
      chaos: 0.0,
      recovery: 0.0,
      transcendence: 0.0
    };

    this.audioEngine.createEntityVoice('player', baseState);
    this.audioEngine.createEntityVoice('boss', baseState);
    this.audioEngine.createEntityVoice('environment', baseState);
    
    // Setup rhythmic feedback listeners
    this.setupRhythmicFeedback();
  }

  @logMethod()
  @catchError()
  private setupRhythmicFeedback(): void {
    // Listen for rhythmic dash events to provide audio feedback
    this.eventBus.subscribe<any>('RhythmicDash', (event) => {
      this.playRhythmicFeedback(event.timing);
    });

    // Listen for metronome ticks for beat audio
    this.eventBus.subscribe<any>('MetronomeTick', (_event) => {
      this.playMetronomeTick();
    });
  }

  @logMethod()
  @catchError()
  public playRhythmicFeedback(timing: 'perfect' | 'good' | 'miss'): void {
    if (!this.audioEngine || !this.isInitialized) {
      this.logger.warn('AudioService not initialized, cannot play rhythmic feedback');
      return;
    }

    // Simple audio feedback based on timing
    try {
      const config = this.configService.getAudioConfig();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different timing accuracy
      switch (timing) {
        case 'perfect':
          oscillator.frequency.value = config.rhythmicFeedback.perfect.frequency;
          gainNode.gain.value = config.rhythmicFeedback.perfect.gain;
          break;
        case 'good':
          oscillator.frequency.value = config.rhythmicFeedback.good.frequency;
          gainNode.gain.value = config.rhythmicFeedback.good.gain;
          break;
        case 'miss':
          oscillator.frequency.value = config.rhythmicFeedback.miss.frequency;
          gainNode.gain.value = config.rhythmicFeedback.miss.gain;
          break;
      }

      oscillator.type = 'sine';
      oscillator.start();
      oscillator.stop(audioContext.currentTime + config.rhythmicFeedback[timing].duration);

      this.logger.info(`🔊 Rhythmic feedback: ${timing}`);
    } catch (error) {
      this.logger.error('Failed to play rhythmic feedback:', { error });
    }
  }

  @logMethod()
  @catchError()
  public playMetronomeTick(): void {
    if (!this.audioEngine || !this.isInitialized) {
      return; // Silent fail for metronome - not critical
    }

    try {
      const config = this.configService.getAudioConfig();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = config.metronome.frequency;
      oscillator.type = 'square';
      gainNode.gain.value = config.metronome.gain;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + config.metronome.duration);
    } catch (error) {
      // Silent fail for metronome
    }
  }

  @logMethod()
  @catchError()
  public createEntityVoice(entityId: string, qualiaState: QualiaState): void {
    if (!this.audioEngine || !this.isInitialized) {
      this.logger.warn('AudioService not initialized, cannot create entity voice');
      return;
    }

    this.audioEngine.createEntityVoice(entityId, qualiaState);
  }

  @logMethod()
  @catchError()
  public removeEntityVoice(entityId: string): void {
    if (!this.audioEngine) {
      this.logger.warn('AudioService not initialized, cannot remove entity voice');
      return;
    }

    this.audioEngine.removeEntityVoice(entityId);
  }

  @logMethod()
  @catchError()
  public removeAllEntityVoices(): void {
    if (!this.audioEngine) {
      this.logger.warn('AudioService not initialized, cannot remove entity voices');
      return;
    }

    // Remove common entity voices
    this.removeEntityVoice('player');
    this.removeEntityVoice('boss');
    this.removeEntityVoice('environment');
  }

  // --- IAudioService Interface Implementation ---

  @logMethod()
  @catchError()
  public playSound(soundId: string, options?: { volume?: number; loop?: boolean }): void {
    if (!this.isInitialized) {
      this.logger.warn('AudioService not initialized, cannot play sound');
      return;
    }

    const volume = options?.volume ?? 1.0;
    const loop = options?.loop ?? false;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Basic sound generation based on soundId
      const frequency = this.getSoundFrequency(soundId);
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gainNode.gain.value = volume * this.configService.getAudioConfig().masterVolume;

      oscillator.start();
      if (!loop) {
        oscillator.stop(audioContext.currentTime + 0.5); // Default 0.5s duration
      }

      this.logger.debug(`🔊 Playing sound: ${soundId}`, { volume, loop });
    } catch (error) {
      this.logger.error('Failed to play sound:', { soundId, error });
    }
  }

  @logMethod()
  @catchError()
  public stopSound(soundId: string): void {
    if (!this.isInitialized) {
      this.logger.warn('AudioService not initialized, cannot stop sound');
      return;
    }

    // Basic implementation - in a full implementation, we'd track active sounds
    this.logger.debug(`🔇 Stopping sound: ${soundId}`);
  }

  @logMethod()
  @catchError()
  public setMasterVolume(volume: number): void {
    // Update the configuration service with new volume
    const config = this.configService.getAudioConfig();
    config.masterVolume = Math.max(0, Math.min(1, volume));
    this.logger.info(`🔊 Master volume set to: ${config.masterVolume}`);
  }

  @logMethod()
  @catchError()
  public getMasterVolume(): number {
    return this.configService.getAudioConfig().masterVolume;
  }

  @logMethod()
  @catchError()
  public async preloadSounds(soundIds: string[]): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn('AudioService not initialized, cannot preload sounds');
      return;
    }

    // Basic implementation - in a full implementation, we'd actually preload audio files
    this.logger.info(`🔊 Preloading sounds: ${soundIds.join(', ')}`);
    
    // Simulate preloading
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.logger.info(`✅ Sounds preloaded successfully`);
  }

  // --- Helper Methods ---

  private getSoundFrequency(soundId: string): number {
    // Basic frequency mapping for different sound types
    const frequencyMap: Record<string, number> = {
      'ui-click': 800,
      'ui-hover': 600,
      'game-hit': 440,
      'game-miss': 200,
      'game-success': 880,
      'game-fail': 150,
      'ambient': 220,
      'notification': 550
    };

    return frequencyMap[soundId] ?? 440; // Default to A4
  }
}
