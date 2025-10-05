/**
 * QUALIA.CODE v1.1 - BloomPass Tests
 * Coverage: Orchestration, pipeline coordination, pool usage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BloomPass } from '../BloomPass';
import type { BloomPassConfig } from '../../contracts/IBloomPass.contracts';
import type { IRenderTargetPoolService } from '../../interfaces/IRenderTargetPoolService';
import * as THREE from 'three';

describe('BloomPass', () => {
  let bloomPass: BloomPass;
  let mockPool: IRenderTargetPoolService;
  let mockRenderer: THREE.WebGLRenderer;
  let readBuffer: THREE.WebGLRenderTarget;
  let writeBuffer: THREE.WebGLRenderTarget;
  let config: BloomPassConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      threshold: 0.8,
      softThreshold: 0.2,
      intensity: 2.0,
      colorPreservation: 0.3,
      radius: 5.0,
      levels: 5,
      blendMode: 'additive'
    };

    mockPool = {
      acquire: vi.fn((width, height) => {
        return new THREE.WebGLRenderTarget(width, height);
      }),
      release: vi.fn(),
      getStatistics: vi.fn().mockReturnValue({
        totalPools: 0,
        totalTargets: 0,
        activeTargets: 0,
        availableTargets: 0,
        pools: new Map()
      }),
      cleanup: vi.fn(),
      dispose: vi.fn()
    };

    mockRenderer = {
      setRenderTarget: vi.fn(),
      render: vi.fn()
    } as unknown as THREE.WebGLRenderer;

    readBuffer = new THREE.WebGLRenderTarget(1920, 1080);
    writeBuffer = new THREE.WebGLRenderTarget(1920, 1080);

    bloomPass = new BloomPass(config, 1920, 1080, mockPool);
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(bloomPass).toBeDefined();
      expect(bloomPass['config']).toEqual(config);
    });

    it('should create all shader materials', () => {
      expect(bloomPass['brightPassMaterial']).toBeDefined();
      expect(bloomPass['downsampleMaterial']).toBeDefined();
      expect(bloomPass['upsampleMaterial']).toBeDefined();
      expect(bloomPass['compositeMaterial']).toBeDefined();
    });
  });

  describe('Render Pipeline', () => {
    it('should acquire render targets from pool', () => {
      bloomPass.render(mockRenderer, writeBuffer, readBuffer);
      
      // Should acquire: 1 bright buffer + 5 mipmap levels = 6 buffers
      expect(mockPool.acquire).toHaveBeenCalledTimes(6);
    });

    it('should release all buffers after rendering', () => {
      bloomPass.render(mockRenderer, writeBuffer, readBuffer);
      
      // Should release all 6 acquired buffers
      expect(mockPool.release).toHaveBeenCalledTimes(6);
    });

    it('should respect mipmap levels configuration', () => {
      const config3Levels: BloomPassConfig = { ...config, levels: 3 };
      const bloomPass3 = new BloomPass(config3Levels, 1920, 1080, mockPool);
      
      bloomPass3.render(mockRenderer, writeBuffer, readBuffer);
      
      // 1 bright + 3 levels = 4 buffers
      expect(mockPool.acquire).toHaveBeenCalledTimes(4);
    });

    it('should handle disabled state with pass-through', () => {
      const disabledConfig: BloomPassConfig = { ...config, enabled: false };
      const disabledPass = new BloomPass(disabledConfig, 1920, 1080, mockPool);
      
      disabledPass.render(mockRenderer, writeBuffer, readBuffer);
      
      // Should not acquire any buffers when disabled
      expect(mockPool.acquire).not.toHaveBeenCalled();
    });
  });

  describe('Resource Management', () => {
    it('should dispose all shader materials', () => {
      const brightMaterialSpy = vi.spyOn(bloomPass['brightPassMaterial'], 'dispose');
      const downsampleMaterialSpy = vi.spyOn(bloomPass['downsampleMaterial'], 'dispose');
      const upsampleMaterialSpy = vi.spyOn(bloomPass['upsampleMaterial'], 'dispose');
      const compositeMaterialSpy = vi.spyOn(bloomPass['compositeMaterial'], 'dispose');
      
      bloomPass.dispose();
      
      expect(brightMaterialSpy).toHaveBeenCalled();
      expect(downsampleMaterialSpy).toHaveBeenCalled();
      expect(upsampleMaterialSpy).toHaveBeenCalled();
      expect(compositeMaterialSpy).toHaveBeenCalled();
    });

    it('should dispose quad geometry', () => {
      const geometryDisposeSpy = vi.spyOn(bloomPass['quad'].geometry, 'dispose');
      
      bloomPass.dispose();
      
      expect(geometryDisposeSpy).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should update dimensions', () => {
      bloomPass.setSize(3840, 2160);
      
      expect(bloomPass['width']).toBe(3840);
      expect(bloomPass['height']).toBe(2160);
    });

    it('should use additive blend mode', () => {
      expect(bloomPass['compositeMaterial'].uniforms.uBlendMode.value).toBe(0);
    });

    it('should use screen blend mode', () => {
      const screenConfig: BloomPassConfig = { ...config, blendMode: 'screen' };
      const screenPass = new BloomPass(screenConfig, 1920, 1080, mockPool);
      
      expect(screenPass['compositeMaterial'].uniforms.uBlendMode.value).toBe(1);
    });
  });
});
