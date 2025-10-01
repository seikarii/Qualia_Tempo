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
  createPolySynth(options?: PolySynthOptions): Tone.PolySynth {
    return new Tone.PolySynth(Tone.Synth, options);
  }

  createReverb(options?: ReverbOptions): Tone.Reverb {
    return new Tone.Reverb(options);
  }

  createFeedbackDelay(options?: FeedbackDelayOptions): Tone.FeedbackDelay {
    return new Tone.FeedbackDelay(options);
  }

  createVolume(options?: VolumeOptions): Tone.Volume {
    return new Tone.Volume(options);
  }
}