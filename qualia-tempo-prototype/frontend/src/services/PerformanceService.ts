/**
 * QUALIA.CODE v1.1 - PerformanceService
 * Abstraction layer for performance measurement APIs
 * Replaces direct usage of performance.now() and performance.memory
 * 
 * REFACTORED: Extracted from TimerService.ts for Single Responsibility Principle compliance
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import { logMethod } from "../utils/decorators";
import type { ILogger } from "./interfaces/ILogger";
import type { IPerformanceService } from "./interfaces/ITimerService";
import type { ITimerProvider } from "./interfaces/ITimerProvider";
import type { TimerServiceConfig } from "./contracts/ITimerService.contracts";

// QUALIA.CODE: Extended performance interface for memory information
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

@injectable()
export class PerformanceService implements IPerformanceService {
  private readonly logger: ILogger;
  private readonly timerProvider: ITimerProvider;
  private readonly config: TimerServiceConfig;

  constructor(
    @inject(TYPES.TimerServiceConfig) config: TimerServiceConfig,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.ITimerProvider) timerProvider: ITimerProvider
  ) {
    this.config = config;
    this.logger = logger;
    this.timerProvider = timerProvider;
    this.logger.info(this.config.messages.performanceServiceInitialized);
  }

  @logMethod
  public now(): number {
    // Delegar al provider, que a su vez puede usar performance.now si está disponible
    return this.timerProvider.performanceNow();
  }

  @logMethod
  public getMemoryInfo(): { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number } {
    if (typeof performance !== 'undefined' && (performance as PerformanceWithMemory).memory) {
      const memory = (performance as PerformanceWithMemory).memory!;
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

  @logMethod
  public requestAnimationFrame(callback: () => void): number {
    return this.timerProvider.requestAnimationFrame(callback);
  }

  @logMethod
  public cancelAnimationFrame(animationId: number): void {
    this.timerProvider.cancelAnimationFrame(animationId);
  }
}
