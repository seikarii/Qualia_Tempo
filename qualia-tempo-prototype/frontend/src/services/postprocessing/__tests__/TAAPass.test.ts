/**
 * QUALIA.CODE v1.1 - TAAPass Tests
 * CRISALIDA.CODE v1.1 - Phase 4: Temporal Effects (ELITE)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { TAAPass } from '../TAAPass';
import type { TAAPassConfig } from '../../contracts/ITAAPass.contracts';

// Mock TAA shader code
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
uniform sampler2D currentFrame;
uniform sampler2D historyFrame;
uniform sampler2D velocityTexture;
uniform vec2 resolution;
uniform float sharpness;
uniform float varianceClipping;
out vec4 fragColor;
void main() {
  vec3 current = texture(currentFrame, vUv).rgb;
  vec3 history = texture(historyFrame, vUv).rgb;
  vec3 blended = mix(history, current, 0.1);
  fragColor = vec4(blended, 1.0);
}
`;

describe('TAAPass', () => {
  let config: TAAPassConfig;
  let pass: TAAPass;
  let renderer: THREE.WebGLRenderer;
  let readBuffer: THREE.WebGLRenderTarget;
  let writeBuffer: THREE.WebGLRenderTarget;
  let velocityTexture: THREE.Texture;

  beforeEach(() => {
    config = {
      enabled: true,
      sampleCount: 8,
      sharpness: 0.5,
      varianceClipping: 1.0
    };

    pass = new TAAPass(config, 256, 256, mockShaderCode);

    renderer = {
      setRenderTarget: vi.fn(),
      render: vi.fn()
    } as unknown as THREE.WebGLRenderer;

    readBuffer = {
      texture: new THREE.Texture()
    } as THREE.WebGLRenderTarget;
    
    writeBuffer = {
      texture: new THREE.Texture()
    } as THREE.WebGLRenderTarget;

    velocityTexture = new THREE.Texture();
  });

  describe('Initialization', () => {
    it('should initialize with config values', () => {
      const state = pass.getState();
      expect(state.isEnabled).toBe(true);
      expect(state.currentFrame).toBe(0);
      expect(state.historyValid).toBe(false);
      expect(state.currentSharpness).toBe(0.5);
      expect(state.currentVarianceClipping).toBe(1.0);
    });

    it('should parse shader code with #pragma markers', () => {
      expect(() => new TAAPass(config, 256, 256, mockShaderCode)).not.toThrow();
    });

    it('should throw error if shader format is invalid', () => {
      const invalidShader = 'invalid shader';
      expect(() => new TAAPass(config, 256, 256, invalidShader)).toThrow();
    });
  });

  describe('History Buffer Management', () => {
    it('should initialize history on first frame', () => {
      pass.setVelocityTexture(velocityTexture);
      const initialState = pass.getState();
      expect(initialState.historyValid).toBe(false);
      
      pass.render(renderer, writeBuffer, readBuffer);
      
      const updatedState = pass.getState();
      expect(updatedState.historyValid).toBe(true);
    });

    it('should reset history', () => {
      pass.setVelocityTexture(velocityTexture);
      pass.render(renderer, writeBuffer, readBuffer);
      
      pass.resetHistory();
      
      const state = pass.getState();
      expect(state.historyValid).toBe(false);
      expect(state.currentFrame).toBe(0);
    });

    it('should invalidate history on resize', () => {
      pass.setVelocityTexture(velocityTexture);
      pass.render(renderer, writeBuffer, readBuffer);
      
      pass.setSize(512, 512);
      
      const state = pass.getState();
      expect(state.historyValid).toBe(false);
    });
  });

  describe('Rendering', () => {
    it('should pass through when disabled', () => {
      const disabledConfig: TAAPassConfig = {
        enabled: false,
        sampleCount: 8,
        sharpness: 0.5,
        varianceClipping: 1.0
      };
      
      const disabledPass = new TAAPass(disabledConfig, 256, 256, mockShaderCode);
      disabledPass.setVelocityTexture(velocityTexture);
      disabledPass.render(renderer, writeBuffer, readBuffer);
      
      expect(renderer.render).toHaveBeenCalled();
    });

    it('should pass through when no velocity texture', () => {
      // Don't set velocity texture
      pass.render(renderer, writeBuffer, readBuffer);
      
      expect(renderer.render).toHaveBeenCalled();
    });

    it('should render TAA after history is valid', () => {
      pass.setVelocityTexture(velocityTexture);
      
      // First frame: initialize history
      pass.render(renderer, writeBuffer, readBuffer);
      
      // Second frame: render TAA
      pass.render(renderer, writeBuffer, readBuffer);
      
      const state = pass.getState();
      expect(state.currentFrame).toBe(1);
    });

    it('should render to screen when renderToScreen is true', () => {
      pass.renderToScreen = true;
      pass.setVelocityTexture(velocityTexture);
      pass.render(renderer, writeBuffer, readBuffer);
      
      expect(renderer.setRenderTarget).toHaveBeenCalledWith(null);
    });
  });

  describe('Dynamic Parameters', () => {
    it('should update sharpness dynamically', () => {
      pass.setSharpness(0.8);
      const state = pass.getState();
      expect(state.currentSharpness).toBe(0.8);
    });

    it('should update variance clipping dynamically', () => {
      pass.setVarianceClipping(1.5);
      const state = pass.getState();
      expect(state.currentVarianceClipping).toBe(1.5);
    });
  });

  describe('Resource Management', () => {
    it('should handle setSize and recreate history buffer', () => {
      expect(() => pass.setSize(512, 512)).not.toThrow();
    });

    it('should dispose resources', () => {
      expect(() => pass.dispose()).not.toThrow();
    });
  });
});
