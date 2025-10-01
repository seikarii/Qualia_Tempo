import * as Tone from 'tone';

// Type-safe option interfaces for Tone.js factories
export type PolySynthOptions = Record<string, unknown>;
export type ReverbOptions = Record<string, unknown>;
export type FeedbackDelayOptions = Record<string, unknown>;
export type VolumeOptions = Record<string, unknown>;

export interface IToneFactoryService {
  createPolySynth(options?: PolySynthOptions): Tone.PolySynth;
  createReverb(options?: ReverbOptions): Tone.Reverb;
  createFeedbackDelay(options?: FeedbackDelayOptions): Tone.FeedbackDelay;
  createVolume(options?: VolumeOptions): Tone.Volume;
}