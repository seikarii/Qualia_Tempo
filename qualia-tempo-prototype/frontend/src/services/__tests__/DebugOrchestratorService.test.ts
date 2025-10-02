import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from 'inversify';
import { createTestContainer } from '../../testing/test-container-factory';
import { DebugOrchestratorService } from '../DebugOrchestratorService';
import { TYPES } from '../inversify.types';
import type { DebugOrchestratorServiceParams } from '../contracts/IDebugOrchestratorService.contracts';
import { mockLogger } from '../../testing/mocks/logger.mock';
import { mockEventBus } from '../../testing/mocks/event-bus.mock';
import { mockGameStateStore } from '../../testing/mocks/game-state-store.mock';
import { mockGameStateStoreService } from '../../testing/mocks/game-state-store-service.mock';
import { mockHttpService } from '../../testing/mocks/http-service.mock';
import { mockTimerService } from '../../testing/mocks/timer-service.mock';
import { mockPerformanceService } from '../../testing/mocks/performance-service.mock';

describe('DebugOrchestratorService', () => {
  let container: any;
  let debugOrchestratorService: DebugOrchestratorService;

  beforeEach(() => {
    // Create a custom container without the DebugOrchestratorService mock
    container = new Container();
    
    // Bind all the mocks except DebugOrchestratorService
    container.bind(TYPES.ILogger).toConstantValue(mockLogger);
    container.bind(TYPES.IEventBus).toConstantValue(mockEventBus);
    container.bind(TYPES.IGameStateStore).toConstantValue(mockGameStateStore);
    container.bind(TYPES.IGameStateStoreService).toConstantValue(mockGameStateStoreService);
    container.bind(TYPES.IHttpService).toConstantValue(mockHttpService);
    container.bind(TYPES.ITimerService).toConstantValue(mockTimerService);
    container.bind(TYPES.IPerformanceService).toConstantValue(mockPerformanceService);
    
    // Bind the required configuration for the real service
    const debugOrchestratorParams: DebugOrchestratorServiceParams = {
      config: {
        refreshInterval: 5000,
        maxHistoryLength: 100,
        enablePerformanceTracking: true,
        environment: 'test',
        version: '1.0.0',
        services: {},
        defaultMetrics: {
          temperature: 25,
          frameTime: 16.67,
          memoryConversionFactor: 1048576,
          fps: 60
        }
      },
      logger: container.get(TYPES.ILogger), // Use the mock logger
      timerService: container.get(TYPES.ITimerService), // Use the mock timer service
      performanceService: container.get(TYPES.IPerformanceService), // Use the mock performance service
    };
    container.bind(TYPES.DebugOrchestratorServiceParams).toConstantValue(debugOrchestratorParams);
    
    // Bind the real service implementation for integration testing
    container.bind(TYPES.IDebugOrchestratorService).to(DebugOrchestratorService).inSingletonScope();
    debugOrchestratorService = container.get(TYPES.IDebugOrchestratorService);
  });

  describe('IBaseService Implementation', () => {
    it('should initialize without errors and register event subscriptions', () => {
      // Act
      expect(() => {
        (debugOrchestratorService as any).initialize();
      }).not.toThrow();

      // Assert that the service has the required _eventListeners property
      expect((debugOrchestratorService as any)._eventListeners).toBeDefined();
      expect(Array.isArray((debugOrchestratorService as any)._eventListeners)).toBe(true);
    });

    it('should cleanup event subscriptions without errors', () => {
      // Arrange
      (debugOrchestratorService as any).initialize(); // Initialize first

      // Act & Assert
      expect(() => {
        (debugOrchestratorService as any).cleanup();
      }).not.toThrow();
    });

    it('should have _eventListeners array for @OnEvent decorator', () => {
      // Assert that the service instance has the required _eventListeners property
      expect((debugOrchestratorService as any)._eventListeners).toBeDefined();
      expect(Array.isArray((debugOrchestratorService as any)._eventListeners)).toBe(true);
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      (debugOrchestratorService as any).initialize();
    });

    it('should handle ConfigurationLoaded event', () => {
      // Arrange
      const mockConfigLoadedEvent = {
        type: 'ConfigurationLoaded',
        timestamp: new Date(),
        source: 'ConfigurationService'
      };

      // Find the event handler that was subscribed
      const eventListeners = (debugOrchestratorService as any)._eventListeners;
      const configLoadedListener = eventListeners.find(
        (listener: any) => listener.eventType === 'ConfigurationLoaded'
      );

      // Act
      if (configLoadedListener) {
        configLoadedListener.handler(mockConfigLoadedEvent);
      }

      // Assert that configLoaded flag is set
      expect((debugOrchestratorService as any).configLoaded).toBe(true);
    });
  });
});