import * as Tone from "tone";
import { injectable, inject } from "inversify";
import { TYPES } from "../services/inversify.types";
import type { ILogger } from "../services/interfaces/ILogger";
import type { ITimerService } from "../services/interfaces/ITimerService";
import type { QualiaState } from "../types/contracts";
import type {
  IOntologicalAudioEngine,
  EmergentBehavior,
} from "./IOntologicalAudioEngine";
import type { IToneFactoryService } from "./interfaces/IToneFactoryService";
import { logMethod, catchError, OnEvent, IBaseService } from "../utils/decorators";

export type OscillatorType =
  | "sine"
  | "triangle"
  | "sawtooth"
  | "square"
  | "pulse";

/**
 * QUALIA.CODE v1.1 - OntologicalAudioEngine Service
 * Audio engine that generates sound based on ontological states.
 */
@injectable()
export class OntologicalAudioEngine implements IOntologicalAudioEngine, IBaseService {
  private readonly logger: ILogger;
  private readonly timerService: ITimerService;
  private readonly toneFactory: IToneFactoryService;
  private isEngineReady: boolean = false;
  private synthPool: Map<string, Tone.PolySynth> = new Map();
  private globalReverb: Tone.Reverb | null = null;
  private globalDelay: Tone.FeedbackDelay | null = null;
  private masterVolume: Tone.Volume | null = null;

  // QUALIA.CODE v1.1: Required for @OnEvent lifecycle
  public _eventListeners: string[] = [];

