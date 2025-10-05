/**
 * QUALIA.CODE v4.0 - PostProcessingService Dynamic Orchestrator
 * 
 * AAA-grade post-processing pipeline orchestrator with intelligent dependency management.
 * Dynamically constructs render graphs based on modular configuration.
 * 
 * Features:
 * - Dynamic pass instantiation (Bloom, TAA, Motion Blur, DoF)
 * - Automatic dependency wiring (G-Buffer velocity → TAA/MotionBlur)
 * - Jitter integration for TAA sub-pixel sampling
 * - History buffer management for temporal effects
 * - Configurable pass execution order
 * - Performance profiling and optimization
 * 
 * Architecture:
 * - Uses Three.js EffectComposer for pass chaining
 * - IoC-compliant with constructor injection
 * - External YAML configuration for all parameters
 * - Zero hardcoded values
 * 
 * @implements {IPostProcessingService}
 */

import { injectable, inject } from "inversify";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { TYPES } from "./inversify.types";
import type { IPostProcessingService } from "./interfaces/IPostProcessingService";
import type { ILogger } from "./interfaces/ILogger";
import type { IShaderLoaderService } from "./interfaces/IShaderLoaderService";
import type { IShaderIntrospectionService } from "./interfaces/IShaderIntrospectionService";
import type { IPerformanceService } from "./interfaces/IPerformanceService";
import type { IJitterService } from "./interfaces/IJitterService";
import type { PostProcessingConfig, PostProcessingServiceParams } from "./contracts/IPostProcessingService.contracts";
import { logMethod, catchError, measureTime, BrowserOnly } from "../utils/decorators";
import { GBufferPass } from "./postprocessing/GBufferPass";
import { BloomPass } from "./postprocessing/BloomPass";
import { TAAPass } from "./postprocessing/TAAPass";
import { MotionBlurPass } from "./postprocessing/MotionBlurPass";
import { DoFPass } from "./postprocessing/DoFPass";

@injectable()
export class PostProcessingService implements IPostProcessingService {
  private readonly logger: ILogger;
  private readonly shaderLoader: IShaderLoaderService;
  private readonly shaderIntrospection: IShaderIntrospectionService;
  private readonly performanceService: IPerformanceService;
  private readonly jitterService: IJitterService;
  private readonly config: PostProcessingConfig;

  private isInitialized = false;

  // Core infrastructure
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;

  // Pass instances (instantiated based on configuration)
  private gbufferPass!: GBufferPass;
  private bloomPass?: BloomPass;
  private taaPass?: TAAPass;
  private motionBlurPass?: MotionBlurPass;
  private dofPass?: DoFPass;

  // Performance tracking
  private renderTime = 0;
  private originalProjectionMatrix!: THREE.Matrix4;

  constructor(
    @inject(TYPES.PostProcessingServiceParams) params: PostProcessingServiceParams
  ) {
    this.logger = params.logger;
    this.shaderLoader = params.shaderLoader;
    this.shaderIntrospection = params.shaderIntrospection;
    this.performanceService = params.performanceService;
    this.jitterService = params.jitterService;
    this.config = params.config;

    this.logger.info("PostProcessingService v4.0 created (not yet initialized)");
  }

  @logMethod
  @catchError
  @BrowserOnly
  async initialize(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn("PostProcessingService already initialized");
      return;
    }

    if (!this.config.enabled) {
      this.logger.info("PostProcessingService disabled by configuration");
      return;
    }

    this.logger.info("Initializing PostProcessingService v4.0 Dynamic Orchestrator");

    // Store shared objects
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.originalProjectionMatrix = camera.projectionMatrix.clone();

    // Create G-Buffer pass (mandatory - produces textures for other passes)
    await this.createGBufferPass();

    // Create optional passes based on configuration
    await this.createOptionalPasses();

    // Wire inter-pass dependencies
    this.wireDependencies();

    // Build EffectComposer with ordered passes
    this.buildComposer();

