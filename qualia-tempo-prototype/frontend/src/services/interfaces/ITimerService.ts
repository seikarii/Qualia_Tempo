export interface ITimerService {
  /**
   * Sets a timeout that executes a callback after a specified delay
   * @param callback Function to execute after the delay
   * @param delay Delay in milliseconds
   * @returns Timer ID that can be used to clear the timeout
   */
  setTimeout(callback: () => void, delay: number): number;

  /**
   * Clears a timeout created by setTimeout
   * @param id Timer ID returned by setTimeout
   */
  clearTimeout(id: number): void;

  /**
   * Sets an interval that repeatedly executes a callback at specified intervals
   * @param callback Function to execute at each interval
   * @param interval Interval in milliseconds
   * @returns Timer ID that can be used to clear the interval
   */
  setInterval(callback: () => void, interval: number): number;

  /**
   * Clears an interval created by setInterval
   * @param id Timer ID returned by setInterval
   */
  clearInterval(id: number): void;

  /**
   * Creates a debounced version of a function that delays invoking func until after wait milliseconds
   * have elapsed since the last time the debounced function was invoked
   * @param func Function to debounce
   * @param wait Wait time in milliseconds
   * @returns Debounced function
   */
  debounce<T extends (...args: any[]) => any>(func: T, wait: number): T;

  /**
   * Creates a throttled version of a function that only invokes func at most once per every wait milliseconds
   * @param func Function to throttle
   * @param wait Wait time in milliseconds
   * @returns Throttled function
   */
  throttle<T extends (...args: any[]) => any>(func: T, wait: number): T;
}
