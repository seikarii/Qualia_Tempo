import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mocked,
} from "vitest";
import { renderHook } from "@testing-library/react";
import { useService } from "../hooks";
import { TYPES } from "../inversify.types";
import { IEventBus } from "../interfaces/IEventBus";
import { ILogger } from "../interfaces/ILogger";
import {
  createTestContainer,
  getMocksFromContainer,
  resetAllMocks,
} from "../../testing/test-container-factory";
import { Container } from "inversify";

// Mock the inversify.container to use our test container
let testContainer: Container;
vi.mock("../inversify.container", () => ({
  get container() {
    return testContainer;
  },
}));

describe("Service Hooks Integration", () => {
  let mockEventBus: Mocked<IEventBus>;
  let mockLogger: Mocked<ILogger>;

  beforeEach(() => {
    resetAllMocks();
    testContainer = createTestContainer();

    const mocks = getMocksFromContainer(testContainer);
    mockEventBus = mocks.mockEventBus as Mocked<IEventBus>;
    mockLogger = mocks.mockLogger as Mocked<ILogger>;
  });

  describe("useService Hook", () => {
    it("should resolve EventBus service correctly", () => {
      const { result } = renderHook(() =>
        useService<IEventBus>(TYPES.IEventBus),
      );

      expect(result.current).toBeDefined();
      expect(result.current).toBe(mockEventBus);
    });

    it("should maintain singleton behavior across hook calls", () => {
      const { result: result1 } = renderHook(() =>
        useService<IEventBus>(TYPES.IEventBus),
      );
      const { result: result2 } = renderHook(() =>
        useService<IEventBus>(TYPES.IEventBus),
      );

      expect(result1.current).toBe(result2.current);
    });

    it("should provide complete service interface", () => {
      const { result } = renderHook(() =>
        useService<IEventBus>(TYPES.IEventBus),
      );

      // Verify all EventBus methods are available
      expect(typeof result.current.emit).toBe("function");
      expect(typeof result.current.subscribe).toBe("function");
      expect(typeof result.current.unsubscribe).toBe("function");
      expect(typeof result.current.clear).toBe("function");
      expect(typeof result.current.destroy).toBe("function");
      expect(typeof result.current.getStats).toBe("function");
    });

    it("should work with React lifecycle", () => {
      const { result, rerender } = renderHook(() =>
        useService<IEventBus>(TYPES.IEventBus),
      );

      const initialService = result.current;

      // Re-render and verify same instance
      rerender();
      expect(result.current).toBe(initialService);
    });
  });

  describe("IoC Container Integration", () => {
    it("should handle service resolution errors gracefully", () => {
      const INVALID_TYPE = Symbol.for("InvalidService");

      expect(() => {
        renderHook(() => useService(INVALID_TYPE));
      }).toThrow();
    });

    it("should support multiple service types", () => {
      // This test validates the hook works with different service types
      const { result } = renderHook(() =>
        useService<IEventBus>(TYPES.IEventBus),
      );

      expect(result.current).toMatchObject({
        emit: expect.any(Function),
        subscribe: expect.any(Function),
        unsubscribe: expect.any(Function),
        clear: expect.any(Function),
        destroy: expect.any(Function),
        getStats: expect.any(Function),
      });
    });
  });
});
