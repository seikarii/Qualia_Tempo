/**
 * QUALIA.CODE v1.1 - MotionBlurPass Implementation
 * CRISALIDA.CODE v1.1 - Phase 4: Temporal Effects
 * 
 * Velocity-based motion blur using G-Buffer velocity texture.
 * Samples along motion vectors for realistic per-pixel blur.
 * 
 * Features:
 * - Configurable sample count (4-16)
 * - Strength multiplier for artistic control
 * - Early exit optimization for static pixels
 * - Symmetric sampling along velocity vector
 * 
 * Performance: ~1-2ms (depends on sample count)
 * Dependencies: G-Buffer velocity texture (Phase 3)
 */

import * as THREE from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { MotionBlurPassConfig, MotionBlurPassState } from '../contracts/IMotionBlurPass.contracts';
import type { IMotionBlurPass } from './interfaces/IMotionBlurPass';

// Simple pass-through shaders for disabled/fallback mode
// eslint-disable-next-line @qualia-tempo/qualia-code/no-hardcoded-config -- Technical shader code, not configuration
const PASSTHROUGH_VERTEX_SHADER = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }';
// eslint-disable-next-line @qualia-tempo/qualia-code/no-hardcoded-config -- Technical shader code, not configuration
const PASSTHROUGH_FRAGMENT_SHADER = 'varying vec2 vUv; uniform sampler2D tDiffuse; void main() { gl_FragColor = texture2D(tDiffuse, vUv); }';

export class MotionBlurPass extends Pass implements IMotionBlurPass {
  private readonly config: MotionBlurPassConfig;
  private readonly motionBlurMaterial: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly camera: THREE.OrthographicCamera;
  private readonly scene: THREE.Scene;
  
  private velocityTexture: THREE.Texture | null = null;
  private strength: number;
  private samples: number;

  constructor(config: MotionBlurPassConfig, shaderCode: string) {
    super();
    
    this.config = config;
    this.strength = config.strength;
    this.samples = config.samples;
    
    // Setup rendering infrastructure
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    
    // Create motion blur shader material
    this.motionBlurMaterial = this.createMotionBlurMaterial(shaderCode);
    this.quad.material = this.motionBlurMaterial;
  }

  private createMotionBlurMaterial(shaderCode: string): THREE.ShaderMaterial {
    // Extract vertex and fragment shaders from pragma-delimited code
    const vertexMatch = shaderCode.match(/#pragma VERTEX\s+([\s\S]*?)#pragma FRAGMENT/);
    const fragmentMatch = shaderCode.match(/#pragma FRAGMENT\s+([\s\S]*$)/);
    
    if (!vertexMatch || !fragmentMatch) {
      throw new Error('MotionBlurPass: Invalid shader format. Expected #pragma VERTEX and #pragma FRAGMENT markers.');
    }
    
    return new THREE.RawShaderMaterial({
      vertexShader: vertexMatch[1].trim(),
      fragmentShader: fragmentMatch[1].trim(),
      glslVersion: THREE.GLSL3,
      uniforms: {
        sceneTexture: { value: null },
        velocityTexture: { value: this.velocityTexture },
        samples: { value: this.config.samples },
        strength: { value: this.config.strength },
        threshold: { value: this.config.threshold }
      },
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
    if (!this.config.enabled || !this.velocityTexture) {
      // Pass through if disabled or no velocity texture
      if (this.renderToScreen) {
        renderer.setRenderTarget(null);
      } else {
        renderer.setRenderTarget(writeBuffer);
      }
      
      // Copy readBuffer to output
      const copyMaterial = new THREE.ShaderMaterial({
        uniforms: { tDiffuse: { value: readBuffer.texture } },
        vertexShader: PASSTHROUGH_VERTEX_SHADER,
        fragmentShader: PASSTHROUGH_FRAGMENT_SHADER
      });
      
      this.quad.material = copyMaterial;
      renderer.render(this.scene, this.camera);
      this.quad.material = this.motionBlurMaterial;
      copyMaterial.dispose();
      
      return;
    }
    
    // Update uniforms
    this.motionBlurMaterial.uniforms.sceneTexture.value = readBuffer.texture;
    this.motionBlurMaterial.uniforms.velocityTexture.value = this.velocityTexture;
    this.motionBlurMaterial.uniforms.samples.value = this.samples;
    this.motionBlurMaterial.uniforms.strength.value = this.strength;
    
    // Render motion blur
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }
    
    renderer.render(this.scene, this.camera);
  }

  public setVelocityTexture(velocityTexture: THREE.Texture): void {
    this.velocityTexture = velocityTexture;
  }

  public setStrength(strength: number): void {
    this.strength = strength;
    this.motionBlurMaterial.uniforms.strength.value = strength;
  }

  public setSamples(samples: number): void {
    this.samples = samples;
    this.motionBlurMaterial.uniforms.samples.value = samples;
  }

  public getState(): MotionBlurPassState {
    return {
      isEnabled: this.config.enabled,
      currentSamples: this.samples,
      currentStrength: this.strength
    };
  }

  public setSize(_width: number, _height: number): void {
    // Motion blur is resolution-independent (samples in texture space)
    // No action needed
  }

  public dispose(): void {
    this.motionBlurMaterial.dispose();
    this.quad.geometry.dispose();
  }
}
