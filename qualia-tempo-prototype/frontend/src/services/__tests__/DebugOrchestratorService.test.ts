/**
 * QUALIA.CODE v1.1 - DebugOrchestratorService Integration Tests
 * Tests for DebugOrchestratorService to ensure proper IBaseService implementation and event handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContainer } from '../../testing/test-container-factory';
import { DebugOrchestratorService } from '../DebugOrchestratorService';
import { TYPES } from '../inversify.types';

describe('DebugOrchestratorService', () => {
  let container: any;
  let debugOrchestratorService: DebugOrchestratorService;

  beforeEach(() => {
    container = createTestContainer();
    // Bind the real service implementation for integration testing
    container.bind<DebugOrchestratorService>(TYPES.IDebugOrchestratorService).to(DebugOrchestratorService).inSingletonScope();
    debugOrchestratorService = container.get<DebugOrchestratorService>(TYPES.IDebugOrchestratorService);
  });

  describe('IBaseService Implementation', () => {
    it('should initialize without errors and register event subscriptions', () => {
      // Act
      expect(() => {
        (debugOrchestratorService as any).initialize();
      }).not.toThrow();

      // Assert that the service has the required _eventListeners property
      expect((debugOrchestratorService as any)._eventListeners).toBeDefined();
      expect(Array.isArray((debugOrchestratorService as any)._eventListeners)).toBe(true);
    });

    it('should cleanup event subscriptions without errors', () => {
      // Arrange
      (debugOrchestratorService as any).initialize(); // Initialize first

      // Act & Assert
      expect(() => {
        (debugOrchestratorService as any).cleanup();
      }).not.toThrow();
    });

    it('should have _eventListeners array for @OnEvent decorator', () => {
      // Assert that the service instance has the required _eventListeners property
      expect((debugOrchestratorService as any)._eventListeners).toBeDefined();
      expect(Array.isArray((debugOrchestratorService as any)._eventListeners)).toBe(true);
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      (debugOrchestratorService as any).initialize();
    });

    it('should handle ConfigurationLoaded event', () => {
      // Arrange
      const mockConfigLoadedEvent = {
        type: 'ConfigurationLoaded',
        timestamp: new Date(),
        source: 'ConfigurationService'
      };

      // Find the event handler that was subscribed
      const eventListeners = (debugOrchestratorService as any)._eventListeners;
      const configLoadedListener = eventListeners.find(
        (listener: any) => listener.eventType === 'ConfigurationLoaded'
      );

      // Act
      if (configLoadedListener) {
        configLoadedListener.handler(mockConfigLoadedEvent);
      }

      // Assert that configLoaded flag is set
      expect((debugOrchestratorService as any).configLoaded).toBe(true);
    });
  });
});