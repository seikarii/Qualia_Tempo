/**
 * IPerformanceProvider interface
 * Platform abstraction for performance APIs
 * QUALIA.CODE v1.1: Mandatory abstraction for global performance object access
 * This is the ONLY interface allowed to access the global performance object
 */
export interface IPerformanceProvider {
  /**
   * Get high-resolution timestamp in milliseconds
   * Direct access to performance.now()
   */
  now(): number;

  /**
   * Get memory usage information
   * Direct access to performance.memory (when available)
   */
  getMemoryInfo(): {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };

  /**
   * Mark a performance measurement point
   * Direct access to performance.mark()
   */
  mark(name: string): void;

  /**
   * Measure time between two performance marks
   * Direct access to performance.measure()
   */
  measure(name: string, startMark?: string, endMark?: string): number;

  /**
   * Clear performance marks
   * Direct access to performance.clearMarks()
   */
  clearMarks(name?: string): void;

  /**
   * Clear performance measures
   * Direct access to performance.clearMeasures()
   */
  clearMeasures(name?: string): void;

  /**
   * Request animation frame callback
   * Direct access to requestAnimationFrame()
   */
  requestAnimationFrame(callback: () => void): number;

  /**
   * Cancel animation frame
   * Direct access to cancelAnimationFrame()
   */
  cancelAnimationFrame(animationId: number): void;
}