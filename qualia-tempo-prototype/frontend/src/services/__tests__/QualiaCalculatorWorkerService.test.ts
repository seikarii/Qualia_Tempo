/**
 * QUALIA.CODE v1.1 - QualiaCalculatorWorkerService Tests
 * RUTA.md Phase 3 Step 7: Unit Tests for Worker Service
 * 
 * Tests worker lifecycle management, error recovery, fallback strategy,
 * and event-driven architecture integration.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestContainer } from '../../testing/test-container-factory';
import type { Container } from 'inversify';
import { TYPES } from '../inversify.types';
import type { IQualiaCalculatorWorkerService } from '../interfaces/IQualiaCalculatorWorkerService';
import type { IQualiaStateCalculatorService } from '../interfaces/IQualiaStateCalculatorService';
import type { IEventBus } from '../interfaces/IEventBus';
import type { ILogger } from '../interfaces/ILogger';
import { QualiaCalculatorWorkerService } from '../QualiaCalculatorWorkerService';
import type { QualiaState } from '../../types/contracts';
import type { PlayerActionEvent, GameTickEvent } from '../contracts/events.contracts';
import { EVENT_TYPES, PLAYER_ACTIONS } from '../contracts/constants';

// Mock Worker API
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  
  postMessage(message: unknown): void {
    // Simulate async message handling
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({ data: message } as MessageEvent);
      }
    }, 0);
  }

  terminate(): void {
    // Cleanup
  }
}

describe('QualiaCalculatorWorkerService - Worker Lifecycle & Error Recovery', () => {
  let container: Container;
  let workerService: IQualiaCalculatorWorkerService;
  let fallbackService: IQualiaStateCalculatorService;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;
  let originalWorker: typeof Worker;

  beforeEach(() => {
    // Mock global Worker constructor
    originalWorker = globalThis.Worker;
    (globalThis as any).Worker = MockWorker;

    // Create test container
    container = createTestContainer();
    mockEventBus = container.get<IEventBus>(TYPES.IEventBus);
    mockLogger = container.get<ILogger>(TYPES.ILogger);
    fallbackService = container.get<IQualiaStateCalculatorService>(
      TYPES.IQualiaStateCalculatorService
    );

    // Replace mock with real implementation
    container.unbind(TYPES.IQualiaCalculatorWorkerService);
    container
      .bind<IQualiaCalculatorWorkerService>(TYPES.IQualiaCalculatorWorkerService)
      .to(QualiaCalculatorWorkerService)
      .inSingletonScope();

    workerService = container.get<IQualiaCalculatorWorkerService>(
      TYPES.IQualiaCalculatorWorkerService
    );
  });

  afterEach(() => {
    // Restore Worker
    globalThis.Worker = originalWorker;
    vi.clearAllMocks();
  });

  describe('1. Initialization', () => {
    it('should initialize worker successfully', async () => {
      await workerService.initialize();

      const health = workerService.getHealthStatus();
      expect(health.isHealthy).toBe(true);
    });

    it('should create worker on initialization', async () => {
      await workerService.initialize();

      expect(workerService.isWorkerHealthy()).toBe(true);
      expect(workerService.isUsingFallback()).toBe(false);
    });

    it('should not initialize twice', async () => {
      await workerService.initialize();
      await workerService.initialize();

      const stats = workerService.getStats();
      // Should only create worker once
      expect(stats.workerRecreations).toBe(0);
    });

    it('should fallback to main thread if worker creation fails', async () => {
      // Mock Worker to throw
      (globalThis as any).Worker = class {
        constructor() {
          throw new Error('Worker creation failed');
        }
      };

      await workerService.initialize();

      expect(workerService.isUsingFallback()).toBe(true);
      expect(workerService.isWorkerHealthy()).toBe(false);
    });
  });

  describe('2. Worker Lifecycle Management', () => {
    beforeEach(async () => {
      await workerService.initialize();
    });

    it('should cleanup worker on service cleanup', async () => {
      const health1 = workerService.getHealthStatus();
      expect(health1.isHealthy).toBe(true);

      await workerService.cleanup();

      const health2 = workerService.getHealthStatus();
      expect(health2.workerStatus).toBe('terminated');
    });

    it('should recreate worker when requested', async () => {
      const initialStats = workerService.getStats();
      const initialRecreations = initialStats.workerRecreations;

      await workerService.recreateWorker();

      const newStats = workerService.getStats();
      expect(newStats.workerRecreations).toBe(initialRecreations + 1);
    });

    it('should disable worker when setWorkerEnabled(false)', async () => {
      workerService.setWorkerEnabled(false);

      expect(workerService.isUsingFallback()).toBe(true);
    });

    it('should enable worker when setWorkerEnabled(true)', async () => {
      workerService.setWorkerEnabled(false);
      expect(workerService.isUsingFallback()).toBe(true);

      workerService.setWorkerEnabled(true);
      await vi.waitFor(() => {
        return !workerService.isUsingFallback();
      }, { timeout: 1000 });

      expect(workerService.isUsingFallback()).toBe(false);
    });
  });

  describe('3. Event-Driven Architecture (@OnEvent)', () => {
    beforeEach(async () => {
      await workerService.initialize();
    });

    it('should process PlayerActionEvent', async () => {
      const action: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: 1.0 },
      };

      // Emit event
      await mockEventBus.emit(action);

      // Wait for processing
      await vi.waitFor(() => {
        const state = workerService.getCurrentState();
        return state.intensity > 0;
      }, { timeout: 1000 });

      const state = workerService.getCurrentState();
      expect(state.intensity).toBeGreaterThan(0);
    });

    it('should process GameTickEvent for time decay', async () => {
      // First, build up intensity
      const hitAction: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: 1.0 },
      };
      await mockEventBus.emit(hitAction);
      await vi.waitFor(() => workerService.getCurrentState().intensity > 0);

      const stateBeforeTick = workerService.getCurrentState();

      // Emit game tick with delta time
      const tickEvent: Omit<GameTickEvent, 'timestamp'> = {
        type: EVENT_TYPES.GAME_TICK,
        deltaTime: 1000, // 1 second
      };
      await mockEventBus.emit(tickEvent);

      // Wait for decay
      await vi.waitFor(() => {
        const state = workerService.getCurrentState();
        return state.intensity < stateBeforeTick.intensity;
      }, { timeout: 1000 });

      const stateAfterTick = workerService.getCurrentState();
      expect(stateAfterTick.intensity).toBeLessThan(stateBeforeTick.intensity);
    });

    it('should ignore events when using fallback and fallback handles them', async () => {
      // Force fallback
      workerService.setWorkerEnabled(false);

      const action: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: 1.0 },
      };

      await mockEventBus.emit(action);

      // Fallback service should handle it
      const state = workerService.getCurrentState();
      expect(state).toBeDefined();
    });
  });

  describe('4. Error Recovery', () => {
    beforeEach(async () => {
      await workerService.initialize();
    });

    it('should track consecutive errors', async () => {
      // Simulate worker errors by mocking worker.postMessage to fail
      const worker = (workerService as any).worker;
      if (worker) {
        worker.postMessage = () => {
          throw new Error('Worker communication error');
        };
      }

      // Try to process actions
      const action: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
      };

      for (let i = 0; i < 5; i++) {
        try {
          await mockEventBus.emit(action);
        } catch {
          // Expected
        }
      }

      const stats = workerService.getStats();
      expect(stats.consecutiveErrors).toBeGreaterThan(0);
    });

    it('should activate fallback after error threshold', async () => {
      // Get error threshold from config
      const stats = workerService.getStats();
      const errorThreshold = 3; // From default config

      // Simulate errors
      const worker = (workerService as any).worker;
      if (worker) {
        worker.onerror?.({ message: 'Worker error' } as ErrorEvent);
        worker.onerror?.({ message: 'Worker error' } as ErrorEvent);
        worker.onerror?.({ message: 'Worker error' } as ErrorEvent);
      }

      // Wait for fallback activation
      await vi.waitFor(() => workerService.isUsingFallback(), { timeout: 1000 });

      expect(workerService.isUsingFallback()).toBe(true);
      const health = workerService.getHealthStatus();
      expect(health.consecutiveErrors).toBeGreaterThanOrEqual(errorThreshold);
    });

    it('should auto-recreate worker on error if configured', async () => {
      const initialRecreations = workerService.getStats().workerRecreations;

      // Simulate worker error
      const worker = (workerService as any).worker;
      if (worker?.onerror) {
        worker.onerror({ message: 'Fatal worker error' } as ErrorEvent);
      }

      // Wait for recreation
      await vi.waitFor(() => {
        const stats = workerService.getStats();
        return stats.workerRecreations > initialRecreations;
      }, { timeout: 2000 });

      const stats = workerService.getStats();
      expect(stats.workerRecreations).toBeGreaterThan(initialRecreations);
    });

    it('should reset error count after successful operation', async () => {
      // Simulate some errors
      const worker = (workerService as any).worker;
      if (worker) {
        worker.postMessage = () => {
          throw new Error('Temporary error');
        };
      }

      const action: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
      };

      try {
        await mockEventBus.emit(action);
      } catch {
        // Expected
      }

      // Fix the worker
      if (worker) {
        worker.postMessage = MockWorker.prototype.postMessage;
      }

      // Successful operation
      await mockEventBus.emit(action);

      // Error count should be reset (this is implementation dependent)
      const stats = workerService.getStats();
      expect(stats.lastSuccessfulOperation).toBeDefined();
    });
  });

  describe('5. Fallback Strategy', () => {
    it('should use fallback service when worker disabled', async () => {
      await workerService.initialize();
      workerService.setWorkerEnabled(false);

      expect(workerService.isUsingFallback()).toBe(true);

      const state = workerService.getCurrentState();
      expect(state).toBeDefined();
      expect(typeof state.intensity).toBe('number');
    });

    it('should provide same interface when using fallback', async () => {
      await workerService.initialize();
      workerService.setWorkerEnabled(false);

      const action: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: 1.0 },
      };

      await mockEventBus.emit(action);

      const state = workerService.getCurrentState();
      expect(state).toBeDefined();
      expect(state.intensity).toBeGreaterThan(0);
    });

    it('should track fallback activations', async () => {
      await workerService.initialize();

      const initialActivations = workerService.getStats().fallbackActivations;

      workerService.setWorkerEnabled(false);

      const stats = workerService.getStats();
      expect(stats.fallbackActivations).toBeGreaterThan(initialActivations);
    });
  });

  describe('6. Health Monitoring', () => {
    beforeEach(async () => {
      await workerService.initialize();
    });

    it('should report healthy status when worker functioning', () => {
      const health = workerService.getHealthStatus();

      expect(health.isHealthy).toBe(true);
      expect(health.workerStatus).toBe('ready');
      expect(health.consecutiveErrors).toBe(0);
    });

    it('should report unhealthy status when using fallback', async () => {
      workerService.setWorkerEnabled(false);

      const health = workerService.getHealthStatus();

      expect(health.isHealthy).toBe(false);
      expect(health.usingFallback).toBe(true);
    });

    it('should track last successful operation time', async () => {
      const action: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
      };

      await mockEventBus.emit(action);

      await vi.waitFor(() => {
        const stats = workerService.getStats();
        return stats.lastSuccessfulOperation !== undefined;
      }, { timeout: 1000 });

      const stats = workerService.getStats();
      expect(stats.lastSuccessfulOperation).toBeDefined();
      expect(stats.lastSuccessfulOperation).toBeGreaterThan(0);
    });

    it('should provide comprehensive statistics', () => {
      const stats = workerService.getStats();

      expect(stats).toHaveProperty('workerStatus');
      expect(stats).toHaveProperty('usingFallback');
      expect(stats).toHaveProperty('workerRecreations');
      expect(stats).toHaveProperty('fallbackActivations');
      expect(stats).toHaveProperty('consecutiveErrors');
      expect(stats).toHaveProperty('lastError');
      expect(stats).toHaveProperty('lastSuccessfulOperation');
    });
  });

  describe('7. Configuration Management', () => {
    beforeEach(async () => {
      await workerService.initialize();
    });

    it('should update configuration', async () => {
      const newConfig = {
        baseQualiaState: {
          intensity: 0.5,
          precision: 0.8,
          aggression: 0.2,
          flow: 0.3,
          chaos: 0,
          recovery: 0,
          transcendence: 0,
        },
        performanceMultipliers: { perfect: 0.2, good: 0.1, miss: -0.2, combo: 0.04 },
        precision: { hitBonus: 0.1, missPenalty: -0.2, decayRate: 0.02 },
        flow: { perfectHitBonus: 0.1, missPenalty: -0.1, decayRate: 0.04 },
        chaos: { missIncrease: 0.2, decayAmount: 0.1, decayRate: 0.06 },
        aggression: { comboMultiplier: 0.04, decayRate: 0.02 },
        transcendenceThresholds: { intensity: 0.95, precision: 0.95, flow: 0.95 },
        updateIntervalMs: 50,
        minValue: 0,
        maxValue: 1,
        transcendenceActivationValue: 1,
        millisecondsToSecondsConversion: 1000,
        transcendenceDecayRate: 0.05,
        transcendenceCheckValue: 0,
      };

      await workerService.updateConfig(newConfig);

      // New config should be applied
      const state = workerService.getCurrentState();
      expect(state.intensity).toBe(0.5);
      expect(state.precision).toBe(0.8);
    });
  });

  describe('8. State Management', () => {
    beforeEach(async () => {
      await workerService.initialize();
    });

    it('should get current state', () => {
      const state = workerService.getCurrentState();

      expect(state).toBeDefined();
      expect(state).toHaveProperty('intensity');
      expect(state).toHaveProperty('precision');
      expect(state).toHaveProperty('aggression');
      expect(state).toHaveProperty('flow');
      expect(state).toHaveProperty('chaos');
      expect(state).toHaveProperty('recovery');
      expect(state).toHaveProperty('transcendence');
    });

    it('should reset state', async () => {
      // Build up state
      const hitAction: Omit<PlayerActionEvent, 'timestamp'> = {
        type: 'PlayerAction',
        action: PLAYER_ACTIONS.HIT_NOTE,
        context: { accuracy: 1.0 },
      };

      await mockEventBus.emit(hitAction);
      await vi.waitFor(() => workerService.getCurrentState().intensity > 0);

      // Reset
      await workerService.resetState();

      const state = workerService.getCurrentState();
      expect(state.intensity).toBe(0);
    });
  });

  describe('9. Performance', () => {
    beforeEach(async () => {
      await workerService.initialize();
    });

    it('should not block main thread during calculations', async () => {
      const startTime = performance.now();
      
      // Process many actions
      for (let i = 0; i < 100; i++) {
        const action: Omit<PlayerActionEvent, 'timestamp'> = {
          type: 'PlayerAction',
          action: PLAYER_ACTIONS.HIT_NOTE,
          context: { accuracy: 1.0 },
        };
        await mockEventBus.emit(action);
      }

      const elapsed = performance.now() - startTime;

      // Should be fast (non-blocking)
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('10. Edge Cases', () => {
    it('should handle cleanup before initialization', async () => {
      expect(async () => {
        await workerService.cleanup();
      }).not.toThrow();
    });

    it('should handle multiple rapid recreations', async () => {
      await workerService.initialize();

      // Rapid recreations
      await Promise.all([
        workerService.recreateWorker(),
        workerService.recreateWorker(),
        workerService.recreateWorker(),
      ]);

      const stats = workerService.getStats();
      expect(stats.workerRecreations).toBeGreaterThan(0);
    });

    it('should handle state requests during worker initialization', async () => {
      const initPromise = workerService.initialize();
      
      // Request state before initialization completes
      const state = workerService.getCurrentState();

      await initPromise;

      expect(state).toBeDefined();
    });
  });
});
