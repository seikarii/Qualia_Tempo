/**
 * QUALIA.CODE v1.2 - PostProcessingService
 * Implements a post-processing effects pipeline using Three.js EffectComposer.
 * Loads effects configuration from YAML and applies them to rendered scenes.
 */

import { injectable, inject } from "inversify";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { TYPES } from "./inversify.types";
import type { IPostProcessingService } from "./interfaces/IPostProcessingService";
import type { ILogger } from "./interfaces/ILogger";
import type { IShaderLoaderService } from "./interfaces/IShaderLoaderService";
import type { PostProcessingConfig, PostProcessingPass } from "./contracts/IPostProcessingService.contracts";
import { logMethod, catchError, BrowserOnly } from "../utils/decorators";

@injectable()
export class PostProcessingService implements IPostProcessingService {
  private readonly logger: ILogger;
  private readonly shaderLoader: IShaderLoaderService;
  private readonly config: PostProcessingConfig;

  private composer!: EffectComposer;
  private renderTarget!: THREE.WebGLRenderTarget;
  private isInitialized = false;

  // Performance tracking
  private renderTime = 0;

  constructor(
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IShaderLoaderService) shaderLoader: IShaderLoaderService,
    @inject(TYPES.PostProcessingConfig) config: PostProcessingConfig
  ) {
    this.logger = logger;
    this.shaderLoader = shaderLoader;
    this.config = config;
  }

  @logMethod
  @catchError
  @BrowserOnly
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn("PostProcessingService already initialized");
      return;
    }

    this.logger.info("Initializing PostProcessingService");

    // Create render target for scene rendering
    this.renderTarget = new THREE.WebGLRenderTarget(
      this.config.renderTargetWidth,
      this.config.renderTargetHeight
    );

    // Create composer
    this.composer = new EffectComposer(new THREE.WebGLRenderer({ canvas }));

    // Build the effects pipeline
    await this.buildPipeline();

    this.isInitialized = true;
    this.logger.info("PostProcessingService initialized successfully");
  }

  @logMethod
  @catchError
  private async buildPipeline(): Promise<void> {
    // Clear existing passes
    this.composer.passes = [];

    for (const passConfig of this.config.passes) {
      if (!passConfig.enabled) continue;

      try {
        const pass = await this.createPass(passConfig);
        if (pass) {
          this.composer.addPass(pass);
          this.logger.debug(`Added pass: ${passConfig.type}`);
        }
      } catch (error) {
        this.logger.error(`Failed to create pass ${passConfig.type}`, { error });
      }
    }

    this.logger.info(`Built post-processing pipeline with ${this.composer.passes.length} passes`);
  }

  @logMethod
  @catchError
  private async createPass(passConfig: PostProcessingPass): Promise<any> {
    switch (passConfig.type) {
      case 'RenderPass':
        // RenderPass is typically the first pass - create with dummy scene/camera, update during render
        const dummyScene = new THREE.Scene();
        const dummyCamera = new THREE.Camera();
        return new RenderPass(dummyScene, dummyCamera);

      case 'UnrealBloomPass':
        return new UnrealBloomPass(
          new THREE.Vector2(this.config.renderTargetWidth, this.config.renderTargetHeight),
          passConfig.params?.strength || 1.5,
          passConfig.params?.radius || 0.4,
          passConfig.params?.threshold || 0.85
        );

      case 'ShaderPass':
        if (!passConfig.shader) {
          throw new Error('ShaderPass requires shader name');
        }

        const shaderSource = await this.shaderLoader.load(passConfig.shader);
        const shader = this.parseShader(shaderSource);

        const pass = new ShaderPass(shader);

        // Apply uniforms
        if (passConfig.uniforms) {
          Object.assign(pass.uniforms, passConfig.uniforms);
        }

        return pass;

      default:
        this.logger.warn(`Unknown pass type: ${passConfig.type}`);
        return null;
    }
  }

  @logMethod
  @catchError
  private parseShader(shaderSource: string): any {
    // Simple shader parsing - assumes vertex and fragment shaders are separated by ---FRAGMENT---
    const parts = shaderSource.split('---FRAGMENT---');
    if (parts.length !== 2) {
      throw new Error('Shader must contain ---FRAGMENT--- separator');
    }

    return {
      uniforms: {},
      vertexShader: parts[0].trim(),
      fragmentShader: parts[1].trim(),
    };
  }

  @logMethod
  @catchError
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (!this.isInitialized) {
      throw new Error("PostProcessingService must be initialized before rendering");
    }

    const startTime = performance.now();

    // Update the render pass with current scene and camera
    const renderPass = this.composer.passes[0] as RenderPass;
    if (renderPass) {
      renderPass.scene = scene;
      renderPass.camera = camera;
    }

    // Render through the pipeline
    this.composer.render();

    this.renderTime = performance.now() - startTime;
  }

  @logMethod
  resize(width: number, height: number): void {
    if (!this.isInitialized) return;

    this.composer.setSize(width, height);

    // Update render target if needed
    if (this.renderTarget) {
      this.renderTarget.setSize(width, height);
    }
  }

  @logMethod
  dispose(): void {
    if (this.composer) {
      this.composer.dispose();
    }

    if (this.renderTarget) {
      this.renderTarget.dispose();
    }

    this.isInitialized = false;
    this.logger.info("PostProcessingService disposed");
  }

  @logMethod
  getStats(): { passes: number; renderTime: number } {
    return {
      passes: this.composer?.passes.length || 0,
      renderTime: this.renderTime,
    };
  }
}