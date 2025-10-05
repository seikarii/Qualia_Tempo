import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from 'inversify';
import { TYPES } from '../inversify.types';
import { IJitterService } from '../interfaces/IJitterService';
import { JitterService } from '../JitterService';
import { JitterServiceConfig } from '../contracts/IJitterService.contracts';
import { QualiaLogger } from '../Logger';
import type { ILogger } from '../interfaces/ILogger';

describe('JitterService', () => {
  let container: Container;
  let jitterService: IJitterService;
  
  const enabledConfig: JitterServiceConfig = {
    enabled: true,
    sampleCount: 8,
    strength: 1.0,
    resetOnMove: true
  };

  beforeEach(() => {
    container = new Container();
    
    // Bind logger
    container.bind<ILogger>(TYPES.ILogger).to(QualiaLogger).inSingletonScope();
    
    // Bind config
    container.bind<JitterServiceConfig>(TYPES.JitterServiceConfig)
      .toConstantValue(enabledConfig);
    
    // Bind service
    container.bind<IJitterService>(TYPES.IJitterService).to(JitterService).inSingletonScope();
    
    jitterService = container.get<IJitterService>(TYPES.IJitterService);
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(jitterService.isEnabled()).toBe(true);
      const state = jitterService.getState();
      expect(state.currentIndex).toBe(0);
      expect(state.totalSamples).toBe(8);
    });

    it('should initialize disabled when config.enabled = false', () => {
      const disabledConfig: JitterServiceConfig = {
        ...enabledConfig,
        enabled: false
      };
      
      // Create new container for this test
      const testContainer = new Container();
      testContainer.bind<ILogger>(TYPES.ILogger).to(QualiaLogger).inSingletonScope();
      testContainer.bind<JitterServiceConfig>(TYPES.JitterServiceConfig)
        .toConstantValue(disabledConfig);
      testContainer.bind<IJitterService>(TYPES.IJitterService).to(JitterService).inSingletonScope();
      
      const disabledService = testContainer.get<IJitterService>(TYPES.IJitterService);
      expect(disabledService.isEnabled()).toBe(false);
    });
  });

  describe('Halton Sequence Generation', () => {
    it('should generate deterministic Halton(2,3) sequence', () => {
      const offsets: Array<{ x: number; y: number }> = [];
      
      // Collect 8 samples
      for (let i = 0; i < 8; i++) {
        offsets.push(jitterService.getJitterOffset());
        jitterService.advanceFrame();
      }
      
      // Verify offsets are within [-0.5, 0.5] range
      offsets.forEach((offset) => {
        expect(offset.x).toBeGreaterThanOrEqual(-0.5);
        expect(offset.x).toBeLessThanOrEqual(0.5);
        expect(offset.y).toBeGreaterThanOrEqual(-0.5);
        expect(offset.y).toBeLessThanOrEqual(0.5);
      });
      
      // Verify sequence is deterministic (same first offset after cycle)
      jitterService.reset();
      const firstOffset = jitterService.getJitterOffset();
      expect(firstOffset.x).toBeCloseTo(offsets[0].x, 10);
      expect(firstOffset.y).toBeCloseTo(offsets[0].y, 10);
    });

    it('should cycle through sampleCount frames', () => {
      const firstOffset = jitterService.getJitterOffset();
      
      // Advance through full cycle
      for (let i = 0; i < 8; i++) {
        jitterService.advanceFrame();
      }
      
      // Should return to first offset
      const cycledOffset = jitterService.getJitterOffset();
      expect(cycledOffset.x).toBeCloseTo(firstOffset.x, 10);
      expect(cycledOffset.y).toBeCloseTo(firstOffset.y, 10);
    });

    it('should apply strength multiplier correctly', () => {
      const halfStrengthConfig: JitterServiceConfig = {
        ...enabledConfig,
        strength: 0.5
      };
      
      // Create new container for this test
      const testContainer = new Container();
      testContainer.bind<ILogger>(TYPES.ILogger).to(QualiaLogger).inSingletonScope();
      testContainer.bind<JitterServiceConfig>(TYPES.JitterServiceConfig)
        .toConstantValue(halfStrengthConfig);
      testContainer.bind<IJitterService>(TYPES.IJitterService).to(JitterService).inSingletonScope();
      
      const halfStrengthService = testContainer.get<IJitterService>(TYPES.IJitterService);
      
      const offset = halfStrengthService.getJitterOffset();
      
      // With strength = 0.5, max offset should be ±0.25
      expect(Math.abs(offset.x)).toBeLessThanOrEqual(0.25);
      expect(Math.abs(offset.y)).toBeLessThanOrEqual(0.25);
    });
  });

  describe('Frame Advancement', () => {
    it('should advance frame index correctly', () => {
      expect(jitterService.getState().currentIndex).toBe(0);
      
      jitterService.advanceFrame();
      expect(jitterService.getState().currentIndex).toBe(1);
      
      jitterService.advanceFrame();
      expect(jitterService.getState().currentIndex).toBe(2);
    });

    it('should wrap around after sampleCount frames', () => {
      // Advance to last frame
      for (let i = 0; i < 7; i++) {
        jitterService.advanceFrame();
      }
      expect(jitterService.getState().currentIndex).toBe(7);
      
      // Advance one more - should wrap to 0
      jitterService.advanceFrame();
      expect(jitterService.getState().currentIndex).toBe(0);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to frame 0', () => {
      // Advance several frames
      jitterService.advanceFrame();
      jitterService.advanceFrame();
      jitterService.advanceFrame();
      expect(jitterService.getState().currentIndex).toBe(3);
      
      // Reset
      jitterService.reset();
      expect(jitterService.getState().currentIndex).toBe(0);
    });

    it('should return same offset after reset', () => {
      const firstOffset = jitterService.getJitterOffset();
      
      // Advance and reset
      jitterService.advanceFrame();
      jitterService.advanceFrame();
      jitterService.reset();
      
      const resetOffset = jitterService.getJitterOffset();
      expect(resetOffset.x).toBeCloseTo(firstOffset.x, 10);
      expect(resetOffset.y).toBeCloseTo(firstOffset.y, 10);
    });
  });

  describe('Disabled Behavior', () => {
    it('should return zero offset when disabled', () => {
      const disabledConfig: JitterServiceConfig = {
        ...enabledConfig,
        enabled: false
      };
      
      // Create new container for this test
      const testContainer = new Container();
      testContainer.bind<ILogger>(TYPES.ILogger).to(QualiaLogger).inSingletonScope();
      testContainer.bind<JitterServiceConfig>(TYPES.JitterServiceConfig)
        .toConstantValue(disabledConfig);
      testContainer.bind<IJitterService>(TYPES.IJitterService).to(JitterService).inSingletonScope();
      
      const disabledService = testContainer.get<IJitterService>(TYPES.IJitterService);
      
      const offset = disabledService.getJitterOffset();
      expect(offset.x).toBe(0);
      expect(offset.y).toBe(0);
    });

    it('should not advance frame when disabled', () => {
      const disabledConfig: JitterServiceConfig = {
        ...enabledConfig,
        enabled: false
      };
      
      // Create new container for this test
      const testContainer = new Container();
      testContainer.bind<ILogger>(TYPES.ILogger).to(QualiaLogger).inSingletonScope();
      testContainer.bind<JitterServiceConfig>(TYPES.JitterServiceConfig)
        .toConstantValue(disabledConfig);
      testContainer.bind<IJitterService>(TYPES.IJitterService).to(JitterService).inSingletonScope();
      
      const disabledService = testContainer.get<IJitterService>(TYPES.IJitterService);
      
      const initialState = disabledService.getState();
      disabledService.advanceFrame();
      const afterAdvance = disabledService.getState();
      
      expect(afterAdvance.currentIndex).toBe(initialState.currentIndex);
    });
  });

  describe('State Management', () => {
    it('should return copy of state (immutable)', () => {
      const state1 = jitterService.getState();
      jitterService.advanceFrame();
      const state2 = jitterService.getState();
      
      // state1 should not be modified
      expect(state1.currentIndex).toBe(0);
      expect(state2.currentIndex).toBe(1);
    });
  });
});
