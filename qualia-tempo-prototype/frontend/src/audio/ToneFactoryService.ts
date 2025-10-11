import * as Tone from 'tone';
import { injectable } from 'inversify';
import { 
  IToneFactoryService, 
  PolySynthOptions, 
  ReverbOptions, 
  FeedbackDelayOptions, 
  VolumeOptions 
} from './interfaces/IToneFactoryService';

@injectable()
export class ToneFactoryService implements IToneFactoryService {
  // @validate-exempt: Tone.js library types are externally validated
  createPolySynth(options?: PolySynthOptions): Tone.PolySynth {
    return new Tone.PolySynth(Tone.Synth, options);
  }

  // @validate-exempt: Tone.js library types are externally validated
  createReverb(options?: ReverbOptions): Tone.Reverb {
    return new Tone.Reverb(options);
  }

  // @validate-exempt: Tone.js library types are externally validated
  createFeedbackDelay(options?: FeedbackDelayOptions): Tone.FeedbackDelay {
    return new Tone.FeedbackDelay(options);
  }

  // @validate-exempt: Tone.js library types are externally validated
  createVolume(options?: VolumeOptions): Tone.Volume {
    return new Tone.Volume(options);
  }
}