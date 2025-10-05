import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BloomPass } from '../BloomPass';
import type { BloomPassConfig } from '../../contracts/IBloomPass.contracts';
import * as THREE from 'three';

describe('BloomPass', () => {
  let bloomPass: BloomPass;
  let mockRenderer: THREE.WebGLRenderer;
  let writeBuffer: THREE.WebGLRenderTarget;
  let readBuffer: THREE.WebGLRenderTarget;
  let config: BloomPassConfig;
  const mockShader = '#version 300 es\nprecision highp float;\nin vec2 vUv;\nout vec4 fragColor;\nvoid main() { fragColor = vec4(1.0); }';

  beforeEach(() => {
    config = {
      enabled: true,
      threshold: 0.9,
      softThreshold: 0.5,
      intensity: 1.5,
      radius: 1.0,
      levels: 5,
      blendMode: 'additive'
    };
    mockRenderer = {
      setRenderTarget: vi.fn(),
      render: vi.fn()
    } as unknown as THREE.WebGLRenderer;
    writeBuffer = new THREE.WebGLRenderTarget(1920, 1080);
    readBuffer = new THREE.WebGLRenderTarget(1920, 1080);
    bloomPass = new BloomPass(config, 1920, 1080, {
      brightPassShader: mockShader,
      blurShader: mockShader,
      downsampleShader: mockShader,
      upsampleShader: mockShader
    });
  });

  it('should initialize correctly', () => {
    expect(bloomPass).toBeDefined();
  });

  it('should create render targets for mipmap chain', () => {
    const state = bloomPass.getState();
    expect(state.renderTargetsAllocated).toBe(5);
  });

  it('should skip render when disabled', () => {
    const disabledConfig = { ...config, enabled: false };
    const disabledPass = new BloomPass(disabledConfig, 1920, 1080, {
      brightPassShader: mockShader,
      blurShader: mockShader,
      downsampleShader: mockShader,
      upsampleShader: mockShader
    });
    disabledPass.render(mockRenderer, writeBuffer, readBuffer);
    expect(mockRenderer.render).not.toHaveBeenCalled();
  });

  it('should set intensity', () => {
    bloomPass.setIntensity(2.5);
    const state = bloomPass.getState();
    expect(state.currentIntensity).toBe(2.5);
  });

  it('should set threshold', () => {
    bloomPass.setThreshold(1.2);
    expect(() => bloomPass.getState()).not.toThrow();
  });

  it('should return state', () => {
    const state = bloomPass.getState();
    expect(state).toHaveProperty('activeLevels');
    expect(state).toHaveProperty('currentIntensity');
    expect(state).toHaveProperty('renderTargetsAllocated');
  });

  it('should dispose resources', () => {
    expect(() => bloomPass.dispose()).not.toThrow();
  });
});
