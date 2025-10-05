/**
 * QUALIA.CODE v1.1 - BrightPass Tests
 * Coverage: Initialization, threshold control, rendering, state management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrightPass } from '../BrightPass';
import type { BrightPassConfig } from '../../contracts/IBrightPass.contracts';
import * as THREE from 'three';

describe('BrightPass', () => {
  let brightPass: BrightPass;
  let mockRenderer: THREE.WebGLRenderer;
  let writeBuffer: THREE.WebGLRenderTarget;
  let readBuffer: THREE.WebGLRenderTarget;
  let config: BrightPassConfig;
  const mockShaderCode = `
    #version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform sampler2D sceneTexture;
    uniform float threshold;
    uniform float softThreshold;
    uniform float intensity;
    uniform float colorPreservation;
    void main() { fragColor = texture(sceneTexture, vUv); }
  `;

  beforeEach(() => {
    config = {
      enabled: true,
      threshold: 0.9,
      softThreshold: 0.5,
      intensity: 1.5,
      colorPreservation: 0.8
    };

    mockRenderer = {
      setRenderTarget: vi.fn(),
      render: vi.fn(),
      setClearColor: vi.fn(),
      clear: vi.fn()
    } as unknown as THREE.WebGLRenderer;

    writeBuffer = new THREE.WebGLRenderTarget(1920, 1080);
    readBuffer = new THREE.WebGLRenderTarget(1920, 1080);

    brightPass = new BrightPass(config, mockShaderCode);
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(brightPass).toBeDefined();
      expect(brightPass['config']).toEqual(config);
    });

    it('should create bright pass material with correct uniforms', () => {
      expect(brightPass['brightPassMaterial']).toBeDefined();
      expect(brightPass['brightPassMaterial'].uniforms.threshold.value).toBe(0.9);
      expect(brightPass['brightPassMaterial'].uniforms.softThreshold.value).toBe(0.5);
      expect(brightPass['brightPassMaterial'].uniforms.intensity.value).toBe(1.5);
      expect(brightPass['brightPassMaterial'].uniforms.colorPreservation.value).toBe(0.8);
    });

    it('should initialize dynamic parameters from config', () => {
      expect(brightPass['threshold']).toBe(0.9);
      expect(brightPass['intensity']).toBe(1.5);
    });

    it('should set GLSL version to 3 for WebGL 2.0', () => {
      expect(brightPass['brightPassMaterial'].glslVersion).toBe(THREE.GLSL3);
    });
  });

  describe('Threshold Control', () => {
    it('should update threshold dynamically', () => {
      brightPass.setThreshold(1.2);
      expect(brightPass['threshold']).toBe(1.2);
      expect(brightPass['brightPassMaterial'].uniforms.threshold.value).toBe(1.2);
    });

    it('should update intensity dynamically', () => {
      brightPass.setIntensity(2.5);
      expect(brightPass['intensity']).toBe(2.5);
      expect(brightPass['brightPassMaterial'].uniforms.intensity.value).toBe(2.5);
    });
  });

  describe('Rendering', () => {
    it('should render bright pass extraction when enabled', () => {
      brightPass.render(mockRenderer, writeBuffer, readBuffer);
      
      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(writeBuffer);
      expect(mockRenderer.render).toHaveBeenCalled();
    });

    it('should render black buffer when disabled', () => {
      const disabledConfig: BrightPassConfig = { ...config, enabled: false };
      const disabledPass = new BrightPass(disabledConfig, mockShaderCode);
      
      disabledPass.render(mockRenderer, writeBuffer, readBuffer);
      
      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(writeBuffer);
      expect(mockRenderer.setClearColor).toHaveBeenCalledWith(expect.any(THREE.Color), 1.0);
      expect(mockRenderer.clear).toHaveBeenCalled();
    });

    it('should update scene texture uniform during render', () => {
      brightPass.render(mockRenderer, writeBuffer, readBuffer);
      expect(brightPass['brightPassMaterial'].uniforms.sceneTexture.value).toBe(readBuffer.texture);
    });

    it('should use dynamic parameters in render', () => {
      brightPass.setThreshold(1.1);
      brightPass.setIntensity(2.0);
      
      brightPass.render(mockRenderer, writeBuffer, readBuffer);
      
      expect(brightPass['brightPassMaterial'].uniforms.threshold.value).toBe(1.1);
      expect(brightPass['brightPassMaterial'].uniforms.intensity.value).toBe(2.0);
    });

    it('should update all uniforms during render', () => {
      brightPass.render(mockRenderer, writeBuffer, readBuffer);
      
      expect(brightPass['brightPassMaterial'].uniforms.sceneTexture.value).toBe(readBuffer.texture);
      expect(brightPass['brightPassMaterial'].uniforms.threshold.value).toBe(config.threshold);
      expect(brightPass['brightPassMaterial'].uniforms.softThreshold.value).toBe(config.softThreshold);
      expect(brightPass['brightPassMaterial'].uniforms.intensity.value).toBe(config.intensity);
      expect(brightPass['brightPassMaterial'].uniforms.colorPreservation.value).toBe(config.colorPreservation);
    });
  });

  describe('State Management', () => {
    it('should return current state', () => {
      const state = brightPass.getState();
      
      expect(state).toHaveProperty('brightPixelCount');
      expect(state).toHaveProperty('averageBrightness');
      expect(state.averageBrightness).toBe(0.9);
    });

    it('should update state when threshold changes', () => {
      brightPass.setThreshold(1.5);
      const state = brightPass.getState();
      expect(state.averageBrightness).toBe(1.5);
    });
  });

  describe('Size Management', () => {
    it('should accept setSize calls without errors', () => {
      expect(() => brightPass.setSize(2560, 1440)).not.toThrow();
    });
  });

  describe('Resource Cleanup', () => {
    it('should dispose of GPU resources', () => {
      const materialDisposeSpy = vi.spyOn(brightPass['brightPassMaterial'], 'dispose');
      const geometryDisposeSpy = vi.spyOn(brightPass['quad'].geometry, 'dispose');
      
      brightPass.dispose();
      
      expect(materialDisposeSpy).toHaveBeenCalled();
      expect(geometryDisposeSpy).toHaveBeenCalled();
    });
  });
});
