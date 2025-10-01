import { PlayToneParams } from "../WebAudioAPIService";

export interface IWebAudioAPIService {
  getAudioContext(): AudioContext;
  playTone(params: PlayToneParams): void;
  playTone(frequency: number, duration: number, gain: number, type: OscillatorType, loop?: boolean): void;
}
