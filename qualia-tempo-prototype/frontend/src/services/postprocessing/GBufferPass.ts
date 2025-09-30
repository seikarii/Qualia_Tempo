/**
 * QUALIA.CODE v4.2 - GBufferPass
 * Custom pass for generating Geometry Buffer using manual MRT implementation.
 * Generates color, normal, and depth textures in a single render pass for maximum performance.
 * Compatible with Three.js 0.180.0 - uses manual WebGL MRT setup.
 */

import * as THREE from "three";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";

export interface GBufferTargets {
  color: THREE.Texture;
  normal: THREE.Texture;
  depth: THREE.Texture;
  material: THREE.Texture;
}

export class GBufferPass extends Pass {
  private gbuffer: any;
  private gbufferMaterial!: THREE.ShaderMaterial;
  private originalOverrideMaterial: THREE.Material | null = null;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  // MRT textures
  private _colorTexture!: THREE.Texture;
  private _normalTexture!: THREE.Texture;
  private _depthTexture!: THREE.Texture;
  private _materialTexture!: THREE.Texture;

  constructor(scene: THREE.Scene, camera: THREE.Camera, width: number, height: number) {
    super();

    this.scene = scene;
    this.camera = camera;

    // Initialize MRT textures
    this.initializeTextures();

    // Create render target
    this.gbuffer = new (THREE as any).WebGLMultipleRenderTargets(width, height, 4, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false
    });

    // Assign textures to MRT
    this.gbuffer.texture[0] = this._colorTexture;
    this.gbuffer.texture[1] = this._normalTexture;
    this.gbuffer.texture[2] = this._depthTexture;
    this.gbuffer.texture[3] = this._materialTexture;

    // Create and configure G-Buffer shader material
    this.initializeShaderMaterial();

    this.needsSwap = false;
  }

  private initializeTextures(): void {
    this._colorTexture = new THREE.Texture();
    this._colorTexture.name = 'gBuffer-Color';
    this._colorTexture.type = THREE.UnsignedByteType;
    this._colorTexture.format = THREE.RGBAFormat;
    this._colorTexture.minFilter = THREE.LinearFilter;
    this._colorTexture.magFilter = THREE.LinearFilter;
    this._colorTexture.generateMipmaps = false;

    this._normalTexture = new THREE.Texture();
    this._normalTexture.name = 'gBuffer-Normal';
    this._normalTexture.type = THREE.UnsignedByteType;
    this._normalTexture.format = THREE.RGBAFormat;
    this._normalTexture.minFilter = THREE.LinearFilter;
    this._normalTexture.magFilter = THREE.LinearFilter;
    this._normalTexture.generateMipmaps = false;

    this._depthTexture = new THREE.Texture();
    this._depthTexture.name = 'gBuffer-Depth';
    this._depthTexture.type = THREE.FloatType;
    this._depthTexture.format = THREE.RGBAFormat;
    this._depthTexture.minFilter = THREE.LinearFilter;
    this._depthTexture.magFilter = THREE.LinearFilter;
    this._depthTexture.generateMipmaps = false;

    this._materialTexture = new THREE.Texture();
    this._materialTexture.name = 'gBuffer-Material';
    this._materialTexture.type = THREE.FloatType;
    this._materialTexture.format = THREE.RGBAFormat;
    this._materialTexture.minFilter = THREE.LinearFilter;
    this._materialTexture.magFilter = THREE.LinearFilter;
    this._materialTexture.generateMipmaps = false;
  }

  private initializeShaderMaterial(): void {
    this.gbufferMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vViewPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        #extension GL_EXT_draw_buffers : require

        uniform sampler2D tDiffuse;
        uniform sampler2D tNormal;
        uniform sampler2D tDepth;

        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vViewPosition;

        void main() {
          // Output 0: Diffuse color
          vec4 diffuseColor = texture2D(tDiffuse, vUv);
          gl_FragData[0] = diffuseColor;

          // Output 1: Normal in view space (normalized to 0-1 range)
          vec3 normal = normalize(vNormal) * 0.5 + 0.5;
          gl_FragData[1] = vec4(normal, 1.0);

          // Output 2: Linear depth
          float depth = length(vViewPosition) / 1000.0; // Normalize depth
          gl_FragData[2] = vec4(vec3(depth), 1.0);

          // Output 3: Material properties (placeholder)
          gl_FragData[3] = vec4(0.5, 0.5, 0.5, 1.0);
        }
      `,
      uniforms: {
        tDiffuse: { value: null },
        tNormal: { value: null },
        tDepth: { value: null }
      }
    });
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, _readBuffer: THREE.WebGLRenderTarget): void {
    // Store original override material
    this.originalOverrideMaterial = this.scene.overrideMaterial;

    // Override all materials with our G-Buffer material
    this.scene.overrideMaterial = this.gbufferMaterial;

    // Set render target to MRT
    renderer.setRenderTarget(this.gbuffer);

    // Render the scene once to all G-Buffer targets simultaneously
    renderer.render(this.scene, this.camera);

    // Restore original override material
    this.scene.overrideMaterial = this.originalOverrideMaterial;

    // Reset render target
    renderer.setRenderTarget(null);
  }

  setSize(width: number, height: number): void {
    this.gbuffer.setSize(width, height);
  }

  dispose(): void {
    this.gbuffer.dispose();
    this.gbufferMaterial.dispose();
    this._colorTexture.dispose();
    this._normalTexture.dispose();
    this._depthTexture.dispose();
    this._materialTexture.dispose();
  }

  // Getters for accessing the G-Buffer textures
  get colorTexture(): THREE.Texture {
    return this.gbuffer.texture[0];
  }

  get normalTexture(): THREE.Texture {
    return this.gbuffer.texture[1];
  }

  get depthTexture(): THREE.Texture {
    return this.gbuffer.texture[2];
  }

  get materialTexture(): THREE.Texture {
    return this.gbuffer.texture[3];
  }

  get targets(): GBufferTargets {
    return {
      color: this.gbuffer.texture[0],
      normal: this.gbuffer.texture[1],
      depth: this.gbuffer.texture[2],
      material: this.gbuffer.texture[3]
    };
  }
}