/**
 * QUALIA.CODE v1.0 - Service Hooks Tests
 * Test suite for React hooks that provide access to services.
 */

import React from "react";
import { render } from "@testing-library/react";
import {
  useServices,
  useEventBus,
  useQualiaCalculator,
  useBackendSync,
  useGameController,
} from "../services/hooks";

// Mock services
jest.mock("../services/EventBus");
jest.mock("../services/QualiaStateCalculatorService");
jest.mock("../services/BackendSyncService");
jest.mock("../services/GameControllerService");

describe("Service Hooks", () => {
  describe("useServices", () => {
    test("should provide access to all services", () => {
      const mockServices = {
        eventBus: {},
        qualiaCalculator: {},
        backendSync: {},
        errorReporting: {},
        debugService: {},
        gameController: {},
      };

      // Mock the context
      const mockUseContext = jest.spyOn(React, "useContext");
      mockUseContext.mockReturnValue(mockServices);

      let services: any;
      const TestComponent = () => {
        services = useServices();
        return null;
      };

      render(<TestComponent />);

      expect(services).toBe(mockServices);
      mockUseContext.mockRestore();
    });

    test("should throw error when used outside provider", () => {
      // Mock the ServiceContext to return undefined (no provider)
      const mockUseContext = jest.spyOn(React, "useContext");
      mockUseContext.mockReturnValueOnce(undefined);

      expect(() => {
        const TestComponent = () => {
          useServices();
          return null;
        };
        render(<TestComponent />);
      }).toThrow("useServices must be used within a CompositionRootProvider");

      mockUseContext.mockRestore();
    });
  });

  describe("Individual Service Hooks", () => {
    const mockServices = {
      eventBus: { emit: jest.fn() },
      qualiaCalculator: { calculateState: jest.fn() },
      backendSync: { isBackendConnected: jest.fn() },
      errorReporting: { logError: jest.fn() },
      debugService: { logDebug: jest.fn() },
      gameController: { start: jest.fn() },
    };

    beforeEach(() => {
      // Mock the context to return our mock services
      const mockUseContext = jest.spyOn(React, "useContext");
      mockUseContext.mockReturnValue(mockServices);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test("useEventBus should return eventBus service", () => {
      let eventBus: any;
      const TestComponent = () => {
        eventBus = useEventBus();
        return null;
      };

      render(<TestComponent />);

      expect(eventBus).toBe(mockServices.eventBus);
    });

    test("useQualiaCalculator should return qualiaCalculator service", () => {
      let qualiaCalculator: any;
      const TestComponent = () => {
        qualiaCalculator = useQualiaCalculator();
        return null;
      };

      render(<TestComponent />);

      expect(qualiaCalculator).toBe(mockServices.qualiaCalculator);
    });

    test("useBackendSync should return backendSync service", () => {
      let backendSync: any;
      const TestComponent = () => {
        backendSync = useBackendSync();
        return null;
      };

      render(<TestComponent />);

      expect(backendSync).toBe(mockServices.backendSync);
    });

    test("useGameController should return gameController service", () => {
      let gameController: any;
      const TestComponent = () => {
        gameController = useGameController();
        return null;
      };

      render(<TestComponent />);

      expect(gameController).toBe(mockServices.gameController);
    });
  });

  describe("Integration with CompositionRootProvider", () => {
    test("hooks should work within provider context", () => {
      const mockServices = {
        eventBus: { emit: jest.fn() },
        qualiaCalculator: { getCurrentState: jest.fn() },
        backendSync: { isBackendConnected: jest.fn() },
        errorReporting: { logError: jest.fn() },
        debugService: { logDebug: jest.fn() },
        gameController: { start: jest.fn() },
      };

      // Mock the context to return services immediately
      const mockUseContext = jest.spyOn(React, "useContext");
      mockUseContext.mockReturnValue(mockServices);

      const TestComponent = () => {
        const services = useServices();
        const eventBus = useEventBus();
        const backendSync = useBackendSync();

        return (
          <div>
            <div data-testid="services">
              {services ? "services-available" : "no-services"}
            </div>
            <div data-testid="eventBus">
              {eventBus ? "eventBus-available" : "no-eventBus"}
            </div>
            <div data-testid="backendSync">
              {backendSync ? "backendSync-available" : "no-backendSync"}
            </div>
          </div>
        );
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId("services")).toHaveTextContent("services-available");
      expect(getByTestId("eventBus")).toHaveTextContent("eventBus-available");
      expect(getByTestId("backendSync")).toHaveTextContent(
        "backendSync-available",
      );

      mockUseContext.mockRestore();
    });
  });

  describe("QUALIA.CODE Compliance", () => {
    test("should follow hook naming conventions", () => {
      // Test that hooks follow the 'use' prefix convention
      expect(useServices.name.startsWith("use")).toBe(true);
      expect(useEventBus.name.startsWith("use")).toBe(true);
      expect(useQualiaCalculator.name.startsWith("use")).toBe(true);
      expect(useBackendSync.name.startsWith("use")).toBe(true);
      expect(useGameController.name.startsWith("use")).toBe(true);
    });

    test("should provide type-safe service access", () => {
      const mockUseContext = jest.spyOn(React, "useContext");
      const mockServices = {
        eventBus: { emit: jest.fn() },
        qualiaCalculator: { getCurrentState: jest.fn() },
        backendSync: { isBackendConnected: jest.fn() },
        errorReporting: { logError: jest.fn() },
        debugService: { logDebug: jest.fn() },
        gameController: { start: jest.fn() },
      };
      mockUseContext.mockReturnValue(mockServices);

      // These should not throw TypeScript errors
      const TestComponent = () => {
        const eventBus = useEventBus();
        const qualiaCalculator = useQualiaCalculator();
        const backendSync = useBackendSync();
        const gameController = useGameController();

        // Type check: these should be the correct types
        expect(typeof eventBus.emit).toBe("function");
        expect(typeof qualiaCalculator.getCurrentState).toBe("function");
        expect(typeof backendSync.isBackendConnected).toBe("function");
        expect(typeof gameController.start).toBe("function");

        return null;
      };

      expect(() => render(<TestComponent />)).not.toThrow();

      mockUseContext.mockRestore();
    });
  });
});
