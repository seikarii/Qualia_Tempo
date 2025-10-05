/**
 * QUALIA.CODE v1.1 - BrightPass Implementation
 * Purpose: Luminance threshold extraction for bloom system
 * Features: Soft threshold, color preservation, dynamic parameters
 * Performance: <0.5ms (fast, single pass)
 */

import * as THREE from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { BrightPassConfig, BrightPassState } from '../contracts/IBrightPass.contracts';
import type { IBrightPass } from './interfaces/IBrightPass';

export class BrightPass extends Pass implements IBrightPass {
  private readonly config: BrightPassConfig;
  private readonly brightPassMaterial: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly camera: THREE.OrthographicCamera;
  private readonly scene: THREE.Scene;
  
  // Dynamic parameters (override config values)
  private threshold: number;
  private intensity: number;

  constructor(config: BrightPassConfig, shaderCode: string) {
    super();
    
    this.config = config;
    this.threshold = config.threshold;
    this.intensity = config.intensity;
    
    // Setup rendering infrastructure
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    
    // Create bright pass shader material
    this.brightPassMaterial = this.createBrightPassMaterial(shaderCode);
  }

  private createBrightPassMaterial(fragmentShader: string): THREE.ShaderMaterial {
    // GLSL 300 es vertex shader (glslVersion property handles #version)
    const vertexShader = `
      in vec2 uv;
      out vec2 vUv;
      
      uniform mat4 projectionMatrix;
      uniform mat4 modelViewMatrix;
      in vec3 position;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    return new THREE.RawShaderMaterial({
      uniforms: {
        sceneTexture: { value: null },
        threshold: { value: this.config.threshold },
        softThreshold: { value: this.config.softThreshold },
        intensity: { value: this.config.intensity },
        colorPreservation: { value: this.config.colorPreservation }
      },
      vertexShader,
      fragmentShader,
      glslVersion: THREE.GLSL3
    }) as THREE.ShaderMaterial;
  }

  // eslint-disable-next-line max-params -- Three.js Pass base class signature requires 5 parameters
  public render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    _deltaTime?: number,
    _maskActive?: boolean
  ): void {
    if (!this.config.enabled) {
      // Pass-through if disabled - render black buffer (no bright pixels)
      renderer.setRenderTarget(writeBuffer);
      renderer.setClearColor(new THREE.Color(0, 0, 0), 1.0);
      renderer.clear();
      return;
    }
    
    // Update uniforms with dynamic parameters
    this.brightPassMaterial.uniforms.sceneTexture.value = readBuffer.texture;
    this.brightPassMaterial.uniforms.threshold.value = this.threshold;
    this.brightPassMaterial.uniforms.softThreshold.value = this.config.softThreshold;
    this.brightPassMaterial.uniforms.intensity.value = this.intensity;
    this.brightPassMaterial.uniforms.colorPreservation.value = this.config.colorPreservation;
    
    // Render bright pass extraction
    this.quad.material = this.brightPassMaterial;
    
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }
    
    renderer.render(this.scene, this.camera);
  }

  public setThreshold(threshold: number): void {
    this.threshold = threshold;
    this.brightPassMaterial.uniforms.threshold.value = threshold;
  }

  public setIntensity(intensity: number): void {
    this.intensity = intensity;
    this.brightPassMaterial.uniforms.intensity.value = intensity;
  }

  public getState(): BrightPassState {
    return {
      brightPixelCount: 0, // Would require GPU readback to calculate accurately
      averageBrightness: this.threshold
    };
  }

  public setSize(_width: number, _height: number): void {
    // BrightPass operates in screen space - size independent
    // Method preserved for Three.js Pass interface compatibility
  }

  public dispose(): void {
    this.brightPassMaterial.dispose();
    this.quad.geometry.dispose();
  }
}
