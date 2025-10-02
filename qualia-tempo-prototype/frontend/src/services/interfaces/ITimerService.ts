/**
 * ITimerService interface
 * Abstraction layer for timer operations (setTimeout, setInterval, etc.)
 * Provides a testable and mockable interface for time-based functionality.
 */

export interface ITimerService {
  /**
   * Schedule a function to be executed after a delay
   */
  setTimeout(callback: () => void, delay: number): number;

  /**
   * Clear a scheduled timeout
   */
  clearTimeout(timeoutId: number): void;

  /**
   * Schedule a function to be executed repeatedly
   */
  setInterval(callback: () => void, interval: number): number;

  /**
   * Clear a scheduled interval
   */
  clearInterval(intervalId: number): void;

  /**
   * Execute a function after the next microtask
   */
  nextTick(callback: () => void): void;

  /**
   * Get current timestamp in milliseconds
   */
  now(): number;

  /**
   * Get current date object
   * Abstraction for new Date()
   */
  getCurrentDate(): Date;

  /**
   * Request animation frame callback
   * Abstraction for requestAnimationFrame()
   */
  requestAnimationFrame(callback: (time: number) => void): number;

  /**
   * Cancel animation frame
   * Abstraction for cancelAnimationFrame()
   */
  cancelAnimationFrame(animationId: number): void;

  /**
   * Get high-resolution performance timestamp
   * Abstraction for performance.now()
   */
  performanceNow(): number;
}
