/**
 * QUALIA.CODE v1.2 - BrowserAudioContextFactory Implementation
 * Browser-specific implementation of AudioContext creation
 *
 * Purpose: Isolates browser-specific AudioContext instantiation logic
 * Architecture: Factory Pattern implementation for platform abstraction
 */

import { injectable } from 'inversify';
import type { IAudioContextFactory } from './interfaces/IAudioContextFactory';

@injectable()
export class BrowserAudioContextFactory implements IAudioContextFactory {
  /**
   * Creates an AudioContext instance with browser compatibility handling.
   * Handles webkit-prefixed AudioContext for older browsers.
   * 
   * QUALIA.CODE EXCEPTION: This is a legitimate platform factory.
   * Direct window access is necessary here as this is the abstraction layer itself.
   * 
   * @returns AudioContext instance or null if not available
   */
  public create(): AudioContext | null {
    // eslint-disable-next-line @qualia-tempo/qualia-code/no-global-api-calls
    if (typeof window === 'undefined') {
      return null;
    }

    // Handle webkit prefixed AudioContext for older browsers
    // eslint-disable-next-line @qualia-tempo/qualia-code/no-global-api-calls
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    
    if (!AudioContextClass) {
      return null;
    }

    return new AudioContextClass();
  }
}
