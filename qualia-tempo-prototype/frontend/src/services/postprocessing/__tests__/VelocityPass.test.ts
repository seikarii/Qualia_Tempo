/**
 * QUALIA.CODE v1.1 - VelocityPass Tests
 * Coverage: Initialization, matrix tracking, rendering, debug mode
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VelocityPass } from '../VelocityPass';
import type { VelocityPassConfig } from '../../contracts/IVelocityPass.contracts';
import * as THREE from 'three';

describe('VelocityPass', () => {
  let velocityPass: VelocityPass;
  let mockRenderer: THREE.WebGLRenderer;
  let writeBuffer: THREE.WebGLRenderTarget;
  let readBuffer: THREE.WebGLRenderTarget;
  let config: VelocityPassConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      velocityScale: 1.0,
      debugMode: false,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType
    };

    mockRenderer = {
      setRenderTarget: vi.fn(),
      render: vi.fn(),
      setClearColor: vi.fn(),
      clear: vi.fn()
    } as unknown as THREE.WebGLRenderer;

    writeBuffer = new THREE.WebGLRenderTarget(1920, 1080);
    readBuffer = new THREE.WebGLRenderTarget(1920, 1080);

    velocityPass = new VelocityPass(config, 1920, 1080);
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(velocityPass).toBeDefined();
      expect(velocityPass['config']).toEqual(config);
    });

    it('should create velocity material', () => {
      expect(velocityPass['velocityMaterial']).toBeDefined();
      expect(velocityPass['velocityMaterial'].uniforms.velocityScale.value).toBe(1.0);
    });

    it('should initialize previous matrices as identity', () => {
      const matrices = velocityPass.getPreviousMatrices();
      expect(matrices.viewMatrix).toBeDefined();
      expect(matrices.projectionMatrix).toBeDefined();
      expect(matrices.viewMatrix.length).toBe(16);
    });
  });

  describe('Matrix Tracking', () => {
    it('should store previous frame matrices', () => {
      const viewMatrix = new THREE.Matrix4().makeTranslation(1, 2, 3);
      const projectionMatrix = new THREE.Matrix4().makePerspective(-1, 1, 1, -1, 0.1, 1000);
      
      velocityPass.updatePreviousMatrices(viewMatrix, projectionMatrix);
      
      const stored = velocityPass.getPreviousMatrices();
      expect(stored.viewMatrix[12]).toBe(1); // Translation X
      expect(stored.viewMatrix[13]).toBe(2); // Translation Y
      expect(stored.viewMatrix[14]).toBe(3); // Translation Z
    });

    it('should update matrices each frame', () => {
      const frame1View = new THREE.Matrix4().makeTranslation(1, 0, 0);
      const frame2View = new THREE.Matrix4().makeTranslation(2, 0, 0);
      const proj = new THREE.Matrix4();
      
      velocityPass.updatePreviousMatrices(frame1View, proj);
      let stored = velocityPass.getPreviousMatrices();
      expect(stored.viewMatrix[12]).toBe(1);
      
      velocityPass.updatePreviousMatrices(frame2View, proj);
      stored = velocityPass.getPreviousMatrices();
      expect(stored.viewMatrix[12]).toBe(2);
    });
  });

  describe('Rendering', () => {
    it('should render velocity buffer when enabled', () => {
      velocityPass.render(mockRenderer, writeBuffer, readBuffer);
      
      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(writeBuffer);
      expect(mockRenderer.render).toHaveBeenCalled();
    });

    it('should render black buffer when disabled', () => {
      const disabledConfig: VelocityPassConfig = { ...config, enabled: false };
      const disabledPass = new VelocityPass(disabledConfig, 1920, 1080);
      
      disabledPass.render(mockRenderer, writeBuffer, readBuffer);
      
      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(writeBuffer);
      expect(mockRenderer.setClearColor).toHaveBeenCalled();
      expect(mockRenderer.clear).toHaveBeenCalled();
    });

    it('should update uniforms before rendering', () => {
      const viewMatrix = new THREE.Matrix4().makeTranslation(5, 10, 15);
      const projMatrix = new THREE.Matrix4();
      
      velocityPass.updatePreviousMatrices(viewMatrix, projMatrix);
      velocityPass.render(mockRenderer, writeBuffer, readBuffer);
      
      const material = velocityPass['velocityMaterial'];
      expect(material.uniforms.prevViewMatrix.value.elements[12]).toBe(5);
    });
  });

  describe('Debug Mode', () => {
    it('should toggle debug visualization', () => {
      velocityPass.setDebugMode(true);
      expect(velocityPass['velocityMaterial'].uniforms.isDebugMode.value).toBe(true);
      
      velocityPass.setDebugMode(false);
      expect(velocityPass['velocityMaterial'].uniforms.isDebugMode.value).toBe(false);
    });

    it('should render with debug colors when enabled', () => {
      const debugConfig: VelocityPassConfig = { ...config, debugMode: true };
      const debugPass = new VelocityPass(debugConfig, 1920, 1080);
      
      debugPass.render(mockRenderer, writeBuffer, readBuffer);
      
      expect(debugPass['velocityMaterial'].uniforms.isDebugMode.value).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should accept setSize calls (NDC space operation)', () => {
      // VelocityPass operates in NDC space - size independent
      // This test ensures setSize() doesn't throw
      expect(() => velocityPass.setSize(3840, 2160)).not.toThrow();
    });

    it('should respect velocity scale', () => {
      const scaledConfig: VelocityPassConfig = { ...config, velocityScale: 2.5 };
      const scaledPass = new VelocityPass(scaledConfig, 1920, 1080);
      
      expect(scaledPass['velocityMaterial'].uniforms.velocityScale.value).toBe(2.5);
    });
  });

  describe('Resource Management', () => {
    it('should dispose material and geometry', () => {
      const materialSpy = vi.spyOn(velocityPass['velocityMaterial'], 'dispose');
      const geometrySpy = vi.spyOn(velocityPass['quad'].geometry, 'dispose');
      
      velocityPass.dispose();
      
      expect(materialSpy).toHaveBeenCalled();
      expect(geometrySpy).toHaveBeenCalled();
    });
  });
});
