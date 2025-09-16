import * as Tone from 'tone';
import type { QualiaState } from '../types/contracts';

/**
 * EmergentBehavior - describe patrones emergentes en la simulación ontológica.
 * Permite la integración de patrones musicales y sonoros basados en estados cualitativos.
 */
export interface EmergentBehavior {
  type: 'CLUSTERING' | 'SYNCHRONIZATION' | 'STATE_PROPAGATOR' | 'NARRATIVE_EVENT';
  entities: any[]; // Simplified entities array
  strength?: number;
  description?: string;
  timestamp?: number;
}

export type OscillatorType = 'sine' | 'triangle' | 'sawtooth' | 'square' | 'pulse';

export class OntologicalAudioEngine {
  private synthPool: Map<string, Tone.PolySynth> = new Map();
  private globalReverb: Tone.Reverb;
  private globalDelay: Tone.FeedbackDelay;
  private masterVolume: Tone.Volume;

  constructor() {
    this.globalReverb = new Tone.Reverb({
      decay: 1.5,
      wet: 0.45
    });

    this.globalDelay = new Tone.FeedbackDelay({
      delayTime: "8n",
      feedback: 0.28,
      wet: 0.18
    });

    this.masterVolume = new Tone.Volume(-8);

    // Cadena de efectos
    this.globalDelay.connect(this.globalReverb);
    this.globalReverb.connect(this.masterVolume);
    this.masterVolume.toDestination();

    console.log('🎵 OntologicalAudioEngine initialized');
  }

  /**
   * Crea una voz musical para una entidad basada en su estado qualia.
   */
  public createEntityVoice(entityId: string, qualiaState: QualiaState): void {
    if (this.synthPool.has(entityId)) return;

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: this.getOscillatorType(qualiaState.intensity),
      },
      envelope: {
        attack: 0.07 + qualiaState.flow * 0.35,
        decay: 0.16,
        sustain: 0.32 + qualiaState.intensity * 0.5,
        release: 0.5 + qualiaState.flow * 1.3
      },
      volume: -7 + qualiaState.precision * 7
    });

    synth.connect(this.globalDelay);
    this.synthPool.set(entityId, synth);
  }

  /**
   * Actualiza el sonido de una entidad según su estado qualia.
   */
  public updateEntitySound(entityId: string, qualiaState: QualiaState): void {
    const synth = this.synthPool.get(entityId);
    if (!synth) return;

    const baseFreq = this.mapConsciousnessToFrequency(qualiaState.intensity);
    const harmonic = this.mapValenceToHarmonic(qualiaState.flow - qualiaState.chaos);
    const rhythm = this.mapArousalToRhythm(qualiaState.aggression);

    if (qualiaState.aggression > 0.2) {
      const note = Tone.Frequency(baseFreq * harmonic).toNote();
      const velocity = Math.min(qualiaState.aggression + qualiaState.precision * 0.25, 1.0);
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
    if (aggression > 0.5) return "8n";  // Medianamente agresivo: notas medias
    if (aggression > 0.2) return "4n";  // Poco agresivo: notas largas
    return "2n"; // Muy calmado: notas muy largas
  }

  /**
   * Ejecuta patrones musicales emergentes según el tipo de comportamiento.
   */
  public playEmergentPattern(behavior: EmergentBehavior): void {
    switch (behavior.type) {
      case 'CLUSTERING':
        this.playClusterHarmony(behavior);
        break;
      case 'SYNCHRONIZATION':
        this.playSynchronizationChord(behavior);
        break;
      case 'STATE_PROPAGATOR':
        this.playPropagationArpeggio(behavior);
        break;
      case 'NARRATIVE_EVENT':
        this.playNarrativeEvent(behavior);
        break;
    }
  }

  private playClusterHarmony(behavior: EmergentBehavior): void {
    // Crear acorde basado en las entidades del cluster
    const chord = behavior.entities.slice(0, 4).map((_entity, index) =>
      Tone.Frequency(200 + index * 100).toNote()
    );

    const clusteredSynth = new Tone.PolySynth();
    clusteredSynth.connect(this.globalReverb);

    clusteredSynth.triggerAttackRelease(chord, "2n");

    // Limpiar después del uso
    setTimeout(() => clusteredSynth.dispose(), 3000);
  }

  private playSynchronizationChord(behavior: EmergentBehavior): void {
    // Crear acorde de sincronización
    const chord = behavior.entities.slice(0, 5).map((_entity, idx) =>
      Tone.Frequency(320 + idx * 70).toNote()
    );

    const syncSynth = new Tone.PolySynth();
    syncSynth.connect(this.globalReverb);

    const velocity = Math.min(behavior.strength ?? 0.8, 1.0);
    syncSynth.triggerAttackRelease(chord, "1n", undefined, velocity);

    setTimeout(() => syncSynth.dispose(), 2200);
  }

  private playPropagationArpeggio(behavior: EmergentBehavior): void {
    // Crear arpegio propagador
    const arpeggioNotes = behavior.entities.map((_entity, idx) =>
      Tone.Frequency(160 + idx * 90).toNote()
    );

    const arpeggioSynth = new Tone.PolySynth();
    arpeggioSynth.connect(this.globalReverb);

    arpeggioNotes.forEach((note, idx) => {
      setTimeout(() => {
        arpeggioSynth.triggerAttackRelease(note, "8n");
      }, idx * 160);
    });

    setTimeout(() => arpeggioSynth.dispose(), 160 * arpeggioNotes.length + 600);
  }

  private playNarrativeEvent(behavior: EmergentBehavior): void {
    // Evento narrativo: acorde especial con modulación de fuerza y descripción
    const chord = behavior.entities.slice(0, 3).map((_entity, idx) =>
      Tone.Frequency(400 + idx * 150).toNote()
    );

    const eventSynth = new Tone.PolySynth();
    eventSynth.connect(this.globalReverb);

    const velocity = Math.min(behavior.strength ?? 1.0, 1.0);
    eventSynth.triggerAttackRelease(chord, "2n", undefined, velocity);

    setTimeout(() => eventSynth.dispose(), 2500);
  }

  /**
   * Elimina la voz de una entidad y libera recursos.
   */
  public removeEntityVoice(entityId: string): void {
    const synth = this.synthPool.get(entityId);
    if (synth) {
      synth.dispose();
      this.synthPool.delete(entityId);
    }
  }
}

export default OntologicalAudioEngine;