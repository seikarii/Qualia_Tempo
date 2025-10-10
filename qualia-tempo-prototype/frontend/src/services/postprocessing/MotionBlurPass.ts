/**
 * QUALIA.CODE v1.2 - MotionBlurPass Implementation
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
 * 
 * ARCHITECTURAL NOTE: Now accepts IntrospectedShader instead of raw shader strings.
 * This eliminates pragma parsing and ensures proper #version directive handling.
 */

import * as THREE from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { MotionBlurPassConfig, MotionBlurPassState } from '../contracts/IMotionBlurPass.contracts';
import type { IMotionBlurPass } from './interfaces/IMotionBlurPass';
import type { IntrospectedShader } from '../interfaces/IShaderIntrospectionService';

// Simple pass-through shaders for disabled/fallback mode (GLSL 300 es)
// eslint-disable-next-line @qualia-tempo/qualia-code/no-hardcoded-config -- Technical shader code, not configuration
const PASSTHROUGH_VERTEX_SHADER = 'in vec2 uv; out vec2 vUv; void main() { vUv = uv; gl_Position = vec4(vec3(uv * 2.0 - 1.0, 0.0), 1.0); }';
// eslint-disable-next-line @qualia-tempo/qualia-code/no-hardcoded-config -- Technical shader code, not configuration
const PASSTHROUGH_FRAGMENT_SHADER = 'in vec2 vUv; uniform sampler2D tDiffuse; out vec4 fragColor; void main() { fragColor = texture(tDiffuse, vUv); }';

export class MotionBlurPass extends Pass implements IMotionBlurPass {
  private readonly config: MotionBlurPassConfig;
  private readonly motionBlurMaterial: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly camera: THREE.OrthographicCamera;
  private readonly scene: THREE.Scene;
  
  private velocityTexture: THREE.Texture | null = null;
  private strength: number;
  private samples: number;

  constructor(config: MotionBlurPassConfig, shader: IntrospectedShader) {
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
    this.motionBlurMaterial = this.createMotionBlurMaterial(shader);
    this.quad.material = this.motionBlurMaterial;
  }

  private createMotionBlurMaterial(shader: IntrospectedShader): THREE.ShaderMaterial {
    // ARCHITECTURAL IMPROVEMENT: Use pre-introspected shader instead of pragma parsing.
    // The ShaderIntrospectionService has already:
    // 1. Stripped #version directives (RawShaderMaterial handles via glslVersion property)
    // 2. Separated vertex/fragment shaders (no pragma artifacts in source)
    // 3. Extracted uniforms from shader source
    
    return new THREE.RawShaderMaterial({
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      glslVersion: THREE.GLSL3,
      uniforms: {
        // Merge introspected uniforms with MotionBlur-specific uniforms
        ...shader.uniforms,
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
