import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import { logMethod, catchError } from "../utils/decorators";
import type { ILogger } from "./interfaces/ILogger";
import type { ITimerService, IPerformanceService } from "./interfaces/ITimerService";

// QUALIA.CODE: Module-level constants for initialization messages
const TIMER_SERVICE_INIT_MESSAGE = "TimerService initialized with timer abstraction";
const PERFORMANCE_SERVICE_INIT_MESSAGE = "PerformanceService initialized with performance abstraction";

@injectable()
export class TimerService implements ITimerService {
  private readonly logger: ILogger;
  private readonly activeTimeouts = new Set<number>();
  private readonly activeIntervals = new Set<number>();

  constructor(@inject(TYPES.ILogger) logger: ILogger) {
    this.logger = logger;
    this.logger.info(TIMER_SERVICE_INIT_MESSAGE);
  }

  @logMethod
  public setTimeout(callback: () => void, delay: number): number {
    this.logger.debug("Setting timeout", { delay });

    const id = window.setTimeout(() => {
      this.activeTimeouts.delete(id);
      try {
        callback();
      } catch (error) {
        this.logger.error("Timeout callback failed", { error });
      }
    }, delay);

    this.activeTimeouts.add(id);
    return id;
  }

  @logMethod
  public clearTimeout(id: number): void {
    if (this.activeTimeouts.has(id)) {
      this.logger.debug("Clearing timeout", { id });
      window.clearTimeout(id);
      this.activeTimeouts.delete(id);
    }
  }

  @logMethod
  public setInterval(callback: () => void, interval: number): number {
    this.logger.debug("Setting interval", { interval });

    const id = window.setInterval(() => {
      try {
        callback();
      } catch (error) {
        this.logger.error("Interval callback failed", { error });
      }
    }, interval);

    this.activeIntervals.add(id);
    return id;
  }

  @logMethod
  public clearInterval(id: number): void {
    if (this.activeIntervals.has(id)) {
      this.logger.debug("Clearing interval", { id });
      window.clearInterval(id);
      this.activeIntervals.delete(id);
    }
  }

  @logMethod
  @catchError
  public debounce<T extends (..._args: any[]) => any>(func: T, wait: number): T {
    this.logger.debug("Creating debounced function", { wait });

    let timeoutId: number | undefined;

    const debounced = ((..._args: Parameters<T>) => {
      if (timeoutId !== undefined) {
        this.clearTimeout(timeoutId);
      }

      timeoutId = this.setTimeout(() => {
        timeoutId = undefined;
        func(..._args);
      }, wait);
    }) as T;

    return debounced;
  }

  @logMethod
  @catchError
  public throttle<T extends (..._args: any[]) => any>(func: T, wait: number): T {
    this.logger.debug("Creating throttled function", { wait });

    let lastCallTime = 0;

    const throttled = ((..._args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastCallTime >= wait) {
        lastCallTime = now;
        func(..._args);
      }
    }) as T;

    return throttled;
  }

  /**
   * Cleanup method to clear all active timers
   * Should be called when the service is being destroyed
   */
  @logMethod
  public cleanup(): void {
    this.logger.info("Cleaning up all active timers");

    // Clear all timeouts
    for (const id of this.activeTimeouts) {
      window.clearTimeout(id);
    }
    this.activeTimeouts.clear();

    // Clear all intervals
    for (const id of this.activeIntervals) {
      window.clearInterval(id);
    }
    this.activeIntervals.clear();
  }

  @logMethod
  public nextTick(callback: () => void): void {
    this.logger.debug("Scheduling next tick callback");
    Promise.resolve().then(() => {
      try {
        callback();
      } catch (error) {
        this.logger.error("Next tick callback failed", { error });
      }
    });
  }

  @logMethod
  public now(): number {
    return Date.now();
  }
}

/**
 * QUALIA.CODE v1.1 Compliant PerformanceService
 * Abstraction layer for performance measurement APIs
 * Replaces direct usage of performance.now() and performance.memory
 */
@injectable()
export class PerformanceService implements IPerformanceService {
  private readonly logger: ILogger;

  constructor(@inject(TYPES.ILogger) logger: ILogger) {
    this.logger = logger;
    this.logger.info(PERFORMANCE_SERVICE_INIT_MESSAGE);
  }

  @logMethod
  public now(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    // Fallback to Date.now() if performance.now() is not available
    return Date.now();
  }

  @logMethod
  public getMemoryInfo(): { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number } {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return {};
  }

  @logMethod
  public mark(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
      this.logger.debug("Performance mark created", { name });
    }
  }

  @logMethod
  public measure(name: string, startMark?: string, endMark?: string): number {
    if (typeof performance !== 'undefined' && performance.measure && performance.getEntriesByName) {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name, 'measure');
      const duration = entries.length > 0 ? entries[entries.length - 1].duration : 0;
      this.logger.debug("Performance measure completed", { name, duration, startMark, endMark });
      return duration;
    }
    return 0;
  }

  @logMethod
  public clearMarks(name?: string): void {
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks(name);
      this.logger.debug("Performance marks cleared", { name });
    }
  }

  @logMethod
  public clearMeasures(name?: string): void {
    if (typeof performance !== 'undefined' && performance.clearMeasures) {
      performance.clearMeasures(name);
      this.logger.debug("Performance measures cleared", { name });
    }
  }
}
