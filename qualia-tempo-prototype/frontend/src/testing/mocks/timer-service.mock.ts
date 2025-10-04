import { vi } from "vitest";
import type { ITimerService } from "../../services/interfaces/ITimerService";

/**
 * QUALIA.CODE v2.0: High-Fidelity Timer Service Mock
 * 
 * CRITICAL UPDATES:
 * - `requestAnimationFrame` now STORES callbacks instead of executing immediately
 * - This prevents infinite recursion in services that use RAF loops
 * - Tests can manually trigger callbacks via exported `rafCallbacks` array
 * 
 * ANTI-PATTERN (FORBIDDEN):
 * requestAnimationFrame: vi.fn((callback) => { callback(); return 1; }) // Causes stack overflow
 * 
 * HIGH-FIDELITY PATTERN (MANDATORY):
 * requestAnimationFrame: vi.fn((callback) => { rafCallbacks.push(callback); return rafCallbacks.length; })
 */

// Exported array for tests to manually trigger RAF callbacks
export const rafCallbacks: Array<() => void> = [];

/**
 * Helper to clear RAF callbacks between tests
 */
export const clearRafCallbacks = () => {
  rafCallbacks.length = 0;
};

export const mockTimerService: ITimerService = {
  // CRITICAL: Execute callback immediately and return a timer ID
  setTimeout: vi.fn((callback: () => void, _delay?: number) => {
    // Execute callback immediately in tests for deterministic behavior
    callback();
    return 1; // Return a valid timer ID
  }),
  clearTimeout: vi.fn(),
  // Execute callback immediately and return an interval ID
  setInterval: vi.fn((callback: () => void, _interval?: number) => {
    // In tests, execute once immediately
    callback();
    return 1; // Return a valid interval ID
  }),
  clearInterval: vi.fn(),
  // Execute callback immediately (nextTick simulation)
  nextTick: vi.fn((callback: () => void) => {
    callback();
  }),
  // Return current timestamp
  now: vi.fn(() => Date.now()),
  // Return current Date object
  getCurrentDate: vi.fn(() => new Date()),
  // CRITICAL: STORE callback instead of executing immediately
  // This prevents infinite recursion in services using RAF loops
  requestAnimationFrame: vi.fn((callback: () => void) => {
    rafCallbacks.push(callback);
    return rafCallbacks.length; // Return callback index as ID
  }),
  cancelAnimationFrame: vi.fn(),
  // Return current performance timestamp
  performanceNow: vi.fn(() => performance.now()),
};
