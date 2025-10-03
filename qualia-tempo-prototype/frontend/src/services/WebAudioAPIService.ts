import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import { IWebAudioAPIService } from "./interfaces/IWebAudioAPIService";
import type { IAudioContextFactory } from "./interfaces/IAudioContextFactory";
import { logMethod, catchError } from "../utils/decorators";
import * as Tone from "tone";

// Parameter object for playTone method
export interface PlayToneParams {
  frequency: number;
  duration: number;
  gain: number;
  type: OscillatorType;
  loop?: boolean;
}

/**
 * QUALIA.CODE v1.2 - WebAudioAPIService Implementation
 * Platform-abstracted audio service using Factory Pattern
 * 
 * ARCHITECTURAL FIX: Platform Abstraction
 * - Eliminates direct new AudioContext() instantiation
 * - Uses injected IAudioContextFactory for decoupled creation
 * - Enables testing in non-browser environments
 */
@injectable()
export class WebAudioAPIService implements IWebAudioAPIService {
  private audioContext: AudioContext | null = null;
  private readonly factory: IAudioContextFactory;

  constructor(
    @inject(TYPES.IAudioContextFactory) factory: IAudioContextFactory
  ) {
    this.factory = factory;
    this.audioContext = this.factory.create();
  }

  @logMethod
  public getAudioContext(): AudioContext {
    if (!this.audioContext) {
      throw new Error("AudioContext is not available in this environment.");
    }
    return this.audioContext;
  }

  /**
   * QUALIA.CODE v1.1: Platform Abstraction for Tone.js
   * Start the audio context - abstracts Tone.start()
   * This enables testing without Tone.js and maintains platform abstraction.
   */
  @logMethod
  @catchError
  public async startContext(): Promise<void> {
    await Tone.start();
  }

  public playTone(_params: PlayToneParams): void;
  public playTone(_frequency: number, _duration: number, _gain: number, _type: OscillatorType, _loop?: boolean): void;
  @logMethod
  public playTone(...args: [PlayToneParams] | [number, number, number, OscillatorType, boolean?]): void {
    const params = this.normalizePlayToneParams(args);

    const audioContext = this.getAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(params.frequency, audioContext.currentTime);
    oscillator.type = params.type;
    gainNode.gain.setValueAtTime(params.gain, audioContext.currentTime);

    oscillator.start();
    if (!params.loop) {
      oscillator.stop(audioContext.currentTime + params.duration);
    }
  }

  private normalizePlayToneParams(
    args: [PlayToneParams] | [number, number, number, OscillatorType, boolean?]
  ): PlayToneParams {
    if (args.length === 1 && typeof args[0] === 'object') {
      return args[0];
    }
    
    const [frequency, duration = 0.5, gain = 0.3, type = 'sine' as OscillatorType, loop = false] = args as [number, number, number, OscillatorType, boolean?];
    return {
      frequency,
      duration,
      gain,
      type,
      loop
    };
  }
}
