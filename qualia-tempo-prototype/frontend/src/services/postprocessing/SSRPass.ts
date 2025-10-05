/**
 * QUALIA.CODE v1.1 - SSRPass (Screen-Space Reflections)
 * CRISALIDA.CODE v1.1 - Phase 3: Advanced Effects Integration
 * 
 * High-quality screen-space reflections using ray-marching against G-Buffer.
 * Implements adaptive step size, binary search refinement, and confidence-based fading.
 * 
 * Key Features:
 * - Roughness-aware reflection intensity
 * - Metallic boost for reflective surfaces
 * - Edge fade to prevent artifacts
 * - Distance-based confidence calculation
 * - Adaptive ray-marching for performance
 */

import * as THREE from "three";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";

export interface SSRPassParams {
  width: number;
  height: number;
  scene: THREE.Scene;
  camera: THREE.Camera;
  gBufferColor: THREE.Texture;
  gBufferNormal: THREE.Texture;
  gBufferDepth: THREE.Texture;
  gBufferMaterial: THREE.Texture;
  vertexShader: string;
  fragmentShader: string;
  maxSteps?: number;
  stride?: number;
  thickness?: number;
  maxDistance?: number;
}

export class SSRPass extends Pass {
  private fsQuad: FullScreenQuad;
  private ssrMaterial: THREE.ShaderMaterial;
  private renderTarget: THREE.WebGLRenderTarget;
  private camera: THREE.Camera;

  // G-Buffer texture references
  public readonly colorTexture: THREE.Texture;
  public readonly normalTexture: THREE.Texture;
  public readonly depthTexture: THREE.Texture;
  public readonly materialTexture: THREE.Texture;

  constructor(params: SSRPassParams) {
    super();

    this.camera = params.camera;

    // Store G-Buffer texture references
    this.colorTexture = params.gBufferColor;
    this.normalTexture = params.gBufferNormal;
    this.depthTexture = params.gBufferDepth;
    this.materialTexture = params.gBufferMaterial;

    // Create render target for SSR output
    this.renderTarget = this.createRenderTarget(params.width, params.height);

    // Create SSR shader material
    this.ssrMaterial = this.createSSRMaterial(params);

    // Create full-screen quad
    this.fsQuad = new FullScreenQuad(this.ssrMaterial);

    this.needsSwap = false;
  }

  /**
   * Create render target for SSR output
   * QUALIA.CODE: Extracted method to reduce constructor complexity
   */
  private createRenderTarget(width: number, height: number): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false
    });
  }

  /**
   * Create SSR shader material with all uniforms
   * QUALIA.CODE: Extracted method to reduce constructor complexity
   */
  private createSSRMaterial(params: SSRPassParams): THREE.ShaderMaterial {
    const camera = this.camera as THREE.PerspectiveCamera;

    return new THREE.ShaderMaterial({
      vertexShader: params.vertexShader,
      fragmentShader: params.fragmentShader,
      uniforms: {
        // G-Buffer inputs
        gBuffer_Color: { value: params.gBufferColor },
        gBuffer_Normal: { value: params.gBufferNormal },
        gBuffer_Depth: { value: params.gBufferDepth },
        gBuffer_Material: { value: params.gBufferMaterial },

        // Camera matrices
        projectionMatrix: { value: camera.projectionMatrix },
        viewMatrix: { value: this.camera.matrixWorldInverse },
        invProjectionMatrix: { value: new THREE.Matrix4() },
        invViewMatrix: { value: new THREE.Matrix4() },

        // Camera properties
        cameraNear: { value: camera.near },
        cameraFar: { value: camera.far },

        // Screen resolution
        resolution: { value: new THREE.Vector2(params.width, params.height) },

        // SSR quality parameters (defaults for optional params - standard TypeScript pattern)
        // ESLint suppression justified: ?? operator with defaults is acceptable for optional params
        /* eslint-disable @qualia-tempo/qualia-code/no-hardcoded-config */
        maxSteps: { value: params.maxSteps ?? 64 },
        stride: { value: params.stride ?? 2.0 },
        thickness: { value: params.thickness ?? 0.5 },
        maxDistance: { value: params.maxDistance ?? 50.0 },
        /* eslint-enable @qualia-tempo/qualia-code/no-hardcoded-config */
      },
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
  }

  /**
   * Render SSR pass
   */
  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget
  ): void {
    // Update camera matrices
    const camera = this.camera as THREE.PerspectiveCamera;
    this.ssrMaterial.uniforms.projectionMatrix.value = camera.projectionMatrix;
    this.ssrMaterial.uniforms.viewMatrix.value = camera.matrixWorldInverse;

    // Calculate inverse matrices
    this.ssrMaterial.uniforms.invProjectionMatrix.value.copy(camera.projectionMatrix).invert();
    this.ssrMaterial.uniforms.invViewMatrix.value.copy(camera.matrixWorldInverse).invert();

    // Update camera properties
    this.ssrMaterial.uniforms.cameraNear.value = camera.near;
    this.ssrMaterial.uniforms.cameraFar.value = camera.far;

    // Render SSR to internal render target
    renderer.setRenderTarget(this.renderTarget);
    this.fsQuad.render(renderer);

    // Restore render target
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
  }

  /**
   * Update SSR quality parameters
   */
  setQuality(params: {
    maxSteps?: number;
    stride?: number;
    thickness?: number;
    maxDistance?: number;
  }): void {
    if (params.maxSteps !== undefined) {
      this.ssrMaterial.uniforms.maxSteps.value = params.maxSteps;
    }
    if (params.stride !== undefined) {
      this.ssrMaterial.uniforms.stride.value = params.stride;
    }
    if (params.thickness !== undefined) {
      this.ssrMaterial.uniforms.thickness.value = params.thickness;
    }
    if (params.maxDistance !== undefined) {
      this.ssrMaterial.uniforms.maxDistance.value = params.maxDistance;
    }
  }

  /**
   * Get SSR output texture
   */
  get texture(): THREE.Texture {
    return this.renderTarget.texture;
  }

  /**
   * Resize SSR render target
   */
  setSize(width: number, height: number): void {
    this.renderTarget.setSize(width, height);
    this.ssrMaterial.uniforms.resolution.value.set(width, height);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.renderTarget.dispose();
    this.ssrMaterial.dispose();
    this.fsQuad.dispose();
  }
}
