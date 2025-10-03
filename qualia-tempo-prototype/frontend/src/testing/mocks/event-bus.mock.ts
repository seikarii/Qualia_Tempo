import { vi } from 'vitest';
import { IEventBus } from '../../services/interfaces/IEventBus';

export const mockEventBus: IEventBus = {
  initialize: vi.fn().mockResolvedValue(undefined),
  cleanup: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockReturnValue('mock-listener-id'),
  emit: vi.fn().mockResolvedValue(undefined),
  unsubscribe: vi.fn().mockReturnValue(true),
  destroy: vi.fn().mockResolvedValue(undefined),
  getStats: vi.fn().mockReturnValue({
    totalListeners: 0,
    eventTypes: [],
    historySize: 0,
    isDestroyed: false,
  }),
  clear: vi.fn().mockResolvedValue(undefined),
};