/**
 * QUALIA.CODE v1.1 - DoFPass Implementation
 * Purpose: Depth of Field post-processing with Golden Angle spiral sampling
 * Features: Configurable focus, bokeh shape, depth-based CoC
 * Performance: ~2-3ms (expensive but high quality)
 */

import * as THREE from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { DoFPassConfig, DoFPassState } from '../contracts/IDoFPass.contracts';
import type { IDoFPass } from './interfaces/IDoFPass';

export class DoFPass extends Pass implements IDoFPass {
  private readonly config: DoFPassConfig;
  private readonly dofMaterial: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly camera: THREE.OrthographicCamera;
  private readonly scene: THREE.Scene;
  
  private depthTexture: THREE.Texture | null = null;
  private currentResolution: THREE.Vector2;
  
  // State tracking
  private currentCoC: number = 0;
  private isInFocus: boolean = true;
  
  // Dynamic parameters (override config values)
  private focusDistance: number;
  private bokehRadius: number;

  constructor(config: DoFPassConfig, width: number, height: number, shaderCode: string) {
    super();
    
    this.config = config;
    this.currentResolution = new THREE.Vector2(width, height);
    this.focusDistance = config.focusDistance;
    this.bokehRadius = config.bokehRadius;
    
    // Setup rendering infrastructure
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    
    // Create DoF shader material
    this.dofMaterial = this.createDoFMaterial(shaderCode);
  }

  private createDoFMaterial(fragmentShader: string): THREE.ShaderMaterial {
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
        depthTexture: { value: null },
        focusDistance: { value: this.config.focusDistance },
        focusRange: { value: this.config.focusRange },
        bokehRadius: { value: this.config.bokehRadius },
        resolution: { value: this.currentResolution },
        bokehSamples: { value: this.config.bokehSamples }
      },
      vertexShader,
      fragmentShader,
      glslVersion: THREE.GLSL3
    }) as THREE.ShaderMaterial;
  }

   
  public render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    _deltaTime?: number,
    _maskActive?: boolean
  ): void {
    if (!this.config.enabled) {
      // Pass-through if disabled
      if (this.renderToScreen) {
        renderer.setRenderTarget(null);
      } else {
        renderer.setRenderTarget(writeBuffer);
      }
      renderer.clear();
      this.copyTexture(renderer, readBuffer.texture, null);
      return;
    }

    if (!this.depthTexture) {
      // Depth texture not set - pass through scene without DoF effect
      this.copyTexture(renderer, readBuffer.texture, writeBuffer);
      return;
    }
    
    // Update uniforms
    this.dofMaterial.uniforms.sceneTexture.value = readBuffer.texture;
    this.dofMaterial.uniforms.depthTexture.value = this.depthTexture;
    this.dofMaterial.uniforms.focusDistance.value = this.focusDistance;
    this.dofMaterial.uniforms.focusRange.value = this.config.focusRange;
    this.dofMaterial.uniforms.bokehRadius.value = this.bokehRadius;
    this.dofMaterial.uniforms.resolution.value = this.currentResolution;
    this.dofMaterial.uniforms.bokehSamples.value = this.config.bokehSamples;
    
    // Render DoF effect
    this.quad.material = this.dofMaterial;
    
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }
    
    renderer.render(this.scene, this.camera);
  }

  private copyTexture(
    renderer: THREE.WebGLRenderer,
    source: THREE.Texture,
    target: THREE.WebGLRenderTarget | null
  ): void {
    const copyMaterial = new THREE.MeshBasicMaterial({ map: source });
    this.quad.material = copyMaterial;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
    copyMaterial.dispose();
  }

  public setDepthTexture(depthTexture: THREE.Texture): void {
    this.depthTexture = depthTexture;
    this.dofMaterial.uniforms.depthTexture.value = depthTexture;
  }

  public setFocusDistance(distance: number): void {
    this.focusDistance = distance;
    this.dofMaterial.uniforms.focusDistance.value = distance;
  }

  public setBokehRadius(radius: number): void {
    this.bokehRadius = radius;
    this.dofMaterial.uniforms.bokehRadius.value = radius;
  }

  public setDebugMode(_enabled: boolean): void {
    // Debug mode visualization (could show CoC as color overlay)
    // Implementation depends on shader support
  }

  public getState(): DoFPassState {
    return {
      circleOfConfusion: this.currentCoC,
      isInFocus: this.isInFocus,
      activeSamples: this.config.bokehSamples
    };
  }

  public setSize(width: number, height: number): void {
    this.currentResolution.set(width, height);
    this.dofMaterial.uniforms.resolution.value = this.currentResolution;
  }

  public dispose(): void {
    this.dofMaterial.dispose();
    this.quad.geometry.dispose();
  }
}
