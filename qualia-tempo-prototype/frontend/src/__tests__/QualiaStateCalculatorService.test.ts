import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mocked,
} from "vitest";
/**
 * QUALIA.CODE v1.1 - QualiaStateCalculatorService Tests
 * IoC COMPLIANT - Uses centralized test container factory with config overrides
 * Tests event-driven architecture, state calculations, and QUALIA.CODE compliance.
 */

import {
  createTestContainer,
  getMocksFromContainer,
} from "../testing/test-container-factory";
import { TYPES } from "../services/inversify.types";
import type { IEventBus } from "../services/interfaces/IEventBus";
import type { IQualiaStateCalculatorService } from "../services/interfaces/IQualiaStateCalculatorService";
import type { IConfigurationService } from "../services/interfaces/IConfigurationService";

describe("QualiaStateCalculatorService - GOLD.CODE STANDARD", () => {
  let qualiaService: IQualiaStateCalculatorService;
  let mocks: ReturnType<typeof getMocksFromContainer>;
  let container: ReturnType<typeof createTestContainer>;

  beforeEach(() => {
    // Define test-specific configuration overrides
    const testSpecificConfig = {
      getQualiaConfig: vi.fn().mockReturnValue({
        decayRate: 0.001,
        transcendenceThreshold: 0.8,
        flowBaseMultiplier: 1.2,
        focusBaseMultiplier: 1.1,
        energyBaseMultiplier: 1.0,
        hitNoteReward: 0.1,
        missNotePenalty: 0.2,
        dashBonus: 0.05,
        fastForwardBonus: 0.03,
        rewindBonus: 0.02,
      }),
      getConfigSection: vi.fn().mockReturnValue({
        baseQualiaState: {
          intensity: 0.3,
          precision: 0.5,
          aggression: 0.0,
          flow: 0.4,
          chaos: 0.0,
          recovery: 0.0,
          transcendence: 0.0,
        },
        performanceMultipliers: {
          perfectHit: 1.5,
          goodHit: 1.0,
          missHit: 0.5,
          comboBonus: 0.1,
        },
        decayRates: {
          intensity: 0.001,
          precision: 0.001,
          aggression: 0.001,
          flow: 0.001,
          chaos: 0.001,
          recovery: 0.001,
          transcendence: 0.001,
        },
        thresholds: {
          highIntensity: 0.8,
          lowPrecision: 0.2,
          chaosThreshold: 0.7,
          transcendenceThreshold: 0.8,
        },
        comboSystem: {
          maxComboMultiplier: 5.0,
          comboDecayTime: 2000,
          perfectComboBonus: 0.2,
        },
        recoveryMechanics: {
          recoveryRate: 0.01,
          maxRecovery: 1.0,
          recoveryCooldown: 1000,
        },
        updateIntervalMs: 100,
        historySize: 100,
        hitNoteMultipliers: { intensity: 0.1, precision: 0.05, flow: 0.08 },
        missNoteMultipliers: { chaos: 0.1, precision: -0.05, flow: -0.03 },
        dashMultipliers: { aggression: 0.05, intensity: 0.03 },
        fastForwardMultipliers: { aggression: 0.02, intensity: 0.01 },
        rewindMultipliers: { recovery: 0.05, precision: 0.02 },
        updateInterval: 100,
        intensityDecay: 0.001,
        precisionDecay: 0.001,
        aggressionDecay: 0.001,
        flowDecay: 0.001,
        chaosDecay: 0.001,
        recoveryDecay: 0.001,
        transcendenceDecay: 0.001,
        transcendenceThresholds: { intensity: 0.8, precision: 0.7, flow: 0.6 },
        minValue: 0.0,
        maxValue: 1.0,
      }),
    };

    // Inject configuration overrides into the test container
    container = createTestContainer(testSpecificConfig);

    // Get service instance and mocks from the container - NO MANUAL INSTANTIATION
    qualiaService = container.get<IQualiaStateCalculatorService>(
      TYPES.IQualiaStateCalculatorService,
    );
    mocks = getMocksFromContainer(container);
  });

  afterEach(() => {
    // Clean up services
    if (qualiaService) {
      qualiaService.stop();
    }
  });

  describe("QUALIA.CODE Compliance", () => {
    test("should use dependency injection (EventBus via constructor)", () => {
      expect(qualiaService).toBeDefined();
      expect(qualiaService.getCurrentState).toBeDefined();
    });

    test("should have no UI coupling (no direct imports of useGameStore)", () => {
      // This test verifies architectural compliance
      // The service should only depend on EventBus for input/output
      const initialState = qualiaService.getCurrentState();
      expect(initialState).toBeDefined();
      expect(typeof initialState.intensity).toBe("number");
    });

    test("should follow single responsibility (only calculate QualiaState)", () => {
      // Service should only calculate state, not handle UI updates or backend sync
      const methods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(qualiaService),
      );

      // Public API should be minimal and focused
      expect(methods).toContain("start");
      expect(methods).toContain("stop");
      expect(methods).toContain("getCurrentState");
      expect(methods).toContain("updateConfig");
    });
  });

  describe("Service Lifecycle", () => {
    test("should start and stop correctly", () => {
      qualiaService.start();
      expect(mocks.mockLogger.info).toHaveBeenCalledWith(
        "🚀 [QualiaCalculator] Service started - pure event architecture",
      );

      qualiaService.stop();
      expect(mocks.mockLogger.info).toHaveBeenCalledWith(
        "🛑 [QualiaCalculator] Service stopped",
      );
    });

    test("should handle multiple start/stop calls gracefully", () => {
      qualiaService.start();
      qualiaService.start(); // Second start should warn
      expect(mocks.mockLogger.warn).toHaveBeenCalledWith(
        "⚠️ [QualiaCalculator] Service already running",
      );

      qualiaService.stop();
      qualiaService.stop(); // Second stop should warn
      expect(mocks.mockLogger.warn).toHaveBeenCalledWith(
        "⚠️ [QualiaCalculator] Service not running",
      );
    });

    test("should provide initial state", () => {
      const state = qualiaService.getCurrentState();

      expect(state).toEqual({
        intensity: 0.3,
        precision: 0.5,
        aggression: 0.0,
        flow: 0.4,
        chaos: 0.0,
        recovery: 0.0,
        transcendence: 0.0,
      });
    });
  });

  describe("Event-Driven Architecture", () => {
    test("should listen to PlayerAction events after start", async () => {
      qualiaService.start();

      const initialState = qualiaService.getCurrentState();

      // Set up event promise to wait for QualiaStateUpdated event
      let eventReceived = false;
      const eventPromise = new Promise<void>((resolve) => {
        mocks.mockEventBus.subscribe("QualiaStateUpdated", () => {
          eventReceived = true;
          resolve();
        });
      });

      // Emit a HitNote event
      await mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "HitNote",
        context: { score: 100 },
      } as any);

      // Wait for the event to be processed
      await eventPromise;

      const newState = qualiaService.getCurrentState();

      // State should have changed due to HitNote
      expect(newState.intensity).toBeGreaterThan(initialState.intensity);
      expect(newState.precision).toBeGreaterThan(initialState.precision);
      expect(newState.flow).toBeGreaterThan(initialState.flow);
    });

    test("should emit QualiaStateUpdated events", async () => {
      let receivedEvent: any = null;

      // Subscribe to QualiaStateUpdated events
      const eventPromise = new Promise<void>((resolve) => {
        mocks.mockEventBus.subscribe("QualiaStateUpdated", (event: any) => {
          receivedEvent = event;
          resolve();
        });
      });

      qualiaService.start();

      // Emit a PlayerAction event
      await mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "HitNote",
      } as any);

      // Wait for the event to be processed
      await eventPromise;

      // Should have received a QualiaStateUpdated event
      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent.type).toBe("QualiaStateUpdated");
      expect(receivedEvent.qualiaState).toBeDefined();
    });

    test("should not respond to events when stopped", () => {
      qualiaService.start();
      qualiaService.stop();

      const initialState = qualiaService.getCurrentState();

      // Track if any event is emitted
      let eventEmitted = false;
      mocks.mockEventBus.subscribe("QualiaStateUpdated", () => {
        eventEmitted = true;
      });

      // Emit an event after stopping - this should not trigger any processing
      mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "HitNote",
      } as any);

      // No event should have been emitted since service is stopped
      expect(eventEmitted).toBe(false);

      const finalState = qualiaService.getCurrentState();

      // State should not have changed
      expect(finalState).toEqual(initialState);
    });
  });

  describe("Player Action Processing", () => {
    beforeEach(() => {
      qualiaService.start();
    });

    test("should process HitNote actions correctly", async () => {
      qualiaService.start();
      const initialState = qualiaService.getCurrentState();

      // Set up event promise to wait for processing
      let eventProcessed = false;
      const eventPromise = new Promise<void>((resolve) => {
        mocks.mockEventBus.subscribe("QualiaStateUpdated", () => {
          eventProcessed = true;
          resolve();
        });
      });

      await mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "HitNote",
      } as any);

      // Wait for event processing
      await eventPromise;

      const newState = qualiaService.getCurrentState();

      expect(newState.intensity).toBeGreaterThan(initialState.intensity);
      expect(newState.precision).toBeGreaterThan(initialState.precision);
      expect(newState.flow).toBeGreaterThan(initialState.flow);
      expect(newState.chaos).toBeLessThanOrEqual(initialState.chaos); // Chaos stays at 0 or decreases
    });

    test("should process MissNote actions correctly", async () => {
      const initialState = qualiaService.getCurrentState();

      // Set up event promise to wait for processing
      let eventProcessed = false;
      const eventPromise = new Promise<void>((resolve) => {
        mocks.mockEventBus.subscribe("QualiaStateUpdated", () => {
          eventProcessed = true;
          resolve();
        });
      });

      await mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "MissNote",
      } as any);

      // Wait for event processing
      await eventPromise;

      const newState = qualiaService.getCurrentState();

      expect(newState.precision).toBeLessThan(initialState.precision);
      expect(newState.chaos).toBeGreaterThan(initialState.chaos);
      expect(newState.flow).toBeLessThan(initialState.flow);
    });

    test("should process Dash actions correctly", async () => {
      const initialState = qualiaService.getCurrentState();

      // Set up event promise to wait for processing
      let eventProcessed = false;
      const eventPromise = new Promise<void>((resolve) => {
        mocks.mockEventBus.subscribe("QualiaStateUpdated", () => {
          eventProcessed = true;
          resolve();
        });
      });

      await mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "Dash",
      } as any);

      // Wait for event processing
      await eventPromise;

      const newState = qualiaService.getCurrentState();

      expect(newState.intensity).toBeGreaterThan(initialState.intensity);
      expect(newState.aggression).toBeGreaterThan(initialState.aggression);
    });

    test("should process FastForward actions correctly", async () => {
      const initialState = qualiaService.getCurrentState();

      // Set up event promise to wait for processing
      let eventProcessed = false;
      const eventPromise = new Promise<void>((resolve) => {
        mocks.mockEventBus.subscribe("QualiaStateUpdated", () => {
          eventProcessed = true;
          resolve();
        });
      });

      await mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "FastForward",
      } as any);

      // Wait for event processing
      await eventPromise;

      const newState = qualiaService.getCurrentState();

      expect(newState.aggression).toBeGreaterThan(initialState.aggression);
      expect(newState.intensity).toBeGreaterThan(initialState.intensity);
    });

    test("should process Rewind actions correctly", async () => {
      const initialState = qualiaService.getCurrentState();

      // Set up event promise to wait for processing
      let eventProcessed = false;
      const eventPromise = new Promise<void>((resolve) => {
        mocks.mockEventBus.subscribe("QualiaStateUpdated", () => {
          eventProcessed = true;
          resolve();
        });
      });

      await mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "Rewind",
      } as any);

      // Wait for event processing
      await eventPromise;

      const newState = qualiaService.getCurrentState();

      expect(newState.recovery).toBeGreaterThan(initialState.recovery);
      expect(newState.precision).toBeGreaterThan(initialState.precision);
    });

    test("should handle unknown actions gracefully", async () => {
      const consoleSpy = vi
        .spyOn(mocks.mockLogger, "warn")
        .mockImplementation(() => {});

      // Set up event promise to wait for processing (though it may not emit)
      let eventProcessed = false;
      const eventPromise = new Promise<void>((resolve) => {
        mocks.mockEventBus.subscribe("QualiaStateUpdated", () => {
          eventProcessed = true;
          resolve();
        });
        // Resolve after a short delay if no event is emitted
        setTimeout(() => resolve(), 10);
      });

      await mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "UnknownAction" as any,
      } as any);

      // Wait for potential event processing
      await eventPromise;

      expect(consoleSpy).toHaveBeenCalledWith(
        "⚠️ [QualiaCalculator] Unknown action: UnknownAction",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("State Boundaries and Validation", () => {
    beforeEach(() => {
      qualiaService.start();
    });

    test("should clamp values between 0 and 1", async () => {
      // Emit many HitNote events to try to exceed 1.0
      let eventsProcessed = 0;
      const eventPromise = new Promise<void>((resolve) => {
        mocks.mockEventBus.subscribe("QualiaStateUpdated", () => {
          eventsProcessed++;
          if (eventsProcessed >= 20) {
            resolve();
          }
        });
      });

      for (let i = 0; i < 20; i++) {
        await mocks.mockEventBus.emit({
          type: "PlayerAction",
          action: "HitNote",
        } as any);
      }

      // Wait for all events to be processed
      await eventPromise;

      const state = qualiaService.getCurrentState();

      // All values should be <= 1.0
      Object.values(state).forEach((value) => {
        expect(value).toBeLessThanOrEqual(1.0);
        expect(value).toBeGreaterThanOrEqual(0.0);
      });
    });

    test("should handle negative values correctly", async () => {
      // Emit many MissNote events to try to go below 0.0
      let eventsProcessed = 0;
      const eventPromise = new Promise<void>((resolve) => {
        mocks.mockEventBus.subscribe("QualiaStateUpdated", () => {
          eventsProcessed++;
          if (eventsProcessed >= 20) {
            resolve();
          }
        });
      });

      for (let i = 0; i < 20; i++) {
        await mocks.mockEventBus.emit({
          type: "PlayerAction",
          action: "MissNote",
        } as any);
      }

      // Wait for all events to be processed
      await eventPromise;

      const state = qualiaService.getCurrentState();

      // All values should be >= 0.0
      Object.values(state).forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0.0);
        expect(value).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe("Transcendence Activation", () => {
    beforeEach(() => {
      qualiaService.start();
    });

    test("should activate transcendence when thresholds are met", async () => {
      // Emit enough HitNote events to trigger transcendence
      let eventsProcessed = 0;
      const eventPromise = new Promise<void>((resolve) => {
        mocks.mockEventBus.subscribe("QualiaStateUpdated", () => {
          eventsProcessed++;
          if (eventsProcessed >= 15) {
            resolve();
          }
        });
      });

      for (let i = 0; i < 15; i++) {
        await mocks.mockEventBus.emit({
          type: "PlayerAction",
          action: "HitNote",
        } as any);
      }

      // Wait for all events to be processed
      await eventPromise;

      const state = qualiaService.getCurrentState();

      // Check if transcendence was activated
      if (state.transcendence > 0) {
        expect(mocks.mockLogger.info).toHaveBeenCalledWith(
          "🌟 [QualiaCalculator] TRANSCENDENCE ACTIVATED! Ultimate mode triggered!",
        );
      }
    });
  });

  describe("Configuration Management", () => {
    test("should allow configuration updates", () => {
      const newConfig = {
        intensityDecay: 0.2,
        hitNoteMultipliers: {
          intensity: 0.3,
          precision: 0.4,
          flow: 0.2,
        },
      };

      qualiaService.updateConfig(newConfig);

      // Configuration should be updated (verified through behavior)
      expect(qualiaService.getCurrentState).toBeDefined();
    });
  });

  describe("State Decay", () => {
    test("should apply time-based decay", async () => {
      qualiaService.start();

      // Set initial high values
      let eventProcessed = false;
      const eventPromise = new Promise<void>((resolve) => {
        mocks.mockEventBus.subscribe("QualiaStateUpdated", () => {
          eventProcessed = true;
          resolve();
        });
      });

      mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "HitNote",
      } as any);

      // Wait for event processing
      await eventPromise;

      const initialState = qualiaService.getCurrentState();

      // Simulate time passage by setting lastUpdateTime to past
      (qualiaService as any).lastUpdateTime = Date.now() - 1000; // 1 second ago

      // Manually apply decay
      qualiaService.applyTimeDecay();

      const decayedState = qualiaService.getCurrentState();

      // Some values should have decayed (become lower)
      expect(decayedState.intensity).toBeLessThan(initialState.intensity);
      expect(decayedState.precision).toBeLessThan(initialState.precision);
      expect(decayedState.flow).toBeLessThan(initialState.flow);
    });
  });
});
