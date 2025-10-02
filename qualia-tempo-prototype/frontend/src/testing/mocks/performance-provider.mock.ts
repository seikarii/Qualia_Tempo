import { vi } from "vitest";
import type { IPerformanceProvider } from "../../services/interfaces/IPerformanceProvider";

export const mockPerformanceProvider: IPerformanceProvider = {
  now: vi.fn(),
  getMemoryInfo: vi.fn(),
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  requestAnimationFrame: vi.fn(),
  cancelAnimationFrame: vi.fn(),
};