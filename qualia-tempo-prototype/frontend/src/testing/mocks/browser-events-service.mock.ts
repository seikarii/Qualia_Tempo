import { vi } from "vitest";
import type { IBrowserEventsService } from "../../services/interfaces/IBrowserEventsService";

export const mockBrowserEventsService: IBrowserEventsService = {
  initialize: vi.fn(),
  cleanup: vi.fn(),
  addWindowEventListener: vi.fn(),
  removeWindowEventListener: vi.fn(),
  addElementEventListener: vi.fn(),
  removeElementEventListener: vi.fn(),
  getWindowDimensions: vi.fn().mockReturnValue({ width: 1920, height: 1080 }),
  getViewportDimensions: vi.fn().mockReturnValue({ width: 1920, height: 1080 }),
};