import { injectable } from "inversify";
import { IWebAudioAPIService } from "./interfaces/IWebAudioAPIService";
import { logMethod } from "../utils/decorators";

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
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
  }

  @logMethod
  public getAudioContext(): AudioContext {
    if (!this.audioContext) {
      throw new Error("AudioContext is not available in this environment.");
    }
    return this.audioContext;
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
