import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container } from 'inversify';
import { DebugService } from '../DebugService';
import { TYPES } from '../inversify.types';
import type { DebugServiceParams } from '../contracts/IDebugService.contracts';
import { mockLogger } from '../../testing/mocks/logger.mock';
import { mockEventBus } from '../../testing/mocks/event-bus.mock';
import { mockTimerService } from '../../testing/mocks/timer-service.mock';
import { mockPerformanceService } from '../../testing/mocks/performance-service.mock';

describe('DebugService', () => {
  let container: Container;
  let debugService: DebugService;

  beforeEach(() => {
    container = new Container();

    // Bind mocks
    container.bind(TYPES.ILogger).toConstantValue(mockLogger);
    container.bind(TYPES.IEventBus).toConstantValue(mockEventBus);
    container.bind(TYPES.ITimerService).toConstantValue(mockTimerService);
    container.bind(TYPES.IPerformanceService).toConstantValue(mockPerformanceService);

    // Bind config
    const debugConfig = {
      logging: {
        enableConsoleOutput: true,
        enableFileOutput: false,
        logLevel: 'info',
        maxLogFiles: 5,
        maxLogSize: 10485760,
      },
      eventMonitoring: {
        enableEventLogging: true,
        enableEventMetrics: true,
        maxEventHistory: 1000,
        eventLogThrottle: 100,
      },
      performance: {
        enablePerformanceTracking: true,
        enableMemoryMonitoring: true,
        enableFrameRateTracking: true,
        metricsUpdateInterval: 1000,
      },
      development: {
        enableDebugOverlay: true,
        enableCheats: false,
        enableHotReload: false,
        enableBreakpoints: false,
      },
      profiling: {
        enableProfiling: false,
        profileUpdateInterval: 5000,
        maxProfileSamples: 1000,
      },
      errorTracking: {
        enableErrorStackTraces: true,
        enableErrorReporting: true,
        maxErrorHistory: 100,
      },
      network: {
        enableNetworkLogging: false,
        enableRequestMetrics: false,
        logRequestHeaders: false,
        logRequestBodies: false,
      },
      maxSessionHistory: 10,
      maxEventHistory: 1000,
      performanceMonitoringInterval: 1000,
      aiAnalysisInterval: 30000,
      enableAIAnalysis: false,
      aiAnalysis: {
        errorPatternThresholds: {
          medium: 5,
          high: 10,
        },
        recommendationThresholds: {
          highErrorRate: 0.1,
        },
      },
      memoryCleanupThreshold: 50,
      sessionIdLength: 8,
      sessionIdPrefixLength: 4,
      sessionIdBase: 36,
      memoryCleanupInterval: 300000,
      eventProcessingTimeThreshold: 100,
      memoryCleanupRatio: 0.5,
      maxAIAnalysisHistory: 100,
      maxErrorHistory: 100,
      maxMemoryUsageHistory: 100,
      eventProcessingTimeHighThreshold: 50,
      maxEventPatternTimestamps: 100,
      maxEventProcessingTimeMeasurements: 100,
      messages: {},
    };

    const params: DebugServiceParams = {
      eventBus: mockEventBus,
      logger: mockLogger,
      timerService: mockTimerService,
      config: debugConfig,
      performanceService: mockPerformanceService,
    };

    container.bind(TYPES.DebugServiceParams).toConstantValue(params);

    // Bind the real service
    container.bind(TYPES.IDebugService).to(DebugService).inSingletonScope();
    debugService = container.get(TYPES.IDebugService);
  });

  describe('attachToGlobalScope', () => {
    it('should attach debug interface to window when enabled and in browser environment', () => {
      // Mock window
      const mockWindow = { QA_DEBUG: undefined };
      (global as any).window = mockWindow;

      debugService.start(); // Initialize the service

      debugService.attachToGlobalScope();

      expect(mockWindow.QA_DEBUG).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('🌐 [DebugService] Debug interface attached to window.QA_DEBUG');

      // Cleanup
      delete (global as any).window;
    });

    it('should not attach when debug overlay is disabled', () => {
      const disabledLogger = { ...mockLogger, info: vi.fn() };
      
      // Create separate container for disabled config
      const disabledContainer = new Container();
      disabledContainer.bind(TYPES.ILogger).toConstantValue(disabledLogger);
      disabledContainer.bind(TYPES.IEventBus).toConstantValue(mockEventBus);
      disabledContainer.bind(TYPES.ITimerService).toConstantValue(mockTimerService);
      disabledContainer.bind(TYPES.IPerformanceService).toConstantValue(mockPerformanceService);

      const disabledConfig = { ...debugService['config'] };
      disabledConfig.development.enableDebugOverlay = false;

      const disabledParams: DebugServiceParams = {
        eventBus: mockEventBus,
        logger: disabledLogger,
        timerService: mockTimerService,
        config: disabledConfig,
        performanceService: mockPerformanceService,
      };

      disabledContainer.bind(TYPES.DebugServiceParams).toConstantValue(disabledParams);
      disabledContainer.bind(TYPES.IDebugService).to(DebugService).inSingletonScope();
      const disabledService = disabledContainer.get(TYPES.IDebugService) as DebugService;

      disabledService.start();
      disabledService.attachToGlobalScope();

      expect(disabledLogger.info).not.toHaveBeenCalledWith('🌐 [DebugService] Debug interface attached to window.QA_DEBUG');
    });

    it('should warn when not in browser environment', () => {
      // No window defined
      debugService.start();

      debugService.attachToGlobalScope();

      expect(mockLogger.warn).toHaveBeenCalledWith('🌐 [DebugService] Cannot attach debug interface: interface not available or not in browser environment');
    });
  });
});