  constructor(
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.ITimerService) timerService: ITimerService,
    @inject(TYPES.IToneFactoryService) toneFactory: IToneFactoryService
  ) {
    this.logger = logger;
    this.timerService = timerService;
    this.toneFactory = toneFactory;

    // NO inicializar nodos de Tone.js aquí.
    this.logger.info("OntologicalAudioEngine constructed. Waiting for AudioContext...");
  }

  /**
   * MÉTODO CRÍTICO: Contiene toda la lógica de creación de nodos de Tone.js.
   * Solo se ejecuta DESPUÉS de que el AudioContext esté activo.
   * NOTE: Public because @OnEvent decorator registers it as event handler.
   */
  @logMethod
  @OnEvent('System.Audio.Ready')
  public _initializeEngine(): void {
    if (this.isEngineReady) return;

    this.logger.info("AudioContext is ready. Initializing OntologicalAudioEngine nodes...");

    // AHORA es seguro crear los nodos de audio.
    this.globalReverb = this.toneFactory.createReverb({
      decay: 1.5,
      wet: 0.45,
    });

    this.globalDelay = this.toneFactory.createFeedbackDelay({
      delayTime: "8n",
      feedback: 0.28,
      wet: 0.18,
    });

    this.masterVolume = this.toneFactory.createVolume({ volume: -8 });

    // Cadena de efectos
    this.globalDelay.connect(this.globalReverb);
    this.globalReverb.connect(this.masterVolume);
    this.masterVolume.toDestination();

    this.isEngineReady = true;
    this.logger.info("✅ OntologicalAudioEngine initialized successfully.");
  }

  /**
   * Crea una voz musical para una entidad basada en su estado qualia.
   */
  @logMethod
  @catchError
  // @validate-exempt: QualiaState validated at emission by QualiaStateCalculatorService
  public createEntityVoice(entityId: string, qualiaState: QualiaState): void {
    // AÑADIR ESTA GUARDIA
    if (!this.isEngineReady) {
      this.logger.warn(`Cannot create voice for ${entityId}. Engine not ready.`);
      return;
    }

    if (this.synthPool.has(entityId)) return;

    const synth = this.toneFactory.createPolySynth({
      oscillator: {
        type: this.getOscillatorType(qualiaState.intensity),
      },
      envelope: {
        attack: 0.07 + qualiaState.flow * 0.35,
        decay: 0.16,
        sustain: 0.32 + qualiaState.intensity * 0.5,
        release: 0.5 + qualiaState.flow * 1.3,
      },
      volume: -7 + qualiaState.precision * 7,
    });

    if (this.globalDelay) {
      synth.connect(this.globalDelay);
    }
    this.synthPool.set(entityId, synth);
  }

  /**
   * Actualiza el sonido de una entidad según su estado qualia.
   */
  @logMethod
  @catchError
  public updateEntitySound(entityId: string, qualiaState: Record<string, unknown>): void {
    // AÑADIR ESTA GUARDIA
    if (!this.isEngineReady) {
      // No registrar advertencia aquí para evitar spam, simplemente salir.
      return;
    }

    const synth = this.synthPool.get(entityId);
    if (!synth) return;

    // Cast to QualiaState for type safety
    const state = qualiaState as unknown as QualiaState;
    const baseFreq = this.mapConsciousnessToFrequency(state.intensity);
    const harmonic = this.mapValenceToHarmonic(
      state.flow - state.chaos,
    );
    const rhythm = this.mapArousalToRhythm(state.aggression);

    if (state.aggression > 0.2) {
      const note = Tone.Frequency(baseFreq * harmonic).toNote();
      const velocity = Math.min(
        state.aggression + state.precision * 0.25,
        1.0,
      );
      const duration = rhythm;

      synth.triggerAttackRelease(note, duration, undefined, velocity);
    }
  }

  /**
   * Determina el tipo de oscilador según la intensidad.
   */
  private getOscillatorType(intensity: number): OscillatorType {
    if (intensity > 0.9) return "sine";
    if (intensity > 0.7) return "triangle";
    if (intensity > 0.4) return "sawtooth";
    if (intensity > 0.2) return "pulse";
    return "square";
  }

  /**
   * Mapea la intensidad a una frecuencia audible.
   */
  private mapConsciousnessToFrequency(intensity: number): number {
    // Rango extendido para mayor expresividad
    return 110 + intensity * 2100;
  }

  /**
   * Mapea la valencia emocional a un factor armónico.
   */
  private mapValenceToHarmonic(valence: number): number {
    if (valence > 0) {
      return 1 + valence * 0.5; // Intervalos consonantes
    } else {
      return 1 + Math.abs(valence) * 0.3; // Intervalos más complejos
    }
  }

  /**
   * Mapea el nivel de agresión a una duración rítmica.
   */
  private mapArousalToRhythm(aggression: number): string {
    if (aggression > 0.8) return "16n"; // Muy agresivo: notas rápidas
    if (aggression > 0.5) return "8n"; // Medianamente agresivo: notas medias
    if (aggression > 0.2) return "4n"; // Poco agresivo: notas largas
    return "2n"; // Muy calmado: notas muy largas
  }

  /**
   * Ejecuta patrones musicales emergentes según el tipo de comportamiento.
   */
  @logMethod
  @catchError
  // @validate-exempt: EmergentBehavior is internal type, validated at creation
  public playEmergentPattern(behavior: EmergentBehavior): void {
    // AÑADIR ESTA GUARDIA
    if (!this.isEngineReady) {
      this.logger.warn(`Cannot play emergent pattern. Engine not ready.`);
      return;
    }

    switch (behavior.type) {
      case "CLUSTERING":
        this.playClusterHarmony(behavior);
        break;
      case "SYNCHRONIZATION":
        this.playSynchronizationChord(behavior);
        break;
      case "STATE_PROPAGATOR":
        this.playPropagationArpeggio(behavior);
        break;
      case "NARRATIVE_EVENT":
        this.playNarrativeEvent(behavior);
        break;
    }
  }

  // WORKER-EXEMPT: Web Audio API operations MUST run on main thread
  private playClusterHarmony(behavior: EmergentBehavior): void {
    // Crear acorde basado en las entidades del cluster
    const chord = behavior.entities
      .slice(0, 4)
      .map((_entity, index) => Tone.Frequency(200 + index * 100).toNote());

    const clusteredSynth = this.toneFactory.createPolySynth();
    if (this.globalReverb) {
      clusteredSynth.connect(this.globalReverb);
    }

    clusteredSynth.triggerAttackRelease(chord, "2n");

    // Limpiar después del uso
    this.timerService.setTimeout(() => clusteredSynth.dispose(), 3000);
  }

  // WORKER-EXEMPT: Web Audio API operations MUST run on main thread
  private playSynchronizationChord(behavior: EmergentBehavior): void {
    // Crear acorde de sincronización
    const chord = behavior.entities
      .slice(0, 5)
      .map((_entity, idx) => Tone.Frequency(320 + idx * 70).toNote());

    const syncSynth = this.toneFactory.createPolySynth();
    if (this.globalReverb) {
      syncSynth.connect(this.globalReverb);
    }

    const velocity = Math.min(behavior.strength ?? 0.8, 1.0);
    syncSynth.triggerAttackRelease(chord, "1n", undefined, velocity);

    this.timerService.setTimeout(() => syncSynth.dispose(), 2200);
  }

  // WORKER-EXEMPT: Web Audio API operations MUST run on main thread
  private playPropagationArpeggio(behavior: EmergentBehavior): void {
    // Crear arpegio propagador
    const arpeggioNotes = behavior.entities.map((_entity, idx) =>
      Tone.Frequency(160 + idx * 90).toNote(),
    );

    const arpeggioSynth = this.toneFactory.createPolySynth();
    if (this.globalReverb) {
      arpeggioSynth.connect(this.globalReverb);
    }

    arpeggioNotes.forEach((note, idx) => {
      this.timerService.setTimeout(() => {
        arpeggioSynth.triggerAttackRelease(note, "8n");
      }, idx * 160);
    });

    this.timerService.setTimeout(() => arpeggioSynth.dispose(), 160 * arpeggioNotes.length + 600);
  }

  // WORKER-EXEMPT: Web Audio API operations MUST run on main thread
  private playNarrativeEvent(behavior: EmergentBehavior): void {
    // Evento narrativo: acorde especial con modulación de fuerza y descripción
    const chord = behavior.entities
      .slice(0, 3)
      .map((_entity, idx) => Tone.Frequency(400 + idx * 150).toNote());

    const eventSynth = this.toneFactory.createPolySynth();
    if (this.globalReverb) {
      eventSynth.connect(this.globalReverb);
    }

    const velocity = Math.min(behavior.strength ?? 1.0, 1.0);
    eventSynth.triggerAttackRelease(chord, "2n", undefined, velocity);

    this.timerService.setTimeout(() => eventSynth.dispose(), 2500);
  }

  /**
   * Elimina la voz de una entidad y libera recursos.
   */
  @logMethod
  @catchError
  public removeEntityVoice(entityId: string): void {
    // AÑADIR ESTA GUARDIA
    if (!this.isEngineReady) {
      this.logger.warn(`Cannot remove voice for ${entityId}. Engine not ready.`);
      return;
    }

    const synth = this.synthPool.get(entityId);
    if (synth) {
      synth.dispose();
      this.synthPool.delete(entityId);
    }
  }

  /**
   * Get the current master volume.
   */
  @logMethod
  public getMasterVolume(): number {
    // AÑADIR ESTA GUARDIA
    if (!this.isEngineReady || !this.masterVolume) {
      this.logger.warn(`Cannot get master volume. Engine not ready.`);
      return -8; // Valor por defecto
    }

    return this.masterVolume.volume.value;
  }

  /**
   * Set the master volume.
   */
  @logMethod
  @catchError
  public setMasterVolume(volume: number): void {
    // AÑADIR ESTA GUARDIA
    if (!this.isEngineReady || !this.masterVolume) {
      this.logger.warn(`Cannot set master volume. Engine not ready.`);
      return;
    }

    this.masterVolume.volume.value = volume;
  }

  // QUALIA.CODE v1.1: IBaseService implementation
  public initialize(): void {
    this.logger.info('🚀 [OntologicalAudioEngine] Initializing service with @OnEvent lifecycle...');
    // @OnEvent subscriptions are handled automatically by the decorator
  }

  public cleanup(): void {
    this.logger.info('🧹 [OntologicalAudioEngine] Cleaning up service...');
    // @OnEvent subscriptions are cleaned up automatically by the decorator
    // Additional cleanup for audio nodes if needed
    if (this.globalReverb) {
      this.globalReverb.dispose();
      this.globalReverb = null;
    }
    if (this.globalDelay) {
      this.globalDelay.dispose();
      this.globalDelay = null;
    }
    if (this.masterVolume) {
      this.masterVolume.dispose();
      this.masterVolume = null;
    }
    this.synthPool.forEach(synth => synth.dispose());
    this.synthPool.clear();
    this.isEngineReady = false;
  }
}

export default OntologicalAudioEngine;
