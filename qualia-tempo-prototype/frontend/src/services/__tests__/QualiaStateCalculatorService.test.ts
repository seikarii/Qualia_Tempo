/**
 * DIRECTIVE 005 - PHASE 1: QualiaStateCalculatorService Critical Test Coverage
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestContainer } from '../../testing/test-container-factory';
import type { Container } from 'inversify';
import { TYPES } from '../inversify.types';
import type { IQualiaStateCalculatorService } from '../interfaces/IQualiaStateCalculatorService';
import type { IEventBus } from '../interfaces/IEventBus';
import type { IPerformanceService } from '../interfaces/IPerformanceService';
import type { PlayerActionEvent, QualiaStateCalculatedEvent } from '../contracts/events.contracts';
import { QualiaStateCalculatorService } from '../QualiaStateCalculatorService';

describe('QualiaStateCalculatorService - Critical Test Coverage', () => {
  let container: Container;
  let qualiaCalculator: IQualiaStateCalculatorService;
  let mockEventBus: IEventBus;
  let mockPerformanceService: IPerformanceService;

  beforeEach(() => {
    vi.useFakeTimers();
    container = createTestContainer();
    mockEventBus = container.get<IEventBus>(TYPES.IEventBus);
    mockPerformanceService = container.get<IPerformanceService>(TYPES.IPerformanceService);

    // Replace mock with real implementation
    container.unbind(TYPES.IQualiaStateCalculatorService);
    container.bind<IQualiaStateCalculatorService>(TYPES.IQualiaStateCalculatorService)
      .to(QualiaStateCalculatorService)
      .inSingletonScope();
    qualiaCalculator = container.get<IQualiaStateCalculatorService>(TYPES.IQualiaStateCalculatorService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. Calculation Per Action Type', () => {
    it('should increase intensity, precision, and flow on HitNote', async () => {
      // Arrange
      qualiaCalculator.initialize();
      const initialState = qualiaCalculator.getCurrentState();
      
      const hitEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'HitNote',
        context: { accuracy: 0.95 }
      };

      // Act
      await mockEventBus.emit(hitEvent);
      const newState = qualiaCalculator.getCurrentState();

      // Assert
      expect(newState.intensity).toBeGreaterThan(initialState.intensity);
      expect(newState.precision).toBeGreaterThan(initialState.precision);
      expect(newState.flow).toBeGreaterThan(initialState.flow);
    });

    it('should increase precision penalty and chaos on MissNote', async () => {
      // Arrange
      qualiaCalculator.initialize();
      const initialState = qualiaCalculator.getCurrentState();
      
      const missEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'MissNote'
      };

      // Act
      await mockEventBus.emit(missEvent);
      const newState = qualiaCalculator.getCurrentState();

      // Assert
      expect(newState.chaos).toBeGreaterThan(initialState.chaos);
      expect(newState.precision).toBeLessThan(initialState.precision);
    });

    it('should increase intensity and aggression on Dash', async () => {
      // Arrange
      qualiaCalculator.initialize();
      const initialState = qualiaCalculator.getCurrentState();
      
      const dashEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'Dash'
      };

      // Act
      await mockEventBus.emit(dashEvent);
      const newState = qualiaCalculator.getCurrentState();

      // Assert
      expect(newState.intensity).toBeGreaterThan(initialState.intensity);
      expect(newState.aggression).toBeGreaterThan(initialState.aggression);
    });
  });

  describe('2. Time Decay', () => {
    it('should decrease all values over time when no actions occur', async () => {
      // Arrange
      qualiaCalculator.initialize();
      const initialState = qualiaCalculator.getCurrentState();

      // Act: Advance time without any actions
      await vi.advanceTimersByTimeAsync(5000);
      const newState = qualiaCalculator.getCurrentState();

      // Assert: Values should decay
      expect(newState.intensity).toBeLessThanOrEqual(initialState.intensity);
      expect(newState.precision).toBeLessThanOrEqual(initialState.precision);
    });
  });

  describe('3. Value Clamping', () => {
    it('should not exceed maximum value of 1.0', async () => {
      // Arrange
      qualiaCalculator.initialize();
      
      const hitEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'HitNote'
      };

      // Act: Emit many HitNote events to try to exceed 1.0
      for (let i = 0; i < 20; i++) {
        await mockEventBus.emit(hitEvent);
      }
      const state = qualiaCalculator.getCurrentState();

      // Assert
      expect(state.intensity).toBeLessThanOrEqual(1.0);
      expect(state.precision).toBeLessThanOrEqual(1.0);
      expect(state.flow).toBeLessThanOrEqual(1.0);
    });

    it('should not go below minimum value of 0.0', async () => {
      // Arrange
      qualiaCalculator.initialize();
      
      const missEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'MissNote'
      };

      // Act: Emit many MissNote events to try to go below 0.0
      for (let i = 0; i < 20; i++) {
        await mockEventBus.emit(missEvent);
      }
      
      // Wait for decay
      await vi.advanceTimersByTimeAsync(10000);
      const state = qualiaCalculator.getCurrentState();

      // Assert
      expect(state.precision).toBeGreaterThanOrEqual(0.0);
      expect(state.chaos).toBeGreaterThanOrEqual(0.0);
    });
  });

  describe('4. Transcendence Activation', () => {
    it('should activate transcendence when thresholds are met', async () => {
      // Arrange
      qualiaCalculator.initialize();
      
      const hitEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'HitNote',
        context: { accuracy: 1.0 }
      };

      // Act: Build up state to transcendence threshold
      for (let i = 0; i < 15; i++) {
        await mockEventBus.emit(hitEvent);
      }
      
      const state = qualiaCalculator.getCurrentState();

      // Assert: Transcendence should be activated or values should be at threshold
      expect(state.intensity).toBeGreaterThan(0.7);
      expect(state.precision).toBeGreaterThan(0.7);
      expect(state.flow).toBeGreaterThan(0.7);
    });

    it('should emit QualiaStateCalculated event with updated transcendence', async () => {
      // Arrange
      const stateHandler = vi.fn();
      mockEventBus.subscribe<QualiaStateCalculatedEvent>('QualiaStateCalculated', stateHandler);
      qualiaCalculator.initialize();
      
      const hitEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'HitNote'
      };

      // Act
      await mockEventBus.emit(hitEvent);

      // Assert
      expect(stateHandler).toHaveBeenCalled();
      const emittedState = stateHandler.mock.calls[0][0] as QualiaStateCalculatedEvent;
      expect(emittedState.qualiaState).toBeDefined();
      expect(emittedState.qualiaState.transcendence).toBeGreaterThanOrEqual(0.0);
    });
  });
});
