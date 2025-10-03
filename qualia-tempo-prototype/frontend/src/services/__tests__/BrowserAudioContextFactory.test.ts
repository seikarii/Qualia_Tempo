/**
 * QUALIA.CODE v1.2 - BrowserAudioContextFactory Tests
 * Unit tests for platform abstraction factory
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserAudioContextFactory } from '../BrowserAudioContextFactory';

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
      // Verify class has injectable metadata
      const metadata = Reflect.getMetadata('inversify:paramtypes', BrowserAudioContextFactory);
      expect(metadata).toBeDefined();
    });
  });
});
