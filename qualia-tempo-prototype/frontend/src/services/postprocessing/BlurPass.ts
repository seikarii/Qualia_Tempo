/**
 * QUALIA.CODE v1.1 - BlurPass Implementation
 * Purpose: Separable Gaussian blur for bloom system
 * Features: 9-tap kernel, configurable radius, horizontal + vertical passes
 * Performance: ~0.5ms per pass
 */

import * as THREE from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { BlurPassConfig, BlurPassState } from '../contracts/IBlurPass.contracts';
import type { IBlurPass } from './interfaces/IBlurPass';

export class BlurPass extends Pass implements IBlurPass {
  private readonly config: BlurPassConfig;
  private readonly blurMaterial: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly camera: THREE.OrthographicCamera;
  private readonly scene: THREE.Scene;
  private readonly tempRenderTarget: THREE.WebGLRenderTarget;
  
  private kernelSize: number;
  private currentResolution: THREE.Vector2;

  constructor(config: BlurPassConfig, width: number, height: number, shaderCode: string) {
    super();
    
    this.config = config;
    this.kernelSize = config.kernelSize;
    this.currentResolution = new THREE.Vector2(width, height);
    
    // Setup rendering infrastructure
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    
    // Create temp render target for ping-pong
    this.tempRenderTarget = new THREE.WebGLRenderTarget(width, height);
    
    // Create blur shader material
    this.blurMaterial = this.createBlurMaterial(shaderCode);
  }

  private createBlurMaterial(fragmentShader: string): THREE.ShaderMaterial {
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    return new THREE.ShaderMaterial({
      uniforms: {
        sourceTexture: { value: null },
        direction: { value: new THREE.Vector2(1, 0) },
        kernelSize: { value: this.config.kernelSize },
        resolution: { value: this.currentResolution }
      },
      vertexShader,
      fragmentShader,
      glslVersion: THREE.GLSL3
    });
  }

  // eslint-disable-next-line max-params
  public render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    _deltaTime?: number,
    _maskActive?: boolean
  ): void {
    if (!this.config.enabled) {
      return;
    }
    
    this.quad.material = this.blurMaterial;
    
    // Horizontal pass
    this.blurMaterial.uniforms.sourceTexture.value = readBuffer.texture;
    this.blurMaterial.uniforms.direction.value.set(1, 0);
    this.blurMaterial.uniforms.kernelSize.value = this.kernelSize;
    
    renderer.setRenderTarget(this.tempRenderTarget);
    renderer.render(this.scene, this.camera);
    
    // Vertical pass
    this.blurMaterial.uniforms.sourceTexture.value = this.tempRenderTarget.texture;
    this.blurMaterial.uniforms.direction.value.set(0, 1);
    
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }
    
    renderer.render(this.scene, this.camera);
  }

  public setKernelSize(size: number): void {
    this.kernelSize = size;
    this.blurMaterial.uniforms.kernelSize.value = size;
  }

  public getState(): BlurPassState {
    return {
      currentPass: 0,
      effectiveKernelSize: this.kernelSize
    };
  }

  public setSize(width: number, height: number): void {
    this.currentResolution.set(width, height);
    this.tempRenderTarget.setSize(width, height);
    this.blurMaterial.uniforms.resolution.value = this.currentResolution;
  }

  public dispose(): void {
    this.blurMaterial.dispose();
    this.quad.geometry.dispose();
    this.tempRenderTarget.dispose();
  }
}
