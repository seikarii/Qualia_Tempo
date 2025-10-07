/**
 * QUALIA.CODE v1.1 - ReactionDiffusionService
 * VISUALS.GOLD.CODE Phase 3: El Mundo Viviente (The Living World)
 * 
 * PURPOSE: Implement Gray-Scott reaction-diffusion simulation for living ground
 * ARCHITECTURE: Injectable service with Direct Configuration Injection
 * ALGORITHM: Gray-Scott model with ping-pong render targets
 * 
 * MISSION: Transform the combat arena floor into an organic, breathing canvas
 * that reflects the chaotic beauty of the battle through Turing patterns.
 * 
 * REFERENCE:
 * - "Complex Patterns in a Simple System" - John E. Pearson (1993)
 * - docs/VISUALS.GOLD.CODE.md Phase 3
 */

import { injectable, inject } from 'inversify';
import * as THREE from 'three';
import { TYPES } from './inversify.types';
import type { IReactionDiffusionService } from './interfaces/IReactionDiffusionService';
import type { ILogger } from './interfaces/ILogger';
import type { 
  ReactionDiffusionServiceConfig,
  ReactionDiffusionServiceParams 
} from './contracts/IReactionDiffusionService.contracts';
import { logMethod, catchError } from '../utils/decorators';

/**
 * ReactionDiffusionService
 * 
 * ARCHITECTURE NOTES:
 * - Uses ping-pong rendering: Two render targets swap each frame
 * - Compute shader runs on GPU for real-time simulation
 * - Ground plane mesh receives the simulation texture
 * - QualiaState parameters dynamically modulate simulation behavior
 * 
 * PERFORMANCE:
 * - GPU-accelerated via WebGL fragment shaders
 * - Configurable resolution (256-1024) for quality/performance balance
 * - Ping-pong targets minimize memory bandwidth
 */
@injectable()
export class ReactionDiffusionService implements IReactionDiffusionService {
  private readonly config: ReactionDiffusionServiceConfig;
  private readonly logger: ILogger;
  
  // Three.js resources
  private renderer: THREE.WebGLRenderer | null = null;
  private renderTargetA: THREE.WebGLRenderTarget | null = null;
  private renderTargetB: THREE.WebGLRenderTarget | null = null;
  private currentTarget: 'A' | 'B' = 'A'; // Ping-pong state
  
  // Simulation scene (orthographic for full-screen quad)
  private simulationScene: THREE.Scene | null = null;
  private simulationCamera: THREE.OrthographicCamera | null = null;
  private simulationMesh: THREE.Mesh | null = null;
  private simulationMaterial: THREE.ShaderMaterial | null = null;
  
  // Display (ground plane in main scene)
  private groundMesh: THREE.Mesh | null = null;
  private groundMaterial: THREE.ShaderMaterial | null = null;
  
  // State
  private isEnabled: boolean = false;
  private isInitialized: boolean = false;
  private time: number = 0;
  
  constructor(
    @inject(TYPES.ReactionDiffusionServiceParams) params: ReactionDiffusionServiceParams
  ) {
    this.config = params.config;
    this.logger = params.logger;
    
    this.isEnabled = this.config.enabled;
    this.logger.info('[ReactionDiffusionService] Service instantiated', {
      enabled: this.isEnabled,
      resolution: this.config.simulation.resolution,
      groundSize: this.config.groundPlane.size
    });
  }
  
  /**
   * Initialize the reaction-diffusion simulation
   * Creates render targets, materials, and ground mesh
   */
  @logMethod
  @catchError
  public initialize(renderer: THREE.WebGLRenderer): void {
    if (this.isInitialized) {
      this.logger.warn('[ReactionDiffusionService] Already initialized');
      return;
    }
    
    if (!this.config.enabled) {
      this.logger.info('[ReactionDiffusionService] Service disabled in config');
      return;
    }
    
    this.renderer = renderer;
    
    // Create ping-pong render targets
    const resolution = this.config.simulation.resolution;
    const targetOptions: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      stencilBuffer: false,
      depthBuffer: false
    };
    
