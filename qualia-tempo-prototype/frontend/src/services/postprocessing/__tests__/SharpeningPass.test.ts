/**
 * QUALIA.CODE v1.1 - SharpeningPass Tests
 * Unit tests for Sharpening post-processing pass
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SharpeningPass } from '../SharpeningPass';
import * as THREE from 'three';

describe('SharpeningPass', () => {
  let sharpeningPass: SharpeningPass;
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
    uniform vec2 resolution;
    uniform float sharpness;
    void main() {
      gl_FragColor = texture2D(inputTexture, vUv);
    }
  `;

  beforeEach(() => {
    // Create sharpening pass
    sharpeningPass = new SharpeningPass({
      width: 1920,
      height: 1080,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      sharpness: 0.3
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
    sharpeningPass.dispose();
  });

  describe('Initialization', () => {
    it('should create sharpening pass with default sharpness', () => {
      expect(sharpeningPass).toBeDefined();
      expect(sharpeningPass.getSharpness()).toBe(0.3);
    });

    it('should create sharpening pass with custom sharpness', () => {
      const customPass = new SharpeningPass({
        width: 1920,
        height: 1080,
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        sharpness: 0.5
      });

      expect(customPass.getSharpness()).toBe(0.5);
      customPass.dispose();
    });

    it('should set needsSwap to true', () => {
      expect(sharpeningPass.needsSwap).toBe(true);
    });
  });

  describe('Sharpness Control', () => {
    it('should update sharpness value', () => {
      sharpeningPass.setSharpness(0.7);
      expect(sharpeningPass.getSharpness()).toBe(0.7);
    });

    it('should clamp sharpness to 0.0-1.0 range', () => {
      sharpeningPass.setSharpness(-0.5);
      expect(sharpeningPass.getSharpness()).toBe(0.0);

      sharpeningPass.setSharpness(1.5);
      expect(sharpeningPass.getSharpness()).toBe(1.0);
    });
  });

  describe('Rendering', () => {
    it('should render to write buffer when renderToScreen is false', () => {
      sharpeningPass.renderToScreen = false;
      sharpeningPass.clear = true;

      sharpeningPass.render(mockRenderer, mockWriteBuffer, mockReadBuffer);

      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(mockWriteBuffer);
      expect(mockRenderer.clear).toHaveBeenCalled();
    });

    it('should render to screen when renderToScreen is true', () => {
      sharpeningPass.renderToScreen = true;

      sharpeningPass.render(mockRenderer, mockWriteBuffer, mockReadBuffer);

      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(null);
    });
  });

  describe('Resizing', () => {
    it('should update resolution uniform on resize', () => {
      sharpeningPass.setSize(2560, 1440);

      // Access private material to verify uniform update
      const material = (sharpeningPass as any).sharpeningMaterial;
      expect(material.uniforms.resolution.value.x).toBe(2560);
      expect(material.uniforms.resolution.value.y).toBe(1440);
    });
  });

  describe('Resource Management', () => {
    it('should dispose resources without errors', () => {
      expect(() => sharpeningPass.dispose()).not.toThrow();
    });
  });
});
