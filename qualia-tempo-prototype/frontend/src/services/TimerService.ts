/**
 * QUALIA.CODE v1.1 - TimerService
 * Abstraction layer for timer operations (setTimeout, setInterval, etc.)
 * 
 * NOTE: PerformanceService has been extracted to its own file (PerformanceService.ts)
 * for Single Responsibility Principle compliance.
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import { logMethod, catchError } from "../utils/decorators";
import type { ILogger } from "./interfaces/ILogger";
import type { ITimerService } from "./interfaces/ITimerService";
import type { ITimerProvider } from "./interfaces/ITimerProvider";
import type { TimerServiceConfig } from "./contracts/ITimerService.contracts";

@injectable()
export class TimerService implements ITimerService {
  private readonly logger: ILogger;
  private readonly timerProvider: ITimerProvider;
  private readonly config: TimerServiceConfig;
  private readonly activeTimeouts = new Set<number>();
  private readonly activeIntervals = new Set<number>();

  constructor(
    @inject(TYPES.TimerServiceConfig) config: TimerServiceConfig,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.ITimerProvider) timerProvider: ITimerProvider
  ) {
    this.config = config;
    this.logger = logger;
    this.timerProvider = timerProvider;
    this.logger.info(this.config.messages.timerServiceInitialized);
  }

  @logMethod
  public setTimeout(callback: () => void, delay: number): number {
    this.logger.debug("Setting timeout", { delay });

    const id = this.timerProvider.setTimeout(() => {
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
      this.timerProvider.clearTimeout(id);
      this.activeTimeouts.delete(id);
    }
  }

  @logMethod
  public setInterval(callback: () => void, interval: number): number {
    this.logger.debug("Setting interval", { interval });

    const id = this.timerProvider.setInterval(() => {
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
      this.timerProvider.clearInterval(id);
      this.activeIntervals.delete(id);
    }
  }

  @logMethod
  @catchError
  public debounce<T extends (..._args: unknown[]) => unknown>(func: T, wait: number): T {
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
  public throttle<T extends (..._args: unknown[]) => unknown>(func: T, wait: number): T {
    this.logger.debug("Creating throttled function", { wait });

    let lastCallTime = 0;

    const throttled = ((..._args: Parameters<T>) => {
      const now = this.now();

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
      this.timerProvider.clearTimeout(id);
    }
    this.activeTimeouts.clear();

    // Clear all intervals
    for (const id of this.activeIntervals) {
      this.timerProvider.clearInterval(id);
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
    return this.timerProvider.now();
  }

  @logMethod
  public getCurrentDate(): Date {
    return this.timerProvider.getCurrentDate();
  }

  @logMethod
  public requestAnimationFrame(callback: (_time: number) => void): number {
    this.logger.debug("Requesting animation frame");
    return this.timerProvider.requestAnimationFrame(callback);
  }

  @logMethod
  public cancelAnimationFrame(animationId: number): void {
    this.logger.debug("Cancelling animation frame", { animationId });
    this.timerProvider.cancelAnimationFrame(animationId);
  }

  @logMethod
  public performanceNow(): number {
    return this.timerProvider.performanceNow();
  }
}
