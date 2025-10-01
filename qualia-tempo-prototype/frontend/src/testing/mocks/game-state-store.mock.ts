import { vi } from "vitest";
import type { IGameStateStore } from "../../services/interfaces/IGameStateStore";

export const mockGameStateStore: IGameStateStore = {
  setNotifications: vi.fn(),
  getNotifications: vi.fn(),
  updateGameState: vi.fn(),
  getGameState: vi.fn(),
  updateQualiaState: vi.fn(),
  getQualiaState: vi.fn(),
};