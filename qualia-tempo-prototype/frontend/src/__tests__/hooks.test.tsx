import { renderHook } from "@testing-library/react";
import { Container } from "inversify";
import { useService } from "../services/hooks";
import { TYPES } from "../services/inversify.types";
import { IEventBus } from "../services/interfaces/IEventBus";

// Mock the container
let container: Container;

// Complete mock EventBus implementation
const mockEventBus: IEventBus = {
  emit: jest.fn(),
  subscribe: jest.fn().mockReturnValue('listener-id'),
  unsubscribe: jest.fn(),
  clear: jest.fn(),
  destroy: jest.fn(),
  getStats: jest.fn().mockReturnValue({
    totalListeners: 0,
    eventTypes: [],
    historySize: 0,
    isDestroyed: false,
  }),
};

// Mock the actual container module
jest.mock('../services/inversify.config', () => {
  const mockContainer = {
    get: jest.fn().mockImplementation((type: symbol) => {
      if (type === TYPES.IEventBus) {
        return mockEventBus;
      }
      throw new Error(`Unmocked service type: ${type.toString()}`);
    }),
  };
  return { container: mockContainer };
});

describe('useService Hook', () => {
  beforeEach(() => {
    container = new Container();
    container.bind<IEventBus>(TYPES.IEventBus).toConstantValue(mockEventBus);
    jest.clearAllMocks();
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
