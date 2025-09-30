// QUALIA.CODE v1.1 - Timer Provider Interface
// Abstraction for timer-related browser APIs to enable platform independence

/**
 * Interface for timer operations, abstracting browser-specific APIs
 * Allows for platform-independent timer management and testing
 */
export interface ITimerProvider {
  /**
   * Sets a timeout to execute a callback after a specified delay
   * @param callback Function to execute
   * @param ms Delay in milliseconds
   * @returns Timeout ID for clearing
   */
  setTimeout(callback: () => void, ms: number): number;

  /**
   * Clears a previously set timeout
   * @param id Timeout ID returned by setTimeout
   */
  clearTimeout(id: number): void;

  /**
   * Sets an interval to repeatedly execute a callback
   * @param callback Function to execute
   * @param ms Interval in milliseconds
   * @returns Interval ID for clearing
   */
  setInterval(callback: () => void, ms: number): number;

  /**
   * Clears a previously set interval
   * @param id Interval ID returned by setInterval
   */
  clearInterval(id: number): void;

  /**
   * Requests animation frame for smooth animations
   * @param callback Function to execute on next animation frame
   * @returns Animation frame ID for canceling
   */
  requestAnimationFrame(callback: () => void): number;

  /**
   * Cancels a previously requested animation frame
   * @param id Animation frame ID returned by requestAnimationFrame
   */
  cancelAnimationFrame(id: number): void;
}