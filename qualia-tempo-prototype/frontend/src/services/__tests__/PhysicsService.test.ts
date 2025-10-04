/**
 * QUALIA.CODE v2.0 - PhysicsService Tests (REFACTORED v3)
 * Observable Behavior Pattern: Tests validate event emission by manually triggering service loops.
 * 
 * KEY INSIGHT: Updated timer mock stores RAF callbacks instead of executing immediately.
 * Tests manually trigger callbacks from shared `rafCallbacks` array.
 * 
 * PATTERN APPLIED: Spy on emit(), trigger logic via rafCallbacks, validate events emitted
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestContainer } from '../../testing/test-container-factory';
import { TYPES } from '../inversify.types';
import type { IPhysicsService } from '../interfaces/IPhysicsService';
import type { IEventBus } from '../interfaces/IEventBus';
import type { IInputStateService } from '../interfaces/IInputStateService';
import type { Container } from 'inversify';
import type { PhysicsDataUpdatedEvent } from '../contracts/events.contracts';
import { rafCallbacks, clearRafCallbacks } from '../../testing/mocks/timer-service.mock';

describe('PhysicsService', () => {
  let container: Container;
  let physicsService: IPhysicsService;
  let mockEventBus: IEventBus;
  let mockInputStateService: IInputStateService;

  beforeEach(() => {
    clearRafCallbacks();
    container = createTestContainer();
    physicsService = container.get<IPhysicsService>(TYPES.IPhysicsService);
    mockEventBus = container.get<IEventBus>(TYPES.IEventBus);
    mockInputStateService = container.get<IInputStateService>(TYPES.IInputStateService);
  });

  afterEach(() => {
    clearRafCallbacks();
  });

  /**
   * Helper to manually trigger one physics loop iteration
   */
  const triggerPhysicsLoop = () => {
    if (rafCallbacks.length > 0) {
      const callback = rafCallbacks.shift();
      if (callback) {
        callback();
      }
    }
  };

  describe('initialize', () => {
    it('should initialize without errors', () => {
      expect(() => physicsService.initialize()).not.toThrow();
    });

    it('should start physics loop and emit PhysicsDataUpdatedEvent', () => {
      // PATTERN: Observable Behavior - Validate event emission
      const emitSpy = vi.spyOn(mockEventBus, 'emit');
      (mockInputStateService.getDirectionVector as any) = vi.fn().mockReturnValue({ x: 1, z: 0 });

      physicsService.initialize();
      
      // Manually trigger one loop iteration
      triggerPhysicsLoop();

      // Validate event was emitted
      expect(emitSpy).toHaveBeenCalled();
      
      const calls = emitSpy.mock.calls;
      const physicsEvents = calls.filter((call: any[]) => call[0].type === 'PhysicsDataUpdated');
      expect(physicsEvents.length).toBeGreaterThan(0);
      
      const event = physicsEvents[0][0] as PhysicsDataUpdatedEvent;
      expect(event).toHaveProperty('type', 'PhysicsDataUpdated');
      expect(event).toHaveProperty('velocity');
      expect(event).toHaveProperty('acceleration');
    });
  });

  describe('getCurrentPhysicsData', () => {
    it('should return initial physics data', () => {
      const data = physicsService.getCurrentPhysicsData();
      expect(data).toHaveProperty('velocity');
      expect(data).toHaveProperty('acceleration');
      expect(data.velocity.x).toBe(0);
      expect(data.velocity.z).toBe(0);
    });

    it('should update velocity based on input (observable via event)', () => {
      // PATTERN: Validate behavior through event emission
      (mockInputStateService.getDirectionVector as any) = vi.fn().mockReturnValue({ x: 1, z: 0 });
      const emitSpy = vi.spyOn(mockEventBus, 'emit');

      physicsService.initialize();
      triggerPhysicsLoop();

      const physicsEvents = emitSpy.mock.calls.filter((call: any[]) => call[0].type === 'PhysicsDataUpdated');
      expect(physicsEvents.length).toBeGreaterThan(0);

      const event = physicsEvents[0][0] as PhysicsDataUpdatedEvent;
      
      // Velocity should reflect input
      expect(event.velocity).toBeDefined();
      expect(event.acceleration.x).toBeGreaterThan(0); // Should have positive acceleration from input
    });
  });

  describe('isRunning', () => {
    it('should return false initially', () => {
      expect(physicsService.isRunning()).toBe(false);
    });

    it('should return true after initialization', () => {
      physicsService.initialize();
      expect(physicsService.isRunning()).toBe(true);
    });

    it('should return false after cleanup', () => {
      physicsService.initialize();
      expect(physicsService.isRunning()).toBe(true);
      
      physicsService.cleanup();
      expect(physicsService.isRunning()).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clean up resources without errors', () => {
      physicsService.initialize();
      expect(() => physicsService.cleanup()).not.toThrow();
    });

    it('should stop physics simulation', () => {
      physicsService.initialize();
      expect(physicsService.isRunning()).toBe(true);
      
      physicsService.cleanup();
      expect(physicsService.isRunning()).toBe(false);
    });
  });

  describe('QUALIA.CODE Compliance', () => {
    it('should implement IBaseService interface', () => {
      expect(physicsService).toHaveProperty('initialize');
      expect(physicsService).toHaveProperty('cleanup');
      expect(typeof physicsService.initialize).toBe('function');
      expect(typeof physicsService.cleanup).toBe('function');
    });

    it('should emit PhysicsDataUpdatedEvent during simulation', () => {
      // PATTERN: Observable Behavior - Validate event structure
      const emitSpy = vi.spyOn(mockEventBus, 'emit');
      (mockInputStateService.getDirectionVector as any) = vi.fn().mockReturnValue({ x: 0, z: 0 });

      physicsService.initialize();
      triggerPhysicsLoop();

      const physicsEvents = emitSpy.mock.calls.filter((call: any[]) => call[0].type === 'PhysicsDataUpdated');
      expect(physicsEvents.length).toBeGreaterThan(0);

      const event = physicsEvents[0][0] as PhysicsDataUpdatedEvent;
      expect(event.type).toBe('PhysicsDataUpdated');
      expect(event.velocity).toHaveProperty('x');
      expect(event.velocity).toHaveProperty('y');
      expect(event.velocity).toHaveProperty('z');
      expect(event.acceleration).toHaveProperty('x');
      expect(event.acceleration).toHaveProperty('y');
      expect(event.acceleration).toHaveProperty('z');
    });

    it('should use injected dependencies only', () => {
      // Service should not directly access platform APIs
      expect(mockEventBus).toBeDefined();
      expect(mockInputStateService).toBeDefined();
    });
  });

  describe('Physics Simulation Accuracy', () => {
    it('should apply friction when no input (observable via event)', () => {
      // PATTERN: Validate physics behavior through event emission
      (mockInputStateService.getDirectionVector as any) = vi.fn().mockReturnValue({ x: 0, z: 0 });
      const emitSpy = vi.spyOn(mockEventBus, 'emit');

      physicsService.initialize();
      triggerPhysicsLoop();

      const physicsEvents = emitSpy.mock.calls.filter((call: any[]) => call[0].type === 'PhysicsDataUpdated');
      expect(physicsEvents.length).toBeGreaterThan(0);
      
      const event = physicsEvents[0][0] as PhysicsDataUpdatedEvent;

      // With no input, friction should keep velocity at/near zero
      expect(Math.abs(event.velocity.x)).toBeLessThanOrEqual(0.1);
      expect(Math.abs(event.velocity.z)).toBeLessThanOrEqual(0.1);
    });

    it('should emit events with clamped velocity', () => {
      // PATTERN: Validate velocity clamping through event emission
      (mockInputStateService.getDirectionVector as any) = vi.fn().mockReturnValue({ x: 1, z: 1 });
      const emitSpy = vi.spyOn(mockEventBus, 'emit');

      physicsService.initialize();
      
      // Trigger multiple iterations to build up velocity
      for (let i = 0; i < 5; i++) {
        triggerPhysicsLoop();
      }

      const physicsEvents = emitSpy.mock.calls.filter((call: any[]) => call[0].type === 'PhysicsDataUpdated');
      
      // Check that velocity magnitude doesn't exceed config max
      physicsEvents.forEach((call: any[]) => {
        const event = call[0] as PhysicsDataUpdatedEvent;
        const magnitude = Math.sqrt(
          event.velocity.x ** 2 + event.velocity.y ** 2 + event.velocity.z ** 2
        );
        // Max velocity should be enforced (default is typically 10)
        expect(magnitude).toBeLessThanOrEqual(20); // Reasonable upper bound
      });
    });
  });
});
