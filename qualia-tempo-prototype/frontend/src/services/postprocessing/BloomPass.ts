/**
 * QUALIA.CODE v1.1 - BloomPass Orchestrator
 * Purpose: Complete bloom system coordinator
 * Features: Mipmap chain, bright pass, blur, downsample, upsample, blend
 * Performance: <3ms total (high quality bloom)
 */

import * as THREE from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { BloomPassConfig, BloomPassState } from '../contracts/IBloomPass.contracts';
import type { IBloomPass } from './interfaces/IBloomPass';
import { BrightPass } from './BrightPass';
import { BlurPass } from './BlurPass';
import { BloomDownsamplePass } from './BloomDownsamplePass';
import { BloomUpsamplePass } from './BloomUpsamplePass';

export class BloomPass extends Pass implements IBloomPass {
  private readonly config: BloomPassConfig;
  private readonly brightPass: BrightPass;
  private readonly blurPass: BlurPass;
  private readonly downsamplePass: BloomDownsamplePass;
  private readonly upsamplePass: BloomUpsamplePass;
  
  private readonly renderTargets: THREE.WebGLRenderTarget[] = [];
  private readonly compositeMaterial: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly camera: THREE.OrthographicCamera;
  private readonly scene: THREE.Scene;
  
  private intensity: number;

  constructor(
    config: BloomPassConfig,
    width: number,
    height: number,
    shaders: {
      brightPassShader: string;
      blurShader: string;
      downsampleShader: string;
      upsampleShader: string;
    }
  ) {
    super();
    
    this.config = config;
    this.intensity = config.intensity;
    
    // Setup rendering infrastructure
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    
    // Create sub-passes
    this.brightPass = this.createBrightPass(config, shaders);
    this.blurPass = this.createBlurPass(config, width, height, shaders);
    this.downsamplePass = this.createDownsamplePass(width, height, shaders);
    this.upsamplePass = this.createUpsamplePass(width, height, shaders);
    
    // Create mipmap chain render targets
    this.createRenderTargets(width, height);
    
    // Create composite material for final blend
    this.compositeMaterial = this.createCompositeMaterial();
  }

  private createBrightPass(
    config: BloomPassConfig,
    shaders: { brightPassShader: string; blurShader: string; downsampleShader: string; upsampleShader: string }
  ): BrightPass {
    return new BrightPass({
      enabled: config.enabled,
      threshold: config.threshold,
      softThreshold: config.softThreshold,
      intensity: config.intensity,
      colorPreservation: 0.8
    }, shaders.brightPassShader);
  }

  private createBlurPass(
    config: BloomPassConfig,
    width: number,
    height: number,
    shaders: { brightPassShader: string; blurShader: string; downsampleShader: string; upsampleShader: string }
  ): BlurPass {
    return new BlurPass({
      enabled: config.enabled,
      kernelSize: config.radius,
      passes: 1
    }, width, height, shaders.blurShader);
  }

  private createDownsamplePass(
    width: number,
    height: number,
    shaders: { brightPassShader: string; blurShader: string; downsampleShader: string; upsampleShader: string }
  ): BloomDownsamplePass {
    return new BloomDownsamplePass({
      width,
      height,
      vertexShader: this.getSimpleVertexShader(),
      fragmentShader: shaders.downsampleShader
    });
  }

  private createUpsamplePass(
    width: number,
    height: number,
    shaders: { brightPassShader: string; blurShader: string; downsampleShader: string; upsampleShader: string }
  ): BloomUpsamplePass {
    return new BloomUpsamplePass({
      width,
      height,
      vertexShader: this.getSimpleVertexShader(),
      fragmentShader: shaders.upsampleShader,
      intensity: 0.3
    });
  }

  private createRenderTargets(width: number, height: number): void {
    let w = Math.floor(width / 2);
    let h = Math.floor(height / 2);
    
    for (let i = 0; i < this.config.levels; i++) {
      this.renderTargets.push(
        new THREE.WebGLRenderTarget(w, h, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat
        })
      );
      w = Math.floor(w / 2);
      h = Math.floor(h / 2);
    }
  }

  private getSimpleVertexShader(): string {
    return `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
  }

  private createCompositeMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: null },
        intensity: { value: this.config.intensity }
      },
      vertexShader: this.getSimpleVertexShader(),
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D baseTexture;
        uniform sampler2D bloomTexture;
        uniform float intensity;
        
        void main() {
          vec3 base = texture2D(baseTexture, vUv).rgb;
          vec3 bloom = texture2D(bloomTexture, vUv).rgb;
          
          // Additive blending with intensity
          vec3 result = base + bloom * intensity;
          
          gl_FragColor = vec4(result, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false
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
    
    // Step 1: Extract bright pixels
    this.brightPass.render(renderer, this.renderTargets[0], readBuffer);
    
    // Step 2: Blur bright pixels
    this.blurPass.render(renderer, this.renderTargets[0], this.renderTargets[0]);
    
    // Step 3-4: Process mipmap chain
    this.downsampleMipmapChain(renderer);
    this.upsampleMipmapChain(renderer);
    
    // Step 5: Composite bloom with scene
    this.compositeBloom(renderer, writeBuffer, readBuffer);
  }

  private downsampleMipmapChain(renderer: THREE.WebGLRenderer): void {
    for (let i = 0; i < this.config.levels - 1; i++) {
      this.downsamplePass.updateTexelSize(
        this.renderTargets[i + 1].width,
        this.renderTargets[i + 1].height
      );
      this.downsamplePass.render(
        renderer,
        this.renderTargets[i + 1],
        this.renderTargets[i]
      );
    }
  }

  private upsampleMipmapChain(renderer: THREE.WebGLRenderer): void {
    for (let i = this.config.levels - 2; i >= 0; i--) {
      this.upsamplePass.updateTexelSize(
        this.renderTargets[i].width,
        this.renderTargets[i].height
      );
      this.upsamplePass.render(
        renderer,
        this.renderTargets[i],
        this.renderTargets[i + 1]
      );
    }
  }

  private compositeBloom(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget
  ): void {
    this.compositeMaterial.uniforms.baseTexture.value = readBuffer.texture;
    this.compositeMaterial.uniforms.bloomTexture.value = this.renderTargets[0].texture;
    this.compositeMaterial.uniforms.intensity.value = this.intensity;
    
    this.quad.material = this.compositeMaterial;
    
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }
    
    renderer.render(this.scene, this.camera);
  }

  public setIntensity(intensity: number): void {
    this.intensity = intensity;
    this.brightPass.setIntensity(intensity);
  }

  public setThreshold(threshold: number): void {
    this.brightPass.setThreshold(threshold);
  }

  public getState(): BloomPassState {
    return {
      activeLevels: this.config.levels,
      currentIntensity: this.intensity,
      renderTargetsAllocated: this.renderTargets.length
    };
  }

  public setSize(width: number, height: number): void {
    this.brightPass.setSize(width, height);
    this.blurPass.setSize(width, height);
    
    // Recreate render targets
    this.renderTargets.forEach(rt => rt.dispose());
    this.renderTargets.length = 0;
    this.createRenderTargets(width, height);
  }

  public dispose(): void {
    this.brightPass.dispose();
    this.blurPass.dispose();
    this.compositeMaterial.dispose();
    this.quad.geometry.dispose();
    this.renderTargets.forEach(rt => rt.dispose());
  }
}
