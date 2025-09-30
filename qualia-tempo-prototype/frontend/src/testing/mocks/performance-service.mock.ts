import { vi } from "vitest";
import type { IPerformanceService } from "../../services/interfaces/ITimerService";

export const mockPerformanceService: IPerformanceService = {
  now: vi.fn(),
  getMemoryInfo: vi.fn(),
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  requestAnimationFrame: vi.fn(),
  cancelAnimationFrame: vi.fn(),
};