/**
 * QUALIA.CODE v1.1 - BrightPass Tests
 * CRISALIDA.CODE v1.1 - Phase 2: Complete Bloom System
 * 
 * Unit tests for BrightPass (luminance threshold extraction)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrightPass } from '../BrightPass';
import * as THREE from 'three';

describe('BrightPass', () => {
  let brightPass: BrightPass;
  let mockRenderer: THREE.WebGLRenderer;
  let mockWriteBuffer: THREE.WebGLRenderTarget;
  let mockReadBuffer: THREE.WebGLRenderTarget;

  const VERTEX_SHADER = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const FRAGMENT_SHADER = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D sceneTexture;
    uniform float threshold;
    uniform float softThreshold;
    uniform float intensity;
    uniform float colorPreservation;
    void main() {
      gl_FragColor = texture2D(sceneTexture, vUv);
    }
  `;

  beforeEach(() => {
    // Create bright pass
    brightPass = new BrightPass({
      width: 1920,
      height: 1080,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      threshold: 0.9,
      softThreshold: 0.5,
      intensity: 1.5,
      colorPreservation: 0.8
    });

    // Mock Three.js objects
    mockRenderer = {
      setRenderTarget: vi.fn(),
      clear: vi.fn(),
      render: vi.fn()
    } as unknown as THREE.WebGLRenderer;

    mockWriteBuffer = {
      texture: new THREE.Texture()
    } as THREE.WebGLRenderTarget;

    mockReadBuffer = {
      texture: new THREE.Texture()
    } as THREE.WebGLRenderTarget;
  });

  afterEach(() => {
    brightPass.dispose();
  });

  describe('Initialization', () => {
    it('should create bright pass with default parameters', () => {
      expect(brightPass).toBeDefined();
      expect(brightPass.getThreshold()).toBe(0.9);
      expect(brightPass.getSoftThreshold()).toBe(0.5);
      expect(brightPass.getIntensity()).toBe(1.5);
      expect(brightPass.getColorPreservation()).toBe(0.8);
    });

    it('should create bright pass with custom parameters', () => {
      const customPass = new BrightPass({
        width: 1920,
        height: 1080,
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        threshold: 1.0,
        softThreshold: 0.3,
        intensity: 2.0,
        colorPreservation: 0.9
      });

      expect(customPass.getThreshold()).toBe(1.0);
      expect(customPass.getSoftThreshold()).toBe(0.3);
      expect(customPass.getIntensity()).toBe(2.0);
      expect(customPass.getColorPreservation()).toBe(0.9);
      customPass.dispose();
    });

    it('should set needsSwap to true', () => {
      expect(brightPass.needsSwap).toBe(true);
    });

    it('should use default values when parameters are omitted', () => {
      const defaultPass = new BrightPass({
        width: 1920,
        height: 1080,
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER
      });

      expect(defaultPass.getThreshold()).toBe(0.9);
      expect(defaultPass.getSoftThreshold()).toBe(0.5);
      expect(defaultPass.getIntensity()).toBe(1.5);
      expect(defaultPass.getColorPreservation()).toBe(0.8);
      defaultPass.dispose();
    });
  });

  describe('Threshold Control', () => {
    it('should update threshold value', () => {
      brightPass.setThreshold(1.2);
      expect(brightPass.getThreshold()).toBe(1.2);
    });

    it('should clamp threshold to minimum 0', () => {
      brightPass.setThreshold(-0.5);
      expect(brightPass.getThreshold()).toBe(0.0);
    });

    it('should allow threshold values above 1', () => {
      brightPass.setThreshold(2.0);
      expect(brightPass.getThreshold()).toBe(2.0);
    });
  });

  describe('Soft Threshold Control', () => {
    it('should update soft threshold value', () => {
      brightPass.setSoftThreshold(0.7);
      expect(brightPass.getSoftThreshold()).toBe(0.7);
    });

    it('should clamp soft threshold to 0.0-1.0 range', () => {
      brightPass.setSoftThreshold(-0.5);
      expect(brightPass.getSoftThreshold()).toBe(0.0);

      brightPass.setSoftThreshold(1.5);
      expect(brightPass.getSoftThreshold()).toBe(1.0);
    });
  });

  describe('Intensity Control', () => {
    it('should update intensity value', () => {
      brightPass.setIntensity(2.5);
      expect(brightPass.getIntensity()).toBe(2.5);
    });

    it('should clamp intensity to minimum 0', () => {
      brightPass.setIntensity(-1.0);
      expect(brightPass.getIntensity()).toBe(0.0);
    });

    it('should allow high intensity values', () => {
      brightPass.setIntensity(5.0);
      expect(brightPass.getIntensity()).toBe(5.0);
    });
  });

  describe('Color Preservation Control', () => {
    it('should update color preservation value', () => {
      brightPass.setColorPreservation(0.95);
      expect(brightPass.getColorPreservation()).toBe(0.95);
    });

    it('should clamp color preservation to 0.0-1.0 range', () => {
      brightPass.setColorPreservation(-0.5);
      expect(brightPass.getColorPreservation()).toBe(0.0);

      brightPass.setColorPreservation(1.5);
      expect(brightPass.getColorPreservation()).toBe(1.0);
    });
  });

  describe('Rendering', () => {
    it('should render to write buffer when renderToScreen is false', () => {
      brightPass.renderToScreen = false;
      brightPass.render(mockRenderer, mockWriteBuffer, mockReadBuffer);

      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(mockWriteBuffer);
    });

    it('should render to screen when renderToScreen is true', () => {
      brightPass.renderToScreen = true;
      brightPass.render(mockRenderer, mockWriteBuffer, mockReadBuffer);

      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(null);
    });

    it('should update input texture from read buffer', () => {
      brightPass.render(mockRenderer, mockWriteBuffer, mockReadBuffer);
      // Material uniform should be set to read buffer texture
      expect(brightPass['brightPassMaterial'].uniforms.sceneTexture.value).toBe(mockReadBuffer.texture);
    });
  });

  describe('Resource Management', () => {
    it('should dispose resources properly', () => {
      const disposeSpy = vi.spyOn(brightPass['brightPassMaterial'], 'dispose');
      brightPass.dispose();
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('Resize Handling', () => {
    it('should handle resize without errors', () => {
      expect(() => brightPass.setSize(2560, 1440)).not.toThrow();
    });
  });
});
