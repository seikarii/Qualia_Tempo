import { describe, test, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
/**
 * QUALIA.CODE v1.1 - GameControllerService Tests - IOC COMPLIANT
 * Comprehensive test suite for game state management service.
 * Uses test-container-factory for proper IoC compliance.
 */

import { createTestContainer, getMocksFromContainer, resetAllMocks } from '../testing/test-container-factory';
import { Container } from 'inversify';
import { TYPES } from '../services/inversify.types';
import type { IGameControllerService } from '../services/interfaces/IGameControllerService';
import type { IEventBus } from '../services/interfaces/IEventBus';
import { PlayerActionEvent } from "../services/EventBus";

describe("GameControllerService - QUALIA.CODE v1.1 COMPLIANT", () => {
  let container: Container;
  let sut: IGameControllerService; // Service Under Test - Interface for IoC compliance
  let mocks: ReturnType<typeof getMocksFromContainer>;

  beforeEach(() => {
    container = createTestContainer();
    // QUALIA.CODE COMPLIANCE: Service resolved from central factory, NO local bindings
    sut = container.get<IGameControllerService>(TYPES.IGameControllerService);
    mocks = getMocksFromContainer(container);

    // Configure mock configuration
    (mocks.mockConfigurationService.getGameConfig as Mock).mockReturnValue({
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
    });
  });

  afterEach(() => {
    resetAllMocks();
    if (sut) {
      sut.stop();
    }
  });

  describe("QUALIA.CODE Compliance", () => {
    test("should initialize with correct default state", () => {
      expect(sut).toBeDefined();
      expect(sut).toBeDefined();
      expect(typeof sut.startGame).toBe('function');
    });

    test("should start and stop service idempotently", async () => {
      // Act
      await sut.start();
      await sut.start(); // Should be idempotent
      await sut.stop();
      await sut.stop(); // Should be idempotent

      // Assert - Service should handle idempotent calls gracefully
      expect(mocks.mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Service started successfully")
      );
    });

    test("should handle event-driven architecture", async () => {
      await sut.start();

      const mockCallback = vi.fn();
      mocks.mockEventBus.subscribe("GameStateChanged", mockCallback);

      // Emit StartGame event - mock returns synchronously
      mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "StartGame",
        source: "Test",
      } as Omit<PlayerActionEvent, "timestamp">);

      // No need to wait - mock operations are synchronous
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
      await sut.start();
    });

    test("should handle StartGame action", async () => {
      await sut.start();
      
      const mockCallback = vi.fn();
      mocks.mockEventBus.subscribe("GameStateChanged", mockCallback);

      mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "StartGame",
        source: "Test",
      } as Omit<PlayerActionEvent, "timestamp">);

      // Synchronous mock - no wait needed
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "GameStateChanged",
          newState: "Playing",
        }),
      );
    });

    test("should handle PauseGame action", async () => {
      await sut.start();
      
      const mockCallback = vi.fn();
      mocks.mockEventBus.subscribe("GameStateChanged", mockCallback);

      // Start game first
      mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "StartGame",
        source: "Test",
      } as Omit<PlayerActionEvent, "timestamp">);

      // Then pause
      mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "PauseGame",
        source: "Test",
      } as Omit<PlayerActionEvent, "timestamp">);

      // Synchronous mocks - no wait needed
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "GameStateChanged",
          newState: "Paused",
        }),
      );
    });

    test("should handle ResetGame action", async () => {
      await sut.start();
      
      const mockCallback = vi.fn();
      mocks.mockEventBus.subscribe("GameStateChanged", mockCallback);

      mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "ResetGame",
        source: "Test",
      } as Omit<PlayerActionEvent, "timestamp">);

      // Synchronous mock - no wait needed
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "GameStateChanged",
          newState: "Menu",
        }),
      );
    });

    test("should handle gameplay actions only when playing", async () => {
      const mockCallback = vi.fn();
      mocks.mockEventBus.subscribe("GameStateChanged", mockCallback);

      // Try to perform action when not playing
      mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "HitNote",
        source: "Test",
        context: { points: 10 },
      } as Omit<PlayerActionEvent, "timestamp">);

      // Synchronous mock - should not emit anything
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe("Event Handling", () => {
    beforeEach(async () => {
      await sut.start();
    });

    test("should subscribe to PlayerAction events on start", async () => {
      const subscribeSpy = vi.spyOn(mocks.mockEventBus as any, "subscribe");

      await sut.stop();
      await sut.start();

      expect(subscribeSpy).toHaveBeenCalledWith(
        "PlayerAction",
        expect.any(Function),
        expect.any(Object),
      );
    });

    test("should unsubscribe from events on stop", async () => {
      const unsubscribeSpy = vi.spyOn(mocks.mockEventBus as any, "unsubscribe");

      await sut.stop();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    test("should handle unknown actions gracefully", async () => {
      await sut.start();
      
      const loggerWarnSpy = vi.spyOn(mocks.mockLogger, "warn");

      mocks.mockEventBus.emit({
        type: "PlayerAction",
        action: "UnknownAction" as any,
        source: "Test",
      } as unknown as Omit<PlayerActionEvent, "timestamp">);

      // Synchronous mock - no wait needed
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown action: UnknownAction"),
      );

      loggerWarnSpy.mockRestore();
    });
  });

  describe("Error Handling", () => {
    test("should handle start failures gracefully", async () => {
      // Get the injected eventBus from the container and mock its subscribe method
      const injectedEventBus = container.get<IEventBus>(TYPES.IEventBus);
      const originalSubscribe = injectedEventBus.subscribe;
      (injectedEventBus.subscribe as any) = vi.fn(() => {
        throw new Error("Subscription failed");
      });

      const loggerErrorSpy = vi.spyOn(mocks.mockLogger, "error");

      // In tests, decorators are mocked so errors are thrown synchronously (not caught)
      expect(() => sut.start()).toThrow("Subscription failed");

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("🚨 [GameController] Start failed"),
        expect.any(Object)
      );

      loggerErrorSpy.mockRestore();
      injectedEventBus.subscribe = originalSubscribe;
    });
  });
});
