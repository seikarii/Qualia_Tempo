/**
 * QUALIA.CODE v1.0 - Frontend EventBus Tests
 * Basic test suite for the EventBus service.
 */

import { EventBus, createQualiaEvents } from "../services/EventBus";
import { QualiaLogger, LogLevel } from "../services/Logger";

// Mock logger for tests  
const mockLogger: QualiaLogger = new QualiaLogger('Test', LogLevel.INFO);

describe("EventBus", () => {
  let eventBus: EventBus;
  let QualiaEvents: ReturnType<typeof createQualiaEvents>;

  beforeEach(() => {
    eventBus = new EventBus(mockLogger);
    QualiaEvents = createQualiaEvents(eventBus);
  });

  afterEach(() => {
    eventBus.destroy();
  });

  describe("Basic Functionality", () => {
    test("should initialize and provide stats", () => {
      const stats = eventBus.getStats();
      expect(stats.totalListeners).toBe(0);
      expect(stats.eventTypes).toHaveLength(0);
      expect(stats.isDestroyed).toBe(false);
    });

    test("should subscribe and unsubscribe", () => {
      const mockHandler = jest.fn();

      const listenerId = eventBus.subscribe("PlayerAction", mockHandler);
      expect(typeof listenerId).toBe("string");

      const unsubscribed = eventBus.unsubscribe(listenerId);
      expect(unsubscribed).toBe(true);
    });

    test("should emit events using QualiaEvents helpers", async () => {
      const mockHandler = jest.fn();
      eventBus.subscribe("PlayerAction", mockHandler);

      await QualiaEvents.playerAction("HitNote", { combo: 5 });

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "PlayerAction",
          action: "HitNote",
          context: { combo: 5 },
          source: "PlayerInput",
          timestamp: expect.any(Date),
        }),
      );
    });

    test("should handle QualiaStateUpdated events", async () => {
      const mockHandler = jest.fn();
      eventBus.subscribe("QualiaStateUpdated", mockHandler);

      const testQualiaState = {
        intensity: 0.8,
        precision: 0.5,
        aggression: 0.3,
        flow: 0.9,
        chaos: 0.1,
        recovery: 0.0,
        transcendence: 0.0,
      };

      await QualiaEvents.qualiaStateUpdated(testQualiaState);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "QualiaStateUpdated",
          qualiaState: testQualiaState,
          source: "QualiaCalculator",
        }),
      );
    });

    test("should handle error events", async () => {
      const mockHandler = jest.fn();
      eventBus.subscribe("Error", mockHandler);

      const testError = new Error("Test error");
      await QualiaEvents.error(testError, "high", "TestService");

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "Error",
          error: testError,
          severity: "high",
          source: "TestService",
        }),
      );
    });

    test("should clear all listeners and history", async () => {
      const handler = jest.fn();
      eventBus.subscribe("PlayerAction", handler);

      await QualiaEvents.playerAction("HitNote");

      eventBus.clear();

      const stats = eventBus.getStats();
      expect(stats.totalListeners).toBe(0);
      expect(stats.historySize).toBe(0);
    });

    test("should prevent operations after destroy", () => {
      eventBus.destroy();

      expect(() => {
        eventBus.subscribe("PlayerAction", jest.fn());
      }).toThrow("EventBus has been destroyed");

      const stats = eventBus.getStats();
      expect(stats.isDestroyed).toBe(true);
    });
  });

  describe("Event History", () => {
    test("should maintain event history", async () => {
      await QualiaEvents.playerAction("HitNote");
      await QualiaEvents.playerAction("Dash");

      const history = eventBus.getEventHistory();
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe("PlayerAction");
      expect(history[1].type).toBe("PlayerAction");
    });

    test("should filter history by event type", async () => {
      await QualiaEvents.playerAction("HitNote");
      await QualiaEvents.error(new Error("Test"), "low");

      const playerActionHistory = eventBus.getEventHistory("PlayerAction");
      expect(playerActionHistory).toHaveLength(1);
      expect(playerActionHistory[0].type).toBe("PlayerAction");
    });
  });

  describe("Performance", () => {
    test("should handle multiple subscribers", async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.subscribe("PlayerAction", handler1);
      eventBus.subscribe("PlayerAction", handler2);

      await QualiaEvents.playerAction("Dash");

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    test("should handle rapid events", async () => {
      const handler = jest.fn();
      eventBus.subscribe("PlayerAction", handler);

      // Emit multiple events rapidly
      const promises = [
        QualiaEvents.playerAction("HitNote"),
        QualiaEvents.playerAction("Dash"),
        QualiaEvents.playerAction("HitNote"),
      ];

      await Promise.all(promises);

      expect(handler).toHaveBeenCalledTimes(3);
    });
  });
});
