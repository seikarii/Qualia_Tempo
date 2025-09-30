import { vi } from "vitest";
import type { IBrowserEventsService } from "../../services/interfaces/IBrowserEventsService";

export const mockBrowserEventsService: IBrowserEventsService = {
  addWindowEventListener: vi.fn(),
  removeWindowEventListener: vi.fn(),
  addElementEventListener: vi.fn(),
  removeElementEventListener: vi.fn(),
  getWindowDimensions: vi.fn(),
  getViewportDimensions: vi.fn(),
};