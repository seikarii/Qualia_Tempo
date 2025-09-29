import { injectable } from "inversify";
import { IWebAudioAPIService } from "./interfaces/IWebAudioAPIService";
import { logMethod } from "../utils/decorators";

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

  @logMethod
  public playTone(frequency: number, duration: number, gain: number, type: OscillatorType, loop: boolean = false): void {
    const audioContext = this.getAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;
    gainNode.gain.setValueAtTime(gain, audioContext.currentTime);

    oscillator.start();
    if (!loop) {
      oscillator.stop(audioContext.currentTime + duration);
    }
  }
}
