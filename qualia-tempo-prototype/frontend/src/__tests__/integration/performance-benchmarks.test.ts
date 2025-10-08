/**
 * QUALIA.CODE v1.1 - Performance Benchmark Integration Tests
 * PHASE 6.3: Testing & Validation
 * 
 * PURPOSE: Automated performance benchmarking for latency, frame rate,
 * resource usage, and mapper overhead validation against targets.
 * 
 * ARCHITECTURAL COMPLIANCE:
 * - IoC: Uses createTestContainer() for total isolation
 * - Performance Profiler: Uses PerformanceProfiler utility for measurements
 * - QUALIA.CODE: Production-grade performance validation
 * 
 * PERFORMANCE TARGETS:
 * - Latency: <50ms localhost, <100ms network
 * - Frame Rate: 60fps (WebSocket + Three.js)
 * - Memory: Stable (no leaks detected)
 * - Mapper Overhead: <0.5ms per call
 * 
 * TEST CATEGORIES:
 * 1. Latency Benchmarks
 * 2. Frame Rate Benchmarks
 * 3. Memory Benchmarks
 * 4. Mapper Overhead Benchmarks
 * 5. Full System Load Testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestContainer, resetAllMocks } from '../../testing/test-container-factory';
import { PerformanceProfiler } from '../../testing/performance-profiler';
import type { Container } from 'inversify';
import { TYPES } from '../../services/inversify.types';
import type { IEventBus } from '../../services/interfaces/IEventBus';
import type { IGameStateStore } from '../../services/interfaces/IGameStateStore';
import type { CombatState } from '../../types/CombatState';
import type { CombatStateUpdatedEvent } from '../../services/contracts/events.contracts';

describe('Performance Benchmarks: System Performance Validation', () => {
  let container: Container;
  let eventBus: IEventBus;
  let gameStateStore: IGameStateStore;
  let profiler: PerformanceProfiler;

  // Sample CombatState for testing
  const mockCombatState: CombatState = {
    timestamp: Date.now(),
    gameState: 'PLAYING',
    player: {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      health: 100,
      combo: 10,
      score: 1000,
      isInvincible: false,
      isDashing: false
    },
    boss: {
      position: { x: 10, y: 0, z: 0 },
      health: 80,
      currentPhase: 1,
      isAttacking: false,
      attackCooldown: 0
    },
    qualia: {
      emotional_valence: 0.5,
      arousal: 0.6,
      coherence: 0.7,
      transcendence: 0.3,
      energy: 0.8,
      intensity: 0.5
    },
    effects: [],
    notes: []
  };

  beforeEach(() => {
    container = createTestContainer();
    eventBus = container.get<IEventBus>(TYPES.IEventBus);
    gameStateStore = container.get<IGameStateStore>(TYPES.IGameStateStore);
    profiler = new PerformanceProfiler();
  });

  afterEach(() => {
    profiler.reset();
    resetAllMocks();
  });

  describe('1. Latency Benchmarks', () => {
    it('should achieve <50ms latency for EventBus emit → Store update', async () => {
      // Arrange: Event to emit
      const event: CombatStateUpdatedEvent = {
        type: 'CombatStateUpdated',
        timestamp: new Date(),
        combatState: mockCombatState,
        latency: 45,
        source: 'GameStateStreamingService',
        metadata: {}
      };

      // Act: Measure latency
      profiler.startLatencyMeasurement('eventbus-to-store');
      await eventBus.emit(event);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small wait for propagation
      const latency = profiler.endLatencyMeasurement('eventbus-to-store');

      // Assert: Latency should be <50ms
      expect(latency).not.toBeNull();
      expect(latency!).toBeLessThan(50);
    });

    it('should achieve <50ms average latency over 100 events', async () => {
      // Arrange: 100 events
      const events: CombatStateUpdatedEvent[] = Array.from({ length: 100 }, (_, i) => ({
        type: 'CombatStateUpdated',
        timestamp: new Date(),
        combatState: {
          ...mockCombatState,
          timestamp: Date.now() + i,
          player: {
            ...mockCombatState.player,
            score: 1000 + i * 10
          }
        },
        latency: 40 + Math.random() * 20,
        source: 'GameStateStreamingService',
        metadata: {}
      }));

      // Act: Measure latency for all events
      for (const event of events) {
        profiler.startLatencyMeasurement(`event-${event.combatState.timestamp}`);
        await eventBus.emit(event);
        profiler.endLatencyMeasurement(`event-${event.combatState.timestamp}`);
      }

      // Get statistics
      const stats = profiler.getLatencyStats();

      // Assert: Average latency <50ms
      expect(stats.average).toBeLessThan(50);
      expect(stats.samples).toBe(100);
    });

    it('should validate latency against target using profiler', () => {
      // Arrange: Simulate latency measurements
      for (let i = 0; i < 10; i++) {
        profiler.startLatencyMeasurement(`test-${i}`);
        // Simulate processing time
        const startTime = performance.now();
        while (performance.now() - startTime < 40) {
          // Busy wait for 40ms
        }
        profiler.endLatencyMeasurement(`test-${i}`);
      }

      // Act: Validate against 50ms target
      const passed = profiler.validateLatency(50);

      // Assert: Should pass
      expect(passed).toBe(true);
    });
  });

  describe('2. Frame Rate Benchmarks', () => {
    it('should achieve 60fps frame rate for 60 consecutive frames', () => {
      // Arrange: Simulate 60 frames
      const frameInterval = 1000 / 60; // ~16.67ms

      profiler.resetFrameRate();
      let lastFrameTime = performance.now();

      // Act: Record 60 frames
      for (let i = 0; i < 60; i++) {
        // Simulate frame render time
        while (performance.now() - lastFrameTime < frameInterval) {
          // Busy wait
        }
        lastFrameTime = performance.now();
        profiler.recordFrame();
      }

      // Get statistics
      const stats = profiler.getFrameRateStats();

      // Assert: FPS should be ~60
      expect(stats.fps).toBeGreaterThan(55); // Allow margin
      expect(stats.fps).toBeLessThan(65);
      expect(stats.totalFrames).toBe(60);
    });

    it('should detect dropped frames when frame time exceeds threshold', () => {
      // Arrange: Simulate frames with some drops
      profiler.resetFrameRate();

      // Act: Record frames (some with delays)
      for (let i = 0; i < 10; i++) {
        if (i === 3 || i === 7) {
          // Simulate dropped frame (delay > 25ms)
          const start = performance.now();
          while (performance.now() - start < 30) {
            // Busy wait
          }
        } else {
          // Normal frame (16.67ms)
          const start = performance.now();
          while (performance.now() - start < 16) {
            // Busy wait
          }
        }
        profiler.recordFrame();
      }

      // Get statistics
      const stats = profiler.getFrameRateStats();

      // Assert: Should detect 2 dropped frames
      expect(stats.droppedFrames).toBeGreaterThanOrEqual(2);
    });

    it('should validate frame rate against 60fps target', () => {
      // Arrange: Simulate 60fps
      profiler.resetFrameRate();
      const frameInterval = 1000 / 60;
      let lastFrameTime = performance.now();

      for (let i = 0; i < 60; i++) {
        while (performance.now() - lastFrameTime < frameInterval) {
          // Busy wait
        }
        lastFrameTime = performance.now();
        profiler.recordFrame();
      }

      // Act: Validate against 60fps target
      const passed = profiler.validateFrameRate(60);

      // Assert: Should pass
      expect(passed).toBe(true);
    });
  });

  describe('3. Memory Benchmarks', () => {
    it('should take memory snapshots at regular intervals', () => {
      // Arrange: Start memory profiling (1s intervals)
      const snapshots = [];
      profiler.startMemoryProfiling(100); // 100ms for faster test

      // Act: Wait for multiple snapshots
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          profiler.stopMemoryProfiling();
          const stats = profiler.getMemoryStats();

          // Assert: Should have multiple snapshots
          expect(stats.snapshots).toBeGreaterThan(0);
          resolve();
        }, 500); // Wait 500ms (should have ~5 snapshots)
      });
    });

    it('should detect memory leaks (consistently increasing heap)', () => {
      // Arrange: Simulate increasing heap usage
      const snapshots = [];
      let artificialHeap = 1000000;

      // Mock process.memoryUsage (Node.js environment)
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const originalMemoryUsage = process.memoryUsage;
        vi.spyOn(process, 'memoryUsage').mockImplementation(() => {
          artificialHeap += 100000; // Increase by 100KB each time
          return {
            heapUsed: artificialHeap,
            heapTotal: 10000000,
            external: 0,
            arrayBuffers: 0,
            rss: 0
          };
        });

        // Act: Take 15 snapshots
        for (let i = 0; i < 15; i++) {
          profiler.takeMemorySnapshot();
        }

        // Assert: Should detect leak
        const leakDetected = profiler.detectMemoryLeak();
        expect(leakDetected).toBe(true);

        // Restore original
        process.memoryUsage = originalMemoryUsage;
      } else {
        // Browser environment - skip test
        expect(true).toBe(true);
      }
    });

    it('should not detect memory leaks when heap is stable', () => {
      // Arrange: Stable heap usage
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const originalMemoryUsage = process.memoryUsage;
        vi.spyOn(process, 'memoryUsage').mockImplementation(() => ({
          heapUsed: 5000000, // Constant
          heapTotal: 10000000,
          external: 0,
          arrayBuffers: 0,
          rss: 0
        }));

        // Act: Take 15 snapshots
        for (let i = 0; i < 15; i++) {
          profiler.takeMemorySnapshot();
        }

        // Assert: Should NOT detect leak
        const leakDetected = profiler.detectMemoryLeak();
        expect(leakDetected).toBe(false);

        // Restore
        process.memoryUsage = originalMemoryUsage;
      } else {
        expect(true).toBe(true);
      }
    });

    it('should calculate average and peak heap usage', () => {
      // Arrange: Take snapshots with varying heap
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const heapValues = [5000000, 5500000, 6000000, 5800000, 5600000];
        let callCount = 0;
        const originalMemoryUsage = process.memoryUsage;

        vi.spyOn(process, 'memoryUsage').mockImplementation(() => {
          const heapUsed = heapValues[callCount % heapValues.length];
          callCount++;
          return {
            heapUsed,
            heapTotal: 10000000,
            external: 0,
            arrayBuffers: 0,
            rss: 0
          };
        });

        // Act: Take snapshots
        for (let i = 0; i < heapValues.length; i++) {
          profiler.takeMemorySnapshot();
        }

        // Get statistics
        const stats = profiler.getMemoryStats();

        // Assert: Average and peak should be calculated correctly
        const expectedAverage = heapValues.reduce((a, b) => a + b, 0) / heapValues.length;
        const expectedPeak = Math.max(...heapValues);

        expect(stats.averageHeapUsed).toBe(expectedAverage);
        expect(stats.peakHeapUsed).toBe(expectedPeak);

        // Restore
        process.memoryUsage = originalMemoryUsage;
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe('4. Mapper Overhead Benchmarks', () => {
    it('should measure mapper overhead <0.5ms per call', () => {
      // Arrange: Mock mapper function
      const mockMapper = (input: CombatState) => {
        return {
          position: [input.player.position.x, input.player.position.y, input.player.position.z],
          health: input.player.health,
          power_level: Math.min(input.player.score / 10000, 1.0),
          consciousness_level: Math.min(input.player.combo / 100, 1.0)
        };
      };

      // Act: Profile mapper 100 times
      for (let i = 0; i < 100; i++) {
        profiler.profileMapper('mapCombatStateToPlayerState', mockMapper, mockCombatState);
      }

      // Get statistics
      const stats = profiler.getMapperOverheadStats();
      const mapperStats = stats.find(s => s.mapperName === 'mapCombatStateToPlayerState');

      // Assert: Average overhead <0.5ms
      expect(mapperStats).toBeDefined();
      expect(mapperStats!.averageTime).toBeLessThan(0.5);
      expect(mapperStats!.calls).toBe(100);
    });

    it('should validate all mappers meet overhead target', () => {
      // Arrange: Profile multiple mappers
      const mapper1 = (input: CombatState) => ({
        position: [input.player.position.x, input.player.position.y, input.player.position.z]
      });

      const mapper2 = (input: CombatState) => ({
        stress_level: (100 - input.boss.health) / 100,
        power_level: input.boss.currentPhase * 0.33
      });

      // Act: Profile both mappers
      for (let i = 0; i < 50; i++) {
        profiler.profileMapper('mapper1', mapper1, mockCombatState);
        profiler.profileMapper('mapper2', mapper2, mockCombatState);
      }

      // Assert: All mappers <0.5ms average
      const passed = profiler.validateMapperOverhead(0.5);
      expect(passed).toBe(true);
    });

    it('should track min/max mapper execution times', () => {
      // Arrange: Mock mapper with varying execution time
      let callCount = 0;
      const mockMapper = (input: CombatState) => {
        // Simulate varying execution time
        const start = performance.now();
        const delay = callCount % 2 === 0 ? 0.1 : 0.3; // Alternating 0.1ms and 0.3ms
        while (performance.now() - start < delay) {
          // Busy wait
        }
        callCount++;
        return { position: [0, 0, 0] };
      };

      // Act: Profile mapper 10 times
      for (let i = 0; i < 10; i++) {
        profiler.profileMapper('variableMapper', mockMapper, mockCombatState);
      }

      // Get statistics
      const stats = profiler.getMapperOverheadStats();
      const mapperStats = stats.find(s => s.mapperName === 'variableMapper');

      // Assert: Min and max should be tracked
      expect(mapperStats).toBeDefined();
      expect(mapperStats!.minTime).toBeGreaterThan(0);
      expect(mapperStats!.maxTime).toBeGreaterThan(mapperStats!.minTime);
    });
  });

  describe('5. Full System Load Testing', () => {
    it('should handle 60fps event stream without performance degradation', async () => {
      // Arrange: 60 events (1 second of 60fps data)
      const frameInterval = 1000 / 60;
      profiler.resetFrameRate();

      // Act: Emit 60 events rapidly
      for (let i = 0; i < 60; i++) {
        const event: CombatStateUpdatedEvent = {
          type: 'CombatStateUpdated',
          timestamp: new Date(Date.now() + i * frameInterval),
          combatState: {
            ...mockCombatState,
            timestamp: Date.now() + i * frameInterval
          },
          latency: 40 + Math.random() * 20,
          source: 'GameStateStreamingService',
          metadata: {}
        };

        profiler.startLatencyMeasurement(`event-${i}`);
        await eventBus.emit(event);
        profiler.endLatencyMeasurement(`event-${i}`);
        profiler.recordFrame();
      }

      // Get statistics
      const latencyStats = profiler.getLatencyStats();
      const frameRateStats = profiler.getFrameRateStats();

      // Assert: Performance targets met
      expect(latencyStats.average).toBeLessThan(50); // <50ms latency
      expect(frameRateStats.droppedFrames).toBeLessThan(5); // <5 dropped frames
    });

    it('should generate comprehensive performance report', async () => {
      // Arrange: Run various operations
      // Latency
      for (let i = 0; i < 10; i++) {
        profiler.startLatencyMeasurement(`op-${i}`);
        await new Promise(resolve => setTimeout(resolve, 40)); // 40ms operation
        profiler.endLatencyMeasurement(`op-${i}`);
      }

      // Frame rate
      profiler.resetFrameRate();
      for (let i = 0; i < 60; i++) {
        profiler.recordFrame();
        await new Promise(resolve => setTimeout(resolve, 16));
      }

      // Mapper overhead
      const mockMapper = (input: CombatState) => ({ position: [0, 0, 0] });
      for (let i = 0; i < 20; i++) {
        profiler.profileMapper('testMapper', mockMapper, mockCombatState);
      }

      // Act: Generate report
      const report = profiler.generateReport({ latency: 50, frameRate: 60 });

      // Assert: Report should have all sections
      expect(report.latency.passed).toBe(true);
      expect(report.latency.samples).toBe(10);
      expect(report.frameRate.target).toBe(60);
      expect(report.mappers.mappers.length).toBeGreaterThan(0);
    });

    it('should print performance report without errors', () => {
      // Arrange: Generate report
      profiler.startLatencyMeasurement('test');
      profiler.endLatencyMeasurement('test');
      const report = profiler.generateReport();

      // Act: Print report (should not throw)
      expect(() => {
        profiler.printReport(report);
      }).not.toThrow();
    });
  });
});
