/**
 * QUALIA.CODE v1.1 - DebugOrchestratorService Mock
 * Centralized mock implementation for DebugOrchestratorService testing.
 */

import { vi } from "vitest";
import type { IDebugOrchestratorService } from "../../services/interfaces/IDebugOrchestratorService";

export const mockDebugOrchestratorService: IDebugOrchestratorService & { initialize: any; cleanup: any } = {
  gatherServiceDiagnostics: vi.fn(),
  getServiceStatuses: vi.fn(),
  isDebugModeEnabled: vi.fn(),
  getLastUpdateTime: vi.fn(),
  forceRefresh: vi.fn(),
  initialize: vi.fn(),
  cleanup: vi.fn(),
};