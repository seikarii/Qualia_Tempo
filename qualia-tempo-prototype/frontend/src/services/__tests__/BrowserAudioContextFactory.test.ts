/**
 * QUALIA.CODE v1.2 - BrowserAudioContextFactory Tests
 * Unit tests for platform abstraction factory
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserAudioContextFactory } from '../BrowserAudioContextFactory';
import { createTestContainer } from '../../testing/test-container-factory';
import { TYPES } from '../inversify.types';

describe('BrowserAudioContextFactory', () => {
  let factory: BrowserAudioContextFactory;

  beforeEach(() => {
    factory = new BrowserAudioContextFactory();
  });

  describe('create()', () => {
    it('should return null in non-browser environment', () => {
      // Simulate Node.js environment
      const windowSpy = vi.spyOn(global, 'window', 'get');
      windowSpy.mockImplementation(() => undefined as unknown as Window & typeof globalThis);

      const result = factory.create();
      expect(result).toBeNull();

      windowSpy.mockRestore();
    });

    it('should create AudioContext when available in browser', () => {
      // Mock browser environment with AudioContext
      const mockAudioContext = vi.fn();
      const windowMock = {
        AudioContext: mockAudioContext,
      } as unknown as Window & typeof globalThis;

      const windowSpy = vi.spyOn(global, 'window', 'get');
      windowSpy.mockImplementation(() => windowMock);

      factory.create();
      expect(mockAudioContext).toHaveBeenCalledTimes(1);

      windowSpy.mockRestore();
    });

    it('should fallback to webkitAudioContext when AudioContext is not available', () => {
      // Mock browser environment with only webkitAudioContext
      const mockWebkitAudioContext = vi.fn();
      const windowMock = {
        AudioContext: undefined,
        webkitAudioContext: mockWebkitAudioContext,
      } as unknown as Window & typeof globalThis;

      const windowSpy = vi.spyOn(global, 'window', 'get');
      windowSpy.mockImplementation(() => windowMock);

      factory.create();
      expect(mockWebkitAudioContext).toHaveBeenCalledTimes(1);

      windowSpy.mockRestore();
    });

    it('should return null when neither AudioContext nor webkitAudioContext are available', () => {
      // Mock browser environment without audio context support
      const windowMock = {
        AudioContext: undefined,
        webkitAudioContext: undefined,
      } as unknown as Window & typeof globalThis;

      const windowSpy = vi.spyOn(global, 'window', 'get');
      windowSpy.mockImplementation(() => windowMock);

      const result = factory.create();
      expect(result).toBeNull();

      windowSpy.mockRestore();
    });
  });

  describe('IoC Container Integration', () => {
    it('should be injectable via @injectable decorator', () => {
      // ARCHITECTURAL NOTE: Services with no constructor params don't have paramtypes metadata
      // The correct test is to verify the class can be resolved from a container
      const container = createTestContainer();
      
      // Bind the factory (as it's not bound by default in test container)
      container.bind(TYPES.IAudioContextFactory).to(BrowserAudioContextFactory);
      
      // Verify it can be resolved
      const resolvedFactory = container.get(TYPES.IAudioContextFactory);
      expect(resolvedFactory).toBeInstanceOf(BrowserAudioContextFactory);
    });
  });
});
