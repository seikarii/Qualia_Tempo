import { vi } from "vitest";
import type { ITimerService } from "../../services/interfaces/ITimerService";

/**
 * QUALIA.CODE v1.1: High-Fidelity Timer Service Mock
 * 
 * CRITICAL: This mock MUST execute timer callbacks immediately to simulate
 * the behavior of real timers in tests. This is essential for:
 * - EventBus error event emission (uses setTimeout internally)
 * - Any asynchronous operations that depend on timers
 * 
 * LOW-FIDELITY ANTI-PATTERN (FORBIDDEN):
 * setTimeout: vi.fn() // Returns undefined, callbacks never execute
 * 
 * HIGH-FIDELITY PATTERN (MANDATORY):
 * setTimeout: vi.fn((callback) => { callback(); return 1; })
 */
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
  // Execute callback immediately and return a frame ID
  requestAnimationFrame: vi.fn((callback: () => void) => {
    callback();
    return 1; // Return a valid frame ID
  }),
  cancelAnimationFrame: vi.fn(),
  // Return current performance timestamp
  performanceNow: vi.fn(() => performance.now()),
};