/**
 * PerformanceProvider implementation
 * QUALIA.CODE v1.1: Platform abstraction for performance APIs
 * This is the ONLY class allowed to access the global performance object
 *
 * Architecture:
 * - Direct access to performance.now(), performance.memory, etc.
 * - No business logic, pure platform abstraction
 * - Injectable service for testing and mocking
 */

import { injectable } from "inversify";
import { BrowserOnly } from "../../utils/decorators";
import type { IPerformanceProvider } from "../interfaces/IPerformanceProvider";

@injectable()
export class PerformanceProvider implements IPerformanceProvider {
  /**
   * Get high-resolution timestamp in milliseconds
   * Direct access to performance.now()
   */
  @BrowserOnly
  public now(): number {
    return performance.now();
  }

  /**
   * Get memory usage information
   * Direct access to performance.memory (when available)
   */
  @BrowserOnly
  public getMemoryInfo(): {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  } {
    // Type assertion for performance.memory which may not exist in all environments
    const perfWithMemory = performance as any;
    if (perfWithMemory.memory) {
      return {
        usedJSHeapSize: perfWithMemory.memory.usedJSHeapSize,
        totalJSHeapSize: perfWithMemory.memory.totalJSHeapSize,
        jsHeapSizeLimit: perfWithMemory.memory.jsHeapSizeLimit,
      };
    }
    return {};
  }

  /**
   * Mark a performance measurement point
   * Direct access to performance.mark()
   */
  @BrowserOnly
  public mark(name: string): void {
    performance.mark(name);
  }

  /**
   * Measure time between two performance marks
   * Direct access to performance.measure()
   */
  @BrowserOnly
  public measure(name: string, startMark?: string, endMark?: string): number {
    performance.measure(name, startMark, endMark);
    // Get the measured value
    const entries = performance.getEntriesByName(name, "measure");
    const entry = entries[entries.length - 1];
    return entry ? entry.duration : 0;
  }

  /**
   * Clear performance marks
   * Direct access to performance.clearMarks()
   */
  @BrowserOnly
  public clearMarks(name?: string): void {
    performance.clearMarks(name);
  }

  /**
   * Clear performance measures
   * Direct access to performance.clearMeasures()
   */
  @BrowserOnly
  public clearMeasures(name?: string): void {
    performance.clearMeasures(name);
  }

  /**
   * Request animation frame callback
   * Direct access to requestAnimationFrame()
   */
  @BrowserOnly
  public requestAnimationFrame(callback: () => void): number {
    return requestAnimationFrame(callback);
  }

  /**
   * Cancel animation frame
   * Direct access to cancelAnimationFrame()
   */
  @BrowserOnly
  public cancelAnimationFrame(animationId: number): void {
    cancelAnimationFrame(animationId);
  }
}