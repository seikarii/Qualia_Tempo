import * as Tone from 'tone';
import { injectable } from 'inversify';
import { IToneFactoryService } from './interfaces/IToneFactoryService';

@injectable()
export class ToneFactoryService implements IToneFactoryService {
  createPolySynth(options?: any): Tone.PolySynth {
    return new Tone.PolySynth(Tone.Synth, options);
  }

  createReverb(options?: any): Tone.Reverb {
    return new Tone.Reverb(options);
  }

  createFeedbackDelay(options?: any): Tone.FeedbackDelay {
    return new Tone.FeedbackDelay(options);
  }

  createVolume(options?: any): Tone.Volume {
    return new Tone.Volume(options);
  }
}