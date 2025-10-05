/**
 * QUALIA.CODE v1.1 - DoFPass Tests
 * Coverage: Initialization, depth texture, focus control, rendering, state management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DoFPass } from '../DoFPass';
import type { DoFPassConfig } from '../../contracts/IDoFPass.contracts';
import * as THREE from 'three';

describe('DoFPass', () => {
  let dofPass: DoFPass;
  let mockRenderer: THREE.WebGLRenderer;
  let writeBuffer: THREE.WebGLRenderTarget;
  let readBuffer: THREE.WebGLRenderTarget;
  let depthTexture: THREE.Texture;
  let config: DoFPassConfig;
  const mockShaderCode = `
    #version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform sampler2D sceneTexture;
    uniform sampler2D depthTexture;
    void main() { fragColor = vec4(1.0); }
  `;

  beforeEach(() => {
    config = {
      enabled: true,
      focusDistance: 10.0,
      focusRange: 5.0,
      bokehRadius: 3.0,
      bokehSamples: 32,
      aperture: 5.6,
      debugMode: false
    };

    mockRenderer = {
      setRenderTarget: vi.fn(),
      render: vi.fn(),
      clear: vi.fn()
    } as unknown as THREE.WebGLRenderer;

    writeBuffer = new THREE.WebGLRenderTarget(1920, 1080);
    readBuffer = new THREE.WebGLRenderTarget(1920, 1080);
    depthTexture = new THREE.Texture();

    dofPass = new DoFPass(config, 1920, 1080, mockShaderCode);
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(dofPass).toBeDefined();
      expect(dofPass['config']).toEqual(config);
    });

    it('should create DoF material with correct uniforms', () => {
      expect(dofPass['dofMaterial']).toBeDefined();
      expect(dofPass['dofMaterial'].uniforms.focusDistance.value).toBe(10.0);
      expect(dofPass['dofMaterial'].uniforms.focusRange.value).toBe(5.0);
      expect(dofPass['dofMaterial'].uniforms.bokehRadius.value).toBe(3.0);
      expect(dofPass['dofMaterial'].uniforms.bokehSamples.value).toBe(32);
    });

    it('should initialize with correct resolution', () => {
      const resolution = dofPass['currentResolution'];
      expect(resolution.x).toBe(1920);
      expect(resolution.y).toBe(1080);
    });

    it('should set GLSL version to 3 for WebGL 2.0', () => {
      expect(dofPass['dofMaterial'].glslVersion).toBe(THREE.GLSL3);
    });
  });

  describe('Depth Texture Management', () => {
    it('should set depth texture', () => {
      dofPass.setDepthTexture(depthTexture);
      expect(dofPass['depthTexture']).toBe(depthTexture);
      expect(dofPass['dofMaterial'].uniforms.depthTexture.value).toBe(depthTexture);
    });

    it('should pass through if depth texture not set', () => {
      // DoFPass should gracefully degrade to pass-through mode when depth texture is missing
      dofPass.render(mockRenderer, writeBuffer, readBuffer);
      
      // Should still render, just without DoF effect (copy texture)
      expect(mockRenderer.setRenderTarget).toHaveBeenCalled();
    });
  });

  describe('Focus Control', () => {
    it('should update focus distance dynamically', () => {
      dofPass.setFocusDistance(15.0);
      expect(dofPass['dofMaterial'].uniforms.focusDistance.value).toBe(15.0);
    });

    it('should update bokeh radius dynamically', () => {
      dofPass.setBokehRadius(5.0);
      expect(dofPass['dofMaterial'].uniforms.bokehRadius.value).toBe(5.0);
    });
  });

  describe('Rendering', () => {
    beforeEach(() => {
      dofPass.setDepthTexture(depthTexture);
    });

    it('should render DoF effect when enabled', () => {
      dofPass.render(mockRenderer, writeBuffer, readBuffer);
      
      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(writeBuffer);
      expect(mockRenderer.render).toHaveBeenCalled();
    });

    it('should pass through when disabled', () => {
      const disabledConfig: DoFPassConfig = { ...config, enabled: false };
      const disabledPass = new DoFPass(disabledConfig, 1920, 1080, mockShaderCode);
      
      disabledPass.render(mockRenderer, writeBuffer, readBuffer);
      
      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(writeBuffer);
      expect(mockRenderer.clear).toHaveBeenCalled();
    });

    it('should update scene texture uniform during render', () => {
      dofPass.render(mockRenderer, writeBuffer, readBuffer);
      expect(dofPass['dofMaterial'].uniforms.sceneTexture.value).toBe(readBuffer.texture);
    });

    it('should update all uniforms during render', () => {
      dofPass.setFocusDistance(20.0);
      dofPass.setBokehRadius(10.0);
      
      dofPass.render(mockRenderer, writeBuffer, readBuffer);
      
      expect(dofPass['dofMaterial'].uniforms.focusDistance.value).toBe(20.0);
      expect(dofPass['dofMaterial'].uniforms.bokehRadius.value).toBe(10.0);
      expect(dofPass['dofMaterial'].uniforms.depthTexture.value).toBe(depthTexture);
    });
  });

  describe('Resolution Management', () => {
    it('should update resolution on setSize', () => {
      dofPass.setSize(2560, 1440);
      
      const resolution = dofPass['currentResolution'];
      expect(resolution.x).toBe(2560);
      expect(resolution.y).toBe(1440);
    });

    it('should update uniform resolution on setSize', () => {
      dofPass.setSize(2560, 1440);
      
      const uniformResolution = dofPass['dofMaterial'].uniforms.resolution.value;
      expect(uniformResolution.x).toBe(2560);
      expect(uniformResolution.y).toBe(1440);
    });
  });

  describe('State Management', () => {
    it('should return current state', () => {
      const state = dofPass.getState();
      
      expect(state).toHaveProperty('circleOfConfusion');
      expect(state).toHaveProperty('isInFocus');
      expect(state).toHaveProperty('activeSamples');
      expect(state.activeSamples).toBe(32);
    });

    it('should track active samples from config', () => {
      const state = dofPass.getState();
      expect(state.activeSamples).toBe(config.bokehSamples);
    });
  });

  describe('Debug Mode', () => {
    it('should accept debug mode changes', () => {
      expect(() => dofPass.setDebugMode(true)).not.toThrow();
    });
  });

  describe('Resource Cleanup', () => {
    it('should dispose of GPU resources', () => {
      const materialDisposeSpy = vi.spyOn(dofPass['dofMaterial'], 'dispose');
      const geometryDisposeSpy = vi.spyOn(dofPass['quad'].geometry, 'dispose');
      
      dofPass.dispose();
      
      expect(materialDisposeSpy).toHaveBeenCalled();
      expect(geometryDisposeSpy).toHaveBeenCalled();
    });
  });
});
