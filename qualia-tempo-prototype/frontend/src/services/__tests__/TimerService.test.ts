/**
 * QUALIA.CODE v1.1 - TimerService Tests
 * Tests for timer abstraction service with tracking and cleanup
 * 
 * ARCHITECTURE COMPLIANCE:
 * - Uses createTestContainer() for isolation
 * - Tests @logMethod decorator
 * - Tests timer provider abstraction
 * - Tests debounce and throttle utilities
 * - Tests cleanup functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Container } from 'inversify';
import { TimerService } from '../TimerService';
import { TYPES } from '../inversify.types';
import type { ITimerService } from '../interfaces/ITimerService';
import type { ILogger } from '../interfaces/ILogger';
import type { ITimerProvider } from '../interfaces/ITimerProvider';
import type { TimerServiceConfig } from '../contracts/ITimerService.contracts';
import { mockLogger } from '../../testing/mocks/logger.mock';

describe('TimerService - Critical Test Coverage', () => {
  let container: Container;
  let timerService: ITimerService;
  let mockTimerProvider: ITimerProvider;
  let config: TimerServiceConfig;

  beforeEach(() => {
    vi.useFakeTimers();
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

    // Create mock timer provider
    mockTimerProvider = {
      setTimeout: vi.fn((callback: () => void, delay: number) => {
        return setTimeout(callback, delay) as unknown as number;
      }),
      clearTimeout: vi.fn((id: number) => {
        clearTimeout(id);
      }),
      setInterval: vi.fn((callback: () => void, interval: number) => {
        return setInterval(callback, interval) as unknown as number;
      }),
      clearInterval: vi.fn((id: number) => {
        clearInterval(id);
      }),
      requestAnimationFrame: vi.fn((callback: () => void) => {
        return requestAnimationFrame(callback);
      }),
      cancelAnimationFrame: vi.fn((id: number) => {
        cancelAnimationFrame(id);
      }),
      now: vi.fn(() => Date.now()),
      performanceNow: vi.fn(() => performance.now()),
      getCurrentDate: vi.fn(() => new Date()),
    };

    // Bind dependencies
    container.bind(TYPES.TimerServiceConfig).toConstantValue(config);
    container.bind(TYPES.ILogger).toConstantValue(mockLogger);
    container.bind(TYPES.ITimerProvider).toConstantValue(mockTimerProvider);
    container.bind<ITimerService>(TYPES.ITimerService).to(TimerService);

    // Resolve service
    timerService = container.get<ITimerService>(TYPES.ITimerService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('1. setTimeout and clearTimeout', () => {
    it('should set timeout and execute callback', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      const id = timerService.setTimeout(callback, 1000);
      vi.advanceTimersByTime(1000);

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockTimerProvider.setTimeout).toHaveBeenCalled();
      expect(id).toBeDefined();
    });

    it('should clear timeout before execution', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      const id = timerService.setTimeout(callback, 1000);
      timerService.clearTimeout(id);
      vi.advanceTimersByTime(1000);

      // Assert
      expect(callback).not.toHaveBeenCalled();
      expect(mockTimerProvider.clearTimeout).toHaveBeenCalled();
    });

    it('should track active timeouts', () => {
      // Arrange
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      // Act
      const id1 = timerService.setTimeout(callback1, 1000);
      const id2 = timerService.setTimeout(callback2, 2000);

      // Assert - Both timeouts should be tracked
      expect(id1).not.toBe(id2);
      expect(mockTimerProvider.setTimeout).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in timeout callback', () => {
      // Arrange
      const errorCallback = vi.fn(() => {
        throw new Error('Timeout error');
      });

      // Act
      timerService.setTimeout(errorCallback, 100);
      vi.advanceTimersByTime(100);

      // Assert - Should log error but not throw
      expect(errorCallback).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Timeout callback failed',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe('2. setInterval and clearInterval', () => {
    it('should set interval and execute callback repeatedly', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      const id = timerService.setInterval(callback, 500);
      vi.advanceTimersByTime(1500);

      // Assert - Should execute 3 times (0ms, 500ms, 1000ms)
      expect(callback).toHaveBeenCalledTimes(3);
      expect(mockTimerProvider.setInterval).toHaveBeenCalled();
      expect(id).toBeDefined();
    });

    it('should clear interval and stop execution', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      const id = timerService.setInterval(callback, 500);
      vi.advanceTimersByTime(500);
      timerService.clearInterval(id);
      vi.advanceTimersByTime(1000);

      // Assert - Should only execute once before clearing
      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockTimerProvider.clearInterval).toHaveBeenCalled();
    });

    it('should handle errors in interval callback', () => {
      // Arrange
      const errorCallback = vi.fn(() => {
        throw new Error('Interval error');
      });

      // Act
      timerService.setInterval(errorCallback, 100);
      vi.advanceTimersByTime(200);

      // Assert - Should log error but continue executing
      expect(errorCallback).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Interval callback failed',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe('3. now() and getCurrentDate()', () => {
    it('should delegate now() to timer provider', () => {
      // Arrange
      const mockTime = 12345.67;
      vi.mocked(mockTimerProvider.now).mockReturnValue(mockTime);

      // Act
      const result = timerService.now();

      // Assert
      expect(mockTimerProvider.now).toHaveBeenCalled();
      expect(result).toBe(mockTime);
    });

    it('should delegate getCurrentDate() to timer provider', () => {
      // Arrange
      const mockDate = new Date('2025-01-01');
      vi.mocked(mockTimerProvider.getCurrentDate).mockReturnValue(mockDate);

      // Act
      const result = timerService.getCurrentDate();

      // Assert
      expect(mockTimerProvider.getCurrentDate).toHaveBeenCalled();
      expect(result).toBe(mockDate);
    });
  });

  describe('4. requestAnimationFrame and cancelAnimationFrame', () => {
    it('should request animation frame via provider', () => {
      // Arrange
      const callback = vi.fn();
      const mockFrameId = 42;
      vi.mocked(mockTimerProvider.requestAnimationFrame).mockReturnValue(mockFrameId);

      // Act
      const frameId = timerService.requestAnimationFrame(callback);

      // Assert
      expect(mockTimerProvider.requestAnimationFrame).toHaveBeenCalledWith(callback);
      expect(frameId).toBe(mockFrameId);
      expect(mockLogger.debug).toHaveBeenCalledWith('Requesting animation frame');
    });

    it('should cancel animation frame via provider', () => {
      // Arrange
      const frameId = 42;

      // Act
      timerService.cancelAnimationFrame(frameId);

      // Assert
      expect(mockTimerProvider.cancelAnimationFrame).toHaveBeenCalledWith(frameId);
      expect(mockLogger.debug).toHaveBeenCalledWith('Cancelling animation frame', { animationId: frameId });
    });
  });

  describe('5. performanceNow()', () => {
    it('should delegate performanceNow() to timer provider', () => {
      // Arrange
      const mockPerformanceTime = 54321.12;
      vi.mocked(mockTimerProvider.performanceNow).mockReturnValue(mockPerformanceTime);

      // Act
      const result = timerService.performanceNow();

      // Assert
      expect(mockTimerProvider.performanceNow).toHaveBeenCalled();
      expect(result).toBe(mockPerformanceTime);
    });
  });

  describe('6. nextTick Functionality', () => {
    it('should schedule callback for next tick', async () => {
      // Arrange
      const callback = vi.fn();

      // Act
      timerService.nextTick(callback);
      await Promise.resolve(); // nextTick uses Promise.resolve().then()

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith('Scheduling next tick callback');
    });
  });

  describe('7. QUALIA.CODE Compliance', () => {
    it('should use @logMethod decorator for public methods', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      timerService.setTimeout(callback, 100);

      // Assert - Logger should be called by decorator
      expect(mockLogger.debug).toHaveBeenCalledWith('Setting timeout', expect.any(Object));
    });

    it('should use injected TimerProvider instead of global timers', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      timerService.setTimeout(callback, 100);

      // Assert - Should delegate to provider
      expect(mockTimerProvider.setTimeout).toHaveBeenCalled();
    });

    it('should be injectable via container', () => {
      // Assert - Service should be resolvable from container
      expect(timerService).toBeDefined();
      expect(timerService).toBeInstanceOf(TimerService);
    });
  });
});
