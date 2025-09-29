export interface IWebAudioAPIService {
  getAudioContext(): AudioContext;
  playTone(frequency: number, duration: number, gain: number, type: OscillatorType): void;
}
