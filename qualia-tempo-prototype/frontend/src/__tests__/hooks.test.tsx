import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from "@testing-library/react";
import { useService } from "../services/hooks";
import { TYPES } from "../services/inversify.types";
import { IEventBus } from "../services/interfaces/IEventBus";

// Mock the container
vi.mock('../services/inversify.container', () => ({
  container: {
    get: vi.fn(),
  },
}));

// Mock the inversify config to avoid actual container setup
vi.mock('../services/inversify.config', () => ({
  container: {
    get: vi.fn(),
  },
}));

const mockContainer = require('../services/inversify.container').container;

// Complete mock EventBus implementation
const mockEventBus: IEventBus = {
  emit: vi.fn(),
  subscribe: vi.fn().mockReturnValue('listener-id'),
  unsubscribe: vi.fn(),
  clear: vi.fn(),
  destroy: vi.fn(),
  getStats: vi.fn().mockReturnValue({
    totalListeners: 0,
    eventTypes: [],
    historySize: 0,
    isDestroyed: false,
  }),
};

describe('useService Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Configure the mock container to return the mock EventBus
    mockContainer.get.mockImplementation((type: symbol) => {
      if (type === TYPES.IEventBus) {
        return mockEventBus;
      }
      throw new Error(`Unmocked service type: ${type.toString()}`);
    });
  });

  it('should resolve service from IoC container', () => {
    const { result } = renderHook(() => useService<IEventBus>(TYPES.IEventBus));
    
    expect(result.current).toBeDefined();
    expect(result.current).toBe(mockEventBus);
  });

  it('should maintain service instance across multiple calls', () => {
    const { result: result1 } = renderHook(() => useService<IEventBus>(TYPES.IEventBus));
    const { result: result2 } = renderHook(() => useService<IEventBus>(TYPES.IEventBus));
    
    expect(result1.current).toBe(result2.current);
  });

  it('should throw error for unregistered service types', () => {
    const UNKNOWN_TYPE = Symbol.for("UnknownService");
    
    expect(() => {
      renderHook(() => useService(UNKNOWN_TYPE));
    }).toThrow();
  });

  it('should provide functional service interface', () => {
    const { result } = renderHook(() => useService<IEventBus>(TYPES.IEventBus));
    
    // Test service methods are available
    expect(typeof result.current.emit).toBe('function');
    expect(typeof result.current.subscribe).toBe('function');
    expect(typeof result.current.unsubscribe).toBe('function');
    expect(typeof result.current.clear).toBe('function');
    expect(typeof result.current.destroy).toBe('function');
    expect(typeof result.current.getStats).toBe('function');
  });
});