    this.isInitialized = true;
    this.logger.info("PostProcessingService v4.0 initialized successfully", {
      taaEnabled: !!this.taaPass,
      bloomEnabled: !!this.bloomPass,
      motionBlurEnabled: !!this.motionBlurPass,
      dofEnabled: !!this.dofPass,
    });
  }

  /**
   * Create mandatory G-Buffer pass (produces color, normal, depth, material, velocity)
   */
  @logMethod
  @catchError
  private async createGBufferPass(): Promise<void> {
    this.logger.debug("Creating GBufferPass");
    
    const width = this.config.renderTargetWidth;
    const height = this.config.renderTargetHeight;

    // CRITICAL FIX: Load and introspect G-Buffer shader to strip version directives
    // and separate pragma-delimited sections
    const shaderSource = await this.shaderLoader.load("gbuffer_particles");
    const shader = await this.shaderIntrospection.introspect(shaderSource);

    // Create G-Buffer pass with introspected shaders
    this.gbufferPass = new GBufferPass({
      scene: this.scene,
      camera: this.camera,
      width,
      height,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      uniforms: shader.uniforms, // Use introspected uniforms
    });
    this.gbufferPass.renderToScreen = false; // Always render to texture

    this.logger.debug("GBufferPass created successfully");
  }

  /**
   * Create optional passes based on orchestration configuration
   */
  @logMethod
  @catchError
  private async createOptionalPasses(): Promise<void> {
    const orch = this.config.orchestration;
    const width = this.config.renderTargetWidth;
    const height = this.config.renderTargetHeight;

    // Create BloomPass if enabled
    if (orch.bloomEnabled) {
      this.logger.debug("Creating BloomPass");
      const shaders = await this.loadBloomShaders();
      this.bloomPass = new BloomPass(this.config.bloom, width, height, shaders);
      this.bloomPass.renderToScreen = false;
      this.logger.debug("BloomPass created successfully");
    }

    // Create TAAPass if enabled
    if (orch.taaEnabled) {
      this.logger.debug("Creating TAAPass");
      const taaShaderSource = await this.shaderLoader.load("taa");
      const taaShader = await this.shaderIntrospection.introspect(taaShaderSource);
      // Reconstruct pragma-delimited format for TAAPass (it expects this format)
      const taaShaderCode = `#pragma VERTEX\n${taaShader.vertexShader}\n#pragma FRAGMENT\n${taaShader.fragmentShader}`;
      this.taaPass = new TAAPass(this.config.taa, width, height, taaShaderCode);
      this.taaPass.renderToScreen = false;
      this.logger.debug("TAAPass created successfully");
    }

    // Create MotionBlurPass if enabled
    if (orch.motionBlurEnabled) {
      this.logger.debug("Creating MotionBlurPass");
      const motionBlurShaderSource = await this.shaderLoader.load("motion_blur");
      const motionBlurShader = await this.shaderIntrospection.introspect(motionBlurShaderSource);
      // Reconstruct pragma-delimited format for MotionBlurPass (it expects this format)
      const motionBlurShaderCode = `#pragma VERTEX\n${motionBlurShader.vertexShader}\n#pragma FRAGMENT\n${motionBlurShader.fragmentShader}`;
      this.motionBlurPass = new MotionBlurPass(
        this.config.motionBlur,
        motionBlurShaderCode
      );
      this.motionBlurPass.renderToScreen = false;
      this.logger.debug("MotionBlurPass created successfully");
    }

    // Create DoFPass if enabled
    if (orch.dofEnabled) {
      this.logger.debug("Creating DoFPass");
      const dofShaderSource = await this.shaderLoader.load("dof");
      const dofShader = await this.shaderIntrospection.introspect(dofShaderSource);
      // Reconstruct pragma-delimited format for DoFPass (it expects this format)
      const dofShaderCode = `#pragma VERTEX\n${dofShader.vertexShader}\n#pragma FRAGMENT\n${dofShader.fragmentShader}`;
      this.dofPass = new DoFPass(this.config.dof, width, height, dofShaderCode);
      this.dofPass.renderToScreen = false;
      this.logger.debug("DoFPass created successfully");
    }
  }

  /**
   * Load all shaders required for BloomPass
   * CRITICAL: All shaders must be introspected to strip #version directives
   */
  @logMethod
  @catchError
  private async loadBloomShaders(): Promise<{
    brightPassShader: string;
    blurShader: string;
    downsampleShader: string;
    upsampleShader: string;
  }> {
    this.logger.debug("Loading Bloom shaders");
    
    const [brightPassSource, blurSource, downsampleSource, upsampleSource] = await Promise.all([
      this.shaderLoader.load("bright_pass"),
      this.shaderLoader.load("blur"),
      this.shaderLoader.load("bloom_downsample"),
      this.shaderLoader.load("bloom_upsample"),
    ]);

    // Introspect all shaders to strip #version directives and separate pragma sections
    const [brightPass, blur, downsample, upsample] = await Promise.all([
      this.shaderIntrospection.introspect(brightPassSource),
      this.shaderIntrospection.introspect(blurSource),
      this.shaderIntrospection.introspect(downsampleSource),
      this.shaderIntrospection.introspect(upsampleSource),
    ]);

    // Reconstruct pragma-delimited format for BloomPass (it expects this format)
    return {
      brightPassShader: `#pragma VERTEX\n${brightPass.vertexShader}\n#pragma FRAGMENT\n${brightPass.fragmentShader}`,
      blurShader: `#pragma VERTEX\n${blur.vertexShader}\n#pragma FRAGMENT\n${blur.fragmentShader}`,
      downsampleShader: `#pragma VERTEX\n${downsample.vertexShader}\n#pragma FRAGMENT\n${downsample.fragmentShader}`,
      upsampleShader: `#pragma VERTEX\n${upsample.vertexShader}\n#pragma FRAGMENT\n${upsample.fragmentShader}`,
    };
  }

  /**
   * Wire inter-pass dependencies (CRITICAL: G-Buffer outputs → Pass inputs)
   */
  @logMethod
  @catchError
  private wireDependencies(): void {
    this.logger.debug("Wiring inter-pass dependencies");

    const velocityTexture = this.gbufferPass.velocityTexture;
    const depthTexture = this.gbufferPass.depthTexture;

    // Wire velocity texture to TAA
    if (this.taaPass && velocityTexture) {
      this.taaPass.setVelocityTexture(velocityTexture);
      this.logger.debug("Wired G-Buffer velocity → TAAPass");
    }

    // Wire velocity texture to MotionBlur
    if (this.motionBlurPass && velocityTexture) {
      this.motionBlurPass.setVelocityTexture(velocityTexture);
      this.logger.debug("Wired G-Buffer velocity → MotionBlurPass");
    }

    // Wire depth texture to DoF
    if (this.dofPass && depthTexture) {
      this.dofPass.setDepthTexture(depthTexture);
      this.logger.debug("Wired G-Buffer depth → DoFPass");
    }

    this.logger.info("Inter-pass dependencies wired successfully");
  }

  /**
   * Build EffectComposer with passes in configured order
   */
  @logMethod
  @catchError
  private buildComposer(): void {
    this.logger.debug("Building EffectComposer with ordered passes");

    this.composer = new EffectComposer(this.renderer);

    // Add RenderPass for scene (base rendering)
    const renderPass = new RenderPass(this.scene, this.camera);
    renderPass.renderToScreen = false;
    this.composer.addPass(renderPass);

    // Add G-Buffer pass (produces textures)
    this.composer.addPass(this.gbufferPass);

    // Add optional passes in configured order
    const passOrder = this.config.orchestration.passOrder;
    for (const passName of passOrder) {
      const pass = this.getPassByName(passName);
      if (pass) {
        this.composer.addPass(pass);
        this.logger.debug(`Added ${passName} to composer`);
      }
    }

    // Ensure last pass renders to screen
    const lastPass = this.composer.passes[this.composer.passes.length - 1];
    if (lastPass) {
      lastPass.renderToScreen = true;
    }

    this.logger.info(`EffectComposer built with ${this.composer.passes.length} passes`);
  }

  /**
   * Get pass instance by name
   */
  private getPassByName(name: string): Pass | undefined {
    switch (name) {
      case "taa":
        return this.taaPass;
      case "bloom":
        return this.bloomPass;
      case "motionBlur":
        return this.motionBlurPass;
      case "dof":
        return this.dofPass;
      default:
        this.logger.warn(`Unknown pass name: ${name}`);
        return undefined;
    }
  }

  /**
   * Apply jitter to camera projection matrix (for TAA sub-pixel sampling)
   */
  @logMethod
  private applyJitterToCamera(): void {
    if (!this.config.orchestration.taaEnabled || !this.taaPass) {
      return;
    }

    const jitter = this.jitterService.getJitterOffset();
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;

    // Apply sub-pixel offset to projection matrix
    // Elements [8] and [9] control horizontal and vertical offset
    this.camera.projectionMatrix.elements[8] += (jitter.x * 2) / width;
    this.camera.projectionMatrix.elements[9] += (jitter.y * 2) / height;

    this.logger.debug("Applied jitter to camera", { jitterX: jitter.x, jitterY: jitter.y });
  }

  /**
   * Remove jitter from camera projection matrix (restore original)
   */
  @logMethod
  private removeJitterFromCamera(): void {
    if (!this.config.orchestration.taaEnabled || !this.taaPass) {
      return;
    }

    // Restore original projection matrix
    this.camera.projectionMatrix.copy(this.originalProjectionMatrix);
    this.camera.updateProjectionMatrix();
  }

  @logMethod
  @catchError
  @measureTime
  @BrowserOnly
  render(): void {
    if (!this.isInitialized || !this.config.enabled) {
      return;
    }

    const startTime = this.performanceService.now();

    // Apply jitter before rendering (for TAA sub-pixel sampling)
    this.applyJitterToCamera();

    // Render entire post-processing pipeline
    this.composer.render();

    // Remove jitter after rendering (restore camera)
    this.removeJitterFromCamera();

    // Advance jitter sequence for next frame (if TAA enabled)
    if (this.config.orchestration.taaEnabled && this.taaPass) {
      this.jitterService.advanceFrame();
    }

    this.renderTime = this.performanceService.now() - startTime;

    if (this.config.orchestration.performance.enableProfiling) {
      this.logger.debug("Post-processing render time", { renderTime: this.renderTime });
    }
  }

  @logMethod
  resize(width: number, height: number): void {
    if (!this.isInitialized) return;

    this.logger.debug("Resizing post-processing pipeline", { width, height });

    // Resize composer
    this.composer.setSize(width, height);

    // Resize individual passes
    if (this.gbufferPass) {
      this.gbufferPass.setSize(width, height);
    }
    if (this.bloomPass) {
      this.bloomPass.setSize(width, height);
    }
    if (this.taaPass) {
      this.taaPass.setSize(width, height);
    }
    if (this.motionBlurPass) {
      this.motionBlurPass.setSize(width, height);
    }
    if (this.dofPass) {
      this.dofPass.setSize(width, height);
    }

    this.logger.info("Post-processing pipeline resized successfully");
  }

  @logMethod
  dispose(): void {
    this.logger.debug("Disposing post-processing pipeline");

    // Dispose composer
    if (this.composer) {
      this.composer.dispose();
    }

    // Dispose individual passes
    if (this.gbufferPass) {
      this.gbufferPass.dispose();
    }
    if (this.bloomPass) {
      this.bloomPass.dispose();
    }
    if (this.taaPass) {
      this.taaPass.dispose();
    }
    if (this.motionBlurPass) {
      this.motionBlurPass.dispose();
    }
    if (this.dofPass) {
      this.dofPass.dispose();
    }

    this.isInitialized = false;
    this.logger.info("PostProcessingService disposed");
  }

  @logMethod
  getStats(): { pipelines: number; renderTargets: number; renderTime: number } {
    let passCount = 1; // G-Buffer always present
    if (this.bloomPass) passCount++;
    if (this.taaPass) passCount++;
    if (this.motionBlurPass) passCount++;
    if (this.dofPass) passCount++;

    return {
      pipelines: passCount,
      renderTargets: 5, // G-Buffer: color, normal, depth, material, velocity
      renderTime: this.renderTime,
    };
  }
}
