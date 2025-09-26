import { describe, test, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
/**
 * QUALIA.CODE v1.1 - BackendSyncService Tests - IOC COMPLIANT
 * Comprehensive test suite for backend synchronization service.
 * Uses test-container-factory for proper IoC compliance.
 */

import { createTestContainer, getMocksFromContainer, resetAllMocks } from '../testing/test-container-factory';
import { Container } from 'inversify';
import { TYPES } from '../services/inversify.types';
import type { IBackendSyncService } from '../services/interfaces/IBackendSyncService';

describe("BackendSyncService - QUALIA.CODE v1.1 COMPLIANT", () => {
  let container: Container;
  let sut: IBackendSyncService; // Service Under Test - Interface for IoC compliance
  let mocks: ReturnType<typeof getMocksFromContainer>;

  beforeEach(() => {
    container = createTestContainer();
    // QUALIA.CODE COMPLIANCE: Service resolved from central factory, NO local bindings
    sut = container.get<IBackendSyncService>(TYPES.IBackendSyncService);
    mocks = getMocksFromContainer(container);

    // Configure backend configuration mock
    (mocks.mockConfigurationService.getBackendConfig as Mock).mockReturnValue({
      baseUrl: 'http://localhost:8000',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      throttleMs: 250,
      healthCheckInterval: 30000,
      endpoints: {
        qualiaState: '/api/qualia-state',
        health: '/api/health'
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
    test("should initialize with event-driven architecture", () => {
      expect(sut).toBeDefined();
    });

    test("should start and stop service idempotently", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await sut.start();
      await sut.start(); // Should be idempotent
      await sut.stop();
      await sut.stop(); // Should be idempotent

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test("should provide connection status", async () => {
      // Arrange
      (mocks.mockHttpService.get as Mock).mockResolvedValue({ success: true });

      // Act
      await sut.start();

      // Assert - Initially should be disconnected until health check passes
      expect(sut.isBackendConnected()).toBe(false);
    });
  });

  describe("Event Handling", () => {
    beforeEach(async () => {
      await sut.start();
    });

    test("should subscribe to QualiaStateUpdated events on start", async () => {
      const subscribeSpy = vi.spyOn(mocks.mockEventBus as any, "subscribe");

      await sut.stop();
      await sut.start();

      expect(subscribeSpy).toHaveBeenCalledWith(
        "QualiaStateUpdated",
        expect.any(Function),
        expect.any(Object),
      );
    });

    test("should unsubscribe from events on stop", async () => {
      const unsubscribeSpy = vi.spyOn(mocks.mockEventBus as any, "unsubscribe");

      await sut.stop();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });

  describe("Health Checking", () => {
    test("should perform health checks when started", async () => {
      // Arrange
      (mocks.mockHttpService.get as Mock).mockResolvedValue({ success: true });

      // Act
      await sut.start();

      // Wait for health check
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mocks.mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Service started successfully"),
      );
    });

    test("should stop health checking when stopped", async () => {
      // Arrange
      (mocks.mockHttpService.get as Mock).mockResolvedValue({ success: true });

      // Act
      await sut.start();
      await sut.stop();

      // Assert - Connection should be false after stop
      expect(sut.isBackendConnected()).toBe(false);
    });
  });

  describe("QualiaState Synchronization", () => {
    beforeEach(async () => {
      await sut.start();
    });

    test("should handle QualiaStateUpdated events", async () => {
      // Arrange
      const mockQualiaState = {
        intensity: 0.8,
        precision: 0.7,
        aggression: 0.5,
        flow: 0.9,
        chaos: 0.2,
        recovery: 0.3,
        transcendence: 0.1,
      };

      (mocks.mockHttpService.post as Mock).mockResolvedValue({ success: true });

      // Act
      await mocks.mockEventBus.emit({
        type: "QualiaStateUpdated",
        qualiaState: mockQualiaState,
        timestamp: new Date(),
        source: "Test",
      } as any);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(mocks.mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Received QualiaState update"),
        expect.any(Object)
      );
    });

    test("should throttle rapid QualiaState updates", async () => {
      // Arrange
      const mockQualiaState = {
        intensity: 0.8,
        precision: 0.7,
        aggression: 0.5,
        flow: 0.9,
        chaos: 0.2,
        recovery: 0.3,
        transcendence: 0.1,
      };

      (mocks.mockHttpService.post as Mock).mockResolvedValue({ success: true });

      // Act - Emit multiple rapid updates
      for (let i = 0; i < 5; i++) {
        await mocks.mockEventBus.emit({
          type: "QualiaStateUpdated",
          qualiaState: { ...mockQualiaState, intensity: i * 0.1 },
          timestamp: new Date(),
          source: "Test",
        } as any);
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Assert - Should have throttled the updates
      const debugCalls = (mocks.mockLogger.debug as Mock).mock.calls.filter((call) =>
        call[0].includes("Received QualiaState update"),
      );

      expect(debugCalls.length).toBeLessThan(5); // Should be throttled
    });
  });

  describe("Configuration", () => {
    test("should provide configuration access", () => {
      // Act
      const config = sut.getConfig();

      // Assert
      expect(config).toBeDefined();
      expect(typeof config).toBe("object");
    });
  });

  describe("Error Handling", () => {
    test("should handle sync failures gracefully", async () => {
      // Arrange
      await sut.start();
      (mocks.mockHttpService.post as Mock).mockRejectedValue(new Error("Sync failed"));

      // Act
      await mocks.mockEventBus.emit({
        type: "QualiaStateUpdated",
        qualiaState: {
          intensity: 0.5,
          precision: 0.5,
          aggression: 0.5,
          flow: 0.5,
          chaos: 0.5,
          recovery: 0.5,
          transcendence: 0.5,
        },
        timestamp: new Date(),
        source: "Test",
      } as any);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(mocks.mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to sync"),
        expect.any(Object)
      );
    });
  });
});
