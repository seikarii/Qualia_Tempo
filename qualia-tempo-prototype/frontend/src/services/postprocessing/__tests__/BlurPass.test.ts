import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlurPass } from '../BlurPass';
import type { BlurPassConfig } from '../../contracts/IBlurPass.contracts';
import * as THREE from 'three';

describe('BlurPass', () => {
  let blurPass: BlurPass;
  let mockRenderer: THREE.WebGLRenderer;
  let writeBuffer: THREE.WebGLRenderTarget;
  let readBuffer: THREE.WebGLRenderTarget;
  let config: BlurPassConfig;
  const mockShader = '#version 300 es\nprecision highp float;\nin vec2 vUv;\nout vec4 fragColor;\nuniform sampler2D sourceTexture;\nuniform vec2 direction;\nuniform float kernelSize;\nuniform vec2 resolution;\nvoid main() { fragColor = texture(sourceTexture, vUv); }';

  beforeEach(() => {
    config = { enabled: true, kernelSize: 2.0, passes: 1 };
    mockRenderer = { setRenderTarget: vi.fn(), render: vi.fn() } as unknown as THREE.WebGLRenderer;
    writeBuffer = new THREE.WebGLRenderTarget(1920, 1080);
    readBuffer = new THREE.WebGLRenderTarget(1920, 1080);
    blurPass = new BlurPass(config, 1920, 1080, mockShader);
  });

  it('should initialize correctly', () => {
    expect(blurPass).toBeDefined();
    expect(blurPass['config']).toEqual(config);
  });

  it('should render horizontal and vertical passes', () => {
    blurPass.render(mockRenderer, writeBuffer, readBuffer);
    expect(mockRenderer.setRenderTarget).toHaveBeenCalledTimes(2);
    expect(mockRenderer.render).toHaveBeenCalledTimes(2);
  });

  it('should update kernel size', () => {
    blurPass.setKernelSize(3.5);
    expect(blurPass['kernelSize']).toBe(3.5);
  });

  it('should skip render when disabled', () => {
    const disabledConfig = { ...config, enabled: false };
    const disabledPass = new BlurPass(disabledConfig, 1920, 1080, mockShader);
    disabledPass.render(mockRenderer, writeBuffer, readBuffer);
    expect(mockRenderer.render).not.toHaveBeenCalled();
  });

  it('should dispose resources', () => {
    const spy = vi.spyOn(blurPass['blurMaterial'], 'dispose');
    blurPass.dispose();
    expect(spy).toHaveBeenCalled();
  });
});
