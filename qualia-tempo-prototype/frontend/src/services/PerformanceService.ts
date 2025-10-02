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
import type { IPerformanceService } from "./interfaces/IPerformanceService";
import type { IPerformanceProvider } from "./interfaces/IPerformanceProvider";
import type { TimerServiceConfig } from "./contracts/ITimerService.contracts";

@injectable()
export class PerformanceService implements IPerformanceService {
  private readonly logger: ILogger;
  private readonly performanceProvider: IPerformanceProvider;
  private readonly config: TimerServiceConfig;

  constructor(
    @inject(TYPES.TimerServiceConfig) config: TimerServiceConfig,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IPerformanceProvider) performanceProvider: IPerformanceProvider
  ) {
    this.config = config;
    this.logger = logger;
    this.performanceProvider = performanceProvider;
    this.logger.info(this.config.messages.performanceServiceInitialized);
  }

  @logMethod
  public now(): number {
    return this.performanceProvider.now();
  }

  @logMethod
  public getMemoryInfo(): { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number } {
    return this.performanceProvider.getMemoryInfo();
  }

  @logMethod
  public mark(name: string): void {
    this.performanceProvider.mark(name);
  }

  @logMethod
  public measure(name: string, startMark?: string, endMark?: string): number {
    return this.performanceProvider.measure(name, startMark, endMark);
  }

  @logMethod
  public clearMarks(name?: string): void {
    this.performanceProvider.clearMarks(name);
  }

  @logMethod
  public clearMeasures(name?: string): void {
    this.performanceProvider.clearMeasures(name);
  }

  @logMethod
  public requestAnimationFrame(callback: () => void): number {
    return this.performanceProvider.requestAnimationFrame(callback);
  }

  @logMethod
  public cancelAnimationFrame(animationId: number): void {
    this.performanceProvider.cancelAnimationFrame(animationId);
  }
}
