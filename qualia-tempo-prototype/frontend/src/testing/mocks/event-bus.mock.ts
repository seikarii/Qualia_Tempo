import { vi } from "vitest";
import type { IEventBus } from "../../services/interfaces/IEventBus";

export const mockEventBus: IEventBus = {
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  emit: vi.fn(),
  clear: vi.fn(),
  destroy: vi.fn(),
  getStats: vi.fn(),
};