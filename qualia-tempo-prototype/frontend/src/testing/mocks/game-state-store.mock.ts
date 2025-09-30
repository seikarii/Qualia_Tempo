import { vi } from "vitest";

export const mockGameStateStore: any = {
  setNotifications: vi.fn(),
  getNotifications: vi.fn(),
  updateGameState: vi.fn(),
  getGameState: vi.fn(),
  updateQualiaState: vi.fn(),
  getQualiaState: vi.fn(),
  setState: vi.fn(),
};