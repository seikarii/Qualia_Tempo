/**
 * QUALIA.CODE v1.1 - VelocityPass Implementation
 * Purpose: Generate per-pixel motion vectors for temporal effects
 * Breaking Change: Requires G-Buffer expansion to 5 render targets
 */

import * as THREE from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { VelocityPassConfig, PreviousFrameMatrices } from '../contracts/IVelocityPass.contracts';
import type { IVelocityPass } from './interfaces/IVelocityPass';

export class VelocityPass extends Pass implements IVelocityPass {
  private readonly config: VelocityPassConfig;
  private readonly velocityMaterial: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly camera: THREE.OrthographicCamera;
  private readonly scene: THREE.Scene;
  
  // Previous frame matrices for velocity calculation
  private previousViewMatrix: THREE.Matrix4;
  private previousProjectionMatrix: THREE.Matrix4;

  constructor(config: VelocityPassConfig, _width: number, _height: number) {
    super();
    
    this.config = config;
    
    // Initialize previous frame matrices (identity on first frame)
    this.previousViewMatrix = new THREE.Matrix4();
    this.previousProjectionMatrix = new THREE.Matrix4();
    
    // Setup rendering infrastructure
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    
    // Create velocity shader material
    this.velocityMaterial = this.createVelocityMaterial();
  }

  private createVelocityMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        prevViewMatrix: { value: this.previousViewMatrix },
        prevProjectionMatrix: { value: this.previousProjectionMatrix },
        velocityScale: { value: this.config.velocityScale },
        isDebugMode: { value: this.config.debugMode }
      },
      vertexShader: this.getVelocityVertexShader(),
      fragmentShader: this.getVelocityFragmentShader()
    });
  }

  private getVelocityVertexShader(): string {
    return `
      out vec2 vUv; out vec3 vWorldPosition; out vec2 vVelocity;
      uniform mat4 prevViewMatrix; uniform mat4 prevProjectionMatrix;
      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vec4 clipPosition = projectionMatrix * viewMatrix * worldPosition;
        vec4 prevClipPosition = prevProjectionMatrix * prevViewMatrix * worldPosition;
        vec2 currentNDC = clipPosition.xy / clipPosition.w;
        vec2 prevNDC = prevClipPosition.xy / prevClipPosition.w;
        vVelocity = currentNDC - prevNDC;
        vWorldPosition = worldPosition.xyz;
        gl_Position = clipPosition;
      }
    `;
  }

  private getVelocityFragmentShader(): string {
    return `
      uniform float velocityScale; uniform bool isDebugMode;
      in vec2 vUv; in vec2 vVelocity; in vec3 vWorldPosition;
      void main() {
        vec2 velocity = vVelocity * velocityScale;
        if (isDebugMode) {
          float speed = length(velocity);
          gl_FragColor = vec4(abs(velocity.x), abs(velocity.y), speed, 1.0);
        } else {
          gl_FragColor = vec4(velocity, length(velocity), 1.0);
        }
      }
    `;
  }

  // eslint-disable-next-line max-params -- Three.js Pass base class signature requires 5 parameters
  public render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    _readBuffer: THREE.WebGLRenderTarget,
    _deltaTime?: number,
    _maskActive?: boolean
  ): void {
    if (!this.config.enabled) {
      // Pass-through if disabled - render black velocity buffer
      const black = new THREE.Color(0, 0, 0);
      renderer.setRenderTarget(writeBuffer);
      renderer.setClearColor(black, 1.0);
      renderer.clear();
      return;
    }
    
    // Update uniforms with current matrices
    this.velocityMaterial.uniforms.prevViewMatrix.value = this.previousViewMatrix;
    this.velocityMaterial.uniforms.prevProjectionMatrix.value = this.previousProjectionMatrix;
    this.velocityMaterial.uniforms.velocityScale.value = this.config.velocityScale;
    this.velocityMaterial.uniforms.isDebugMode.value = this.config.debugMode;
    
    // Render velocity buffer
    this.quad.material = this.velocityMaterial;
    renderer.setRenderTarget(writeBuffer);
    renderer.render(this.scene, this.camera);
  }

  public updatePreviousMatrices(
    viewMatrix: THREE.Matrix4,
    projectionMatrix: THREE.Matrix4
  ): void {
    this.previousViewMatrix.copy(viewMatrix);
    this.previousProjectionMatrix.copy(projectionMatrix);
  }

  public getPreviousMatrices(): PreviousFrameMatrices {
    return {
      viewMatrix: new Float32Array(this.previousViewMatrix.elements),
      projectionMatrix: new Float32Array(this.previousProjectionMatrix.elements)
    };
  }

  public setDebugMode(enabled: boolean): void {
    this.velocityMaterial.uniforms.isDebugMode.value = enabled;
  }

  public setSize(_width: number, _height: number): void {
    // VelocityPass operates in NDC space - size independent
    // Method preserved for Three.js Pass interface compatibility
  }

  public dispose(): void {
    this.velocityMaterial.dispose();
    this.quad.geometry.dispose();
  }
}
