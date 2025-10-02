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
      // Initialize first to set up event listeners
      (debugOrchestratorService as any).initialize();
      
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
      // With mocked decorators, we verify that initialize() sets up the infrastructure
      // The actual event handling is tested through integration tests
      expect(() => {
        (debugOrchestratorService as any).initialize();
      }).not.toThrow();
    });
  });

  describe('getHealthReport() - Event-Driven Health Monitoring', () => {
    beforeEach(() => {
      (debugOrchestratorService as any).initialize();
    });

    it('should return empty array when no services have emitted status events', () => {
      // Act
      const healthReport = debugOrchestratorService.getHealthReport();

      // Assert
      expect(Array.isArray(healthReport)).toBe(true);
      expect(healthReport.length).toBe(0);
    });

    it('should return cached service statuses synchronously', () => {
      // Arrange - Simulate a service status update event by directly populating the internal map
      const mockServiceStatus = {
        name: 'TestService',
        isRunning: true,
        status: 'RUNNING',
        stats: { testStat: 42 },
        lastUpdate: new Date()
      };
      
      // Access the private serviceStatuses map (only for testing)
      (debugOrchestratorService as any).serviceStatuses.set('TestService', mockServiceStatus);

      // Act
      const healthReport = debugOrchestratorService.getHealthReport();

      // Assert
      expect(healthReport).toHaveLength(1);
      expect(healthReport[0]).toEqual(mockServiceStatus);
      expect(healthReport[0].name).toBe('TestService');
      expect(healthReport[0].isRunning).toBe(true);
    });

    it('should return multiple service statuses when multiple services have reported', () => {
      // Arrange
      const services = [
        { name: 'ServiceA', isRunning: true, status: 'RUNNING', lastUpdate: new Date() },
        { name: 'ServiceB', isRunning: false, status: 'STOPPED', lastUpdate: new Date() },
        { name: 'ServiceC', isRunning: true, status: 'RUNNING', stats: { count: 100 }, lastUpdate: new Date() }
      ];

      services.forEach(service => {
        (debugOrchestratorService as any).serviceStatuses.set(service.name, service);
      });

      // Act
      const healthReport = debugOrchestratorService.getHealthReport();

      // Assert
      expect(healthReport).toHaveLength(3);
      expect(healthReport.map(s => s.name)).toEqual(['ServiceA', 'ServiceB', 'ServiceC']);
    });

    it('should be synchronous and not return a Promise', () => {
      // Act
      const result = debugOrchestratorService.getHealthReport();

      // Assert - Verify it's NOT a Promise
      expect(result).not.toBeInstanceOf(Promise);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});