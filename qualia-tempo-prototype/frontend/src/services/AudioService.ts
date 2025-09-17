import { EventBus } from './EventBus';
import type { QualiaStateUpdatedEvent } from './EventBus';
import { OntologicalAudioEngine } from '../audio/OntologicalAudioEngine';
import type { QualiaState } from '../types/contracts';
import { logMethod, catchError, measureTime } from '../utils/decorators';
import { QualiaLogger } from './Logger';
import { AudioServiceConfig } from './ConfigurationService';

/**
 * AudioService - QUALIA.CODE compliant service for audio management
 */
export class AudioService {
  private audioEngine: OntologicalAudioEngine | null = null;
  private eventBus: EventBus;
  private logger: QualiaLogger;
  private qualiaStateListenerId: string | null = null;
  private isInitialized: boolean = false;
  private config: AudioServiceConfig;

  constructor(
    eventBus: EventBus,
    logger: QualiaLogger,
    config: AudioServiceConfig
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.config = config;
  }

  @logMethod()
  @catchError()
  @measureTime()
  public async start(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('AudioService already initialized');
      return;
    }

    this.audioEngine = new OntologicalAudioEngine();
    
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
    this.audioEngine = null;
    this.isInitialized = false;
    
    this.logger.info('✅ AudioService stopped successfully');
  }

  @logMethod()
  @catchError()
  public isRunning(): boolean {
    return this.isInitialized && this.audioEngine !== null;
  }

  @logMethod()
  @catchError()
  public getStatus(): { running: boolean; engine: boolean } {
    return {
      running: this.isInitialized,
      engine: this.audioEngine !== null
    };
  }

  @logMethod()
  @catchError()
  private handleQualiaStateUpdate(event: QualiaStateUpdatedEvent): void {
    if (!this.audioEngine) return;

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
      precision: 0.5,
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
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different timing accuracy
      switch (timing) {
        case 'perfect':
          oscillator.frequency.value = this.config.rhythmicFeedback.perfect.frequency;
          gainNode.gain.value = this.config.rhythmicFeedback.perfect.gain;
          break;
        case 'good':
          oscillator.frequency.value = this.config.rhythmicFeedback.good.frequency;
          gainNode.gain.value = this.config.rhythmicFeedback.good.gain;
          break;
        case 'miss':
          oscillator.frequency.value = this.config.rhythmicFeedback.miss.frequency;
          gainNode.gain.value = this.config.rhythmicFeedback.miss.gain;
          break;
      }

      oscillator.type = 'sine';
      oscillator.start();
      oscillator.stop(audioContext.currentTime + this.config.rhythmicFeedback[timing].duration);

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
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = this.config.metronome.frequency;
      oscillator.type = 'square';
      gainNode.gain.value = this.config.metronome.gain;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + this.config.metronome.duration);
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
}
