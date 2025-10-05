/**
 * QUALIA.CODE v1.1 - LUTPass Tests
 * Unit tests for Color Grading LUT post-processing pass
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LUTPass } from '../LUTPass';
import * as THREE from 'three';

describe('LUTPass', () => {
  let lutPass: LUTPass;
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
    uniform sampler2D inputTexture;
    uniform sampler2D colorLUT;
    uniform float lutStrength;
    void main() {
      gl_FragColor = texture2D(inputTexture, vUv);
    }
  `;

  beforeEach(() => {
    // Create LUT pass
    lutPass = new LUTPass({
      width: 1920,
      height: 1080,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      lutStrength: 1.0
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
    lutPass.dispose();
  });

  describe('Initialization', () => {
    it('should create LUT pass with default strength', () => {
      expect(lutPass).toBeDefined();
      expect(lutPass.getStrength()).toBe(1.0);
    });

    it('should create LUT pass with custom strength', () => {
      const customPass = new LUTPass({
        width: 1920,
        height: 1080,
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        lutStrength: 0.5
      });

      expect(customPass.getStrength()).toBe(0.5);
      customPass.dispose();
    });

    it('should create neutral identity LUT by default', () => {
      // Access private lutTexture to verify it was created (WebGL 2.0 native 3D texture)
      const material = (lutPass as any).material;
      expect(material.uniforms.colorLUT.value).toBeDefined();
      expect(material.uniforms.colorLUT.value).toBeInstanceOf(THREE.Data3DTexture);
    });

    it('should set needsSwap to true', () => {
      expect(lutPass.needsSwap).toBe(true);
    });
  });

  describe('Strength Control', () => {
    it('should update strength value', () => {
      lutPass.setStrength(0.7);
      expect(lutPass.getStrength()).toBe(0.7);
    });

    it('should clamp strength to 0.0-1.0 range', () => {
      lutPass.setStrength(-0.2);
      expect(lutPass.getStrength()).toBe(0.0);

      lutPass.setStrength(1.5);
      expect(lutPass.getStrength()).toBe(1.0);
    });
  });

  describe('LUT Texture Management', () => {
    it('should allow replacing LUT texture', () => {
      // Create a new 3D LUT texture (WebGL 2.0)
      const size = 32;
      const data = new Uint8Array(size * size * size * 4);
      const newLUT = new THREE.Data3DTexture(data, size, size, size);
      newLUT.format = THREE.RGBAFormat;
      newLUT.type = THREE.UnsignedByteType;
      
      lutPass.setLUTTexture(newLUT);

      const material = (lutPass as any).material;
      expect(material.uniforms.colorLUT.value).toBe(newLUT);
    });
  });

  describe('Rendering', () => {
    it('should render to write buffer when renderToScreen is false', () => {
      lutPass.renderToScreen = false;
      lutPass.clear = true;

      lutPass.render(mockRenderer, mockWriteBuffer, mockReadBuffer);

      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(mockWriteBuffer);
      expect(mockRenderer.clear).toHaveBeenCalled();
    });

    it('should render to screen when renderToScreen is true', () => {
      lutPass.renderToScreen = true;

      lutPass.render(mockRenderer, mockWriteBuffer, mockReadBuffer);

      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(null);
    });
  });

  describe('Resizing', () => {
    it('should handle resize without errors (resolution-independent effect)', () => {
      expect(() => lutPass.setSize(2560, 1440)).not.toThrow();
    });
  });

  describe('Resource Management', () => {
    it('should dispose resources without errors', () => {
      expect(() => lutPass.dispose()).not.toThrow();
    });
  });
});
