/**
 * QUALIA.CODE v1.2 - Mock AudioContextFactory
 * Test double for IAudioContextFactory interface
 */

import type { IAudioContextFactory } from '../../services/interfaces/IAudioContextFactory';

export class MockAudioContextFactory implements IAudioContextFactory {
  private mockContext: AudioContext | null = null;

  public setMockContext(context: AudioContext | null): void {
    this.mockContext = context;
  }

  public create(): AudioContext | null {
    return this.mockContext;
  }
}
