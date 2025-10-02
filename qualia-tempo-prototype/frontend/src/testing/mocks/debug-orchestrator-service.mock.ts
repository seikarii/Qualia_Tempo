/**
 * QUALIA.CODE v1.1 - DebugOrchestratorService Mock
 * Centralized mock implementation for DebugOrchestratorService testing.
 */

import { vi } from "vitest";
import type { IDebugOrchestratorService } from "../../services/interfaces/IDebugOrchestratorService";

export const mockDebugOrchestratorService: IDebugOrchestratorService & { initialize: () => void; cleanup: () => void } = {
  getHealthReport: vi.fn(() => []), // QUALIA.CODE v1.1: Event-driven method returns empty array by default
  gatherServiceDiagnostics: vi.fn(),
  getServiceStatuses: vi.fn(),
  isDebugModeEnabled: vi.fn(),
  getLastUpdateTime: vi.fn(),
  forceRefresh: vi.fn(),
  initialize: vi.fn(),
  cleanup: vi.fn(),
};