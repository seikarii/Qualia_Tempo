import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import { logMethod, catchError } from "../utils/decorators";
import type { ILogger } from "./interfaces/ILogger";
import type { ITimerService } from "./interfaces/ITimerService";

@injectable()
export class TimerService implements ITimerService {
  private readonly logger: ILogger;
  private readonly activeTimeouts = new Set<number>();
  private readonly activeIntervals = new Set<number>();

  constructor(@inject(TYPES.ILogger) logger: ILogger) {
    this.logger = logger;
    this.logger.info("TimerService initialized with timer abstraction");
  }

  @logMethod()
  @catchError()
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

  @logMethod()
  @catchError()
  public clearTimeout(id: number): void {
    if (this.activeTimeouts.has(id)) {
      this.logger.debug("Clearing timeout", { id });
      window.clearTimeout(id);
      this.activeTimeouts.delete(id);
    }
  }

  @logMethod()
  @catchError()
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

  @logMethod()
  @catchError()
  public clearInterval(id: number): void {
    if (this.activeIntervals.has(id)) {
      this.logger.debug("Clearing interval", { id });
      window.clearInterval(id);
      this.activeIntervals.delete(id);
    }
  }

  @logMethod()
  @catchError()
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

  @logMethod()
  @catchError()
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
  @logMethod()
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
}
