// QUALIA.CODE v1.1 - Timer Provider Interface
// Abstraction for timer-related browser APIs to enable platform independence

/* eslint-disable @qualia-tempo/qualia-code/no-global-api-calls */
// This interface DEFINES platform abstractions - exempt from global API rules

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
   * @param callback Function to execute on next animation frame (receives timestamp)
   * @returns Animation frame ID for canceling
   */
  requestAnimationFrame(callback: (time: number) => void): number;

  /**
   * Cancels a previously requested animation frame
   * @param id Animation frame ID returned by requestAnimationFrame
   */
  cancelAnimationFrame(id: number): void;

  /**
   * Returns high-resolution timestamp for performance measurements
   * @returns High-resolution timestamp in milliseconds
   */
  performanceNow(): number;

  /**
   * Returns the current timestamp in milliseconds
   * @returns Current timestamp
   */
  now(): number;

  /**
   * Returns the current date object
   * @returns Current date
   */
  getCurrentDate(): Date;
}