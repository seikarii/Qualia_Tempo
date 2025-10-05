/**
 * QUALIA.CODE v1.1 - BlurPass Tests
 * CRISALIDA.CODE v1.1 - Phase 2: Complete Bloom System
 * 
 * Unit tests for separable Gaussian blur pass
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BlurPass } from '../BlurPass';
import * as THREE from 'three';

describe('BlurPass', () => {
  let horizontalBlurPass: BlurPass;
  let verticalBlurPass: BlurPass;
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
    uniform sampler2D image;
    uniform bool horizontal;
    uniform float blurIntensity;
    uniform float kernelSize;
    void main() {
      gl_FragColor = texture2D(image, vUv);
    }
  `;

  beforeEach(() => {
    // Create horizontal and vertical blur passes
    horizontalBlurPass = new BlurPass({
      width: 1920,
      height: 1080,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      blurIntensity: 1.0,
      kernelSize: 1.0
    }, true);

    verticalBlurPass = new BlurPass({
      width: 1920,
      height: 1080,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      blurIntensity: 1.0,
      kernelSize: 1.0
    }, false);

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
    horizontalBlurPass.dispose();
    verticalBlurPass.dispose();
  });

  describe('Initialization', () => {
    it('should create horizontal blur pass', () => {
      expect(horizontalBlurPass).toBeDefined();
      expect(horizontalBlurPass.isHorizontal()).toBe(true);
      expect(horizontalBlurPass.getBlurIntensity()).toBe(1.0);
      expect(horizontalBlurPass.getKernelSize()).toBe(1.0);
    });

    it('should create vertical blur pass', () => {
      expect(verticalBlurPass).toBeDefined();
      expect(verticalBlurPass.isHorizontal()).toBe(false);
      expect(verticalBlurPass.getBlurIntensity()).toBe(1.0);
      expect(verticalBlurPass.getKernelSize()).toBe(1.0);
    });

    it('should use default values when parameters are omitted', () => {
      const defaultPass = new BlurPass({
        width: 1920,
        height: 1080,
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER
      });

      expect(defaultPass.getBlurIntensity()).toBe(1.0);
      expect(defaultPass.getKernelSize()).toBe(1.0);
      expect(defaultPass.isHorizontal()).toBe(true); // Default is horizontal
      defaultPass.dispose();
    });

    it('should set needsSwap to true', () => {
      expect(horizontalBlurPass.needsSwap).toBe(true);
    });
  });

  describe('Direction Control', () => {
    it('should change blur direction', () => {
      horizontalBlurPass.setHorizontal(false);
      expect(horizontalBlurPass.isHorizontal()).toBe(false);

      verticalBlurPass.setHorizontal(true);
      expect(verticalBlurPass.isHorizontal()).toBe(true);
    });
  });

  describe('Blur Intensity Control', () => {
    it('should update blur intensity value', () => {
      horizontalBlurPass.setBlurIntensity(0.5);
      expect(horizontalBlurPass.getBlurIntensity()).toBe(0.5);
    });

    it('should clamp blur intensity to 0.0-1.0 range', () => {
      horizontalBlurPass.setBlurIntensity(-0.5);
      expect(horizontalBlurPass.getBlurIntensity()).toBe(0.0);

      horizontalBlurPass.setBlurIntensity(1.5);
      expect(horizontalBlurPass.getBlurIntensity()).toBe(1.0);
    });
  });

  describe('Kernel Size Control', () => {
    it('should update kernel size value', () => {
      horizontalBlurPass.setKernelSize(2.0);
      expect(horizontalBlurPass.getKernelSize()).toBe(2.0);
    });

    it('should clamp kernel size to minimum 0.1', () => {
      horizontalBlurPass.setKernelSize(-1.0);
      expect(horizontalBlurPass.getKernelSize()).toBe(0.1);
    });

    it('should allow large kernel sizes', () => {
      horizontalBlurPass.setKernelSize(5.0);
      expect(horizontalBlurPass.getKernelSize()).toBe(5.0);
    });
  });

  describe('Rendering', () => {
    it('should render to write buffer when renderToScreen is false', () => {
      horizontalBlurPass.renderToScreen = false;
      horizontalBlurPass.render(mockRenderer, mockWriteBuffer, mockReadBuffer);

      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(mockWriteBuffer);
    });

    it('should render to screen when renderToScreen is true', () => {
      horizontalBlurPass.renderToScreen = true;
      horizontalBlurPass.render(mockRenderer, mockWriteBuffer, mockReadBuffer);

      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(null);
    });

    it('should update input texture from read buffer', () => {
      horizontalBlurPass.render(mockRenderer, mockWriteBuffer, mockReadBuffer);
      expect(horizontalBlurPass['blurMaterial'].uniforms.image.value).toBe(mockReadBuffer.texture);
    });
  });

  describe('Resource Management', () => {
    it('should dispose resources properly', () => {
      const disposeSpy = vi.spyOn(horizontalBlurPass['blurMaterial'], 'dispose');
      horizontalBlurPass.dispose();
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('Resize Handling', () => {
    it('should handle resize without errors', () => {
      expect(() => horizontalBlurPass.setSize(2560, 1440)).not.toThrow();
    });
  });

  describe('Separable Convolution Workflow', () => {
    it('should support two-pass blur workflow', () => {
      // First pass: horizontal blur
      expect(horizontalBlurPass.isHorizontal()).toBe(true);
      horizontalBlurPass.render(mockRenderer, mockWriteBuffer, mockReadBuffer);

      // Second pass: vertical blur
      expect(verticalBlurPass.isHorizontal()).toBe(false);
      verticalBlurPass.render(mockRenderer, mockReadBuffer, mockWriteBuffer);

      // Both passes should have executed
      expect(mockRenderer.setRenderTarget).toHaveBeenCalledTimes(2);
    });
  });
});
