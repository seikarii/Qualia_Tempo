import { vi } from "vitest";

export const mockGameStateStoreService: any = {
  start: vi.fn(),
  stop: vi.fn(),
  updateGameState: vi.fn(),
  updateQualiaState: vi.fn(),
  getStatus: vi.fn(),
  isRunning: vi.fn(),
};