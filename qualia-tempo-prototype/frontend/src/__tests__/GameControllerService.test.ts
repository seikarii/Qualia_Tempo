import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
/**
 * QUALIA.CODE v1.1 - GameControllerService Tests - IOC COMPLIANT
 * Comprehensive test suite for game state management service.
 * Uses InversifyJS container for dependency injection.
 */

import { container } from '../services/inversify.config';
import { TYPES } from '../services/inversify.types';
import type { IGameControllerService } from '../services/interfaces/IGameControllerService';
import type { IEventBus } from '../services/interfaces/IEventBus';
import type { IConfigurationService } from '../services/interfaces/IConfigurationService';
import { QualiaLogger, LogLevel } from "../services/Logger";
import { PlayerActionEvent } from "../services/EventBus";

describe("GameControllerService - IOC COMPLIANT", () => {
  let gameController: IGameControllerService;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockConfigService: jest.Mocked<IConfigurationService>;

  beforeEach(() => {
    // Create mocks for EventBus interface
    mockEventBus = {
      emit: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      clear: vi.fn(),
      destroy: vi.fn(),
      getStats: vi.fn().mockReturnValue({
        totalListeners: 0,
        eventTypes: [],
        historySize: 0,
        isDestroyed: false
      })
    };

    // Create mocks for ConfigurationService interface
    mockConfigService = {
      loadConfig: vi.fn(),
      getConfig: vi.fn(),
      getGameConfig: vi.fn().mockReturnValue({
        pauseCooldown: 1000,
        rhythmTolerance: 0.2,
        comboResetTime: 2000,
        maxHealth: 100,
        scoringSystem: {
          perfect: 100,
          good: 75,
          okay: 50,
          miss: 0
        }
      }),
      getQualiaConfig: vi.fn(),
      getBackendConfig: vi.fn(),
      getAudioConfig: vi.fn(),
      getErrorReportingConfig: vi.fn(),
      getRhythmicMovementConfig: vi.fn(),
      getNotificationConfig: vi.fn(),
      getConfigSection: vi.fn(),
      isLoaded: vi.fn().mockReturnValue(true),
      reload: vi.fn()
    };

    // Inject mocks into IoC container using QUALIA.CODE LAW
    container.unbind(TYPES.IEventBus);
    container.bind<IEventBus>(TYPES.IEventBus).toConstantValue(mockEventBus);
    
    container.unbind(TYPES.IConfigurationService);
    container.bind<IConfigurationService>(TYPES.IConfigurationService).toConstantValue(mockConfigService);
    
    container.unbind(TYPES.ILogger);
    container.bind<QualiaLogger>(TYPES.ILogger).toConstantValue(new QualiaLogger('Test', LogLevel.INFO));

    // Get service instance from container - NO MANUAL INSTANTIATION
    gameController = container.get<IGameControllerService>(TYPES.IGameControllerService);
  });

  afterEach(async () => {
    if (gameController) {
      await gameController.stop();
    }
  });

  describe("QUALIA.CODE Compliance", () => {
    test("should initialize with correct default state", () => {
      expect(gameController).toBeDefined();
      // Note: Internal state is private, so we test through behavior
    });

    test("should start and stop service idempotently", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation();

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

      const mockCallback = vi.fn();
      mockEventBus.subscribe("GameStateChanged", mockCallback);

      // Emit StartGame event
      mockEventBus.emit({
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
      gameController = container.get<IGameControllerService>(TYPES.IGameControllerService);
      await gameController.start();

      const mockCallback = vi.fn();
      mockEventBus.subscribe("GameStateChanged", mockCallback);

      mockEventBus.emit({
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
      const mockCallback = vi.fn();
      mockEventBus.subscribe("GameStateChanged", mockCallback);

      // Start game first
      mockEventBus.emit({
        type: "PlayerAction",
        action: "StartGame",
        source: "Test",
      } as Omit<PlayerActionEvent, "timestamp">);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Then pause
      mockEventBus.emit({
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
      const mockCallback = vi.fn();
      mockEventBus.subscribe("GameStateChanged", mockCallback);

      mockEventBus.emit({
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
      const mockCallback = vi.fn();
      mockEventBus.subscribe("GameStateChanged", mockCallback);

      // Try to perform action when not playing
      mockEventBus.emit({
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
      const subscribeSpy = vi.spyOn(mockEventBus as any, "subscribe");

      await gameController.stop();
      await gameController.start();

      expect(subscribeSpy).toHaveBeenCalledWith(
        "PlayerAction",
        expect.any(Function),
        expect.any(Object),
      );
    });

    test("should unsubscribe from events on stop", async () => {
      const unsubscribeSpy = vi.spyOn(mockEventBus as any, "unsubscribe");

      await gameController.stop();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    test("should handle unknown actions gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation();

      mockEventBus.emit({
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
      const originalSubscribe = mockEventBus.subscribe;
      (mockEventBus.subscribe as any) = jest.fn(() => {
        throw new Error("Subscription failed");
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation();

      await expect(gameController.start()).rejects.toThrow(
        "Subscription failed",
      );

      consoleSpy.mockRestore();
      mockEventBus.subscribe = originalSubscribe;
    });
  });
});
