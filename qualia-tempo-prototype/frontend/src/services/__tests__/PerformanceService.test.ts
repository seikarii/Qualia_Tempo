import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { Container } from 'inversify';
import { PerformanceService } from '../PerformanceService';
import { TYPES } from '../inversify.types';
import type { TimerServiceConfig } from '../contracts/ITimerService.contracts';
import { mockLogger } from '../../testing/mocks/logger.mock';
import { mockPerformanceProvider } from '../../testing/mocks/performance-provider.mock';

describe('PerformanceService', () => {
  let container: Container;
  let performanceService: PerformanceService;
  let config: TimerServiceConfig;

  beforeEach(() => {
    container = new Container();

    // Setup config
    config = {
      messages: {
        timerServiceInitialized: 'TimerService initialized',
        performanceServiceInitialized: 'PerformanceService initialized',
      },
      timer: {
        performance: {
          enableTracking: true,
          slowTimerThreshold: 100,
        },
        cleanup: {
          cleanupInterval: 1000,
          maxTrackedTimers: 10,
        },
        debug: {
          enableDebugLogging: false,
          logTimerLifecycle: false,
        },
      },
    };

    // Bind mocks and config
    container.bind(TYPES.TimerServiceConfig).toConstantValue(config);
    container.bind(TYPES.ILogger).toConstantValue(mockLogger);
    container.bind(TYPES.IPerformanceProvider).toConstantValue(mockPerformanceProvider);

    // Bind service
    container.bind(TYPES.IPerformanceService).to(PerformanceService);

    // Resolve service
    performanceService = container.get(TYPES.IPerformanceService);
  });

  describe('Initialization', () => {
    it('should initialize with correct dependencies', () => {
      expect(performanceService).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(config.messages.performanceServiceInitialized);
    });
  });

  describe('now()', () => {
    it('should delegate to performance provider', () => {
      const mockTime = 12345.67;
      (mockPerformanceProvider.now as Mock).mockReturnValue(mockTime);

      const result = performanceService.now();

      expect(mockPerformanceProvider.now).toHaveBeenCalled();
      expect(result).toBe(mockTime);
    });
  });

  describe('getMemoryInfo()', () => {
    it('should delegate to performance provider', () => {
      const mockMemoryInfo = {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 5000000,
      };
      (mockPerformanceProvider.getMemoryInfo as Mock).mockReturnValue(mockMemoryInfo);

      const result = performanceService.getMemoryInfo();

      expect(mockPerformanceProvider.getMemoryInfo).toHaveBeenCalled();
      expect(result).toBe(mockMemoryInfo);
    });
  });

  describe('mark()', () => {
    it('should delegate to performance provider', () => {
      const markName = 'test-mark';

      performanceService.mark(markName);

      expect(mockPerformanceProvider.mark).toHaveBeenCalledWith(markName);
    });
  });

  describe('measure()', () => {
    it('should delegate to performance provider with name only', () => {
      const measureName = 'test-measure';
      const mockDuration = 100.5;
      (mockPerformanceProvider.measure as Mock).mockReturnValue(mockDuration);

      const result = performanceService.measure(measureName);

      expect(mockPerformanceProvider.measure).toHaveBeenCalledWith(measureName, undefined, undefined);
      expect(result).toBe(mockDuration);
    });

    it('should delegate to performance provider with start and end marks', () => {
      const measureName = 'test-measure';
      const startMark = 'start';
      const endMark = 'end';
      const mockDuration = 200.75;
      (mockPerformanceProvider.measure as Mock).mockReturnValue(mockDuration);

      const result = performanceService.measure(measureName, startMark, endMark);

      expect(mockPerformanceProvider.measure).toHaveBeenCalledWith(measureName, startMark, endMark);
      expect(result).toBe(mockDuration);
    });
  });

  describe('clearMarks()', () => {
    it('should delegate to performance provider with name', () => {
      const markName = 'test-mark';

      performanceService.clearMarks(markName);

      expect(mockPerformanceProvider.clearMarks).toHaveBeenCalledWith(markName);
    });

    it('should delegate to performance provider without name', () => {
      performanceService.clearMarks();

      expect(mockPerformanceProvider.clearMarks).toHaveBeenCalledWith(undefined);
    });
  });

  describe('clearMeasures()', () => {
    it('should delegate to performance provider with name', () => {
      const measureName = 'test-measure';

      performanceService.clearMeasures(measureName);

      expect(mockPerformanceProvider.clearMeasures).toHaveBeenCalledWith(measureName);
    });

    it('should delegate to performance provider without name', () => {
      performanceService.clearMeasures();

      expect(mockPerformanceProvider.clearMeasures).toHaveBeenCalledWith(undefined);
    });
  });

  describe('requestAnimationFrame()', () => {
    it('should delegate to performance provider', () => {
      const mockCallback = vi.fn();
      const mockId = 42;
      (mockPerformanceProvider.requestAnimationFrame as Mock).mockReturnValue(mockId);

      const result = performanceService.requestAnimationFrame(mockCallback);

      expect(mockPerformanceProvider.requestAnimationFrame).toHaveBeenCalledWith(mockCallback);
      expect(result).toBe(mockId);
    });
  });

  describe('cancelAnimationFrame()', () => {
    it('should delegate to performance provider', () => {
      const mockId = 42;

      performanceService.cancelAnimationFrame(mockId);

      expect(mockPerformanceProvider.cancelAnimationFrame).toHaveBeenCalledWith(mockId);
    });
  });
});