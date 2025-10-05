/**
 * QUALIA.CODE v1.1 - HBAOPass (Horizon-Based Ambient Occlusion)
 * CRISALIDA.CODE v1.1 - Phase 3: Advanced Effects Integration
 * 
 * High-quality ambient occlusion using horizon-based algorithm.
 * Rescued from _deprecated shaders - elite quality implementation.
 * 
 * Key Features:
 * - Horizon-based sampling for accurate occlusion
 * - Depth-aware bilateral filtering
 * - Normal-oriented hemisphere sampling
 * - Random rotation per pixel using noise texture
 * - Configurable radius, bias, and sample count
 */

import * as THREE from "three";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";

export interface HBAOPassParams {
  width: number;
  height: number;
  scene: THREE.Scene;
  camera: THREE.Camera;
  gBufferNormal: THREE.Texture;
  gBufferDepth: THREE.Texture;
  vertexShader: string;
  fragmentShader: string;
  radius?: number;
  bias?: number;
  numDirections?: number;
  numSteps?: number;
}

export class HBAOPass extends Pass {
  private fsQuad: FullScreenQuad;
  private hbaoMaterial: THREE.ShaderMaterial;
  private renderTarget: THREE.WebGLRenderTarget;
  private noiseTexture: THREE.DataTexture;
  private camera: THREE.Camera;

  // G-Buffer texture references
  public readonly normalTexture: THREE.Texture;
  public readonly depthTexture: THREE.Texture;

  constructor(params: HBAOPassParams) {
    super();

    this.camera = params.camera;

    // Store G-Buffer texture references
    this.normalTexture = params.gBufferNormal;
    this.depthTexture = params.gBufferDepth;

    // Create noise texture for random rotation
    this.noiseTexture = this.generateNoiseTexture();

    // Create render target for HBAO output
    this.renderTarget = this.createRenderTarget(params.width, params.height);

    // Create HBAO shader material
    this.hbaoMaterial = this.createHBAOMaterial(params);

    // Create full-screen quad
    this.fsQuad = new FullScreenQuad(this.hbaoMaterial);

    this.needsSwap = false;
  }

  /**
   * Create render target for HBAO output
   * QUALIA.CODE: Extracted method to reduce constructor complexity
   */
  private createRenderTarget(width: number, height: number): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(width, height, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false
    });
  }

  /**
   * Create HBAO shader material with all uniforms
   * QUALIA.CODE: Extracted method to reduce constructor complexity
   */
  private createHBAOMaterial(params: HBAOPassParams): THREE.ShaderMaterial {
    const camera = this.camera as THREE.PerspectiveCamera;
    const noiseScale = 4; // Noise texture is 4x4

    return new THREE.RawShaderMaterial({
      vertexShader: params.vertexShader,
      fragmentShader: params.fragmentShader,
      glslVersion: THREE.GLSL3,
      uniforms: {
        // G-Buffer inputs
        depthTexture: { value: params.gBufferDepth },
        normalTexture: { value: params.gBufferNormal },
        noiseTexture: { value: this.noiseTexture },

        // Camera matrices
        projection: { value: camera.projectionMatrix },
        invProjection: { value: new THREE.Matrix4() },

        // Screen resolution
        resolution: { value: new THREE.Vector2(params.width, params.height) },

        // HBAO parameters (with defaults)
        radius: { value: params.radius ?? 1.5 },
        bias: { value: params.bias ?? 0.025 },
        numDirections: { value: params.numDirections ?? 8 },
        numSteps: { value: params.numSteps ?? 4 },

        // Noise texture parameters
        noiseScale: { value: new THREE.Vector2(params.width / noiseScale, params.height / noiseScale) }
      },
      transparent: false,
      depthTest: false,
      depthWrite: false
    });
  }

  /**
   * Generate random noise texture for HBAO sampling rotation
   */
  private generateNoiseTexture(): THREE.DataTexture {
    const size = 4;
    const data = new Uint8Array(size * size * 4);

    for (let i = 0; i < size * size; i++) {
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle);
      const y = Math.sin(angle);

      data[i * 4 + 0] = (x * 0.5 + 0.5) * 255;
      data[i * 4 + 1] = (y * 0.5 + 0.5) * 255;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 255;
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * Render HBAO pass
   */
  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget
  ): void {
    // Update camera matrices
    const camera = this.camera as THREE.PerspectiveCamera;
    this.hbaoMaterial.uniforms.projection.value = camera.projectionMatrix;

    // Calculate inverse projection matrix
    this.hbaoMaterial.uniforms.invProjection.value.copy(camera.projectionMatrix).invert();

    // Render HBAO to internal render target
    renderer.setRenderTarget(this.renderTarget);
    this.fsQuad.render(renderer);

    // Restore render target
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
  }

  /**
   * Update HBAO quality parameters
   */
  setQuality(params: {
    radius?: number;
    bias?: number;
    numDirections?: number;
    numSteps?: number;
  }): void {
    if (params.radius !== undefined) {
      this.hbaoMaterial.uniforms.radius.value = params.radius;
    }
    if (params.bias !== undefined) {
      this.hbaoMaterial.uniforms.bias.value = params.bias;
    }
    if (params.numDirections !== undefined) {
      this.hbaoMaterial.uniforms.numDirections.value = params.numDirections;
    }
    if (params.numSteps !== undefined) {
      this.hbaoMaterial.uniforms.numSteps.value = params.numSteps;
    }
  }

  /**
   * Get HBAO output texture
   */
  get texture(): THREE.Texture {
    return this.renderTarget.texture;
  }

  /**
   * Resize HBAO render target
   */
  setSize(width: number, height: number): void {
    this.renderTarget.setSize(width, height);
    this.hbaoMaterial.uniforms.resolution.value.set(width, height);
    this.hbaoMaterial.uniforms.noiseScale.value.set(width / 4, height / 4);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.renderTarget.dispose();
    this.hbaoMaterial.dispose();
    this.noiseTexture.dispose();
    this.fsQuad.dispose();
  }
}
