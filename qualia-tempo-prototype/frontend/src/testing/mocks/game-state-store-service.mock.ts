import { vi } from "vitest";
import type { IGameStateStoreService } from "../../services/interfaces/IGameStateStoreService";

export const mockGameStateStoreService: IGameStateStoreService = {
  initialize: vi.fn(),
  cleanup: vi.fn(),
  updateGameState: vi.fn(),
  updateQualiaState: vi.fn(),
  getStatus: vi.fn(),
  isRunning: vi.fn(),
  getGameState: vi.fn(),
  setStoreSetter: vi.fn(),
};