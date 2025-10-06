/**
 * QUALIA.CODE v1.2 - TAAPass Implementation
 * CRISALIDA.CODE v1.1 - Phase 4: Temporal Effects (ELITE)
 * 
 * Temporal Anti-Aliasing with advanced reconstruction:
 * - Catmull-Rom 9-tap sampling for sharp reconstruction
 * - Variance clipping to prevent ghosting
 * - YCoCg color space for chroma preservation
 * - Conservative sharpening to recover detail
 * - History buffer ping-pong system
 * 
 * Performance: ~1-2ms (high quality)
 * Dependencies: G-Buffer velocity texture (Phase 3), JitterService (Phase 4)
 * 
 * ARCHITECTURAL NOTE: Now accepts IntrospectedShader instead of raw shader strings.
 * This eliminates pragma parsing and ensures proper #version directive handling.
 */

import * as THREE from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { TAAPassConfig, TAAPassState } from '../contracts/ITAAPass.contracts';
import type { ITAAPass } from './interfaces/ITAAPass';
import type { IntrospectedShader } from '../interfaces/IShaderIntrospectionService';

export class TAAPass extends Pass implements ITAAPass {
  private readonly config: TAAPassConfig;
  private readonly taaMaterial: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly camera: THREE.OrthographicCamera;
  private readonly scene: THREE.Scene;
  
  // History buffer for temporal accumulation (ping-pong)
  private historyBuffer: THREE.WebGLRenderTarget;
  private historyValid: boolean = false;
  
  private velocityTexture: THREE.Texture | null = null;
  private frameCount: number = 0;
  private sharpness: number;
  private varianceClipping: number;
  private width: number;
  private height: number;

  constructor(config: TAAPassConfig, width: number, height: number, shader: IntrospectedShader) {
    super();
    
    this.config = config;
    this.sharpness = config.sharpness;
    this.varianceClipping = config.varianceClipping;
    this.width = width;
    this.height = height;
    
    // Create history buffer
    this.historyBuffer = this.createHistoryBuffer(width, height);
    
    // Setup rendering infrastructure
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    
    // Create TAA shader material
    this.taaMaterial = this.createTAAMaterial(shader);
    this.quad.material = this.taaMaterial;
  }

  private createHistoryBuffer(width: number, height: number): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,  // High precision for temporal accumulation
      generateMipmaps: false
    });
  }

  private createTAAMaterial(shader: IntrospectedShader): THREE.ShaderMaterial {
    // ARCHITECTURAL IMPROVEMENT: Use pre-introspected shader instead of pragma parsing.
    // The ShaderIntrospectionService has already:
    // 1. Stripped #version directives (RawShaderMaterial handles via glslVersion property)
    // 2. Separated vertex/fragment shaders (no pragma artifacts in source)
    // 3. Extracted uniforms from shader source
    
    return new THREE.RawShaderMaterial({
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      uniforms: {
        // Merge introspected uniforms with TAA-specific uniforms
        ...shader.uniforms,
        currentFrame: { value: null },
        historyFrame: { value: this.historyBuffer.texture },
        velocityTexture: { value: this.velocityTexture },
        resolution: { value: new THREE.Vector2(this.width, this.height) },
        sharpness: { value: this.config.sharpness },
        varianceClipping: { value: this.config.varianceClipping }
      },
      depthTest: false,
      depthWrite: false,
      glslVersion: THREE.GLSL3
    }) as THREE.ShaderMaterial;
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
      this.renderPassthrough(renderer, writeBuffer, readBuffer);
      return;
    }
    
    // First frame: Initialize history with current frame (no jitter yet)
    if (!this.historyValid) {
      this.copyToHistory(renderer, readBuffer);
      this.historyValid = true;
      this.renderPassthrough(renderer, writeBuffer, readBuffer);
      return;
    }
    
    // Update uniforms
    this.updateUniforms(readBuffer);
    
    // Render TAA
    this.renderTAA(renderer, writeBuffer);
    
    // Copy result to history buffer for next frame
    this.copyToHistory(renderer, writeBuffer);
    
    // Increment frame counter
    this.frameCount++;
  }

  private updateUniforms(readBuffer: THREE.WebGLRenderTarget): void {
    this.taaMaterial.uniforms.currentFrame.value = readBuffer.texture;
    this.taaMaterial.uniforms.historyFrame.value = this.historyBuffer.texture;
    this.taaMaterial.uniforms.velocityTexture.value = this.velocityTexture;
    this.taaMaterial.uniforms.sharpness.value = this.sharpness;
    this.taaMaterial.uniforms.varianceClipping.value = this.varianceClipping;
  }

  private renderTAA(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget): void {
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }
    
    renderer.render(this.scene, this.camera);
  }

  private renderPassthrough(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget
  ): void {
    // Simple copy shader
    const copyMaterial = this.createCopyMaterial(readBuffer);
    
    this.quad.material = copyMaterial;
    
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }
    
    renderer.render(this.scene, this.camera);
    
    this.quad.material = this.taaMaterial;
    copyMaterial.dispose();
  }

  private createCopyMaterial(readBuffer: THREE.WebGLRenderTarget): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: readBuffer.texture } },
      // eslint-disable-next-line @qualia-tempo/qualia-code/no-hardcoded-config -- Technical shader code, not configuration
      vertexShader: 'in vec2 uv; out vec2 vUv; void main() { vUv = uv; gl_Position = vec4(vec3(uv * 2.0 - 1.0, 0.0), 1.0); }',
      // eslint-disable-next-line @qualia-tempo/qualia-code/no-hardcoded-config -- Technical shader code, not configuration
      fragmentShader: 'in vec2 vUv; uniform sampler2D tDiffuse; out vec4 fragColor; void main() { fragColor = texture(tDiffuse, vUv); }',
      depthTest: false,
      depthWrite: false
    });
  }

  private copyToHistory(renderer: THREE.WebGLRenderer, source: THREE.WebGLRenderTarget): void {
    const copyMaterial = this.createCopyMaterial(source);
    
    this.quad.material = copyMaterial;
    renderer.setRenderTarget(this.historyBuffer);
    renderer.render(this.scene, this.camera);
    
    this.quad.material = this.taaMaterial;
    copyMaterial.dispose();
  }

  public setVelocityTexture(velocityTexture: THREE.Texture): void {
    this.velocityTexture = velocityTexture;
  }

  public setSharpness(sharpness: number): void {
    this.sharpness = sharpness;
    this.taaMaterial.uniforms.sharpness.value = sharpness;
  }

  public setVarianceClipping(amount: number): void {
    this.varianceClipping = amount;
    this.taaMaterial.uniforms.varianceClipping.value = amount;
  }

  public resetHistory(): void {
    this.historyValid = false;
    this.frameCount = 0;
  }

  public getState(): TAAPassState {
    return {
      isEnabled: this.config.enabled,
      currentFrame: this.frameCount,
      historyValid: this.historyValid,
      currentSharpness: this.sharpness,
      currentVarianceClipping: this.varianceClipping
    };
  }

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    
    // Recreate history buffer with new size
    this.historyBuffer.dispose();
    this.historyBuffer = this.createHistoryBuffer(width, height);
    this.taaMaterial.uniforms.historyFrame.value = this.historyBuffer.texture;
    this.taaMaterial.uniforms.resolution.value.set(width, height);
    
    // Invalidate history on resize
    this.resetHistory();
  }

  public dispose(): void {
    this.taaMaterial.dispose();
    this.quad.geometry.dispose();
    this.historyBuffer.dispose();
  }
}
