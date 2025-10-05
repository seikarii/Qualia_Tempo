/**
 * QUALIA.CODE v1.1 - ChromaticAberrationPass Tests
 * Unit tests for Chromatic Aberration post-processing pass
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChromaticAberrationPass } from '../ChromaticAberrationPass';
import * as THREE from 'three';

describe('ChromaticAberrationPass', () => {
  let chromaticAberrationPass: ChromaticAberrationPass;
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
    uniform float strength;
    void main() {
      gl_FragColor = texture2D(inputTexture, vUv);
    }
  `;

  beforeEach(() => {
    // Create chromatic aberration pass
    chromaticAberrationPass = new ChromaticAberrationPass({
      width: 1920,
      height: 1080,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      strength: 0.002
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
    chromaticAberrationPass.dispose();
  });

  describe('Initialization', () => {
    it('should create chromatic aberration pass with default strength', () => {
      expect(chromaticAberrationPass).toBeDefined();
      expect(chromaticAberrationPass.getStrength()).toBe(0.002);
    });

    it('should create chromatic aberration pass with custom strength', () => {
      const customPass = new ChromaticAberrationPass({
        width: 1920,
        height: 1080,
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        strength: 0.005
      });

      expect(customPass.getStrength()).toBe(0.005);
      customPass.dispose();
    });

    it('should set needsSwap to true', () => {
      expect(chromaticAberrationPass.needsSwap).toBe(true);
    });
  });

  describe('Strength Control', () => {
    it('should update strength value', () => {
      chromaticAberrationPass.setStrength(0.003);
      expect(chromaticAberrationPass.getStrength()).toBe(0.003);
    });

    it('should clamp strength to non-negative values', () => {
      chromaticAberrationPass.setStrength(-0.001);
      expect(chromaticAberrationPass.getStrength()).toBe(0.0);
    });

    it('should allow high strength values', () => {
      chromaticAberrationPass.setStrength(0.01);
      expect(chromaticAberrationPass.getStrength()).toBe(0.01);
    });
  });

  describe('Rendering', () => {
    it('should render to write buffer when renderToScreen is false', () => {
      chromaticAberrationPass.renderToScreen = false;
      chromaticAberrationPass.clear = true;

      chromaticAberrationPass.render(mockRenderer, mockWriteBuffer, mockReadBuffer);

      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(mockWriteBuffer);
      expect(mockRenderer.clear).toHaveBeenCalled();
    });

    it('should render to screen when renderToScreen is true', () => {
      chromaticAberrationPass.renderToScreen = true;

      chromaticAberrationPass.render(mockRenderer, mockWriteBuffer, mockReadBuffer);

      expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(null);
    });
  });

  describe('Resizing', () => {
    it('should handle resize without errors (resolution-independent effect)', () => {
      expect(() => chromaticAberrationPass.setSize(2560, 1440)).not.toThrow();
    });
  });

  describe('Resource Management', () => {
    it('should dispose resources without errors', () => {
      expect(() => chromaticAberrationPass.dispose()).not.toThrow();
    });
  });
});
