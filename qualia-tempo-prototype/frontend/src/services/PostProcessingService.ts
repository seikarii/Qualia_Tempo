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
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
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

  // Map to store pass results for dependency management
  private readonly passResults = new Map<string, THREE.Texture>();

  // Shared objects from FrontendRenderingService
  private scene!: THREE.Scene;
  private camera!: THREE.Camera;

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
  async initialize(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn("PostProcessingService already initialized");
      return;
    }

    this.logger.info("Initializing PostProcessingService");

    // Store shared objects
    this.scene = scene;
    this.camera = camera;

    // Create render target for scene rendering
    this.renderTarget = new THREE.WebGLRenderTarget(
      this.config.renderTargetWidth,
      this.config.renderTargetHeight
    );

    // Create composer with shared renderer
    this.composer = new EffectComposer(renderer);

    // Build the effects pipeline
    await this.buildPipeline();

    this.isInitialized = true;
    this.logger.info("PostProcessingService initialized successfully");
  }

  @logMethod
  @catchError
  private async buildPipeline(): Promise<void> {
    // Clear existing passes and results
    this.composer.passes = [];
    this.passResults.clear();

    for (const passConfig of this.config.passes) {
      if (!passConfig.enabled) continue;

      try {
        const pass = await this.createPass(passConfig);
        if (pass) {
          this.composer.addPass(pass);

          // Store pass result if it has a name
          if (passConfig.name) {
            // For passes that have render targets (like UnrealBloomPass), store their texture
            if ('renderTarget' in pass && (pass as unknown as { renderTarget: THREE.WebGLRenderTarget }).renderTarget) {
              this.passResults.set(passConfig.name, (pass as unknown as { renderTarget: THREE.WebGLRenderTarget }).renderTarget.texture);
              this.logger.debug(`Stored pass result: ${passConfig.name}`);
            }
          }

          this.logger.debug(`Added pass: ${passConfig.type}`);
        }
      } catch (error) {
        this.logger.error(`Failed to create pass ${passConfig.type}`, { error });
      }
    }

    // Connect dependencies between passes
    this.connectPassDependencies();

    this.logger.info(`Built post-processing pipeline with ${this.composer.passes.length} passes`);
  }

  @logMethod
  @catchError
  private connectPassDependencies(): void {
    // Iterate through passes to connect dependencies
    for (let i = 0; i < this.composer.passes.length; i++) {
      const pass = this.composer.passes[i];
      const passConfig = this.config.passes[i];

      // Handle ShaderPass dependencies
      if (pass instanceof ShaderPass && passConfig.uniforms) {
        for (const uniformName in passConfig.uniforms) {
          const uniformValue = passConfig.uniforms[uniformName].value;

          // If uniform value is null and we have a stored pass result with that name
          if (uniformValue === null && this.passResults.has(uniformName)) {
            pass.uniforms[uniformName].value = this.passResults.get(uniformName);
            this.logger.debug(`Connected dependency: ${uniformName} for pass ${passConfig.type}`);
          }
        }
      }
    }
  }

  @logMethod
  @catchError
  private async createPass(passConfig: PostProcessingPass): Promise<Pass | null> {
    switch (passConfig.type) {
      case 'RenderPass':
        // RenderPass uses the shared scene and camera
        return new RenderPass(this.scene, this.camera);

      case 'UnrealBloomPass':
        return new UnrealBloomPass(
          new THREE.Vector2(this.config.renderTargetWidth, this.config.renderTargetHeight),
          passConfig.params?.strength || 1.5,
          passConfig.params?.radius || 0.4,
          passConfig.params?.threshold || 0.85
        );

      case 'ShaderPass': {
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
      }

      default:
        this.logger.warn(`Unknown pass type: ${passConfig.type}`);
        return null;
    }
  }

  @logMethod
  @catchError
  private parseShader(shaderSource: string): { uniforms: Record<string, { value: unknown }>, vertexShader: string, fragmentShader: string } {
    // For ShaderPass, we need both vertex and fragment shaders
    // If the file contains ---FRAGMENT--- separator, split it
    // Otherwise, assume it's just a fragment shader and use default vertex shader
    let vertexShader: string;
    let fragmentShader: string;

    if (shaderSource.includes('---FRAGMENT---')) {
      const parts = shaderSource.split('---FRAGMENT---');
      vertexShader = parts[0].trim();
      fragmentShader = parts[1].trim();
    } else {
      // Use default pass-through vertex shader
      vertexShader = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `.trim();
      fragmentShader = shaderSource.trim();
    }

    return {
      uniforms: {
        tDiffuse: { value: null }
      },
      vertexShader,
      fragmentShader,
    };
  }

  @logMethod
  @catchError
  render(): void {
    if (!this.isInitialized) {
      throw new Error("PostProcessingService must be initialized before rendering");
    }

    const startTime = performance.now();

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