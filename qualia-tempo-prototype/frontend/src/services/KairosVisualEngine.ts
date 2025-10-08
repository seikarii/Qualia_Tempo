/**
 * QUALIA.CODE v1.1 - Kairos Visual Engine
 * Three.js rendering orchestration service
 * 
 * ARCHITECTURE: IBaseService lifecycle with @OnEvent handlers
 * REFERENCE: docs/VISUALS.GOLD.CODE.md
 * 
 * MISSION: Orchestrate all visual rendering for Qualia Tempo using Three.js
 * RESPONSIBILITY: Transform game state into visual experiences (Kairos moment)
 * 
 * PHASE 5.2: Atmospheric Effects (Bloom + God Rays) - IN PROGRESS
 */

import { injectable, inject } from 'inversify';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { TYPES } from './inversify.types';
import type { IKairosVisualEngine, RenderStats, SceneState } from './interfaces/IKairosVisualEngine';
import type { IBaseService } from './interfaces/IBaseService';
import type { ILogger } from './interfaces/ILogger';
import type { IEventBus } from './interfaces/IEventBus';
import type { IGameStateStore } from './interfaces/IGameStateStore';
import type { IParticleSystemService } from './interfaces/IParticleSystemService';
import type { IReactionDiffusionService } from './interfaces/IReactionDiffusionService';
import type { KairosVisualEngineParams, KairosVisualEngineConfig } from './contracts/IKairosVisualEngine.contracts';
import { OnEvent, initializeEventSubscriptions, cleanupEventSubscriptions } from '../utils/decorators';
import type { GameStateChangedEvent, QualiaStateCalculatedEvent } from './contracts/events.contracts';

/**
 * God Rays Shader
 * VISUALS.GOLD.CODE Phase 1: Volumetric lighting with QualiaState mapping
 */
const GodRaysShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'tDepth': { value: null },
    'uResolution': { value: new THREE.Vector2(1, 1) },
    'uLightPosition': { value: new THREE.Vector3(0.5, 0.5, 0.0) },
    // QualiaState driven uniforms
    'uPrecision': { value: 0.5 },
    'uAggression': { value: 0.5 },
    'uTranscendence': { value: 0.0 },
    // Effect parameters
    'uDecay': { value: 0.95 },
    'uWeight': { value: 0.5 },
    'uDensity': { value: 0.8 },
    'uExposure': { value: 0.6 },
    'uSamples': { value: 100 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform vec2 uResolution;
    uniform vec3 uLightPosition;
    uniform float uPrecision;
    uniform float uAggression;
    uniform float uTranscendence;
    uniform float uDecay;
    uniform float uWeight;
    uniform float uDensity;
    uniform float uExposure;
    uniform int uSamples;
    
    varying vec2 vUv;
    
    vec3 getAggressionTint(float aggression) {
      vec3 coolColor = vec3(0.6, 0.8, 1.0);
      vec3 warmColor = vec3(1.0, 0.7, 0.4);
      return mix(coolColor, warmColor, aggression);
    }
    
    void main() {
      vec4 sceneColor = texture2D(tDiffuse, vUv);
      vec2 deltaTextCoord = vUv - uLightPosition.xy;
      float sharpness = mix(0.3, 1.0, uPrecision);
      deltaTextCoord *= sharpness;
      deltaTextCoord *= (1.0 / float(uSamples)) * uDensity;
      vec2 textCoo = vUv;
      float illuminationDecay = 1.0;
      vec3 godRayColor = vec3(0.0);
      
      for(int i = 0; i < 100; i++) {
        if(i >= uSamples) break;
        textCoo -= deltaTextCoord;
        vec3 sample = texture2D(tDiffuse, textCoo).rgb;
        sample *= illuminationDecay * uWeight;
        godRayColor += sample;
        illuminationDecay *= uDecay;
      }
      
      godRayColor *= uExposure;
      vec3 tintColor = getAggressionTint(uAggression);
      godRayColor *= tintColor;
      
      if(uTranscendence > 0.9) {
        vec3 goldenTint = vec3(1.0, 0.9, 0.5);
        float ultimateStrength = (uTranscendence - 0.9) * 10.0;
        godRayColor = mix(godRayColor, godRayColor * goldenTint, ultimateStrength * 0.5);
        godRayColor *= (1.0 + ultimateStrength);
      }
      
      vec3 finalColor = sceneColor.rgb + godRayColor;
      gl_FragColor = vec4(finalColor, sceneColor.a);
    }
  `
};

/**
 * KairosVisualEngine - Main Three.js Rendering Service
 * 
 * ARCHITECTURE NOTES:
 * - Implements IBaseService for lifecycle management
 * - Uses Direct Configuration Injection (QUALIA.CODE v1.1)
 * - Subscribes to game state events via @OnEvent decorators
 * - Manages Three.js Scene, Camera, Renderer
 * - Orchestrates EffectComposer for post-processing (PHASE 5.2)
 * - Provides foundation for 4 visual phases (VISUALS.GOLD.CODE)
 */
@injectable()
export class KairosVisualEngine implements IKairosVisualEngine, IBaseService {
  private readonly config: KairosVisualEngineConfig;
  private readonly logger: ILogger;
  private readonly eventBus: IEventBus;
  private readonly gameStateStore: IGameStateStore;
  private readonly particleSystemService: IParticleSystemService;
  private readonly reactionDiffusionService: IReactionDiffusionService;
  private readonly viewLogicService: any; // IViewLogicService - PHASE 5.6
  private readonly performanceService: any; // IPerformanceService - PHASE 5.6
  
  // Three.js core objects
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  
  // Post-processing (PHASE 5.2)
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private godRaysPass: ShaderPass | null = null;
  
  // Rendering state
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsHistory: number[] = [];
  
  // Scene objects
  private lights: THREE.Light[] = [];
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;
  
  // PHASE 5.5: SDF Avatar meshes
  private playerAvatarMesh: THREE.Mesh | null = null;
  private bossAvatarMesh: THREE.Mesh | null = null;
  private playerShaderMaterial: THREE.ShaderMaterial | null = null;
  private bossShaderMaterial: THREE.ShaderMaterial | null = null;
  
  // Performance tracking
  private drawCalls: number = 0;
  private triangles: number = 0;
  
  // Current QualiaState (for shader uniform updates)
  private currentQualiaState: {
    intensity: number;
    transcendence: number;
    precision: number;
    aggression: number;
    chaos: number;
    flow: number;
    recovery: number;
  } = {
    intensity: 0.5,
    transcendence: 0.0,
    precision: 0.5,
    aggression: 0.5,
    chaos: 0.5,
    flow: 0.5,
    recovery: 0.5
  };
  
  constructor(
    @inject(TYPES.KairosVisualEngineParams) params: KairosVisualEngineParams
  ) {
    this.config = params.config;
    this.logger = params.logger;
    this.eventBus = params.eventBus;
    this.gameStateStore = params.gameStateStore;
    this.particleSystemService = params.particleSystemService;
    this.reactionDiffusionService = params.reactionDiffusionService;
    this.viewLogicService = params.viewLogicService; // PHASE 5.6
    this.performanceService = params.performanceService; // PHASE 5.6
    
    this.logger.info('[KairosVisualEngine] Service instantiated');
  }
  
  /**
   * IBaseService lifecycle - Initialize service
   * Sets up event subscriptions via @OnEvent decorator
   */
  public initialize(): void {
    this.logger.info('[KairosVisualEngine] Initializing...');
    initializeEventSubscriptions(this);
    this.logger.info('[KairosVisualEngine] Initialized successfully');
  }
  
  /**
   * IBaseService lifecycle - Cleanup service
   * Removes event subscriptions and disposes Three.js resources
   */
  public cleanup(): void {
    this.logger.info('[KairosVisualEngine] Cleaning up...');
    this.stop();
    this.dispose();
    cleanupEventSubscriptions(this);
    this.logger.info('[KairosVisualEngine] Cleanup complete');
  }
  
  /**
   * Initialize Three.js renderer and scene with canvas
   * PHASE 5.1: Foundation setup
   * PHASE 5.2: EffectComposer and atmospheric effects
   * 
   * NOTE: This is separate from IBaseService.initialize() which sets up event subscriptions
   */
  public async initializeRenderer(canvas: HTMLCanvasElement): Promise<void> {
    this.logger.info('[KairosVisualEngine] Initializing Three.js with canvas', { 
      width: canvas.width, 
      height: canvas.height 
    });
    
    this.canvas = canvas;
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.config.render.antialias,
      alpha: true,
      powerPreference: 'high-performance'
    });
    
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, this.config.render.pixelRatio)
    );
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    
    // Configure tone mapping
    this.renderer.toneMapping = this.getToneMappingConstant(this.config.render.toneMapping);
    this.renderer.toneMappingExposure = this.config.render.toneMappingExposure;
    
    // Configure shadows
    if (this.config.render.shadowsEnabled) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); // Black background
    
    // Create camera
    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(
      this.config.camera.fov,
      aspect,
      this.config.camera.near,
      this.config.camera.far
    );
    
    this.camera.position.set(
      this.config.camera.position.x,
      this.config.camera.position.y,
      this.config.camera.position.z
    );
    
    this.camera.lookAt(
      this.config.camera.lookAt.x,
      this.config.camera.lookAt.y,
      this.config.camera.lookAt.z
    );
    
    // Setup lighting
    this.setupLighting();
    
    // PHASE 5.2: Setup post-processing pipeline
    this.setupPostProcessing();
    
    // PHASE 5.3: Setup particle system (FFT-reactive)
    this.setupParticleSystem();
    
    // PHASE 5.4: Setup reaction-diffusion ground (VISUALS.GOLD.CODE Phase 3)
    this.setupReactionDiffusionGround();
    
    // PHASE 5.5: Setup SDF avatars (VISUALS.GOLD.CODE Phase 4)
    await this.setupSdfAvatars();
    
    // Log initialization complete
    this.logger.info('[KairosVisualEngine] Three.js initialized successfully', {
      renderer: 'WebGLRenderer',
      toneMapping: this.config.render.toneMapping,
      antialias: this.config.render.antialias,
      shadows: this.config.render.shadowsEnabled,
      postProcessing: true,
      bloomEnabled: this.config.effects.bloomEnabled,
      godRaysEnabled: this.config.effects.godRaysEnabled,
      particleSystemEnabled: this.config.effects.fftReactiveParticlesEnabled,
      sdfAvatarsEnabled: this.config.effects.sdfAvatarsEnabled
    });
  }
  
  /**
   * Setup scene lighting
   */
  private setupLighting(): void {
    if (!this.scene) return;
    
    // Ambient light for base illumination
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);
    this.lights.push(this.ambientLight);
    
    // Directional light for shadows and god rays source
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(10, 20, 10);
    
    if (this.config.render.shadowsEnabled) {
      this.directionalLight.castShadow = true;
      this.directionalLight.shadow.mapSize.width = this.config.render.shadowMapSize;
      this.directionalLight.shadow.mapSize.height = this.config.render.shadowMapSize;
      this.directionalLight.shadow.camera.near = 0.5;
      this.directionalLight.shadow.camera.far = 500;
    }
    
    this.scene.add(this.directionalLight);
    this.lights.push(this.directionalLight);
    
    this.logger.debug('[KairosVisualEngine] Lighting setup complete', {
      ambientIntensity: 0.4,
      directionalIntensity: 0.8,
      shadowsEnabled: this.config.render.shadowsEnabled
    });
  }
  
  /**
   * Setup post-processing pipeline (PHASE 5.2: Atmospheric Effects)
   * Creates EffectComposer with Bloom and God Rays passes
   */
  private setupPostProcessing(): void {
    if (!this.renderer || !this.scene || !this.camera) {
      this.logger.error('[KairosVisualEngine] Cannot setup post-processing - renderer not initialized');
      return;
    }
    
    // Create composer
    this.composer = new EffectComposer(this.renderer);
    
    // Add render pass (base scene render)
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    
    // PHASE 5.2.1: Add Bloom Pass
    if (this.config.effects.bloomEnabled) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.canvas!.clientWidth, this.canvas!.clientHeight),
        this.config.effects.bloomIntensity,
        this.config.effects.bloomRadius,
        this.config.effects.bloomThreshold
      );
      this.composer.addPass(this.bloomPass);
      
      this.logger.info('[KairosVisualEngine] Bloom pass added', {
        intensity: this.config.effects.bloomIntensity,
        threshold: this.config.effects.bloomThreshold,
        radius: this.config.effects.bloomRadius
      });
    }
    
    // PHASE 5.2.2: Add God Rays Pass
    if (this.config.effects.godRaysEnabled) {
      this.godRaysPass = new ShaderPass(GodRaysShader);
      this.godRaysPass.uniforms['uResolution'].value.set(
        this.canvas!.clientWidth,
        this.canvas!.clientHeight
      );
      this.godRaysPass.uniforms['uDecay'].value = this.config.effects.godRaysDecay;
      this.godRaysPass.uniforms['uWeight'].value = this.config.effects.godRaysWeight;
      this.godRaysPass.uniforms['uDensity'].value = this.config.effects.godRaysDensity;
      this.godRaysPass.uniforms['uExposure'].value = this.config.effects.godRaysExposure;
      
      // Calculate light position in screen space
      if (this.directionalLight) {
        const lightPos = this.directionalLight.position.clone();
        lightPos.project(this.camera);
        this.godRaysPass.uniforms['uLightPosition'].value.set(
          (lightPos.x + 1) / 2,
          (lightPos.y + 1) / 2,
          0
        );
      }
      
      this.composer.addPass(this.godRaysPass);
      
      this.logger.info('[KairosVisualEngine] God Rays pass added', {
        decay: this.config.effects.godRaysDecay,
        weight: this.config.effects.godRaysWeight,
        density: this.config.effects.godRaysDensity,
        exposure: this.config.effects.godRaysExposure
      });
    }
    
    this.logger.info('[KairosVisualEngine] Post-processing pipeline setup complete');
  }
  
  /**
   * Setup particle system
   * VISUALS.GOLD.CODE Phase 2: FFT-Reactive Particles
   */
  private setupParticleSystem(): void {
    if (!this.scene) {
      this.logger.error('[KairosVisualEngine] Cannot setup particle system - scene not initialized');
      return;
    }
    
    if (!this.config.effects.fftReactiveParticlesEnabled) {
      this.logger.info('[KairosVisualEngine] FFT-reactive particles disabled in config');
      return;
    }
    
    // Get particle system mesh from service
    const particleMesh = this.particleSystemService.getInstancedMesh();
    if (particleMesh) {
      this.scene.add(particleMesh);
      this.logger.info('[KairosVisualEngine] Particle system added to scene', {
        particleCount: particleMesh.count,
        instancedRendering: true
      });
    } else {
      this.logger.warn('[KairosVisualEngine] Particle system mesh not available');
    }
  }
  
  /**
   * Setup reaction-diffusion ground plane
   * VISUALS.GOLD.CODE Phase 3: El Mundo Viviente (The Living World)
   */
  private setupReactionDiffusionGround(): void {
    if (!this.scene || !this.renderer) {
      this.logger.error('[KairosVisualEngine] Cannot setup reaction-diffusion - scene/renderer not initialized');
      return;
    }
    
    if (!this.config.effects.reactionDiffusionEnabled) {
      this.logger.info('[KairosVisualEngine] Reaction-diffusion ground disabled in config');
      return;
    }
    
    // Initialize reaction-diffusion service
    this.reactionDiffusionService.initialize(this.renderer);
    
    // Get ground mesh from service and add to scene
    const groundMesh = this.reactionDiffusionService.getGroundMesh();
    if (groundMesh) {
      this.scene.add(groundMesh);
      this.logger.info('[KairosVisualEngine] Reaction-diffusion ground added to scene', {
        enabled: true,
        phase: 'VISUALS.GOLD.CODE Phase 3'
      });
    } else {
      this.logger.warn('[KairosVisualEngine] Reaction-diffusion ground mesh not available');
    }
  }
  
  /**
   * Setup SDF Avatar Meshes
   * VISUALS.GOLD.CODE Phase 4: Avatares Procedurales
   * 
   * Creates player and boss avatar meshes using raymarching shaders
   * Conditionally switches to Mandelbulb fractal when transcendence > 0.9
   */
  private async setupSdfAvatars(): Promise<void> {
    if (!this.scene) {
      this.logger.error('[KairosVisualEngine] Cannot setup SDF avatars - scene not initialized');
      return;
    }
    
    if (!this.config.effects.sdfAvatarsEnabled) {
      this.logger.info('[KairosVisualEngine] SDF avatars disabled in config');
      return;
    }
    
    try {
      // Load shaders
      const [playerShader, bossShader, mandelbulbShader] = await Promise.all([
        this.loadShader('/shaders/sdf_raymarching_player.glsl'),
        this.loadShader('/shaders/sdf_raymarching_boss.glsl'),
        this.loadShader('/shaders/mandelbulb_fractal.glsl')
      ]);
      
      // Create player avatar material
      this.playerShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: this.getDefaultVertexShader(),
        fragmentShader: this.combinePlayerShaders(playerShader, mandelbulbShader),
        uniforms: {
          u_time: { value: 0.0 },
          u_player_shape_params: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
          u_base_color: { value: new THREE.Color(0.3, 0.5, 0.8) },
          u_emissive: { value: 0.5 },
          u_max_steps: { value: 64 },
          u_max_distance: { value: 100.0 },
          u_hit_threshold: { value: 0.001 },
          // Mandelbulb uniforms (transcendence > 0.9)
          u_fractal_iterations: { value: 8 },
          u_fractal_power: { value: 8.0 },
          u_color_gradient_inner: { value: new THREE.Color(1.0, 0.84, 0.0) },
          u_color_gradient_outer: { value: new THREE.Color(1.0, 0.5, 0.2) },
          u_rim_light_intensity: { value: 0.8 },
          u_glow_radius: { value: 2.0 },
          u_use_fractal: { value: 0.0 } // 0.0 = SDF, 1.0 = Mandelbulb
        },
        side: THREE.DoubleSide,
        transparent: true
      });
      
      // Create boss avatar material
      this.bossShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: this.getDefaultVertexShader(),
        fragmentShader: bossShader,
        uniforms: {
          u_time: { value: 0.0 },
          u_boss_shape_params: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
          u_base_color: { value: new THREE.Color(0.8, 0.3, 0.3) },
          u_emissive: { value: 0.7 },
          u_max_steps: { value: 64 },
          u_max_distance: { value: 100.0 },
          u_hit_threshold: { value: 0.001 }
        },
        side: THREE.DoubleSide,
        transparent: true
      });
      
      // Create avatar geometries (simple planes for raymarching)
      const avatarGeometry = new THREE.PlaneGeometry(2, 2);
      
      // Create player avatar mesh
      this.playerAvatarMesh = new THREE.Mesh(avatarGeometry, this.playerShaderMaterial);
      this.playerAvatarMesh.position.set(0, 1, 0); // Default position
      this.scene.add(this.playerAvatarMesh);
      
      // Create boss avatar mesh
      this.bossAvatarMesh = new THREE.Mesh(avatarGeometry.clone(), this.bossShaderMaterial);
      this.bossAvatarMesh.position.set(0, 1, 5); // Default position (in front of player)
      this.scene.add(this.bossAvatarMesh);
      
      this.logger.info('[KairosVisualEngine] SDF avatars setup complete', {
        playerMesh: !!this.playerAvatarMesh,
        bossMesh: !!this.bossAvatarMesh,
        fractalEnabled: this.config.effects.fractalMandelbulbEnabled,
        phase: 'VISUALS.GOLD.CODE Phase 4'
      });
    } catch (error) {
      this.logger.error('[KairosVisualEngine] Failed to setup SDF avatars', { error });
    }
  }
  
  /**
   * Load shader from public/shaders directory
   */
  private async loadShader(shaderPath: string): Promise<string> {
    const response = await fetch(shaderPath);
    if (!response.ok) {
      throw new Error(`Failed to load shader: ${shaderPath}`);
    }
    return await response.text();
  }
  
  /**
   * Get default vertex shader for full-screen quad
   */
  private getDefaultVertexShader(): string {
    return `
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
  }
  
  /**
   * Combine player SDF shader with Mandelbulb fractal shader
   * Conditional rendering based on u_use_fractal uniform
   */
  private combinePlayerShaders(playerShader: string, mandelbulbShader: string): string {
    return `
      ${playerShader}
      ${mandelbulbShader}
      
      // Main entry point - conditionally switch between SDF and fractal
      void main() {
        if (u_use_fractal > 0.5) {
          // Use Mandelbulb fractal (transcendence mode)
          // Call mandelbulb main function if available
          gl_FragColor = vec4(u_color_gradient_inner, 1.0); // Placeholder
        } else {
          // Use player SDF raymarching
          // Call player SDF main function if available
          gl_FragColor = vec4(u_base_color, 1.0); // Placeholder
        }
      }
    `;
  }
  
  /**
   * Update SDF avatar shader uniforms based on QualiaState
   * VISUALS.GOLD.CODE Phase 4: Avatares Procedurales
   * 
   * Uses ViewLogicService to compute avatar visuals from game state
   */
  private updateSdfAvatars(deltaTime: number, timeInSeconds: number): void {
    if (!this.playerShaderMaterial || !this.bossShaderMaterial) return;
    if (!this.viewLogicService) return;
    
    try {
      // TODO PHASE 5.6: Get player/boss state from proper source (CombatState)
      // For now, use placeholder data until CombatState integration is complete
      const placeholderPlayerState = {
        position: { x: 0, y: 1, z: 0 },
        health: 100,
        powerLevel: 0.5,
        consciousnessLevel: 0.5,
        qualiaState: {
          emotionalValence: 0.5,
          arousal: 0.5,
          coherence: 0.5
        }
      };
      
      const placeholderBossState = {
        position: { x: 0, y: 1, z: 5 },
        health: 1000,
        currentPhase: 1,
        aggressionLevel: 0.5
      };
      
      // Get avatar visuals from ViewLogicService
      const playerVisuals = this.viewLogicService.getPlayerAvatarVisuals(
        placeholderPlayerState,
        this.currentQualiaState
      );
      
      const bossVisuals = this.viewLogicService.getBossAvatarVisuals(
        placeholderBossState,
        this.currentQualiaState
      );
      
      // Update player avatar uniforms
      this.playerShaderMaterial.uniforms['u_time'].value = timeInSeconds;
      this.playerShaderMaterial.uniforms['u_player_shape_params'].value.set(
        playerVisuals.shapeParameters.x,
        playerVisuals.shapeParameters.y,
        playerVisuals.shapeParameters.z
      );
      this.playerShaderMaterial.uniforms['u_base_color'].value.setRGB(
        playerVisuals.baseColor.r,
        playerVisuals.baseColor.g,
        playerVisuals.baseColor.b
      );
      this.playerShaderMaterial.uniforms['u_emissive'].value = playerVisuals.emissive;
      
      // Update player avatar position
      if (this.playerAvatarMesh) {
        this.playerAvatarMesh.position.set(
          placeholderPlayerState.position.x,
          placeholderPlayerState.position.y,
          placeholderPlayerState.position.z
        );
      }
      
      // Update boss avatar uniforms
      this.bossShaderMaterial.uniforms['u_time'].value = timeInSeconds;
      this.bossShaderMaterial.uniforms['u_boss_shape_params'].value.set(
        bossVisuals.shapeParameters.x,
        bossVisuals.shapeParameters.y,
        bossVisuals.shapeParameters.z
      );
      this.bossShaderMaterial.uniforms['u_base_color'].value.setRGB(
        bossVisuals.baseColor.r,
        bossVisuals.baseColor.g,
        bossVisuals.baseColor.b
      );
      this.bossShaderMaterial.uniforms['u_emissive'].value = bossVisuals.emissive;
      
      // Update boss avatar position
      if (this.bossAvatarMesh) {
        this.bossAvatarMesh.position.set(
          placeholderBossState.position.x,
          placeholderBossState.position.y,
          placeholderBossState.position.z
        );
      }
      
      // Handle fractal transition (transcendence > 0.9)
      if (this.config.effects.fractalMandelbulbEnabled) {
        const transcendenceThreshold = this.config.qualiaMapping.transcendenceToFractalIterations.threshold;
        const useFractal = this.currentQualiaState.transcendence > transcendenceThreshold ? 1.0 : 0.0;
        this.playerShaderMaterial.uniforms['u_use_fractal'].value = useFractal;
        
        if (useFractal > 0.5) {
          // Get Mandelbulb visuals
          const mandelbulbVisuals = this.viewLogicService.getMandelbulbVisuals(this.currentQualiaState);
          this.playerShaderMaterial.uniforms['u_fractal_iterations'].value = mandelbulbVisuals.iterations;
          this.playerShaderMaterial.uniforms['u_fractal_power'].value = mandelbulbVisuals.power;
          this.playerShaderMaterial.uniforms['u_color_gradient_inner'].value.setRGB(
            mandelbulbVisuals.colorGradient.inner.r,
            mandelbulbVisuals.colorGradient.inner.g,
            mandelbulbVisuals.colorGradient.inner.b
          );
          this.playerShaderMaterial.uniforms['u_color_gradient_outer'].value.setRGB(
            mandelbulbVisuals.colorGradient.outer.r,
            mandelbulbVisuals.colorGradient.outer.g,
            mandelbulbVisuals.colorGradient.outer.b
          );
          this.playerShaderMaterial.uniforms['u_rim_light_intensity'].value = mandelbulbVisuals.rimLightIntensity;
          this.playerShaderMaterial.uniforms['u_glow_radius'].value = mandelbulbVisuals.glowRadius;
        }
      }
    } catch (error) {
      this.logger.error('[KairosVisualEngine] Failed to update SDF avatars', { error });
    }
  }
  
  /**
   * Update post-processing uniforms based on QualiaState
   * VISUALS.GOLD.CODE Phase 1: Atmospheric Effects
   */
  private updateAtmosphericEffects(): void {
    const { intensity, transcendence, precision, aggression } = this.currentQualiaState;
    
    // Update Bloom parameters
    if (this.bloomPass) {
      // Map intensity → bloom threshold (inverse: higher intensity = lower threshold = more bloom)
      const thresholdMin = this.config.qualiaMapping.intensityToBloomThreshold.max;
      const thresholdMax = this.config.qualiaMapping.intensityToBloomThreshold.min;
      this.bloomPass.threshold = THREE.MathUtils.lerp(thresholdMax, thresholdMin, intensity);
      
      // Map transcendence → bloom intensity
      const intensityMin = this.config.qualiaMapping.transcendenceToBloomIntensity.min;
      const intensityMax = this.config.qualiaMapping.transcendenceToBloomIntensity.max;
      this.bloomPass.strength = THREE.MathUtils.lerp(intensityMin, intensityMax, transcendence);
      
      // Golden tint when transcendence > 0.9
      // Note: UnrealBloomPass doesn't have direct color control, 
      // so we'll handle this in the scene background or via a separate pass in future phase
    }
    
    // Update God Rays parameters
    if (this.godRaysPass) {
      // Map precision → ray sharpness
      const sharpnessMin = this.config.qualiaMapping.precisionToGodRaysSharpness.min;
      const sharpnessMax = this.config.qualiaMapping.precisionToGodRaysSharpness.max;
      this.godRaysPass.uniforms['uPrecision'].value = THREE.MathUtils.lerp(sharpnessMin, sharpnessMax, precision);
      
      // Map aggression → color tint (0 = cool blue, 1 = warm red/orange)
      this.godRaysPass.uniforms['uAggression'].value = aggression;
      
      // Pass transcendence for ultimate mode effects
      this.godRaysPass.uniforms['uTranscendence'].value = transcendence;
    }
  }
  
  /**
   * Start rendering loop
   */
  public start(): void {
    if (this.isRunning) {
      this.logger.warn('[KairosVisualEngine] Already running');
      return;
    }
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.logger.info('[KairosVisualEngine] Starting render loop');
    this.renderLoop();
  }
  
  /**
   * Stop rendering loop
   */
  public stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.logger.info('[KairosVisualEngine] Render loop stopped');
  }
  
  /**
   * Main rendering loop
   * Called every frame via requestAnimationFrame
   * PHASE 5.6: Added performance profiling markers
   */
  private renderLoop = (): void => {
    if (!this.isRunning || !this.renderer || !this.scene || !this.camera) return;
    
    // PHASE 5.6: Performance mark - Frame start
    if (this.performanceService && this.config.dev.logPerformance) {
      this.performanceService.mark('frame-start');
    }
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
    
    // Calculate delta time
    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = now;
    
    // Update FPS tracking
    this.updateFPSTracking(deltaTime);
    
    // PHASE 5.2: Update atmospheric effects based on current QualiaState
    if (this.performanceService && this.config.dev.logPerformance) {
      this.performanceService.mark('atmospheric-update-start');
    }
    this.updateAtmosphericEffects();
    if (this.performanceService && this.config.dev.logPerformance) {
      this.performanceService.mark('atmospheric-update-end');
    }
    
    // PHASE 5.3: Update particle system (FFT-reactive)
    if (this.config.effects.fftReactiveParticlesEnabled) {
      if (this.performanceService && this.config.dev.logPerformance) {
        this.performanceService.mark('particles-update-start');
      }
      this.particleSystemService.update(deltaTime);
      if (this.performanceService && this.config.dev.logPerformance) {
        this.performanceService.mark('particles-update-end');
      }
    }
    
    // PHASE 5.4: Update reaction-diffusion ground
    if (this.config.effects.reactionDiffusionEnabled) {
      if (this.performanceService && this.config.dev.logPerformance) {
        this.performanceService.mark('reaction-diffusion-update-start');
      }
      this.reactionDiffusionService.update(deltaTime, this.currentQualiaState);
      if (this.performanceService && this.config.dev.logPerformance) {
        this.performanceService.mark('reaction-diffusion-update-end');
      }
    }
    
    // PHASE 5.5: Update SDF avatars ✅ INTEGRATED
    if (this.config.effects.sdfAvatarsEnabled) {
      if (this.performanceService && this.config.dev.logPerformance) {
        this.performanceService.mark('avatars-update-start');
      }
      this.updateSdfAvatars(deltaTime, now / 1000); // Pass time in seconds
      if (this.performanceService && this.config.dev.logPerformance) {
        this.performanceService.mark('avatars-update-end');
      }
    }
    
    // Render scene with post-processing
    if (this.performanceService && this.config.dev.logPerformance) {
      this.performanceService.mark('render-start');
    }
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    if (this.performanceService && this.config.dev.logPerformance) {
      this.performanceService.mark('render-end');
    }
    
    // PHASE 5.6: Performance mark - Frame end
    if (this.performanceService && this.config.dev.logPerformance) {
      this.performanceService.mark('frame-end');
      
      // Log performance measures every 60 frames (1 second at 60fps)
      if (this.frameCount % 60 === 0) {
        const stats = this.getRenderStats();
        this.logger.debug('[KairosVisualEngine] Performance', { 
          ...stats,
          frameTime: `${deltaTime * 1000}ms`
        });
      }
    }
    
    this.frameCount++;
  };
  
  /**
   * Update FPS tracking for performance monitoring
   */
  private updateFPSTracking(deltaTime: number): void {
    const fps = 1 / deltaTime;
    this.fpsHistory.push(fps);
    
    // Keep only last 60 frames (1 second at 60fps)
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }
  }
  
  /**
   * Update scene with new state
   * Called by @OnEvent handlers when game state changes
   */
  public updateScene(state: SceneState): void {
    if (!this.scene) {
      this.logger.warn('[KairosVisualEngine] Cannot update scene - not initialized');
      return;
    }
    
    // TODO PHASE 5.3+: Update scene based on state
    // - Update particle positions
    // - Update avatar positions
    
    this.logger.debug('[KairosVisualEngine] Scene updated', {
      playerPos: state.playerPosition,
      particleCount: state.particles.length,
      activeEffects: state.activeEffects
    });
  }
  
  /**
   * @OnEvent handler for GameStateChanged
   * Updates visual elements when game state changes
   */
  @OnEvent('GameState.Changed')
  private handleGameStateChanged(event: GameStateChangedEvent): void {
    this.logger.debug('[KairosVisualEngine] GameState changed', { 
      newState: event.newState, 
      previousState: event.previousState 
    });
    
    // TODO: Extract SceneState from GameState and call updateScene()
  }
  
  /**
   * @OnEvent handler for QualiaStateCalculated
   * Updates shader parameters based on QualiaState
   * VISUALS.GOLD.CODE: This is where the magic happens
   */
  @OnEvent('QualiaState.Calculated')
  private handleQualiaStateCalculated(event: QualiaStateCalculatedEvent): void {
    const qualiaState = event.qualiaState;
    
    // Store current QualiaState for shader uniform updates
    this.currentQualiaState = {
      intensity: qualiaState.intensity,
      transcendence: qualiaState.transcendence,
      precision: qualiaState.precision,
      aggression: qualiaState.aggression,
      chaos: qualiaState.chaos,
      flow: qualiaState.flow,
      recovery: qualiaState.recovery || 0.5 // Default if not present
    };
    
    this.logger.debug('[KairosVisualEngine] QualiaState updated', this.currentQualiaState);
    
    // Atmospheric effects will be updated in next frame via updateAtmosphericEffects()
    // PHASE 5.4: Reaction-Diffusion parameters (chaos, flow, recovery) ✅ COMPLETE
    // TODO PHASE 5.5: SDF avatar parameters (precision, flow, chaos, aggression)
  }
  
  /**
   * Get current render statistics
   */
  public getRenderStats(): RenderStats {
    const avgFps = this.fpsHistory.length > 0
      ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      : 0;
    
    // Get Three.js renderer info
    const info = this.renderer?.info;
    
    return {
      fps: Math.round(avgFps),
      drawCalls: info?.render.calls || 0,
      triangles: info?.render.triangles || 0,
      textureMemoryMB: (info?.memory.textures || 0) * 0.001 // Approximate MB
    };
  }
  
  /**
   * Handle window resize
   */
  public resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    
    // Update composer size
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    
    // Update post-processing uniforms
    if (this.godRaysPass) {
      this.godRaysPass.uniforms['uResolution'].value.set(width, height);
    }
    
    this.logger.debug('[KairosVisualEngine] Resized', { width, height });
  }
  
  /**
   * Enable/disable post-processing effect
   * PHASE 5.2: Implements effect toggling
   */
  public setPostProcessingEffect(effectName: string, enabled: boolean): void {
    this.logger.info('[KairosVisualEngine] Post-processing effect toggled', {
      effect: effectName,
      enabled
    });
    
    switch (effectName) {
      case 'bloom':
        if (this.bloomPass) {
          this.bloomPass.enabled = enabled;
        }
        break;
      case 'godRays':
        if (this.godRaysPass) {
          this.godRaysPass.enabled = enabled;
        }
        break;
      default:
        this.logger.warn('[KairosVisualEngine] Unknown effect', { effectName });
    }
  }
  
  /**
   * Update engine configuration at runtime
   */
  public async updateConfig(config: Partial<Record<string, unknown>>): Promise<void> {
    this.logger.info('[KairosVisualEngine] Configuration updated', config);
    
    // TODO: Apply runtime configuration updates
    // - Renderer settings
    // - Post-processing toggles
    // - Performance settings
  }
  
  /**
   * Cleanup and dispose Three.js resources
   * PHASE 5.6: Added avatar cleanup
   */
  public dispose(): void {
    this.logger.info('[KairosVisualEngine] Disposing resources...');
    
    // PHASE 5.6: Dispose avatar resources
    if (this.playerAvatarMesh) {
      this.playerAvatarMesh.geometry.dispose();
      if (this.playerShaderMaterial) {
        this.playerShaderMaterial.dispose();
      }
      this.scene?.remove(this.playerAvatarMesh);
      this.playerAvatarMesh = null;
      this.playerShaderMaterial = null;
    }
    
    if (this.bossAvatarMesh) {
      this.bossAvatarMesh.geometry.dispose();
      if (this.bossShaderMaterial) {
        this.bossShaderMaterial.dispose();
      }
      this.scene?.remove(this.bossAvatarMesh);
      this.bossAvatarMesh = null;
      this.bossShaderMaterial = null;
    }
    
    // Dispose composer
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    
    // Dispose lights
    this.lights.forEach(light => {
      light.parent?.remove(light);
    });
    this.lights = [];
    
    // Dispose scene objects
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      
      this.scene.clear();
      this.scene = null;
    }
    
    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    
    this.camera = null;
    this.canvas = null;
    this.renderPass = null;
    this.bloomPass = null;
    this.godRaysPass = null;
    
    this.logger.info('[KairosVisualEngine] Resources disposed');
  }
  
  /**
   * Helper: Convert tone mapping string to Three.js constant
   */
  private getToneMappingConstant(mapping: string): THREE.ToneMapping {
    switch (mapping) {
      case 'None': return THREE.NoToneMapping;
      case 'Linear': return THREE.LinearToneMapping;
      case 'Reinhard': return THREE.ReinhardToneMapping;
      case 'Cinematic': return THREE.ACESFilmicToneMapping;
      case 'ACESFilmic': return THREE.ACESFilmicToneMapping;
      default: return THREE.ACESFilmicToneMapping;
    }
  }
}
