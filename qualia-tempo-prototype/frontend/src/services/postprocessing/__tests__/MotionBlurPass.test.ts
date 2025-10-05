/**
 * QUALIA.CODE v1.1 - MotionBlurPass Tests
 * CRISALIDA.CODE v1.1 - Phase 4: Temporal Effects
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { MotionBlurPass } from '../MotionBlurPass';
import type { MotionBlurPassConfig } from '../../contracts/IMotionBlurPass.contracts';

// Mock shader code
const mockShaderCode = `
#pragma VERTEX
#version 300 es
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}

#pragma FRAGMENT
#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D sceneTexture;
uniform sampler2D velocityTexture;
uniform int samples;
uniform float strength;
uniform float threshold;
out vec4 fragColor;
void main() {
  vec2 velocity = texture(velocityTexture, vUv).rg * strength;
  if (length(velocity) < threshold) {
    fragColor = texture(sceneTexture, vUv);
    return;
  }
  fragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

describe('MotionBlurPass', () => {
  let config: MotionBlurPassConfig;
  let pass: MotionBlurPass;
  let renderer: THREE.WebGLRenderer;
  let readBuffer: THREE.WebGLRenderTarget;
  let writeBuffer: THREE.WebGLRenderTarget;
  let velocityTexture: THREE.Texture;

  beforeEach(() => {
    // Create config
    config = {
      enabled: true,
      samples: 8,
      strength: 0.8,
      threshold: 0.001
    };

    // Create pass
    pass = new MotionBlurPass(config, mockShaderCode);

    // Create mock renderer (minimal mock to avoid WebGL context issues)
    renderer = {
      setRenderTarget: vi.fn(),
      render: vi.fn()
    } as unknown as THREE.WebGLRenderer;

    // Create mock render targets
    readBuffer = {
      texture: new THREE.Texture()
    } as THREE.WebGLRenderTarget;
    
    writeBuffer = {
      texture: new THREE.Texture()
    } as THREE.WebGLRenderTarget;

    // Create mock velocity texture
    velocityTexture = new THREE.Texture();
  });

  describe('Initialization', () => {
    it('should initialize with config values', () => {
      const state = pass.getState();
      expect(state.isEnabled).toBe(true);
      expect(state.currentSamples).toBe(8);
      expect(state.currentStrength).toBe(0.8);
    });

    it('should parse shader code with #pragma markers', () => {
      // Should not throw
      expect(() => new MotionBlurPass(config, mockShaderCode)).not.toThrow();
    });

    it('should throw error if shader format is invalid', () => {
      const invalidShader = 'invalid shader code';
      expect(() => new MotionBlurPass(config, invalidShader)).toThrow();
    });
  });

  describe('Velocity Texture', () => {
    it('should set velocity texture', () => {
      pass.setVelocityTexture(velocityTexture);
      // No error should be thrown
      expect(() => pass.render(renderer, writeBuffer, readBuffer)).not.toThrow();
    });

    it('should pass through when no velocity texture is set', () => {
      // Don't set velocity texture
      pass.render(renderer, writeBuffer, readBuffer);
      
      // Should have called setRenderTarget and render (pass-through mode)
      expect(renderer.setRenderTarget).toHaveBeenCalled();
      expect(renderer.render).toHaveBeenCalled();
    });
  });

  describe('Rendering', () => {
    it('should render motion blur when enabled and velocity texture set', () => {
      pass.setVelocityTexture(velocityTexture);
      pass.render(renderer, writeBuffer, readBuffer);
      
      expect(renderer.setRenderTarget).toHaveBeenCalledWith(writeBuffer);
      expect(renderer.render).toHaveBeenCalled();
    });

    it('should pass through when disabled', () => {
      const disabledConfig: MotionBlurPassConfig = {
        enabled: false,
        samples: 8,
        strength: 0.8,
        threshold: 0.001
      };
      
      const disabledPass = new MotionBlurPass(disabledConfig, mockShaderCode);
      disabledPass.setVelocityTexture(velocityTexture);
      disabledPass.render(renderer, writeBuffer, readBuffer);
      
      // Should still render (pass-through)
      expect(renderer.render).toHaveBeenCalled();
    });

    it('should render to screen when renderToScreen is true', () => {
      pass.renderToScreen = true;
      pass.setVelocityTexture(velocityTexture);
      pass.render(renderer, writeBuffer, readBuffer);
      
      expect(renderer.setRenderTarget).toHaveBeenCalledWith(null);
    });
  });

  describe('Dynamic Parameters', () => {
    it('should update strength dynamically', () => {
      pass.setStrength(1.0);
      const state = pass.getState();
      expect(state.currentStrength).toBe(1.0);
    });

    it('should update samples dynamically', () => {
      pass.setSamples(16);
      const state = pass.getState();
      expect(state.currentSamples).toBe(16);
    });
  });

  describe('Resource Management', () => {
    it('should handle setSize without errors', () => {
      expect(() => pass.setSize(512, 512)).not.toThrow();
    });

    it('should dispose resources', () => {
      expect(() => pass.dispose()).not.toThrow();
    });
  });
});
