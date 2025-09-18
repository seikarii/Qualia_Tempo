/**
 * Tests for DebugService - GOLD.CODE IoC Compliance
 * AI-powered debugging with session management and performance monitoring
 */

import { createTestContainer, getMocksFromContainer, resetAllMocks } from '../../testing/test-container-factory';
import { DebugService } from '../DebugService';
import { IDebugService } from '../interfaces/IDebugService';
import { IEventBus } from '../interfaces/IEventBus';
import { IConfigurationService } from '../interfaces/IConfigurationService';
import { QualiaLogger } from '../Logger';
import { Container } from 'inversify';
import { TYPES } from '../inversify.types';

// Mock decorators
jest.mock('../../utils/decorators', () => ({
  logMethod: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  catchError: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

describe('DebugService - GOLD.CODE IoC Testing', () => {
  let debugService: IDebugService;
  let container: Container;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockConfigService: jest.Mocked<IConfigurationService>;
  let mockLogger: jest.Mocked<QualiaLogger>;

  beforeEach(() => {
    // Reset all mocks to clean state
    resetAllMocks();

    // Create fresh test container with proper IoC bindings
    container = createTestContainer();

    // Get mock instances for assertions
    const mocks = getMocksFromContainer(container);
    mockEventBus = mocks.mockEventBus as jest.Mocked<IEventBus>;
    mockConfigService = mocks.mockConfigurationService as jest.Mocked<IConfigurationService>;
    mockLogger = mocks.mockLogger as jest.Mocked<QualiaLogger>;

    // GOLD.CODE COMPLIANCE: Resolve service from IoC container
    debugService = container.get<IDebugService>(TYPES.IDebugService);
  });

  afterEach(() => {
    // Clean up global debug interface if it exists
    if ((global as any).window?.QA_DEBUG) {
      delete (global as any).window.QA_DEBUG;
    }
  });

  describe('Service Initialization', () => {
    it('should initialize with proper IoC dependencies', () => {
      expect(debugService).toBeDefined();
      expect(debugService).toBeInstanceOf(DebugService);
    });

    it('should start successfully and register event listeners', async () => {
      await debugService.start();
      
      // Verify logger was called for initialization
      expect(mockLogger.info).toHaveBeenCalledWith('DebugService started');
      
      // Verify event subscriptions were registered
      expect(mockEventBus.subscribe).toHaveBeenCalled();
    });

    it('should stop successfully and cleanup resources', async () => {
      await debugService.start();
      await debugService.stop();
      
      expect(mockLogger.info).toHaveBeenCalledWith('DebugService stopped');
      expect(mockEventBus.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('AI Analysis Features', () => {
    beforeEach(async () => {
      await debugService.start();
    });

    it('should analyze performance metrics', async () => {
      const mockMetrics = {
        fps: 60,
        memory: { used: 50, total: 100 },
        render: { time: 16.7 }
      };

      const analysis = await debugService.analyzePerformance(mockMetrics);
      
      expect(analysis).toBeDefined();
      expect(typeof analysis.summary).toBe('string');
      expect(Array.isArray(analysis.recommendations)).toBe(true);
      expect(typeof analysis.severity).toBe('string');
    });

    it('should analyze error patterns', async () => {
      const mockErrors = [
        { message: 'Network timeout', stack: 'at fetch...', timestamp: Date.now() },
        { message: 'Render error', stack: 'at render...', timestamp: Date.now() }
      ];

      const analysis = await debugService.analyzeErrorPatterns(mockErrors);
      
      expect(analysis).toBeDefined();
      expect(typeof analysis.summary).toBe('string');
      expect(Array.isArray(analysis.patterns)).toBe(true);
      expect(Array.isArray(analysis.suggestions)).toBe(true);
    });

    it('should generate intelligent recommendations', async () => {
      const mockContext = {
        errors: [],
        performance: { fps: 30, memory: { used: 80, total: 100 } },
        userActions: []
      };

      const recommendations = await debugService.generateRecommendations(mockContext);
      
      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('category');
      });
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      await debugService.start();
    });

    it('should create and manage debug sessions', async () => {
      const sessionId = await debugService.startSession('test-session');
      
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
      
      const sessionInfo = debugService.getSessionInfo(sessionId);
      expect(sessionInfo).toBeDefined();
      expect(sessionInfo?.name).toBe('test-session');
    });

    it('should end sessions and cleanup resources', async () => {
      const sessionId = await debugService.startSession('test-session');
      await debugService.endSession(sessionId);
      
      const sessionInfo = debugService.getSessionInfo(sessionId);
      expect(sessionInfo?.active).toBe(false);
    });

    it('should export session data', async () => {
      const sessionId = await debugService.startSession('test-session');
      const exportData = await debugService.exportSessionData(sessionId);
      
      expect(exportData).toBeDefined();
      expect(exportData).toHaveProperty('sessionId');
      expect(exportData).toHaveProperty('data');
    });
  });

  describe('Global Debug Interface', () => {
    beforeEach(async () => {
      // Mock global window object
      (global as any).window = { location: { href: 'http://localhost' } };
      await debugService.start();
    });

    it('should expose global QA_DEBUG interface', () => {
      expect((global as any).window.QA_DEBUG).toBeDefined();
      expect(typeof (global as any).window.QA_DEBUG.getMetrics).toBe('function');
      expect(typeof (global as any).window.QA_DEBUG.analyzePerformance).toBe('function');
      expect(typeof (global as any).window.QA_DEBUG.startSession).toBe('function');
    });

    it('should provide metrics through global interface', () => {
      const metrics = (global as any).window.QA_DEBUG.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('object');
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await debugService.start();
    });

    it('should track performance metrics', () => {
      const metrics = debugService.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('timing');
      expect(metrics).toHaveProperty('events');
    });

    it('should update metrics over time', async () => {
      const initialMetrics = debugService.getMetrics();
      
      // Simulate some time passing and activity
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updatedMetrics = debugService.getMetrics();
      expect(updatedMetrics).toBeDefined();
    });
  });

  describe('Event Monitoring', () => {
    beforeEach(async () => {
      await debugService.start();
    });

    it('should monitor EventBus activity', () => {
      // Verify that debug service subscribed to events
      expect(mockEventBus.subscribe).toHaveBeenCalled();
      
      // The debug service should be listening for all events
      const subscribeCall = (mockEventBus.subscribe as jest.Mock).mock.calls[0];
      expect(subscribeCall).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await debugService.start();
    });

    it('should handle configuration errors gracefully', async () => {
      // Mock configuration service to throw error
      mockConfigService.getConfig.mockImplementation(() => {
        throw new Error('Config load failed');
      });

      // Service should handle this gracefully
      expect(() => debugService.getMetrics()).not.toThrow();
    });

    it('should handle EventBus errors gracefully', async () => {
      // Mock EventBus to throw error
      mockEventBus.emit.mockImplementation(() => {
        throw new Error('EventBus error');
      });

      // Service should handle this gracefully
      expect(() => debugService.getMetrics()).not.toThrow();
    });
  });
});
