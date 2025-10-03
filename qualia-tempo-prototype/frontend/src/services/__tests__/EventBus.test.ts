/**
 * DIRECTIVE 005 - PHASE 1: EventBus Critical Test Coverage
 * 
 * ARCHITECTURE COMPLIANCE:
 * - Uses createTestContainer() for total isolation
 * - No manual instantiation (new EventBus())
 * - Mocks used as oracles for verification
 * - Tests business logic, not implementation details
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestContainer, resetAllMocks } from '../../testing/test-container-factory';
import type { Container } from 'inversify';
import { TYPES } from '../inversify.types';
import type { IEventBus } from '../interfaces/IEventBus';
import type { ILogger } from '../interfaces/ILogger';
import type { ITimerService } from '../interfaces/ITimerService';
import type { PlayerActionEvent, ErrorEvent } from '../contracts/events.contracts';
import { EventBus } from '../EventBus';

describe('EventBus - Critical Test Coverage', () => {
  let container: Container;
  let eventBus: IEventBus;
  let mockLogger: ILogger;
  let mockTimerService: ITimerService;

  beforeEach(() => {
    // STEP 1: Create isolated test container
    container = createTestContainer();
    
    // STEP 2: Resolve dependencies from container
    mockLogger = container.get<ILogger>(TYPES.ILogger);
    mockTimerService = container.get<ITimerService>(TYPES.ITimerService);
    
    // STEP 3: Bind and resolve the SUT
    container.bind<IEventBus>(TYPES.IEventBus).to(EventBus).inSingletonScope();
    eventBus = container.get<IEventBus>(TYPES.IEventBus);
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('1. Subscription and Emission', () => {
    it('should invoke subscribed handler when event is emitted', async () => {
      // Arrange
      const handler = vi.fn();
      const testEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'HitNote',
        context: { noteId: 'test-note-1' }
      };

      // Act
      eventBus.subscribe<PlayerActionEvent>('PlayerAction', handler);
      await eventBus.emit(testEvent);

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PlayerAction',
          action: 'HitNote',
          context: { noteId: 'test-note-1' },
          timestamp: expect.any(Date)
        })
      );
    });

    it('should invoke multiple handlers for the same event type', async () => {
      // Arrange
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const testEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'Dash'
      };

      // Act
      eventBus.subscribe<PlayerActionEvent>('PlayerAction', handler1);
      eventBus.subscribe<PlayerActionEvent>('PlayerAction', handler2);
      await eventBus.emit(testEvent);

      // Assert
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Unsubscription', () => {
    it('should not invoke handler after unsubscribe', async () => {
      // Arrange
      const handler = vi.fn();
      const testEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'MissNote'
      };

      // Act
      const listenerId = eventBus.subscribe<PlayerActionEvent>('PlayerAction', handler);
      eventBus.unsubscribe(listenerId);
      await eventBus.emit(testEvent);

      // Assert
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return true when successfully unsubscribing', () => {
      // Arrange
      const handler = vi.fn();
      const listenerId = eventBus.subscribe<PlayerActionEvent>('PlayerAction', handler);

      // Act
      const result = eventBus.unsubscribe(listenerId);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('3. Once Subscription', () => {
    it('should invoke once handler only one time', async () => {
      // Arrange
      const handler = vi.fn();
      const testEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'StartGame'
      };

      // Act
      eventBus.once<PlayerActionEvent>('PlayerAction', handler);
      await eventBus.emit(testEvent);
      await eventBus.emit(testEvent); // Second emission

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should automatically remove once handler after first invocation', async () => {
      // Arrange
      const handler = vi.fn();
      const testEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'PauseGame'
      };

      // Act
      eventBus.once<PlayerActionEvent>('PlayerAction', handler);
      await eventBus.emit(testEvent);
      
      const stats = eventBus.getStats();

      // Assert
      expect(stats.totalListeners).toBe(0);
    });
  });

  describe('4. Error Isolation', () => {
    it('should isolate errors and continue executing remaining handlers', async () => {
      // Arrange
      const handler1 = vi.fn(() => {
        throw new Error('Handler 1 failed');
      });
      const handler2 = vi.fn();
      const testEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'HitNote'
      };

      // Act
      eventBus.subscribe<PlayerActionEvent>('PlayerAction', handler1);
      eventBus.subscribe<PlayerActionEvent>('PlayerAction', handler2);
      await eventBus.emit(testEvent);

      // Assert: handler2 should still execute despite handler1 throwing
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should emit ErrorEvent when a handler throws', async () => {
      // Arrange
      const errorHandler = vi.fn();
      const failingHandler = vi.fn(() => {
        throw new Error('Critical failure');
      });
      
      const testEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'Dash'
      };

      // Act
      eventBus.subscribe<ErrorEvent>('Error', errorHandler);
      eventBus.subscribe<PlayerActionEvent>('PlayerAction', failingHandler);
      
      await eventBus.emit(testEvent);
      
      // Wait for async error emission (EventBus uses setTimeout for error events)
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert: ErrorEvent should be emitted
      expect(errorHandler).toHaveBeenCalled();
      const emittedError = errorHandler.mock.calls[0][0] as ErrorEvent;
      expect(emittedError.type).toBe('Error');
      expect(emittedError.error.message).toBe('Critical failure');
    });
  });

  describe('5. Priority Handling', () => {
    it('should execute high priority handlers before normal priority', async () => {
      // Arrange
      const executionOrder: string[] = [];
      const normalHandler = vi.fn(() => executionOrder.push('normal'));
      const highHandler = vi.fn(() => executionOrder.push('high'));
      
      const testEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'HitNote'
      };

      // Act: Subscribe in reverse order to test sorting
      eventBus.subscribe<PlayerActionEvent>('PlayerAction', normalHandler, { priority: 'normal' });
      eventBus.subscribe<PlayerActionEvent>('PlayerAction', highHandler, { priority: 'high' });
      
      await eventBus.emit(testEvent);

      // Assert
      expect(executionOrder).toEqual(['high', 'normal']);
    });

    it('should execute low priority handlers last', async () => {
      // Arrange
      const executionOrder: string[] = [];
      const lowHandler = vi.fn(() => executionOrder.push('low'));
      const normalHandler = vi.fn(() => executionOrder.push('normal'));
      const highHandler = vi.fn(() => executionOrder.push('high'));
      
      const testEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'Dash'
      };

      // Act
      eventBus.subscribe<PlayerActionEvent>('PlayerAction', lowHandler, { priority: 'low' });
      eventBus.subscribe<PlayerActionEvent>('PlayerAction', highHandler, { priority: 'high' });
      eventBus.subscribe<PlayerActionEvent>('PlayerAction', normalHandler, { priority: 'normal' });
      
      await eventBus.emit(testEvent);

      // Assert
      expect(executionOrder).toEqual(['high', 'normal', 'low']);
    });
  });

  describe('6. Lifecycle Management', () => {
    it('should clear all listeners when clear() is called', () => {
      // Arrange
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      eventBus.subscribe<PlayerActionEvent>('PlayerAction', handler1);
      eventBus.subscribe<PlayerActionEvent>('PlayerAction', handler2);

      // Act
      eventBus.clear();
      const stats = eventBus.getStats();

      // Assert
      expect(stats.totalListeners).toBe(0);
      expect(stats.eventTypes).toEqual([]);
    });

    it('should prevent emissions after destroy()', async () => {
      // Arrange
      const handler = vi.fn();
      const testEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'HitNote'
      };

      eventBus.subscribe<PlayerActionEvent>('PlayerAction', handler);

      // Act
      eventBus.destroy();
      await eventBus.emit(testEvent);

      // Assert
      expect(handler).not.toHaveBeenCalled();
      const stats = eventBus.getStats();
      expect(stats.isDestroyed).toBe(true);
    });

    it('should log warning when emitting to destroyed EventBus', async () => {
      // Arrange
      const testEvent: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'StartGame'
      };

      // Act
      eventBus.destroy();
      await eventBus.emit(testEvent);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should successfully unsubscribe from destroyed EventBus without errors', () => {
      // Arrange
      const handler = vi.fn();
      const listenerId = eventBus.subscribe<PlayerActionEvent>('PlayerAction', handler);

      // Act
      eventBus.destroy();
      const result = eventBus.unsubscribe(listenerId);

      // Assert: Should return true and not throw
      expect(result).toBe(true);
    });
  });

  describe('7. Statistics and Monitoring', () => {
    it('should track listener count correctly', () => {
      // Arrange & Act
      eventBus.subscribe<PlayerActionEvent>('PlayerAction', vi.fn());
      eventBus.subscribe<PlayerActionEvent>('PlayerAction', vi.fn());
      eventBus.subscribe<ErrorEvent>('Error', vi.fn());

      const stats = eventBus.getStats();

      // Assert
      expect(stats.totalListeners).toBe(3);
      expect(stats.eventTypes).toContain('PlayerAction');
      expect(stats.eventTypes).toContain('Error');
    });

    it('should maintain event history', async () => {
      // Arrange
      const event1: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'HitNote'
      };
      const event2: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: 'MissNote'
      };

      // Act
      await eventBus.emit(event1);
      await eventBus.emit(event2);
      
      const history = eventBus.getEventHistory('PlayerAction');

      // Assert
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe('PlayerAction');
      expect(history[1].type).toBe('PlayerAction');
    });
  });
});
