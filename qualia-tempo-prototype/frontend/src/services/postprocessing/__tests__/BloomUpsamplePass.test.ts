/**
 * QUALIA.CODE v1.1 - BloomUpsamplePass Tests
 * CRISALIDA.CODE v1.1 - Phase 2: Complete Bloom System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BloomUpsamplePass } from '../BloomUpsamplePass';
import * as THREE from 'three';

describe('BloomUpsamplePass', () => {
  let upsamplePass: BloomUpsamplePass;
  let mockRenderer: THREE.WebGLRenderer;
  let mockWriteBuffer: THREE.WebGLRenderTarget;
  let mockLowResTexture: THREE.Texture;
  let mockHighResTexture: THREE.Texture;

  const VERTEX_SHADER = `out vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`;
  const FRAGMENT_SHADER = `precision highp float; in vec2 vUv; uniform sampler2D lowResTexture; uniform sampler2D highResTexture; uniform vec2 texelSize; uniform float intensity; void main() { gl_FragColor = texture(lowResTexture, vUv); }`;

  beforeEach(() => {
    upsamplePass = new BloomUpsamplePass({
      width: 1920,
      height: 1080,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      intensity: 0.3
    });

    mockRenderer = {
      setRenderTarget: vi.fn(),
      clear: vi.fn(),
      render: vi.fn()
    } as unknown as THREE.WebGLRenderer;

    mockWriteBuffer = { texture: new THREE.Texture() } as THREE.WebGLRenderTarget;
    mockLowResTexture = new THREE.Texture();
    mockHighResTexture = new THREE.Texture();
  });

  afterEach(() => upsamplePass.dispose());

  it('should initialize with default intensity', () => {
    expect(upsamplePass.getIntensity()).toBe(0.3);
  });

  it('should update intensity correctly', () => {
    upsamplePass.setIntensity(0.5);
    expect(upsamplePass.getIntensity()).toBe(0.5);
  });

  it('should clamp intensity to minimum 0', () => {
    upsamplePass.setIntensity(-0.5);
    expect(upsamplePass.getIntensity()).toBe(0.0);
  });

  it('should render with two textures', () => {
    upsamplePass.renderToScreen = false;
    upsamplePass.renderWithTextures(mockRenderer, mockWriteBuffer, mockLowResTexture, mockHighResTexture);
    expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(mockWriteBuffer);
  });

  it('should handle resize', () => {
    upsamplePass.setSize(2560, 1440);
    const texelSize = upsamplePass.getTexelSize();
    expect(texelSize.x).toBeCloseTo(1.0 / 2560);
    expect(texelSize.y).toBeCloseTo(1.0 / 1440);
  });
});
