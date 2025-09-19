import { describe, test, expect, beforeEach, afterEach, vi, type Mocked } from 'vitest';
/**
 * Tests for RhythmicMovementController - GOLD.CODE IoC Compliance
 * Rhythmic movement pattern controller with beat synchronization
 */

import { createTestContainer, getMocksFromContainer, resetAllMocks } from '../../testing/test-container-factory';
import { RhythmicMovementController } from '../RhythmicMovementController';
import { IRhythmicMovementController } from '../interfaces/IRhythmicMovementController';
import { IEventBus } from '../interfaces/IEventBus';
import { IConfigurationService } from '../interfaces/IConfigurationService';
import { QualiaLogger } from '../Logger';
import { Container } from 'inversify';
import { TYPES } from '../inversify.types';

// Mock decorators
vi.mock('../../utils/decorators', () => ({
  logMethod: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  catchError: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

describe('RhythmicMovementController - GOLD.CODE IoC Testing', () => {
  let rhythmicController: IRhythmicMovementController;
  let container: Container;
  let mockEventBus: Mocked<IEventBus>;
  let mockConfigService: Mocked<IConfigurationService>;
  let mockLogger: Mocked<QualiaLogger>;

  beforeEach(() => {
    // Reset all mocks to clean state
    resetAllMocks();

    // Create fresh test container with proper IoC bindings
    container = createTestContainer();

    // Get mock instances for assertions
    const mocks = getMocksFromContainer(container);
    mockEventBus = mocks.mockEventBus as Mocked<IEventBus>;
    mockConfigService = mocks.mockConfigurationService as Mocked<IConfigurationService>;
    mockLogger = mocks.mockLogger as Mocked<QualiaLogger>;

    // Configure mock configuration service with rhythm settings
    mockConfigService.getConfig.mockReturnValue({
      rhythm: {
        bpm: 120,
        beatPatterns: {
          dash: [1, 0, 1, 0],
          attack: [1, 1, 0, 1],
          defense: [0, 1, 1, 0]
        },
        syncTolerance: 100,
        adaptive: true
      }
    });

    // GOLD.CODE COMPLIANCE: Resolve service from IoC container
    rhythmicController = container.get<IRhythmicMovementController>(TYPES.IRhythmicMovementController);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Service Initialization', () => {
    it('should initialize with proper IoC dependencies', () => {
      expect(rhythmicController).toBeDefined();
      expect(rhythmicController).toBeInstanceOf(RhythmicMovementController);
    });

    it('should start successfully and register event listeners', async () => {
      await rhythmicController.start();
      
      // Verify logger was called for initialization
      expect(mockLogger.info).toHaveBeenCalledWith('RhythmicMovementController started');
      
      // Verify event subscriptions were registered
      expect(mockEventBus.subscribe).toHaveBeenCalled();
    });

    it('should stop successfully and cleanup resources', async () => {
      await rhythmicController.start();
      await rhythmicController.stop();
      
      expect(mockLogger.info).toHaveBeenCalledWith('RhythmicMovementController stopped');
      expect(mockEventBus.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Beat Synchronization', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await rhythmicController.start();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should initialize with configured BPM', () => {
      const currentBpm = rhythmicController.getCurrentBPM();
      expect(currentBpm).toBe(120); // From mock config
    });

    it('should update BPM dynamically', async () => {
      await rhythmicController.setBPM(140);
      
      const newBpm = rhythmicController.getCurrentBPM();
      expect(newBpm).toBe(140);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'BPM updated',
        expect.objectContaining({ newBpm: 140 })
      );
    });

    it('should calculate beat timing correctly', () => {
      const beatInterval = rhythmicController.getBeatInterval();
      
      // 120 BPM = 60000ms / 120 = 500ms per beat
      expect(beatInterval).toBe(500);
    });

    it('should detect rhythm sync accuracy', async () => {
      const mockTimestamp = Date.now();
      const syncAccuracy = await rhythmicController.checkSyncAccuracy(mockTimestamp);
      
      expect(typeof syncAccuracy).toBe('number');
      expect(syncAccuracy).toBeGreaterThanOrEqual(0);
      expect(syncAccuracy).toBeLessThanOrEqual(1);
    });
  });

  describe('Movement Pattern Generation', () => {
    beforeEach(async () => {
      await rhythmicController.start();
    });

    it('should generate movement patterns based on rhythm', async () => {
      const pattern = await rhythmicController.generateMovementPattern('dash', 4);
      
      expect(Array.isArray(pattern)).toBe(true);
      expect(pattern.length).toBe(4);
      
      pattern.forEach(step => {
        expect(step).toHaveProperty('timing');
        expect(step).toHaveProperty('intensity');
        expect(step).toHaveProperty('direction');
      });
    });

    it('should generate different patterns for different movement types', async () => {
      const dashPattern = await rhythmicController.generateMovementPattern('dash', 4);
      const attackPattern = await rhythmicController.generateMovementPattern('attack', 4);
      
      expect(dashPattern).not.toEqual(attackPattern);
    });

    it('should respect beat pattern configuration', async () => {
      const pattern = await rhythmicController.generateMovementPattern('dash', 4);
      
      // Should follow the configured dash pattern [1, 0, 1, 0]
      expect(pattern[0].intensity).toBeGreaterThan(0); // Beat 1: active
      expect(pattern[1].intensity).toBe(0); // Beat 2: rest
      expect(pattern[2].intensity).toBeGreaterThan(0); // Beat 3: active
      expect(pattern[3].intensity).toBe(0); // Beat 4: rest
    });
  });

  describe('Player Input Validation', () => {
    beforeEach(async () => {
      await rhythmicController.start();
    });

    it('should validate player input timing against rhythm', async () => {
      const inputTimestamp = Date.now();
      const validation = await rhythmicController.validatePlayerInput('dash', inputTimestamp);
      
      expect(validation).toHaveProperty('isOnBeat');
      expect(validation).toHaveProperty('accuracy');
      expect(validation).toHaveProperty('feedback');
      expect(typeof validation.isOnBeat).toBe('boolean');
      expect(typeof validation.accuracy).toBe('number');
    });

    it('should provide feedback for timing accuracy', async () => {
      const inputTimestamp = Date.now();
      const validation = await rhythmicController.validatePlayerInput('attack', inputTimestamp);
      
      expect(validation.feedback).toBeDefined();
      expect(['perfect', 'good', 'fair', 'poor']).toContain(validation.feedback);
    });

    it('should handle different tolerance levels', async () => {
      // Test with tight tolerance
      mockConfigService.getConfig.mockReturnValue({
        rhythm: {
          syncTolerance: 50 // Very strict
        }
      });
      
      const strictValidation = await rhythmicController.validatePlayerInput('dash', Date.now());
      
      // Test with loose tolerance
      mockConfigService.getConfig.mockReturnValue({
        rhythm: {
          syncTolerance: 200 // More forgiving
        }
      });
      
      const looseValidation = await rhythmicController.validatePlayerInput('dash', Date.now());
      
      // Both should be valid responses
      expect(strictValidation).toHaveProperty('accuracy');
      expect(looseValidation).toHaveProperty('accuracy');
    });
  });

  describe('Adaptive Rhythm System', () => {
    beforeEach(async () => {
      await rhythmicController.start();
    });

    it('should adapt rhythm based on player performance', async () => {
      // Simulate good player performance
      const goodInputs = [
        { type: 'dash', timestamp: Date.now(), accuracy: 0.9 },
        { type: 'attack', timestamp: Date.now() + 500, accuracy: 0.85 },
        { type: 'dash', timestamp: Date.now() + 1000, accuracy: 0.92 }
      ];
      
      for (const input of goodInputs) {
        await rhythmicController.recordPlayerPerformance(input.type, input.timestamp, input.accuracy);
      }
      
      await rhythmicController.adaptRhythm();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Rhythm adapted')
      );
    });

    it('should increase complexity for skilled players', async () => {
      // Record consistently high performance
      for (let i = 0; i < 10; i++) {
        await rhythmicController.recordPlayerPerformance('dash', Date.now() + i * 500, 0.95);
      }
      
      await rhythmicController.adaptRhythm();
      
      const complexity = rhythmicController.getCurrentComplexity();
      expect(complexity).toBeGreaterThan(1); // Should increase from base level
    });

    it('should reduce complexity for struggling players', async () => {
      // Record consistently poor performance
      for (let i = 0; i < 10; i++) {
        await rhythmicController.recordPlayerPerformance('attack', Date.now() + i * 500, 0.3);
      }
      
      await rhythmicController.adaptRhythm();
      
      const complexity = rhythmicController.getCurrentComplexity();
      expect(complexity).toBeLessThan(1); // Should decrease from base level
    });
  });

  describe('Beat Detection and Audio Sync', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await rhythmicController.start();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should sync with external audio source', async () => {
      const audioContext = {
        currentTime: 0,
        sampleRate: 44100
      };
      
      await rhythmicController.syncWithAudio(audioContext as any);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Synced with audio context'
      );
    });

    it('should detect beat from audio analysis', async () => {
      const mockAudioData = new Float32Array([0.5, -0.3, 0.8, -0.2, 0.9, -0.1]);
      
      const beatDetected = await rhythmicController.analyzeAudioForBeat(mockAudioData);
      
      expect(typeof beatDetected).toBe('boolean');
    });

    it('should maintain beat tracking over time', async () => {
      await rhythmicController.startBeatTracking();
      
      // Advance time to simulate beat intervals
      vi.advanceTimersByTime(1000);
      
      const beatCount = rhythmicController.getBeatCount();
      expect(beatCount).toBeGreaterThan(0);
      
      await rhythmicController.stopBeatTracking();
    });
  });

  describe('Movement Preview and Prediction', () => {
    beforeEach(async () => {
      await rhythmicController.start();
    });

    it('should preview upcoming movement cues', async () => {
      const preview = await rhythmicController.getUpcomingMovements(4);
      
      expect(Array.isArray(preview)).toBe(true);
      expect(preview.length).toBeLessThanOrEqual(4);
      
      preview.forEach(cue => {
        expect(cue).toHaveProperty('type');
        expect(cue).toHaveProperty('timing');
        expect(cue).toHaveProperty('confidence');
      });
    });

    it('should predict optimal input timing', async () => {
      const prediction = await rhythmicController.predictOptimalTiming('dash');
      
      expect(prediction).toHaveProperty('nextBeat');
      expect(prediction).toHaveProperty('window');
      expect(typeof prediction.nextBeat).toBe('number');
      expect(typeof prediction.window).toBe('number');
    });

    it('should calculate movement difficulty score', async () => {
      const sequence = ['dash', 'attack', 'dash', 'defense'];
      const difficulty = await rhythmicController.calculateSequenceDifficulty(sequence);
      
      expect(typeof difficulty).toBe('number');
      expect(difficulty).toBeGreaterThanOrEqual(0);
      expect(difficulty).toBeLessThanOrEqual(10);
    });
  });

  describe('Performance Analytics', () => {
    beforeEach(async () => {
      await rhythmicController.start();
    });

    it('should track performance metrics', async () => {
      // Simulate some player inputs
      await rhythmicController.recordPlayerPerformance('dash', Date.now(), 0.8);
      await rhythmicController.recordPlayerPerformance('attack', Date.now() + 500, 0.9);
      
      const metrics = rhythmicController.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('averageAccuracy');
      expect(metrics).toHaveProperty('totalInputs');
      expect(metrics).toHaveProperty('rhythmConsistency');
      expect(typeof metrics.averageAccuracy).toBe('number');
    });

    it('should provide rhythm consistency analysis', async () => {
      // Record inputs with consistent timing
      const baseTime = Date.now();
      for (let i = 0; i < 5; i++) {
        await rhythmicController.recordPlayerPerformance('dash', baseTime + i * 500, 0.85);
      }
      
      const consistency = rhythmicController.getRhythmConsistency();
      expect(typeof consistency).toBe('number');
      expect(consistency).toBeGreaterThanOrEqual(0);
      expect(consistency).toBeLessThanOrEqual(1);
    });

    it('should identify improvement areas', async () => {
      // Record mixed performance
      await rhythmicController.recordPlayerPerformance('dash', Date.now(), 0.9);
      await rhythmicController.recordPlayerPerformance('attack', Date.now() + 500, 0.4);
      await rhythmicController.recordPlayerPerformance('defense', Date.now() + 1000, 0.3);
      
      const suggestions = await rhythmicController.getImprovementSuggestions();
      
      expect(Array.isArray(suggestions)).toBe(true);
      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('area');
        expect(suggestion).toHaveProperty('description');
        expect(suggestion).toHaveProperty('priority');
      });
    });
  });

  describe('Configuration and Customization', () => {
    beforeEach(async () => {
      await rhythmicController.start();
    });

    it('should handle custom beat patterns', async () => {
      const customPattern = [1, 1, 0, 1, 0, 1, 1, 0];
      
      await rhythmicController.setCustomBeatPattern('custom', customPattern);
      
      const pattern = await rhythmicController.generateMovementPattern('custom', 8);
      expect(pattern.length).toBe(8);
      
      // Verify pattern follows custom beat pattern
      expect(pattern[0].intensity).toBeGreaterThan(0); // 1
      expect(pattern[1].intensity).toBeGreaterThan(0); // 1
      expect(pattern[2].intensity).toBe(0); // 0
    });

    it('should update configuration dynamically', async () => {
      const newConfig = {
        rhythm: {
          bpm: 140,
          syncTolerance: 75,
          adaptive: false
        }
      };

      await rhythmicController.updateConfig(newConfig);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'RhythmicMovementController configuration updated'
      );
      
      expect(rhythmicController.getCurrentBPM()).toBe(140);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await rhythmicController.start();
    });

    it('should handle invalid BPM values gracefully', async () => {
      await rhythmicController.setBPM(-50); // Invalid BPM
      await rhythmicController.setBPM(0); // Invalid BPM
      await rhythmicController.setBPM(1000); // Unrealistic BPM
      
      // Should log warnings and maintain reasonable values
      expect(mockLogger.warn).toHaveBeenCalled();
      
      const currentBpm = rhythmicController.getCurrentBPM();
      expect(currentBpm).toBeGreaterThan(0);
      expect(currentBpm).toBeLessThan(500); // Reasonable upper limit
    });

    it('should handle audio sync failures gracefully', async () => {
      const invalidAudioContext = null;
      
      await rhythmicController.syncWithAudio(invalidAudioContext as any);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to sync with audio')
      );
    });

    it('should handle malformed movement patterns', async () => {
      const invalidPattern = [1, 'invalid', null, undefined] as any;
      
      await rhythmicController.setCustomBeatPattern('invalid', invalidPattern);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid beat pattern')
      );
    });

    it('should recover from timing calculation errors', async () => {
      // Mock Date.now to return invalid values
      const originalNow = Date.now;
      Date.now = vi.fn().mockReturnValue(NaN);
      
      const accuracy = await rhythmicController.checkSyncAccuracy(Date.now());
      
      // Should handle gracefully and return reasonable default
      expect(typeof accuracy).toBe('number');
      expect(!isNaN(accuracy)).toBe(true);
      
      // Restore original Date.now
      Date.now = originalNow;
    });
  });
});
