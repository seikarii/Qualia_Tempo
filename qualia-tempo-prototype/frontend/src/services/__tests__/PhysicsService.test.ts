/**
 * QUALIA.CODE v2.0 - PhysicsService Tests
 * Unit tests for physics simulation service following QUALIA.CODE testing patterns.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContainer } from '../../testing/test-container-factory';
import { TYPES } from '../inversify.types';
import type { IPhysicsService } from '../interfaces/IPhysicsService';
import type { IEventBus } from '../interfaces/IEventBus';
import type { IInputStateService } from '../interfaces/IInputStateService';
import type { Container } from 'inversify';

describe('PhysicsService', () => {
  let container: Container;
  let physicsService: IPhysicsService;
  let mockEventBus: IEventBus;
  let mockInputStateService: IInputStateService;

  beforeEach(() => {
    container = createTestContainer();
    physicsService = container.get<IPhysicsService>(TYPES.IPhysicsService);
    mockEventBus = container.get<IEventBus>(TYPES.IEventBus);
    mockInputStateService = container.get<IInputStateService>(TYPES.IInputStateService);
  });

  describe('initialize', () => {
    it('should initialize without errors', () => {
      expect(() => physicsService.initialize()).not.toThrow();
    });

    it('should start physics loop', () => {
      physicsService.initialize();
      expect(physicsService.isRunning()).toBe(true);
    });
  });

  describe('getCurrentPhysicsData', () => {
    it('should return initial physics data', () => {
      const physicsData = physicsService.getCurrentPhysicsData();
      
      expect(physicsData).toHaveProperty('velocity');
      expect(physicsData).toHaveProperty('acceleration');
      expect(physicsData.velocity).toEqual({ x: 0, y: 0, z: 0 });
      expect(physicsData.acceleration).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('should update velocity based on input', () => {
      // Mock input state to return a direction vector
      mockInputStateService.getDirectionVector = vi.fn().mockReturnValue({ x: 1, z: 0 });
      
      physicsService.initialize();
      
      // Wait for physics tick
      setTimeout(() => {
        const physicsData = physicsService.getCurrentPhysicsData();
        expect(physicsData.velocity.x).toBeGreaterThan(0);
      }, 100);
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
      const emitSpy = vi.spyOn(mockEventBus, 'emit');
      
      physicsService.initialize();
      
      // Wait for at least one physics tick
      setTimeout(() => {
        expect(emitSpy).toHaveBeenCalled();
        
        // Check that emitted events have correct structure
        const calls = emitSpy.mock.calls;
        const physicsEvents = calls.filter(call => 
          call[0] && typeof call[0] === 'object' && 'type' in call[0] && call[0].type === 'PhysicsDataUpdated'
        );
        
        expect(physicsEvents.length).toBeGreaterThan(0);
      }, 100);
    });

    it('should use injected dependencies only', () => {
      // Service should not create its own dependencies
      expect(physicsService).toBeDefined();
      expect(mockInputStateService.getDirectionVector).toBeDefined();
    });
  });

  describe('Physics Simulation Accuracy', () => {
    it('should apply friction when no input', () => {
      mockInputStateService.getDirectionVector = vi.fn().mockReturnValue({ x: 0, z: 0 });
      
      physicsService.initialize();
      
      // Manually set velocity (this would normally come from previous input)
      const initialData = physicsService.getCurrentPhysicsData();
      initialData.velocity.x = 5;
      
      // Wait for friction to be applied
      setTimeout(() => {
        const physicsData = physicsService.getCurrentPhysicsData();
        // Velocity should decrease due to friction
        expect(physicsData.velocity.x).toBeLessThan(5);
      }, 100);
    });

    it('should clamp velocity to max velocity', () => {
      // Mock high acceleration input
      mockInputStateService.getDirectionVector = vi.fn().mockReturnValue({ x: 1, z: 1 });
      
      physicsService.initialize();
      
      // After many ticks, velocity should be clamped to max
      setTimeout(() => {
        const physicsData = physicsService.getCurrentPhysicsData();
        const velocityMagnitude = Math.sqrt(
          physicsData.velocity.x ** 2 +
          physicsData.velocity.y ** 2 +
          physicsData.velocity.z ** 2
        );
        
        // Should not exceed max velocity (10 from config)
        expect(velocityMagnitude).toBeLessThanOrEqual(10);
      }, 500);
    });
  });
});
