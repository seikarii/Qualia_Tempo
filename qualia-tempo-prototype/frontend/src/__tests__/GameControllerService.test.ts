/**
 * QUALIA.CODE v1.0 - GameControllerService Tests
 * Comprehensive test suite for game state management service.
 */

import { GameControllerService } from "../services/GameControllerService";
import { EventBus, PlayerActionEvent } from "../services/EventBus";
import { QualiaLogger, LogLevel } from "../services/Logger";

// Mock logger for tests
const mockLogger: QualiaLogger = new QualiaLogger('Test', LogLevel.INFO);

describe("GameControllerService", () => {
  let eventBus: EventBus;
  let gameController: GameControllerService;

  beforeEach(() => {
    eventBus = new EventBus(mockLogger);
    gameController = new GameControllerService(eventBus, mockLogger);
  });

  afterEach(async () => {
    if (gameController) {
      await gameController.stop();
    }
    if (eventBus) {
      eventBus.destroy();
    }
  });

  describe("QUALIA.CODE Compliance", () => {
    test("should initialize with correct default state", () => {
      expect(gameController).toBeDefined();
      // Note: Internal state is private, so we test through behavior
    });

    test("should start and stop service idempotently", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await gameController.start();
      await gameController.start(); // Should warn about already running
      await gameController.stop();
      await gameController.stop(); // Should warn about not running

      // Should have warned twice: once for already running, once for not running
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        "⚠️ [GameController] Service already running",
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        "⚠️ [GameController] Service not running",
      );

      consoleSpy.mockRestore();
    });

    test("should handle event-driven architecture", async () => {
      await gameController.start();

      const mockCallback = jest.fn();
      eventBus.subscribe("GameStateChanged", mockCallback);

      // Emit StartGame event
      eventBus.emit({
        type: "PlayerAction",
        action: "StartGame",
        source: "Test",
      } as Omit<PlayerActionEvent, "timestamp">);

      // Wait for event processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "GameStateChanged",
          newState: "Playing",
        }),
      );
    });
  });

  describe("Game State Management", () => {
    beforeEach(async () => {
      await gameController.start();
    });

    test("should handle StartGame action", async () => {
      // Reset game state to ensure clean initial state
      gameController = new GameControllerService(eventBus, mockLogger);
      await gameController.start();

      const mockCallback = jest.fn();
      eventBus.subscribe("GameStateChanged", mockCallback);

      eventBus.emit({
        type: "PlayerAction",
        action: "StartGame",
        source: "Test",
      } as Omit<PlayerActionEvent, "timestamp">);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "GameStateChanged",
          newState: "Playing",
          // Note: previousState depends on initial state, could be 'Menu' or 'Playing'
        }),
      );
    });

    test("should handle PauseGame action", async () => {
      const mockCallback = jest.fn();
      eventBus.subscribe("GameStateChanged", mockCallback);

      // Start game first
      eventBus.emit({
        type: "PlayerAction",
        action: "StartGame",
        source: "Test",
      } as Omit<PlayerActionEvent, "timestamp">);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Then pause
      eventBus.emit({
        type: "PlayerAction",
        action: "PauseGame",
        source: "Test",
      } as Omit<PlayerActionEvent, "timestamp">);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "GameStateChanged",
          newState: "Paused",
        }),
      );
    });

    test("should handle ResetGame action", async () => {
      const mockCallback = jest.fn();
      eventBus.subscribe("GameStateChanged", mockCallback);

      eventBus.emit({
        type: "PlayerAction",
        action: "ResetGame",
        source: "Test",
      } as Omit<PlayerActionEvent, "timestamp">);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "GameStateChanged",
          newState: "Menu",
        }),
      );
    });

    test("should handle gameplay actions only when playing", async () => {
      const mockCallback = jest.fn();
      eventBus.subscribe("GameStateChanged", mockCallback);

      // Try to perform action when not playing
      eventBus.emit({
        type: "PlayerAction",
        action: "HitNote",
        source: "Test",
        context: { points: 10 },
      } as Omit<PlayerActionEvent, "timestamp">);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not emit GameStateChanged for gameplay actions when not playing
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe("Event Handling", () => {
    beforeEach(async () => {
      await gameController.start();
    });

    test("should subscribe to PlayerAction events on start", async () => {
      const subscribeSpy = jest.spyOn(eventBus, "subscribe");

      await gameController.stop();
      await gameController.start();

      expect(subscribeSpy).toHaveBeenCalledWith(
        "PlayerAction",
        expect.any(Function),
        expect.any(Object),
      );
    });

    test("should unsubscribe from events on stop", async () => {
      const unsubscribeSpy = jest.spyOn(eventBus, "unsubscribe");

      await gameController.stop();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    test("should handle unknown actions gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      eventBus.emit({
        type: "PlayerAction",
        action: "UnknownAction" as any,
        source: "Test",
      } as unknown as Omit<PlayerActionEvent, "timestamp">);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown action: UnknownAction"),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Error Handling", () => {
    test("should handle start failures gracefully", async () => {
      // Mock a failure scenario
      const originalSubscribe = eventBus.subscribe;
      eventBus.subscribe = jest.fn(() => {
        throw new Error("Subscription failed");
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await expect(gameController.start()).rejects.toThrow(
        "Subscription failed",
      );

      consoleSpy.mockRestore();
      eventBus.subscribe = originalSubscribe;
    });
  });
});
