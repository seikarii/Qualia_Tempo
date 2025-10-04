import { vi } from "vitest";
import type { IDebugOrchestratorService } from "../../services/interfaces/IDebugOrchestratorService";

export const mockDebugOrchestratorService: IDebugOrchestratorService = {
  initialize: vi.fn(),
  cleanup: vi.fn(),
  getHealthReport: vi.fn().mockReturnValue([]),
  isDebugModeEnabled: vi.fn().mockReturnValue(false),
  getLastUpdateTime: vi.fn().mockReturnValue(new Date()),
  forceRefresh: vi.fn().mockResolvedValue(undefined),
};