/**
 * QUALIA.CODE v1.2 - IAudioContextFactory Interface
 * Factory abstraction for platform-specific AudioContext creation
 *
 * Purpose: Eliminates direct platform API usage (new AudioContext())
 * following the "Platform Abstraction is Mandatory" principle.
 * 
 * Architecture: Factory Pattern + IoC
 * - Decouples WebAudioAPIService from browser-specific AudioContext instantiation
 * - Enables testing in Node.js environments
 * - Allows mock injection for unit tests
 */

export interface IAudioContextFactory {
  /**
   * Creates an AudioContext instance.
   * Implementation handles browser-specific logic (webkit prefixes, etc.)
   * 
   * @returns AudioContext instance or null if not available in environment
   */
  create(): AudioContext | null;
}
