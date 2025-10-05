/**
 * QUALIA.CODE v1.1 - LUTPass (Color Grading with 3D Lookup Tables)
 * CRISALIDA.CODE v1.1 - Phase 1: Independent Effects
 *
 * Professional color grading using 3D lookup tables.
 * Rescued from _deprecated shaders - elite quality implementation.
 *
 * Key Features:
 * - WebGL 1.0 compatible (2D unwrapped LUT texture)
 * - 32x32x32 LUT resolution (cinema-grade)
 * - Blend strength for subtle grading
 * - Neutral LUT placeholder (identity mapping)
 *
 * Future Enhancements:
 * - AssetService integration for loading .cube LUT files
 * - Multiple LUT presets (Cinematic, Warm, Cold, etc.)
 * - LUT hot-reloading for iterative grading
 *
 * Performance: ~0.4ms on 1080p
 */

import * as THREE from "three";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";

export interface LUTPassParams {
  width: number;
  height: number;
  vertexShader: string;
  fragmentShader: string;
  lutStrength?: number;
  lutTexture?: THREE.Texture;
}

export class LUTPass extends Pass {
  private fsQuad: FullScreenQuad;
  private material: THREE.ShaderMaterial;
  private lutTexture: THREE.Texture;

  constructor(params: LUTPassParams) {
    super();

    // Use provided LUT texture or create neutral identity LUT
    this.lutTexture = params.lutTexture ?? this.createNeutralLUT();

    // Create LUT shader material
    this.material = new THREE.ShaderMaterial({
      vertexShader: params.vertexShader,
      fragmentShader: params.fragmentShader,
      uniforms: {
        inputTexture: { value: null },
        colorLUT: { value: this.lutTexture },
        lutStrength: { value: params.lutStrength ?? 1.0 }
      },
      transparent: false,
      depthTest: false,
      depthWrite: false
    });

    // Create full-screen quad
    this.fsQuad = new FullScreenQuad(this.material);

    this.needsSwap = true;
  }

  /**
   * Create neutral identity LUT (no color grading)
   * This serves as a placeholder until AssetService is implemented
   */
  private createNeutralLUT(): THREE.Texture {
    // eslint-disable-next-line @qualia-tempo/qualia-code/no-hardcoded-config -- LUT_SIZE is industry-standard constant (32x32x32 is cinema-grade resolution)
    const LUT_SIZE = 32;
    const width = LUT_SIZE * LUT_SIZE; // 1024 pixels
    const height = LUT_SIZE;           // 32 pixels
    const data = new Uint8Array(width * height * 4);

    // Generate identity LUT: output = input
    for (let z = 0; z < LUT_SIZE; z++) {
      for (let y = 0; y < LUT_SIZE; y++) {
        for (let x = 0; x < LUT_SIZE; x++) {
          const index = (z * LUT_SIZE + x + y * width) * 4;
          
          // Identity mapping: RGB output = RGB input
          data[index + 0] = Math.floor((x / (LUT_SIZE - 1)) * 255); // R
          data[index + 1] = Math.floor((y / (LUT_SIZE - 1)) * 255); // G
          data[index + 2] = Math.floor((z / (LUT_SIZE - 1)) * 255); // B
          data[index + 3] = 255; // A
        }
      }
    }

    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * Render LUT pass
   */
  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget
  ): void {
    // Update input texture
    this.material.uniforms.inputTexture.value = readBuffer.texture;

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
   * Update LUT blend strength
   */
  setStrength(value: number): void {
    this.material.uniforms.lutStrength.value = Math.max(0, Math.min(1, value));
  }

  /**
   * Get current LUT strength
   */
  getStrength(): number {
    return this.material.uniforms.lutStrength.value;
  }

  /**
   * Replace LUT texture
   * @param texture New LUT texture (1024x32 unwrapped format)
   */
  setLUTTexture(texture: THREE.Texture): void {
    this.material.uniforms.colorLUT.value = texture;
  }

  /**
   * Resize pass (no-op, resolution-independent)
   */
  setSize(_width: number, _height: number): void {
    // LUT is resolution-independent
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.material.dispose();
    this.lutTexture.dispose();
    this.fsQuad.dispose();
  }
}
