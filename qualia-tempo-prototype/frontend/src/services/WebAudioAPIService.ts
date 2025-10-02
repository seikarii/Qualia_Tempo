import { injectable } from "inversify";
import { IWebAudioAPIService } from "./interfaces/IWebAudioAPIService";
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

@injectable()
export class WebAudioAPIService implements IWebAudioAPIService {
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      // Handle webkit prefixed AudioContext for older browsers
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }
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

  public playTone(params: PlayToneParams): void;
  public playTone(frequency: number, duration: number, gain: number, type: OscillatorType, loop?: boolean): void;
  @logMethod
  public playTone(
    paramsOrFrequency: PlayToneParams | number,
    duration?: number,
    gain?: number,
    type?: OscillatorType,
    loop: boolean = false
  ): void {
    let params: PlayToneParams;
    
    if (typeof paramsOrFrequency === 'object') {
      params = paramsOrFrequency;
    } else {
      params = {
        frequency: paramsOrFrequency,
        duration: duration!,
        gain: gain!,
        type: type!,
        loop
      };
    }

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
}
