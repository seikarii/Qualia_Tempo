/**
 * IPerformanceService interface
 * Abstraction layer for performance measurement APIs
 * Provides a testable and mockable interface for performance monitoring.
 * QUALIA.CODE v1.1: Mandatory abstraction for performance.now() and memory APIs
 */
export interface IPerformanceService {
  /**
   * Get high-resolution timestamp in milliseconds
   * Abstraction for performance.now()
   */
  now(): number;

  /**
   * Get memory usage information
   * Abstraction for performance.memory (when available)
   */
  getMemoryInfo(): {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };

  /**
   * Mark a performance measurement point
   * Abstraction for performance.mark()
   */
  mark(name: string): void;

  /**
   * Measure time between two performance marks
   * Abstraction for performance.measure()
   */
  measure(name: string, startMark?: string, endMark?: string): number;

  /**
   * Clear performance marks
   * Abstraction for performance.clearMarks()
   */
  clearMarks(name?: string): void;

  /**
   * Clear performance measures
   * Abstraction for performance.clearMeasures()
   */
  clearMeasures(name?: string): void;

  /**
   * Request animation frame callback
   * Abstraction for requestAnimationFrame()
   */
  requestAnimationFrame(callback: () => void): number;

  /**
   * Cancel animation frame
   * Abstraction for cancelAnimationFrame()
   */
  cancelAnimationFrame(animationId: number): void;
}