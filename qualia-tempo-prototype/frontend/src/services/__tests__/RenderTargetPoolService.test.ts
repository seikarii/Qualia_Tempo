/**
 * QUALIA.CODE v1.1 - RenderTargetPoolService Tests
 * Coverage: Service initialization, acquire/release, statistics, disposal
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container } from 'inversify';
import { TYPES } from '../inversify.types';
import { RenderTargetPoolService } from '../RenderTargetPoolService';
import type { IRenderTargetPoolService } from '../interfaces/IRenderTargetPoolService';
import type { RenderTargetPoolConfig } from '../contracts/IRenderTargetPoolService.contracts';
import type { ILogger } from '../interfaces/ILogger';
import * as THREE from 'three';

describe('RenderTargetPoolService', () => {
  let container: Container;
  let service: IRenderTargetPoolService;
  let mockLogger: ILogger;
  let config: RenderTargetPoolConfig;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn().mockReturnValue('info'),
      child: vi.fn().mockReturnThis(),
      flush: vi.fn().mockResolvedValue(undefined)
    };

    // Default configuration
    config = {
      enabled: true,
      maxPoolSize: 5,
      autoCleanup: true,
      debugMode: false
    };

    // Setup IoC container
    container = new Container();
    container.bind<RenderTargetPoolConfig>(TYPES.RenderTargetPoolConfig).toConstantValue(config);
    container.bind<ILogger>(TYPES.ILogger).toConstantValue(mockLogger);
    container.bind<IRenderTargetPoolService>(TYPES.IRenderTargetPoolService)
      .to(RenderTargetPoolService)
      .inSingletonScope();

    service = container.get<IRenderTargetPoolService>(TYPES.IRenderTargetPoolService);
  });

  describe('Service Initialization', () => {
    it('should initialize with provided configuration', () => {
      expect(service).toBeDefined();
      expect(mockLogger.info).not.toHaveBeenCalled(); // debugMode is false
    });

    it('should log initialization when debugMode is enabled', () => {
      // Create new container with debug mode enabled
      const debugConfig: RenderTargetPoolConfig = {
        enabled: true,
        maxPoolSize: 5,
        autoCleanup: true,
        debugMode: true
      };

      const debugContainer = new Container();
      debugContainer.bind<RenderTargetPoolConfig>(TYPES.RenderTargetPoolConfig).toConstantValue(debugConfig);
      debugContainer.bind<ILogger>(TYPES.ILogger).toConstantValue(mockLogger);
      debugContainer.bind<IRenderTargetPoolService>(TYPES.IRenderTargetPoolService)
        .to(RenderTargetPoolService)
        .inSingletonScope();
      
      const debugService = debugContainer.get<IRenderTargetPoolService>(TYPES.IRenderTargetPoolService);
      
      expect(debugService).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[RenderTargetPool] Initialized',
        expect.objectContaining({
          maxPoolSize: 5,
          autoCleanup: true
        })
      );
    });
  });

  describe('Acquire Operations', () => {
    it('should acquire a new render target when pool is empty', () => {
      const target = service.acquire(1920, 1080);
      
      expect(target).toBeInstanceOf(THREE.WebGLRenderTarget);
      expect(target.width).toBe(1920);
      expect(target.height).toBe(1080);
    });

    it('should acquire render targets with different formats', () => {
      const rgbaTarget = service.acquire(512, 512, { 
        format: THREE.RGBAFormat 
      });
      const rgbTarget = service.acquire(512, 512, { 
        format: THREE.RGBFormat 
      });
      
      expect(rgbaTarget.texture.format).toBe(THREE.RGBAFormat);
      expect(rgbTarget.texture.format).toBe(THREE.RGBFormat);
    });

    it('should acquire render targets with different types', () => {
      const byteTarget = service.acquire(256, 256, { 
        type: THREE.UnsignedByteType 
      });
      const floatTarget = service.acquire(256, 256, { 
        type: THREE.FloatType 
      });
      
      expect(byteTarget.texture.type).toBe(THREE.UnsignedByteType);
      expect(floatTarget.texture.type).toBe(THREE.FloatType);
    });

    it('should acquire render targets with custom filters', () => {
      const target = service.acquire(128, 128, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter
      });
      
      expect(target.texture.minFilter).toBe(THREE.NearestFilter);
      expect(target.texture.magFilter).toBe(THREE.NearestFilter);
    });

    it('should acquire render targets with custom wrapping', () => {
      const target = service.acquire(64, 64, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
      });
      
      expect(target.texture.wrapS).toBe(THREE.RepeatWrapping);
      expect(target.texture.wrapT).toBe(THREE.RepeatWrapping);
    });

    it('should reuse targets from pool after release', () => {
      const target1 = service.acquire(1024, 1024);
      service.release(target1);
      
      const target2 = service.acquire(1024, 1024);
      
      // Should be the same instance (reused from pool)
      expect(target2).toBe(target1);
    });

    it('should create separate pools for different dimensions', () => {
      const target1 = service.acquire(512, 512);
      const target2 = service.acquire(1024, 1024);
      
      service.release(target1);
      service.release(target2);
      
      const stats = service.getStatistics();
      expect(stats.totalPools).toBe(2);
    });
  });

  describe('Release Operations', () => {
    it('should release target back to pool', () => {
      const target = service.acquire(512, 512);
      
      let stats = service.getStatistics();
      expect(stats.activeTargets).toBe(1);
      
      service.release(target);
      
      stats = service.getStatistics();
      expect(stats.activeTargets).toBe(0);
      expect(stats.availableTargets).toBe(1);
    });

    it('should warn when releasing non-active target', () => {
      const target = new THREE.WebGLRenderTarget(256, 256);
      
      service.release(target);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[RenderTargetPool] Attempted to release non-active target'
      );
    });

    it('should dispose target when pool is full', () => {
      const targets: THREE.WebGLRenderTarget[] = [];
      
      // Fill pool to maxPoolSize (5)
      for (let i = 0; i < 6; i++) {
        const target = service.acquire(512, 512);
        targets.push(target);
      }
      
      // Release all targets
      for (const target of targets) {
        service.release(target);
      }
      
      const stats = service.getStatistics();
      // Pool should cap at maxPoolSize
      expect(stats.availableTargets).toBeLessThanOrEqual(config.maxPoolSize);
    });

    it('should log releases in debug mode', () => {
      // Create new container with debug mode enabled
      const debugConfig: RenderTargetPoolConfig = {
        enabled: true,
        maxPoolSize: 5,
        autoCleanup: true,
        debugMode: true
      };

      const debugContainer = new Container();
      debugContainer.bind<RenderTargetPoolConfig>(TYPES.RenderTargetPoolConfig).toConstantValue(debugConfig);
      debugContainer.bind<ILogger>(TYPES.ILogger).toConstantValue(mockLogger);
      debugContainer.bind<IRenderTargetPoolService>(TYPES.IRenderTargetPoolService)
        .to(RenderTargetPoolService)
        .inSingletonScope();
      
      const debugService = debugContainer.get<IRenderTargetPoolService>(TYPES.IRenderTargetPoolService);
      const target = debugService.acquire(512, 512);
      
      debugService.release(target);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[RenderTargetPool] Released target to pool',
        expect.objectContaining({
          key: expect.stringContaining('512x512'),
          poolSize: expect.any(Number)
        })
      );
    });
  });

  describe('Statistics', () => {
    it('should return accurate statistics', () => {
      const target1 = service.acquire(512, 512);
      const target2 = service.acquire(1024, 1024);
      
      const stats = service.getStatistics();
      
      expect(stats.totalPools).toBe(2);
      expect(stats.activeTargets).toBe(2);
      expect(stats.totalTargets).toBe(2);
      expect(stats.availableTargets).toBe(0);
    });

    it('should track pool sizes correctly', () => {
      const target1 = service.acquire(256, 256);
      const target2 = service.acquire(256, 256);
      
      service.release(target1);
      service.release(target2);
      
      const stats = service.getStatistics();
      
      expect(stats.totalPools).toBe(1);
      expect(stats.activeTargets).toBe(0);
      expect(stats.availableTargets).toBe(2);
    });

    it('should provide per-pool statistics', () => {
      service.acquire(512, 512);
      service.acquire(1024, 1024);
      
      const stats = service.getStatistics();
      
      expect(stats.pools).toBeDefined();
      expect(stats.pools.size).toBe(2);
    });
  });

  describe('Cleanup', () => {
    it('should clean up all pooled targets', () => {
      const targets: THREE.WebGLRenderTarget[] = [];
      
      for (let i = 0; i < 3; i++) {
        const target = service.acquire(512, 512);
        targets.push(target);
      }
      
      for (const target of targets) {
        service.release(target);
      }
      
      service.cleanup();
      
      const stats = service.getStatistics();
      expect(stats.availableTargets).toBe(0);
      expect(stats.totalPools).toBe(0);
    });

    it('should not affect active targets', () => {
      const activeTarget = service.acquire(512, 512);
      const releasedTarget = service.acquire(512, 512);
      
      service.release(releasedTarget);
      service.cleanup();
      
      const stats = service.getStatistics();
      expect(stats.activeTargets).toBe(1);
    });

    it('should log cleanup in debug mode', () => {
      // Create new container with debug mode enabled
      const debugConfig: RenderTargetPoolConfig = {
        enabled: true,
        maxPoolSize: 5,
        autoCleanup: true,
        debugMode: true
      };

      const debugContainer = new Container();
      debugContainer.bind<RenderTargetPoolConfig>(TYPES.RenderTargetPoolConfig).toConstantValue(debugConfig);
      debugContainer.bind<ILogger>(TYPES.ILogger).toConstantValue(mockLogger);
      debugContainer.bind<IRenderTargetPoolService>(TYPES.IRenderTargetPoolService)
        .to(RenderTargetPoolService)
        .inSingletonScope();
      
      const debugService = debugContainer.get<IRenderTargetPoolService>(TYPES.IRenderTargetPoolService);
      const target = debugService.acquire(512, 512);
      debugService.release(target);
      
      debugService.cleanup();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[RenderTargetPool] Cleanup complete',
        expect.objectContaining({
          disposedCount: expect.any(Number)
        })
      );
    });
  });

  describe('Disposal', () => {
    it('should dispose all targets', () => {
      const target1 = service.acquire(512, 512);
      const target2 = service.acquire(1024, 1024);
      
      service.release(target1);
      
      service.dispose();
      
      const stats = service.getStatistics();
      expect(stats.totalTargets).toBe(0);
      expect(stats.activeTargets).toBe(0);
      expect(stats.availableTargets).toBe(0);
    });

    it('should warn when disposing active targets', () => {
      const target = service.acquire(512, 512);
      
      service.dispose();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[RenderTargetPool] Disposing active target - potential leak'
      );
    });

    it('should log disposal in debug mode', () => {
      // Create new container with debug mode enabled
      const debugConfig: RenderTargetPoolConfig = {
        enabled: true,
        maxPoolSize: 5,
        autoCleanup: true,
        debugMode: true
      };

      const debugContainer = new Container();
      debugContainer.bind<RenderTargetPoolConfig>(TYPES.RenderTargetPoolConfig).toConstantValue(debugConfig);
      debugContainer.bind<ILogger>(TYPES.ILogger).toConstantValue(mockLogger);
      debugContainer.bind<IRenderTargetPoolService>(TYPES.IRenderTargetPoolService)
        .to(RenderTargetPoolService)
        .inSingletonScope();
      
      const debugService = debugContainer.get<IRenderTargetPoolService>(TYPES.IRenderTargetPoolService);
      
      debugService.dispose();
      
      expect(mockLogger.info).toHaveBeenCalledWith('[RenderTargetPool] Fully disposed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid acquire/release cycles', () => {
      for (let i = 0; i < 100; i++) {
        const target = service.acquire(512, 512);
        service.release(target);
      }
      
      const stats = service.getStatistics();
      // Pool should be stable at maxPoolSize
      expect(stats.availableTargets).toBeLessThanOrEqual(config.maxPoolSize);
    });

    it('should handle multiple concurrent active targets', () => {
      const targets: THREE.WebGLRenderTarget[] = [];
      
      for (let i = 0; i < 10; i++) {
        targets.push(service.acquire(512, 512));
      }
      
      const stats = service.getStatistics();
      expect(stats.activeTargets).toBe(10);
    });

    it('should handle mixed operations correctly', () => {
      const t1 = service.acquire(512, 512);
      const t2 = service.acquire(1024, 1024);
      service.release(t1);
      const t3 = service.acquire(512, 512);
      service.release(t2);
      service.release(t3);
      
      const stats = service.getStatistics();
      expect(stats.totalPools).toBe(2);
      expect(stats.activeTargets).toBe(0);
    });
  });
});
