import { PlayToneParams } from "../WebAudioAPIService";

export interface IWebAudioAPIService {
  getAudioContext(): AudioContext;
  playTone(params: PlayToneParams): void;
  playTone(frequency: number, duration: number, gain: number, type: OscillatorType, loop?: boolean): void;
  
  /**
   * QUALIA.CODE v1.1: Platform Abstraction for Tone.js
   * Start the audio context (abstracts Tone.start())
   * This method MUST be called after a user gesture to comply with browser autoplay policies.
   */
  startContext(): Promise<void>;
}
