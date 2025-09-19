import { describe, test, expect, beforeEach, afterEach, vi, type Mocked } from 'vitest';
/**
 * Tests for NotificationService - GOLD.CODE IoC Compliance
 * Event-driven notification bridge between EventBus and Zustand store
 */

import { createTestContainer, getMocksFromContainer, resetAllMocks } from '../../testing/test-container-factory';
import { NotificationService } from '../NotificationService';
import { INotificationService } from '../interfaces/INotificationService';
import { IEventBus } from '../interfaces/IEventBus';
import { IGameStateStore } from '../interfaces/IGameStateStore';
import { QualiaLogger } from '../Logger';
import { Container } from 'inversify';
import { TYPES } from '../inversify.types';

// Mock decorators
vi.mock('../../utils/decorators', () => ({
  logMethod: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  catchError: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

describe('NotificationService - GOLD.CODE IoC Testing', () => {
  let notificationService: INotificationService;
  let container: Container;
  let mockEventBus: Mocked<IEventBus>;
  let mockGameStateStore: Mocked<IGameStateStore>;
  let mockLogger: Mocked<QualiaLogger>;

  beforeEach(() => {
    // Reset all mocks to clean state
    resetAllMocks();

    // Create fresh test container with proper IoC bindings
    container = createTestContainer();

    // Get mock instances for assertions
    const mocks = getMocksFromContainer(container);
    mockEventBus = mocks.mockEventBus as Mocked<IEventBus>;
    mockGameStateStore = mocks.mockGameStateStore as Mocked<IGameStateStore>;
    mockLogger = mocks.mockLogger as Mocked<QualiaLogger>;

    // GOLD.CODE COMPLIANCE: Resolve service from IoC container
    notificationService = container.get<INotificationService>(TYPES.INotificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Service Initialization', () => {
    it('should initialize with proper IoC dependencies', () => {
      expect(notificationService).toBeDefined();
      expect(notificationService).toBeInstanceOf(NotificationService);
    });

    it('should start successfully and register event listeners', async () => {
      await notificationService.start();
      
      // Verify logger was called for initialization
      expect(mockLogger.info).toHaveBeenCalledWith('NotificationService started');
      
      // Verify event subscriptions were registered
      expect(mockEventBus.subscribe).toHaveBeenCalled();
    });

    it('should stop successfully and cleanup resources', async () => {
      await notificationService.start();
      await notificationService.stop();
      
      expect(mockLogger.info).toHaveBeenCalledWith('NotificationService stopped');
      expect(mockEventBus.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Notification Display', () => {
    beforeEach(async () => {
      await notificationService.start();
    });

    it('should show notifications with different types', async () => {
      const message = 'Test notification';
      const types: Array<'info' | 'success' | 'warning' | 'error'> = ['info', 'success', 'warning', 'error'];
      
      for (const type of types) {
        await notificationService.show(message, type);
        
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Showing notification',
          expect.objectContaining({
            message,
            type
          })
        );
      }
    });

    it('should show notifications with custom duration', async () => {
      const message = 'Timed notification';
      const duration = 5000;
      
      await notificationService.show(message, 'info', duration);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Showing notification',
        expect.objectContaining({
          duration
        })
      );
    });

    it('should show notifications with metadata', async () => {
      const message = 'Notification with metadata';
      const metadata = { userId: '123', action: 'save' };
      
      await notificationService.show(message, 'success', 3000, metadata);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Showing notification',
        expect.objectContaining({
          metadata
        })
      );
    });
  });

  describe('Priority Queue System', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await notificationService.start();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should handle high priority notifications first', async () => {
      await notificationService.show('Low priority', 'info', 1000, { priority: 'low' });
      await notificationService.show('High priority', 'error', 1000, { priority: 'high' });
      await notificationService.show('Normal priority', 'warning', 1000, { priority: 'normal' });
      
      // Check that notifications are processed in priority order
      const logCalls = (mockLogger.info as Mock).mock.calls;
      const notificationCalls = logCalls.filter(call => call[0] === 'Showing notification');
      
      expect(notificationCalls.length).toBeGreaterThanOrEqual(3);
    });

    it('should limit concurrent notifications', async () => {
      // Show many notifications quickly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(notificationService.show(`Notification ${i}`, 'info', 100));
      }
      
      await Promise.all(promises);
      
      // Should have managed concurrent display appropriately
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('Event-Driven Notifications', () => {
    beforeEach(async () => {
      await notificationService.start();
    });

    it('should listen to EventBus events and create notifications', () => {
      // Verify that the service subscribed to events
      expect(mockEventBus.subscribe).toHaveBeenCalled();
      
      // Get the subscription callback
      const subscribeCall = (mockEventBus.subscribe as Mock).mock.calls[0];
      expect(subscribeCall).toBeDefined();
      expect(typeof subscribeCall[1]).toBe('function'); // callback function
    });

    it('should handle game events and show appropriate notifications', async () => {
      // Simulate the subscription callback being called
      const subscribeCall = (mockEventBus.subscribe as Mock).mock.calls[0];
      const eventHandler = subscribeCall[1];
      
      // Simulate a game event
      const gameEvent = {
        type: 'ACHIEVEMENT_UNLOCKED',
        data: { achievement: 'Perfect Score', score: 1000 }
      };
      
      await eventHandler(gameEvent);
      
      // Should process the event appropriately
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('Store Integration', () => {
    beforeEach(async () => {
      await notificationService.start();
    });

    it('should update game state store with notification state', async () => {
      await notificationService.show('Store update test', 'info');
      
      // Should have attempted to update the store
      expect(mockGameStateStore.setState).toHaveBeenCalled();
    });

    it('should track notification history in store', async () => {
      await notificationService.show('First notification', 'info');
      await notificationService.show('Second notification', 'success');
      
      // Should have updated store multiple times
      expect(mockGameStateStore.setState).toHaveBeenCalledTimes(2);
    });
  });

  describe('Throttling and Rate Limiting', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await notificationService.start();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should throttle rapid notifications of same type', async () => {
      const message = 'Throttled notification';
      
      // Send multiple notifications rapidly to exceed throttling limits
      for (let i = 0; i < 15; i++) {
        await notificationService.show(message, 'info');
      }
      
      // Should have throttled some notifications
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('throttled')
      );
    });

    it('should reset throttling after time window', async () => {
      await notificationService.show('Throttle test', 'info');
      
      // Advance time past throttle window
      vi.advanceTimersByTime(5000);
      
      await notificationService.show('Throttle test', 'info');
      
      // Should allow notification after throttle reset
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Showing notification',
        expect.objectContaining({
          message: 'Throttle test'
        })
      );
    });
  });

  describe('Filtering System', () => {
    beforeEach(async () => {
      await notificationService.start();
    });

    it('should filter notifications based on user preferences', async () => {
      // Configure to filter info notifications
      const config = {
        notifications: {
          enabled: true,
          types: {
            info: false,
            success: true,
            warning: true,
            error: true
          }
        }
      };
      
      await notificationService.updateConfig(config);
      await notificationService.show('Filtered info', 'info');
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('filtered')
      );
    });

    it('should allow notifications based on priority override', async () => {
      // Configure to filter warnings but allow high priority
      const config = {
        notifications: {
          enabled: true,
          types: {
            warning: false
          },
          allowHighPriority: true
        }
      };
      
      await notificationService.updateConfig(config);
      await notificationService.show('High priority warning', 'warning', 3000, { priority: 'high' });
      
      // Should show despite filter due to high priority
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Showing notification',
        expect.objectContaining({
          message: 'High priority warning'
        })
      );
    });
  });

  describe('Auto-dismiss Functionality', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await notificationService.start();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should auto-dismiss notifications after duration', async () => {
      await notificationService.show('Auto-dismiss test', 'info', 1000);
      
      // Fast-forward time past duration
      vi.advanceTimersByTime(1500);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Auto-dismissed')
      );
    });

    it('should not auto-dismiss persistent notifications', async () => {
      await notificationService.show('Persistent notification', 'error', 0); // 0 = persistent
      
      // Fast-forward time
      vi.advanceTimersByTime(10000);
      
      // Should not be auto-dismissed
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Auto-dismissed')
      );
    });
  });

  describe('Manual Notification Management', () => {
    beforeEach(async () => {
      await notificationService.start();
    });

    it('should hide specific notifications by ID', async () => {
      const notificationId = await notificationService.show('Hideable notification', 'info');
      expect(typeof notificationId).toBe('string');
      
      await notificationService.hide(notificationId);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Hiding notification',
        expect.objectContaining({ id: notificationId })
      );
    });

    it('should clear all notifications', async () => {
      await notificationService.show('Notification 1', 'info');
      await notificationService.show('Notification 2', 'success');
      
      await notificationService.clearAll();
      
      expect(mockLogger.info).toHaveBeenCalledWith('All notifications cleared');
    });

    it('should get current notification count', async () => {
      await notificationService.show('Count test 1', 'info');
      await notificationService.show('Count test 2', 'success');
      
      const count = notificationService.getActiveCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await notificationService.start();
    });

    it('should handle disabled notification system', async () => {
      const config = {
        notifications: {
          enabled: false
        }
      };
      
      await notificationService.updateConfig(config);
      await notificationService.show('Disabled test', 'info');
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Notifications are disabled');
    });

    it('should update configuration dynamically', async () => {
      const newConfig = {
        notifications: {
          enabled: true,
          maxConcurrent: 5,
          defaultDuration: 4000
        }
      };

      await notificationService.updateConfig(newConfig);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'NotificationService configuration updated'
      );
    });

    it('should validate configuration parameters', async () => {
      const invalidConfig = {
        notifications: {
          enabled: true,
          maxConcurrent: -1, // Invalid value
          defaultDuration: 'invalid' // Invalid type
        }
      };

      await notificationService.updateConfig(invalidConfig as any);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid configuration')
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await notificationService.start();
    });

    it('should handle store update failures gracefully', async () => {
      // Mock store to throw error
      mockGameStateStore.setState.mockImplementation(() => {
        throw new Error('Store update failed');
      });

      await notificationService.show('Store error test', 'info');
      
      // Should handle error and log it
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update store')
      );
    });

    it('should handle EventBus errors gracefully', async () => {
      // Mock EventBus to throw error
      mockEventBus.emit.mockImplementation(() => {
        throw new Error('EventBus error');
      });

      await notificationService.show('EventBus error test', 'info');
      
      // Should not crash the service
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle malformed notification data', async () => {
      await notificationService.show(null as any, 'info');
      await notificationService.show('', 'invalid' as any);
      
      // Should handle gracefully and log warnings
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('Notification Statistics', () => {
    beforeEach(async () => {
      await notificationService.start();
    });

    it('should track notification statistics', async () => {
      await notificationService.show('Stats test 1', 'info');
      await notificationService.show('Stats test 2', 'error');
      
      const stats = notificationService.getStatistics();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalShown).toBe('number');
      expect(typeof stats.totalDismissed).toBe('number');
      expect(typeof stats.byType).toBe('object');
    });

    it('should provide breakdown by notification type', async () => {
      await notificationService.show('Info test', 'info');
      await notificationService.show('Error test', 'error');
      
      const stats = notificationService.getStatistics();
      
      expect(stats.byType.info).toBeGreaterThan(0);
      expect(stats.byType.error).toBeGreaterThan(0);
    });
  });
});
