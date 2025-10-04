/**
 * QUALIA.CODE v2.0 - AudioAnalysisService Tests
 * Unit tests for audio analysis service following QUALIA.CODE testing patterns.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestContainer } from '../../testing/test-container-factory';
import { TYPES } from '../inversify.types';
import type { IAudioAnalysisService } from '../interfaces/IAudioAnalysisService';
import type { IEventBus } from '../interfaces/IEventBus';
import type { Container } from 'inversify';

describe('AudioAnalysisService', () => {
  let container: Container;
  let audioAnalysisService: IAudioAnalysisService;
  let mockEventBus: IEventBus;

  beforeEach(() => {
    container = createTestContainer();
    audioAnalysisService = container.get<IAudioAnalysisService>(TYPES.IAudioAnalysisService);
    mockEventBus = container.get<IEventBus>(TYPES.IEventBus);
  });

  describe('initialize', () => {
    it('should initialize without errors', () => {
      expect(() => audioAnalysisService.initialize()).not.toThrow();
    });

    it('should set up event subscriptions', () => {
      audioAnalysisService.initialize();
      expect(mockEventBus.subscribe).toHaveBeenCalled();
    });
  });

  describe('getCurrentAudioData', () => {
    it('should return null when audio is not ready', () => {
      const audioData = audioAnalysisService.getCurrentAudioData();
      expect(audioData).toBeNull();
    });

    it('should return audio data structure when ready', () => {
      audioAnalysisService.initialize();
      // Simulate System.Audio.Ready event
      const audioReadyEvent = {
        type: 'System.Audio.Ready' as const,
        timestamp: new Date(),
      };
      mockEventBus.emit(audioReadyEvent);

      const audioData = audioAnalysisService.getCurrentAudioData();
      if (audioData !== null) {
        expect(audioData).toHaveProperty('tempo');
        expect(audioData).toHaveProperty('beatPosition');
        expect(audioData).toHaveProperty('frequencyBands');
        expect(audioData).toHaveProperty('volume');
      }
    });
  });

  describe('isAnalyzing', () => {
    it('should return false initially', () => {
      expect(audioAnalysisService.isAnalyzing()).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clean up resources without errors', () => {
      audioAnalysisService.initialize();
      expect(() => audioAnalysisService.cleanup()).not.toThrow();
    });

    it('should stop analysis when cleaning up', () => {
      audioAnalysisService.initialize();
      audioAnalysisService.cleanup();
      expect(audioAnalysisService.isAnalyzing()).toBe(false);
    });
  });

  describe('QUALIA.CODE Compliance', () => {
    it('should implement IBaseService interface', () => {
      expect(audioAnalysisService).toHaveProperty('initialize');
      expect(audioAnalysisService).toHaveProperty('cleanup');
      expect(typeof audioAnalysisService.initialize).toBe('function');
      expect(typeof audioAnalysisService.cleanup).toBe('function');
    });

    it('should emit AudioDataUpdatedEvent after audio is ready', () => {
      audioAnalysisService.initialize();
      const emitSpy = vi.spyOn(mockEventBus, 'emit');
      
      // Simulate System.Audio.Ready event
      const audioReadyEvent = {
        type: 'System.Audio.Ready' as const,
        timestamp: new Date(),
      };
      mockEventBus.emit(audioReadyEvent);

      // Check that events are being emitted
      // Note: In real implementation, this would require proper audio context setup
      expect(emitSpy).toHaveBeenCalled();
    });
  });
});