    this.renderTargetA = new THREE.WebGLRenderTarget(resolution, resolution, targetOptions);
    this.renderTargetB = new THREE.WebGLRenderTarget(resolution, resolution, targetOptions);
    
    this.logger.info('[ReactionDiffusionService] Render targets created', {
      resolution,
      format: 'RGBA Float'
    });
    
    // Initialize with random seed pattern
    this.initializeSeedPattern();
    
    // Create simulation scene (for compute pass)
    this.createSimulationScene();
    
    // Create ground plane (for display in main scene)
    this.createGroundPlane();
    
    this.isInitialized = true;
    this.logger.info('[ReactionDiffusionService] Initialization complete');
  }
  
  /**
   * Initialize render targets with random seed pattern
   * Creates interesting starting conditions for the simulation
   */
  @catchError
  private initializeSeedPattern(): void {
    if (!this.renderTargetA || !this.renderer) return;
    
    const resolution = this.config.simulation.resolution;
    const data = this.createInitialStateData(resolution);
    const texture = this.createTextureFromData(data, resolution);
    this.copyTextureToRenderTargets(texture);
    
    texture.dispose();
    
    this.logger.debug('[ReactionDiffusionService] Seed pattern initialized', {
      resolution
    });
  }

  /**
   * Create initial state data with chemical A=1.0 and seeded chemical B
   */
  private createInitialStateData(resolution: number): Float32Array {
    const size = resolution * resolution;
    const data = new Float32Array(size * 4);
    
    // Fill with initial state (Chemical A = 1.0, Chemical B = 0.0)
    for (let i = 0; i < size; i++) {
      data[i * 4 + 0] = 1.0; // Chemical A
      data[i * 4 + 1] = 0.0; // Chemical B
      data[i * 4 + 2] = 0.0; // Unused
      data[i * 4 + 3] = 1.0; // Alpha
    }
    
    // Add random seed points for chemical B (catalyst)
    this.addSeedPoints(data, resolution);
    
    return data;
  }

  /**
   * Add circular seed points for chemical B catalyst
   */
  private addSeedPoints(data: Float32Array, resolution: number): void {
    const seedCount = Math.floor(resolution / 4);
    const seedRadius = 3;
    
    for (let i = 0; i < seedCount; i++) {
      const x = Math.floor(Math.random() * resolution);
      const y = Math.floor(Math.random() * resolution);
      
      for (let dy = -seedRadius; dy <= seedRadius; dy++) {
        for (let dx = -seedRadius; dx <= seedRadius; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= seedRadius) {
            const px = Math.max(0, Math.min(resolution - 1, x + dx));
            const py = Math.max(0, Math.min(resolution - 1, y + dy));
            const idx = (py * resolution + px) * 4;
            data[idx + 1] = 1.0; // Set chemical B
          }
        }
      }
    }
  }

  /**
   * Create DataTexture from Float32Array
   */
  private createTextureFromData(data: Float32Array, resolution: number): THREE.DataTexture {
    const texture = new THREE.DataTexture(
      data,
      resolution,
      resolution,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Copy texture to both render targets using temporary scene
   */
  private copyTextureToRenderTargets(texture: THREE.DataTexture): void {
    if (!this.renderer || !this.renderTargetA || !this.renderTargetB) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    this.renderer.setRenderTarget(this.renderTargetA);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(this.renderTargetB);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    
    geometry.dispose();
    material.dispose();
  }
  
  /**
   * Create simulation scene with compute shader
   * This runs the Gray-Scott algorithm
   */
  @catchError
  private createSimulationScene(): void {
    this.simulationScene = new THREE.Scene();
    this.simulationCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Create full-screen quad geometry
    const geometry = new THREE.PlaneGeometry(2, 2);
    
    // Create compute shader material
    this.simulationMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_state_texture: { value: null },
        u_resolution: { value: new THREE.Vector2(
          this.config.simulation.resolution,
          this.config.simulation.resolution
        )},
        u_delta_time: { value: 0.0 },
        u_chaos: { value: 0.5 },
        u_flow_direction: { value: new THREE.Vector2(0, 0) },
        u_recovery: { value: 0.5 },
        u_feed_rate: { value: this.config.grayScott.feedRate },
        u_diffusion_a: { value: this.config.grayScott.diffusionA },
        u_diffusion_b: { value: this.config.grayScott.diffusionB }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: this.getComputeShaderCode(),
      depthTest: false,
      depthWrite: false
    });
    
    this.simulationMesh = new THREE.Mesh(geometry, this.simulationMaterial);
    this.simulationScene.add(this.simulationMesh);
    
    this.logger.info('[ReactionDiffusionService] Simulation scene created');
  }
  
  /**
   * Get compute shader code
   * Returns the fragment shader that runs the simulation
   */
  private getComputeShaderCode(): string {
    // NOTE: In production, this should be loaded from the shader file
    // For now, we inline a simplified version
    return `
      precision highp float;
      
      uniform sampler2D u_state_texture;
      uniform vec2 u_resolution;
      uniform float u_delta_time;
      uniform float u_chaos;
      uniform vec2 u_flow_direction;
      uniform float u_recovery;
      uniform float u_feed_rate;
      uniform float u_diffusion_a;
      uniform float u_diffusion_b;
      
      varying vec2 vUv;
      
      vec2 laplacian(sampler2D tex, vec2 uv, vec2 texelSize) {
        vec2 sum = vec2(0.0);
        sum += texture2D(tex, uv).xy * -1.0;
        sum += texture2D(tex, uv + vec2(-texelSize.x, 0.0)).xy * 0.2;
        sum += texture2D(tex, uv + vec2(texelSize.x, 0.0)).xy * 0.2;
        sum += texture2D(tex, uv + vec2(0.0, -texelSize.y)).xy * 0.2;
        sum += texture2D(tex, uv + vec2(0.0, texelSize.y)).xy * 0.2;
        sum += texture2D(tex, uv + vec2(-texelSize.x, -texelSize.y)).xy * 0.05;
        sum += texture2D(tex, uv + vec2(texelSize.x, -texelSize.y)).xy * 0.05;
        sum += texture2D(tex, uv + vec2(-texelSize.x, texelSize.y)).xy * 0.05;
        sum += texture2D(tex, uv + vec2(texelSize.x, texelSize.y)).xy * 0.05;
        return sum;
      }
      
      void main() {
        vec2 texelSize = 1.0 / u_resolution;
        vec2 state = texture2D(u_state_texture, vUv).xy;
        float a = state.x;
        float b = state.y;
        
        vec2 lap = laplacian(u_state_texture, vUv, texelSize);
        
        float chaosModifier = mix(0.8, 1.2, u_chaos);
        float Da = u_diffusion_a * chaosModifier;
        float Db = u_diffusion_b * chaosModifier;
        
        float killRate = mix(0.055, 0.065, u_recovery);
        float reaction = a * b * b;
        
        float dA = Da * lap.x - reaction + u_feed_rate * (1.0 - a);
        float dB = Db * lap.y + reaction - (killRate + u_feed_rate) * b;
        
        if (length(u_flow_direction) > 0.01) {
          vec2 flowUV = vUv - u_flow_direction * texelSize * 0.5;
          vec2 flowedState = texture2D(u_state_texture, flowUV).xy;
          float flowStrength = length(u_flow_direction) * 0.3;
          a = mix(a, flowedState.x, flowStrength);
          b = mix(b, flowedState.y, flowStrength);
        }
        
        float newA = clamp(a + dA * u_delta_time, 0.0, 1.0);
        float newB = clamp(b + dB * u_delta_time, 0.0, 1.0);
        
        gl_FragColor = vec4(newA, newB, 0.0, 1.0);
      }
    `;
  }
  
  /**
   * Create ground plane mesh with display shader
   * This mesh is added to the main scene
   */
  @catchError
  private createGroundPlane(): void {
    const size = this.config.groundPlane.size;
    const segments = this.config.groundPlane.segments;
    
    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2); // Make horizontal
    
    // Create display shader material
    this.groundMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_simulation_texture: { value: null },
        u_time: { value: 0 },
        u_intensity: { value: 0.5 },
        u_aggression: { value: 0.5 },
        u_transcendence: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: this.getDisplayShaderCode(),
      transparent: true,
      side: THREE.DoubleSide
    });
    
    // Create mesh
    this.groundMesh = new THREE.Mesh(geometry, this.groundMaterial);
    this.groundMesh.position.y = this.config.groundPlane.height;
    this.groundMesh.receiveShadow = true;
    
    this.logger.info('[ReactionDiffusionService] Ground plane created', {
      size,
      segments,
      height: this.config.groundPlane.height
    });
  }
  
  /**
   * Get display shader code
   * Returns the fragment shader that visualizes the simulation
   */
  private getDisplayShaderCode(): string {
    return `
      precision highp float;
      
      uniform sampler2D u_simulation_texture;
      uniform float u_time;
      uniform float u_intensity;
      uniform float u_aggression;
      uniform float u_transcendence;
      
      varying vec2 vUv;
      
      vec3 getPatternColor(float concentration, float aggression, float intensity) {
        vec3 coolColor = vec3(0.1, 0.4, 0.8);
        vec3 warmColor = vec3(0.9, 0.3, 0.2);
        vec3 baseColor = mix(coolColor, warmColor, aggression);
        vec3 color = baseColor * concentration;
        float saturation = mix(0.5, 1.5, intensity);
        color *= saturation;
        return color;
      }
      
      void main() {
        vec4 state = texture2D(u_simulation_texture, vUv);
        float chemicalB = state.y;
        float concentration = chemicalB;
        
        vec3 patternColor = getPatternColor(concentration, u_aggression, u_intensity);
        
        float pulse = sin(u_time * 2.0 + concentration * 10.0) * 0.1 + 0.9;
        patternColor *= pulse;
        
        if (u_transcendence > 0.5) {
          vec3 goldenGlow = vec3(1.0, 0.9, 0.5);
          float glowStrength = (u_transcendence - 0.5) * 2.0;
          patternColor = mix(patternColor, patternColor * goldenGlow, glowStrength * 0.6);
        }
        
        float emissive = concentration * 0.5;
        patternColor += vec3(emissive);
        
        gl_FragColor = vec4(patternColor, 0.9);
      }
    `;
  }
  
  /**
   * Update simulation one step
   * VISUALS.GOLD.CODE: Maps QualiaState to simulation parameters
   */
  @logMethod
  @catchError
  public update(deltaTime: number, qualiaState: {
    chaos: number;
    flow: number;
    recovery: number;
    intensity: number;
    aggression: number;
    transcendence: number;
  }): void {
    if (!this.isEnabled || !this.isInitialized || !this.renderer) return;
    if (!this.simulationScene || !this.simulationCamera || !this.simulationMaterial) return;
    
    this.time += deltaTime;
    const scaledDeltaTime = deltaTime * this.config.simulation.deltaTimeScale;
    
    this.updateSimulationUniforms(scaledDeltaTime, qualiaState);
    this.runSimulationSteps();
    this.updateGroundMaterialUniforms(qualiaState);
  }

  /**
   * Update simulation material uniforms from QualiaState
   */
  private updateSimulationUniforms(deltaTime: number, qualiaState: {
    chaos: number;
    flow: number;
    recovery: number;
  }): void {
    if (!this.simulationMaterial) return;
    
    this.simulationMaterial.uniforms.u_chaos.value = qualiaState.chaos;
    this.simulationMaterial.uniforms.u_flow_direction.value.set(
      Math.cos(qualiaState.flow * Math.PI * 2) * qualiaState.flow,
      Math.sin(qualiaState.flow * Math.PI * 2) * qualiaState.flow
    );
    this.simulationMaterial.uniforms.u_recovery.value = qualiaState.recovery;
    this.simulationMaterial.uniforms.u_delta_time.value = deltaTime;
  }

  /**
   * Run configured number of simulation steps with ping-pong rendering
   */
  private runSimulationSteps(): void {
    if (!this.canRunSimulation()) return;
    
    const steps = this.config.simulation.updateRate;
    for (let i = 0; i < steps; i++) {
      this.executeSimulationStep();
    }
    
    this.renderer!.setRenderTarget(null);
  }

  /**
   * Check if all resources are available for simulation
   */
  private canRunSimulation(): boolean {
    return !!(
      this.renderer &&
      this.simulationScene &&
      this.simulationCamera &&
      this.simulationMaterial &&
      this.renderTargetA &&
      this.renderTargetB
    );
  }

  /**
   * Execute single simulation step with ping-pong rendering
   */
  private executeSimulationStep(): void {
    const readTarget = this.currentTarget === 'A' ? this.renderTargetA! : this.renderTargetB!;
    const writeTarget = this.currentTarget === 'A' ? this.renderTargetB! : this.renderTargetA!;
    
    this.simulationMaterial!.uniforms.u_state_texture.value = readTarget.texture;
    this.renderer!.setRenderTarget(writeTarget);
    this.renderer!.render(this.simulationScene!, this.simulationCamera!);
    
    this.currentTarget = this.currentTarget === 'A' ? 'B' : 'A';
  }

  /**
   * Update ground plane display material uniforms
   */
  private updateGroundMaterialUniforms(qualiaState: {
    intensity: number;
    aggression: number;
    transcendence: number;
  }): void {
    if (!this.groundMaterial || !this.renderTargetA || !this.renderTargetB) return;
    
    const currentTexture = this.currentTarget === 'A' 
      ? this.renderTargetA.texture 
      : this.renderTargetB.texture;
    
    this.groundMaterial.uniforms.u_simulation_texture.value = currentTexture;
    this.groundMaterial.uniforms.u_time.value = this.time;
    this.groundMaterial.uniforms.u_intensity.value = qualiaState.intensity;
    this.groundMaterial.uniforms.u_aggression.value = qualiaState.aggression;
    this.groundMaterial.uniforms.u_transcendence.value = qualiaState.transcendence;
  }
  
  /**
   * Get the ground mesh to add to main scene
   */
  @logMethod
  public getGroundMesh(): THREE.Mesh | null {
    return this.groundMesh;
  }
  
  /**
   * Get the current simulation texture
   */
  @logMethod
  public getSimulationTexture(): THREE.Texture | null {
    if (!this.renderTargetA || !this.renderTargetB) return null;
    
    const currentTexture = this.currentTarget === 'A'
      ? this.renderTargetA.texture
      : this.renderTargetB.texture;
    
    return currentTexture;
  }
  
  /**
   * Reset simulation to initial state
   */
  @logMethod
  @catchError
  public reset(): void {
    if (!this.isInitialized) return;
    
    this.logger.info('[ReactionDiffusionService] Resetting simulation');
    this.initializeSeedPattern();
    this.time = 0;
  }
  
  /**
   * Enable/disable simulation
   */
  @logMethod
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.logger.info('[ReactionDiffusionService] Enabled state changed', { enabled });
  }
  
  /**
   * Dispose all resources
   */
  @logMethod
  @catchError
  public dispose(): void {
    this.logger.info('[ReactionDiffusionService] Disposing resources');
    
    // Dispose render targets
    if (this.renderTargetA) {
      this.renderTargetA.dispose();
      this.renderTargetA = null;
    }
    
    if (this.renderTargetB) {
      this.renderTargetB.dispose();
      this.renderTargetB = null;
    }
    
    // Dispose materials
    if (this.simulationMaterial) {
      this.simulationMaterial.dispose();
      this.simulationMaterial = null;
    }
    
    if (this.groundMaterial) {
      this.groundMaterial.dispose();
      this.groundMaterial = null;
    }
    
    // Dispose geometries
    if (this.simulationMesh) {
      this.simulationMesh.geometry.dispose();
      this.simulationMesh = null;
    }
    
    if (this.groundMesh) {
      this.groundMesh.geometry.dispose();
      this.groundMesh = null;
    }
    
    // Clear references
    this.simulationScene = null;
    this.simulationCamera = null;
    this.renderer = null;
    this.isInitialized = false;
    
    this.logger.info('[ReactionDiffusionService] Disposal complete');
  }
}
