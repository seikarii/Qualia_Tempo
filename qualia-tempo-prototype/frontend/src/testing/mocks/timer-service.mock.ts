import { vi } from "vitest";
import type { ITimerService } from "../../services/interfaces/ITimerService";

export const mockTimerService: ITimerService = {
  setTimeout: vi.fn(),
  clearTimeout: vi.fn(),
  setInterval: vi.fn(),
  clearInterval: vi.fn(),
  nextTick: vi.fn(),
  now: vi.fn(),
  getCurrentDate: vi.fn(),
  requestAnimationFrame: vi.fn(),
  cancelAnimationFrame: vi.fn(),
  performanceNow: vi.fn(),
};