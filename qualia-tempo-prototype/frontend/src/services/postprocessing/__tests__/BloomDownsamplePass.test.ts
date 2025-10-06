/**
 * QUALIA.CODE v1.1 - BloomDownsamplePass Tests
 * CRISALIDA.CODE v1.1 - Phase 2: Complete Bloom System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BloomDownsamplePass } from '../BloomDownsamplePass';
import * as THREE from 'three';

describe('BloomDownsamplePass', () => {
  let downsamplePass: BloomDownsamplePass;
  let mockRenderer: THREE.WebGLRenderer;
  let mockWriteBuffer: THREE.WebGLRenderTarget;
  let mockReadBuffer: THREE.WebGLRenderTarget;

  const VERTEX_SHADER = `out vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`;
  const FRAGMENT_SHADER = `precision highp float; in vec2 vUv; uniform sampler2D inputTexture; uniform vec2 texelSize; void main() { gl_FragColor = texture(inputTexture, vUv); }`;

  beforeEach(() => {
    downsamplePass = new BloomDownsamplePass({
      width: 1920,
      height: 1080,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER
    });

    mockRenderer = {
      setRenderTarget: vi.fn(),
      clear: vi.fn(),
      render: vi.fn()
    } as unknown as THREE.WebGLRenderer;

    mockWriteBuffer = { texture: new THREE.Texture() } as THREE.WebGLRenderTarget;
    mockReadBuffer = { texture: new THREE.Texture() } as THREE.WebGLRenderTarget;
  });

  afterEach(() => downsamplePass.dispose());

  it('should initialize with correct texel size', () => {
    const texelSize = downsamplePass.getTexelSize();
    expect(texelSize.x).toBeCloseTo(1.0 / 1920);
    expect(texelSize.y).toBeCloseTo(1.0 / 1080);
  });

  it('should update texel size correctly', () => {
    downsamplePass.updateTexelSize(960, 540);
    const texelSize = downsamplePass.getTexelSize();
    expect(texelSize.x).toBeCloseTo(1.0 / 960);
    expect(texelSize.y).toBeCloseTo(1.0 / 540);
  });

  it('should render to write buffer', () => {
    downsamplePass.renderToScreen = false;
    downsamplePass.render(mockRenderer, mockWriteBuffer, mockReadBuffer);
    expect(mockRenderer.setRenderTarget).toHaveBeenCalledWith(mockWriteBuffer);
  });

  it('should handle resize', () => {
    downsamplePass.setSize(2560, 1440);
    const texelSize = downsamplePass.getTexelSize();
    expect(texelSize.x).toBeCloseTo(1.0 / 2560);
    expect(texelSize.y).toBeCloseTo(1.0 / 1440);
  });
});
