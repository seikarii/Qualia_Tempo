/**
 * QUALIA.CODE v1.1 - BloomDownsamplePass
 * CRISALIDA.CODE v1.1 - Phase 2: Complete Bloom System
 *
 * Professional box filter downsampling for mipmap chain generation.
 * Part of the bloom pipeline - creates progressive mipmap chain.
 *
 * Key Features:
 * - 13-tap box filter for efficient downsampling
 * - Weighted sampling to prevent artifacts
 * - Progressive mipmap chain (5-7 levels)
 * - Half-resolution per level
 *
 * Architecture:
 * - Follows Pass-based post-processing pattern
 * - Used iteratively to create mipmap chain
 * - Each pass downsamples to half resolution
 *
 * Performance: ~0.1ms per level (0.5-0.7ms total for 5-7 levels)
 */

import * as THREE from "three";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import type { BloomDownsamplePassParams } from "../contracts/IBloomDownsamplePass.contracts";

export class BloomDownsamplePass extends Pass {
  private fsQuad: FullScreenQuad;
  private downsampleMaterial: THREE.ShaderMaterial;
  private resolution: THREE.Vector2;

  constructor(params: BloomDownsamplePassParams) {
    super();

    this.resolution = new THREE.Vector2(params.width, params.height);

    // Create downsample shader material
    this.downsampleMaterial = new THREE.ShaderMaterial({
      vertexShader: params.vertexShader,
      fragmentShader: params.fragmentShader,
      uniforms: {
        inputTexture: { value: null },
        texelSize: { value: new THREE.Vector2(1.0 / params.width, 1.0 / params.height) }
      },
      transparent: false,
      depthTest: false,
      depthWrite: false
    });

    // Create full-screen quad
    this.fsQuad = new FullScreenQuad(this.downsampleMaterial);

    this.needsSwap = true;
  }

  /**
   * Render downsample pass
   */
  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget
  ): void {
    // Update input texture
    this.downsampleMaterial.uniforms.inputTexture.value = readBuffer.texture;

    // Render to write buffer or screen
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
      this.fsQuad.render(renderer);
    }
  }

  /**
   * Update texel size based on current resolution
   */
  updateTexelSize(width: number, height: number): void {
    this.resolution.set(width, height);
    this.downsampleMaterial.uniforms.texelSize.value.set(
      1.0 / width,
      1.0 / height
    );
  }

  /**
   * Get current texel size
   */
  getTexelSize(): THREE.Vector2 {
    return this.downsampleMaterial.uniforms.texelSize.value;
  }

  /**
   * Resize pass
   */
  setSize(width: number, height: number): void {
    this.updateTexelSize(width, height);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.downsampleMaterial.dispose();
    this.fsQuad.dispose();
  }
}
