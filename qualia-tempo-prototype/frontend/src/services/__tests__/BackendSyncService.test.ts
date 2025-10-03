/**
 * DIRECTIVE 005 - PHASE 1: BackendSyncService Critical Test Coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { createTestContainer } from '../../testing/test-container-factory';
import type { Container } from 'inversify';
import { TYPES } from '../inversify.types';
import type { IBackendSyncService } from '../interfaces/IBackendSyncService';
import type { IEventBus } from '../interfaces/IEventBus';
import type { IHttpService } from '../interfaces/IHttpService';
import type { ITimerService } from '../interfaces/ITimerService';
import type { ILogger } from '../interfaces/ILogger';
import type { QualiaStateCalculatedEvent } from '../contracts/events.contracts';
import { BackendSyncService } from '../BackendSyncService';

describe('BackendSyncService - Critical Test Coverage', () => {
  let container: Container;
  let backendSync: IBackendSyncService;
  let mockEventBus: IEventBus;
  let mockHttpService: IHttpService;
  let mockTimerService: ITimerService;
  let mockLogger: ILogger;

  beforeEach(() => {
    vi.useFakeTimers();
    container = createTestContainer();
    
    mockEventBus = container.get<IEventBus>(TYPES.IEventBus);
    mockHttpService = container.get<IHttpService>(TYPES.IHttpService);
    mockTimerService = container.get<ITimerService>(TYPES.ITimerService);
    mockLogger = container.get<ILogger>(TYPES.ILogger);

    // Replace mock with real implementation
    container.unbind(TYPES.IBackendSyncService);
    container.bind<IBackendSyncService>(TYPES.IBackendSyncService)
      .to(BackendSyncService)
      .inSingletonScope();
    backendSync = container.get<IBackendSyncService>(TYPES.IBackendSyncService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. Event Reaction', () => {
    it('should call httpService.post when QualiaStateCalculated event is emitted', async () => {
      // Arrange
      await backendSync.start();
      backendSync.initialize();
      
      const testEvent: Omit<QualiaStateCalculatedEvent, 'timestamp'> = {
        type: 'QualiaStateCalculated',
        qualiaState: {
          intensity: 0.8,
          precision: 0.9,
          aggression: 0.5,
          flow: 0.7,
          chaos: 0.3,
          recovery: 0.6,
          transcendence: 0.0
        }
      };

      // Act
      await mockEventBus.emit(testEvent);
      await vi.runAllTimersAsync();

      // Assert
      expect(mockHttpService.post).toHaveBeenCalled();
    });
  });

  describe('2. Throttling Logic', () => {
    it('should send first request immediately', async () => {
      // Arrange
      await backendSync.start();
      backendSync.initialize();
      
      const testEvent: Omit<QualiaStateCalculatedEvent, 'timestamp'> = {
        type: 'QualiaStateCalculated',
        qualiaState: {
          intensity: 0.5,
          precision: 0.5,
          aggression: 0.5,
          flow: 0.5,
          chaos: 0.5,
          recovery: 0.5,
          transcendence: 0.0
        }
      };

      // Act
      await mockEventBus.emit(testEvent);

      // Assert
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });

    it('should throttle second immediate request', async () => {
      // Arrange
      await backendSync.start();
      backendSync.initialize();
      
      const event1: Omit<QualiaStateCalculatedEvent, 'timestamp'> = {
        type: 'QualiaStateCalculated',
        qualiaState: { intensity: 0.5, precision: 0.5, aggression: 0.5, flow: 0.5, chaos: 0.5, recovery: 0.5, transcendence: 0.0 }
      };
      
      const event2: Omit<QualiaStateCalculatedEvent, 'timestamp'> = {
        type: 'QualiaStateCalculated',
        qualiaState: { intensity: 0.6, precision: 0.6, aggression: 0.6, flow: 0.6, chaos: 0.4, recovery: 0.6, transcendence: 0.0 }
      };

      // Act
      await mockEventBus.emit(event1);
      await mockEventBus.emit(event2);

      // Assert: Only first should post immediately
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
      expect(mockTimerService.setTimeout).toHaveBeenCalled();
    });

    it('should send throttled request after delay', async () => {
      // Arrange
      await backendSync.start();
      backendSync.initialize();
      
      const event1: Omit<QualiaStateCalculatedEvent, 'timestamp'> = {
        type: 'QualiaStateCalculated',
        qualiaState: { intensity: 0.5, precision: 0.5, aggression: 0.5, flow: 0.5, chaos: 0.5, recovery: 0.5, transcendence: 0.0 }
      };
      
      const event2: Omit<QualiaStateCalculatedEvent, 'timestamp'> = {
        type: 'QualiaStateCalculated',
        qualiaState: { intensity: 0.7, precision: 0.7, aggression: 0.7, flow: 0.7, chaos: 0.3, recovery: 0.7, transcendence: 0.0 }
      };

      // Act
      await mockEventBus.emit(event1);
      await mockEventBus.emit(event2);
      
      // Advance time past throttle delay
      await vi.advanceTimersByTimeAsync(1000);

      // Assert: Second request should be sent after delay
      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('3. Health Check', () => {
    it('should call setInterval for health checks on start', async () => {
      // Act
      await backendSync.start();

      // Assert
      expect(mockTimerService.setInterval).toHaveBeenCalled();
    });

    it('should call httpService.get on health endpoint periodically', async () => {
      // Arrange
      (mockHttpService.get as Mock).mockResolvedValue({ status: 'ok' });

      // Act
      await backendSync.start();
      await vi.advanceTimersByTimeAsync(10000); // Advance past health check interval

      // Assert
      expect(mockHttpService.get).toHaveBeenCalled();
    });

    it('should return false from isConnected when health check fails', async () => {
      // Arrange
      (mockHttpService.get as Mock).mockRejectedValue(new Error('Health check failed'));

      // Act
      await backendSync.start();
      await vi.advanceTimersByTimeAsync(10000);
      
      // Assert
      expect(backendSync.isBackendConnected()).toBe(false);
    });
  });
});
