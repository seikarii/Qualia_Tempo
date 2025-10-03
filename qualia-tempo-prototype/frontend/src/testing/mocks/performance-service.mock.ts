import { vi } from "vitest";
import type { IPerformanceService } from "../../services/interfaces/IPerformanceService";

/**
 * QUALIA.CODE v1.1: High-Fidelity Performance Service Mock
 * 
 * CRITICAL: All methods MUST return contract-compliant default values.
 * LOW-FIDELITY ANTI-PATTERN: getMemoryInfo: vi.fn() // Returns undefined
 * HIGH-FIDELITY PATTERN: getMemoryInfo: vi.fn(() => ({ usedJSHeapSize: 0, ... }))
 */
export const mockPerformanceService: IPerformanceService = {
  now: vi.fn(() => Date.now()),
  getMemoryInfo: vi.fn(() => ({
    usedJSHeapSize: 10 * 1024 * 1024, // 10 MB default
    totalJSHeapSize: 50 * 1024 * 1024, // 50 MB default
    jsHeapSizeLimit: 2048 * 1024 * 1024, // 2 GB default
  })),
  mark: vi.fn(),
  measure: vi.fn(() => 0),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  requestAnimationFrame: vi.fn((callback: () => void) => {
    callback();
    return 1;
  }),
  cancelAnimationFrame: vi.fn(),
};