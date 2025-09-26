import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useService } from '../services/hooks';
import { TYPES } from '../services/inversify.types';
import type { IEventBus } from '../services/interfaces/IEventBus';
import { container } from '../services/inversify.container';

// Mock the entire container module
vi.mock('../services/inversify.container', () => ({
  container: {
    get: vi.fn(),
  },
}));

// Type-safe mock of the container
const mockedContainer = vi.mocked(container);

// A complete, type-safe mock implementation of IEventBus
const mockEventBus: IEventBus = {
  emit: vi.fn(),
  subscribe: vi.fn().mockReturnValue('mock-listener-id'),
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
    // Reset mocks before each test
    vi.clearAllMocks();

    // Configure the mock implementation for container.get
    mockedContainer.get.mockImplementation((serviceIdentifier: any) => {
      if (serviceIdentifier === TYPES.IEventBus) {
        return mockEventBus as any; // Cast to any to satisfy the generic T
      }
      // Throw an error for any unmocked service to ensure test integrity
      throw new Error(`Service not found in mock container: ${serviceIdentifier.toString()}`);
    });
  });

  it('should resolve a registered service from the IoC container', () => {
    const { result } = renderHook(() => useService<IEventBus>(TYPES.IEventBus));

    expect(result.current).toBe(mockEventBus);
    expect(mockedContainer.get).toHaveBeenCalledWith(TYPES.IEventBus);
    expect(mockedContainer.get).toHaveBeenCalledTimes(1);
  });

  it('should throw a descriptive error for an unregistered service', () => {
    const UNKNOWN_TYPE = Symbol.for('IUnknownService');

    expect(() => renderHook(() => useService(UNKNOWN_TYPE))).toThrow('Service not found in mock container: Symbol(IUnknownService)');
  });

  it('should return a fully functional service interface', () => {
    const { result } = renderHook(() => useService<IEventBus>(TYPES.IEventBus));
    const bus = result.current;

    // Verify that the service methods are present and callable
    bus.emit({ type: 'PlayerAction', action: 'Dash' } as any);
    expect(mockEventBus.emit).toHaveBeenCalledWith({ type: 'PlayerAction', action: 'Dash' } as any);

    const listenerId = bus.subscribe('PlayerAction', () => {});
    expect(listenerId).toBe('mock-listener-id');
    expect(mockEventBus.subscribe).toHaveBeenCalled();
  });
});
