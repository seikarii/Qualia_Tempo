/**
 * QUALIA.CODE v1.1 - AudioService Configuration Validator
 * Modular validation for AudioService configuration section.
 */

import type { AudioServiceConfig } from '../contracts/IAudioService.contracts';

/**
 * Validate AudioService configuration section.
 * @param config - AudioService configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateAudioServiceConfig(config: Partial<AudioServiceConfig> | undefined): void {
  if (!config?.rhythmicFeedback?.perfect?.frequency) {
    throw new Error('Invalid audioService.rhythmicFeedback.perfect.frequency configuration: must be defined number');
  }
  
  if (!config?.metronome?.frequency || typeof config.metronome.frequency !== 'number') {
    throw new Error('Invalid audioService.metronome.frequency configuration: must be positive number');
  }
  
  if (!config?.audioEngine?.sampleRate || typeof config.audioEngine.sampleRate !== 'number') {
    throw new Error('Invalid audioService.audioEngine.sampleRate configuration: must be positive number');
  }
  
  if (typeof config?.volume !== 'number' || config.volume < 0 || config.volume > 1) {
    throw new Error('Invalid audioService.volume configuration: must be number between 0 and 1');
  }
  
  if (typeof config?.soundEnabled !== 'boolean') {
    throw new Error('Invalid audioService.soundEnabled configuration: must be boolean');
  }
}