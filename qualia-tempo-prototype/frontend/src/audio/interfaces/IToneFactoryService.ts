import * as Tone from 'tone';

export interface IToneFactoryService {
  createPolySynth(options?: any): Tone.PolySynth;
  createReverb(options?: any): Tone.Reverb;
  createFeedbackDelay(options?: any): Tone.FeedbackDelay;
  createVolume(options?: any): Tone.Volume;
}