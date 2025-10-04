/**
 * QUALIA.CODE v3.2 - PostProcessingService
 * Dynamic post-processing pipeline graph engine using Three.js EffectComposer.
 * Loads pipeline configuration from YAML and orchestrates complex rendering graphs.
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
import type { IShaderIntrospectionService } from "./interfaces/IShaderIntrospectionService";
import type { IShaderLoaderService } from "./interfaces/IShaderLoaderService";
import type { IPerformanceService } from "./interfaces/IPerformanceService";
import type { PostProcessingConfig, PostProcessingPass, PostProcessingServiceParams } from "./contracts/IPostProcessingService.contracts";
import { logMethod, catchError, measureTime, BrowserOnly } from "../utils/decorators";
import { env } from "../utils/env";
import { GBufferPass } from "./postprocessing/GBufferPass.js";

@injectable()
export class PostProcessingService implements IPostProcessingService {
  private readonly logger: ILogger;
  private readonly shaderLoader: IShaderLoaderService;
  private readonly shaderIntrospection: IShaderIntrospectionService;
  private readonly config: PostProcessingConfig;
  private readonly performanceService: IPerformanceService;

  private isInitialized = false;

  // Dynamic pipeline graph storage
  private readonly pipelines = new Map<string, EffectComposer>();
  private readonly renderTargets = new Map<string, { texture: THREE.Texture, renderTarget?: THREE.WebGLRenderTarget }>();

  // Shared objects from FrontendRenderingService
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  // Performance tracking
  private renderTime = 0;

  constructor(
    @inject(TYPES.PostProcessingServiceParams) params: PostProcessingServiceParams
  ) {
    this.logger = params.logger;
    this.shaderLoader = params.shaderLoader;
    this.shaderIntrospection = params.shaderIntrospection;
    this.config = params.config;
    this.performanceService = params.performanceService;
  }

  @logMethod
  @catchError
  @BrowserOnly
  async initialize(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn("PostProcessingService already initialized");
      return;
    }

    this.logger.info("Initializing PostProcessingService v3.2");

    // Store shared objects
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Build render targets from configuration
    this.buildRenderTargets();

    // Build pipelines from configuration
    await this.buildPipelines();

    // Connect pipeline dependencies
    this.connectPipelines();

    this.isInitialized = true;
    this.logger.info("PostProcessingService v3.2 initialized successfully");
  }

  @logMethod
  @catchError
  private buildRenderTargets(): void {
    this.logger.debug("Building render targets from configuration");

    for (const rtConfig of this.config.renderTargets) {
      const options: THREE.RenderTargetOptions = {
        type: this.mapTextureType(rtConfig.format),
        minFilter: this.mapMinFilter(rtConfig.options?.minFilter),
        magFilter: this.mapMagFilter(rtConfig.options?.magFilter),
        // Añadir wrapS, wrapT si se definen en el contrato
      };

      const renderTarget = new THREE.WebGLRenderTarget(
        rtConfig.width,
        rtConfig.height,
        options
      );

      this.renderTargets.set(rtConfig.name, { texture: renderTarget.texture, renderTarget });
      this.logger.debug(`Created render target: ${rtConfig.name} (${rtConfig.width}x${rtConfig.height})`);
    }

    this.logger.info(`Built ${this.renderTargets.size} render targets`);
  }

  @logMethod
  @catchError
  private mapTextureType(format: 'HalfFloat' | 'Float' | 'UnsignedByte'): THREE.TextureDataType {
    switch (format) {
      case 'HalfFloat': return THREE.HalfFloatType;
      case 'Float': return THREE.FloatType;
      case 'UnsignedByte': return THREE.UnsignedByteType;
      default: return THREE.UnsignedByteType;
    }
  }

  @logMethod
  @catchError
  private mapMinFilter(filter?: 'Linear' | 'Nearest'): THREE.MinificationTextureFilter | undefined {
    if (!filter) return undefined;
    return filter === 'Linear' ? THREE.LinearFilter : THREE.NearestFilter;
  }

  @logMethod
  @catchError
  private mapMagFilter(filter?: 'Linear' | 'Nearest'): THREE.MagnificationTextureFilter | undefined {
    if (!filter) return undefined;
    return filter === 'Linear' ? THREE.LinearFilter : THREE.NearestFilter;
  }

  @logMethod
  @catchError
  private async buildPipelines(): Promise<void> {
    this.logger.debug("Building pipelines from configuration");

    for (const pipelineConfig of this.config.pipelines) {
      let composer: EffectComposer;
      const outputTarget = this.renderTargets.get(pipelineConfig.output);

      if (pipelineConfig.output === 'screen') {
        // Este pipeline renderiza a la pantalla
        composer = new EffectComposer(this.renderer);
      } else if (outputTarget?.renderTarget) {
        // Este pipeline renderiza a un render target específico
        composer = new EffectComposer(this.renderer, outputTarget.renderTarget);
      } else {
        // Para pipelines productores como gbuffer
        composer = new EffectComposer(this.renderer);
        composer.renderToScreen = false;
      }

      // Add passes to the pipeline
      for (const passConfig of pipelineConfig.passes) {
        if (!passConfig.enabled) continue;

        try {
          const pass = await this.createPass(passConfig);
          if (pass) {
            composer.addPass(pass);
            this.logger.debug(`Added pass ${passConfig.type} to pipeline ${pipelineConfig.name}`);
          }
        } catch (error) {
          this.logger.error(`Failed to create pass ${passConfig.type} in pipeline ${pipelineConfig.name}`, { error });
          if (env.isDev) {
            throw error;
          }
        }
      }

      this.pipelines.set(pipelineConfig.name, composer);
      this.logger.debug(`Built pipeline: ${pipelineConfig.name} with ${composer.passes.length} passes -> output: ${pipelineConfig.output}`);
    }

    this.logger.info(`Built ${this.pipelines.size} pipelines`);
  }

  @logMethod
  @catchError
  private connectPipelines(): void {
    this.logger.debug("Connecting pipeline dependencies");

    for (const [pipelineName, composer] of this.pipelines) {
      const pipelineConfig = this.config.pipelines.find(p => p.name === pipelineName);
      if (!pipelineConfig) continue;

      // Connect pass dependencies within this pipeline
      for (let i = 0; i < composer.passes.length; i++) {
        const pass = composer.passes[i];
        const passConfig = pipelineConfig.passes[i];

        // Handle ShaderPass uniform connections
        if (pass instanceof ShaderPass && passConfig.uniforms) {
          for (const uniformName in passConfig.uniforms) {
            const uniformValue = passConfig.uniforms[uniformName].value;

            // If uniform references a render target by name
            if (typeof uniformValue === 'string') {
              const renderTarget = this.renderTargets.get(uniformValue);
              if (renderTarget) {
                pass.uniforms[uniformName].value = renderTarget.texture;
                this.logger.debug(`Connected render target ${uniformValue} to uniform ${uniformName} in pipeline ${pipelineName}`);
              }
            }
          }
        }
      }
    }

    this.logger.info("Pipeline dependencies connected");
  }

  @logMethod
  @catchError
  /**
   * Create post-processing pass from configuration
   * QUALIA.CODE COMPLIANT: Extract Method Pattern (58→20 lines, 66% reduction)
   */
  private async createPass(passConfig: PostProcessingPass): Promise<Pass | null> {
    switch (passConfig.type) {
      case 'RenderPass':
        return this.createRenderPass();

      case 'UnrealBloomPass':
        return this.createUnrealBloomPass(passConfig);

      case 'ShaderPass':
        return await this.createShaderPass(passConfig);

      case 'GBufferPass':
        return await this.createGBufferPass();

      default:
        this.logger.warn(`Unknown pass type: ${passConfig.type}`);
        return null;
    }
  }

  /**
   * Create basic render pass using shared scene and camera
   */
  private createRenderPass(): Pass {
    return new RenderPass(this.scene, this.camera);
  }

  /**
   * Create unreal bloom pass with configured parameters
   */
  private createUnrealBloomPass(passConfig: PostProcessingPass): Pass {
    return new UnrealBloomPass(
      new THREE.Vector2(this.config.renderTargetWidth, this.config.renderTargetHeight),
      (typeof passConfig.params?.strength === 'number' ? passConfig.params.strength : 1.5),
      (typeof passConfig.params?.radius === 'number' ? passConfig.params.radius : 0.4),
      (typeof passConfig.params?.threshold === 'number' ? passConfig.params.threshold : 0.85)
    );
  }

  /**
   * Create shader pass with introspected shader and auto-connected uniforms
   */
  private async createShaderPass(passConfig: PostProcessingPass): Promise<Pass> {
    if (!passConfig.shader) {
      throw new Error('ShaderPass requires shader name');
    }

    const shaderSource = await this.shaderLoader.load(passConfig.shader);
    const shader = this.shaderIntrospection.introspect(shaderSource);

    // Merge uniforms from config
    shader.uniforms = { ...shader.uniforms, ...passConfig.uniforms };

    // Add auto-connected uniforms
    this.addAutoConnectedUniforms(shader);

    return new ShaderPass(shader);
  }

  /**
   * Create G-Buffer pass for deferred rendering
   */
  private async createGBufferPass(): Promise<Pass> {
    const shaderSource = await this.shaderLoader.load('gbuffer');
    const shader = this.shaderIntrospection.introspect(shaderSource);
    return new GBufferPass({
      scene: this.scene,
      camera: this.camera,
      width: this.config.renderTargetWidth,
      height: this.config.renderTargetHeight,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      uniforms: shader.uniforms
    });
  }

  /**
   * Add auto-connected uniforms to shader (camera matrices, resolution, etc.)
   */
  private addAutoConnectedUniforms(shader: { uniforms: Record<string, { value: unknown }> }): void {
    shader.uniforms.projectionMatrix = { value: new THREE.Matrix4() };
    shader.uniforms.viewMatrix = { value: new THREE.Matrix4() };
    shader.uniforms.cameraNear = { value: this.camera.near };
    shader.uniforms.cameraFar = { value: this.camera.far };
    shader.uniforms.resolution = { value: new THREE.Vector2(this.config.renderTargetWidth, this.config.renderTargetHeight) };
  }

  /**
   * QUALIA.CODE v4.2: Update pipeline inputs from render targets map
   * Updates ShaderPass uniforms that reference render targets by name
   */
  private _updatePipelineInputsFromMap(): void {
    for (const [pipelineName, composer] of this.pipelines) {
      for (const pass of composer.passes) {
        if (pass instanceof ShaderPass && pass.uniforms) {
          for (const uniformName in pass.uniforms) {
            const uniformValue = pass.uniforms[uniformName].value;
            if (typeof uniformValue === 'string') {
              const renderTarget = this.renderTargets.get(uniformValue);
              if (renderTarget) {
                pass.uniforms[uniformName].value = renderTarget.texture;
                this.logger.debug(`Updated uniform ${uniformName} in pipeline ${pipelineName} from map`);
              }
            }
          }
        }
      }
    }
  }

  /**
   * QUALIA.CODE v4.3: Update camera-related uniforms for all ShaderPasses
   */
  private _updateCameraUniforms(camera: THREE.PerspectiveCamera): void {
    for (const composer of this.pipelines.values()) {
      for (const pass of composer.passes) {
        if (pass instanceof ShaderPass && pass.uniforms) {
          if ('projectionMatrix' in pass.uniforms) {
            pass.uniforms.projectionMatrix.value = camera.projectionMatrix;
          }
          if ('viewMatrix' in pass.uniforms) {
            pass.uniforms.viewMatrix.value = camera.matrixWorldInverse;
          }
          if ('cameraNear' in pass.uniforms) {
            pass.uniforms.cameraNear.value = camera.near;
          }
          if ('cameraFar' in pass.uniforms) {
            pass.uniforms.cameraFar.value = camera.far;
          }
          if ('resolution' in pass.uniforms) {
            pass.uniforms.resolution.value.set(this.config.renderTargetWidth, this.config.renderTargetHeight);
          }
        }
      }
    }
  }

  @logMethod
  @catchError
  @measureTime
  @BrowserOnly
  render(camera: THREE.PerspectiveCamera): void {
    if (!this.isInitialized) {
      throw new Error("PostProcessingService must be initialized before rendering");
    }

    const startTime = this.performanceService.now();

    // Producer: Render gbuffer pipeline to produce textures
    const gbufferPipeline = 'gbuffer_pipeline';
    const gbufferComposer = this.pipelines.get(gbufferPipeline);
    if (gbufferComposer) {
      gbufferComposer.render();

      // Update Map: Update renderTargets map with produced G-Buffer textures
      const gbufferPass = gbufferComposer.passes.find(p => p instanceof GBufferPass) as GBufferPass;
      if (gbufferPass) {
        this.renderTargets.set('gbuffer_color', { texture: gbufferPass.colorTexture });
        this.renderTargets.set('gbuffer_normal', { texture: gbufferPass.normalTexture });
        this.renderTargets.set('gbuffer_depth', { texture: gbufferPass.depthTexture });
        this.renderTargets.set('gbuffer_material', { texture: gbufferPass.materialTexture });
      }

      // Update uniforms from the updated map
      this._updatePipelineInputsFromMap();

      // Update camera uniforms
      this._updateCameraUniforms(camera);
    }

    // Consumer: Render other pipelines that consume the textures
    for (const pipelineName of (this.config.pipelineOrder || []).filter(name => name !== gbufferPipeline)) {
      const composer = this.pipelines.get(pipelineName);
      if (composer) {
        composer.render();
        this.logger.debug(`Rendered pipeline: ${pipelineName}`);
      } else {
        this.logger.warn(`Pipeline not found: ${pipelineName}`);
      }
    }

    this.renderTime = this.performanceService.now() - startTime;
  }

  @logMethod
  resize(width: number, height: number): void {
    if (!this.isInitialized) return;

    // Resize all render targets
    for (const [name, rtWrapper] of this.renderTargets) {
      if (rtWrapper.renderTarget) {
        rtWrapper.renderTarget.setSize(width, height);
        this.logger.debug(`Resized render target: ${name}`);
      }
    }

    // Resize all composers
    for (const [name, composer] of this.pipelines) {
      composer.setSize(width, height);
      this.logger.debug(`Resized pipeline: ${name}`);
    }
  }

  @logMethod
  dispose(): void {
    // Dispose all render targets
    for (const [name, rtWrapper] of this.renderTargets) {
      if (rtWrapper.renderTarget) {
        rtWrapper.renderTarget.dispose();
        this.logger.debug(`Disposed render target: ${name}`);
      }
    }
    this.renderTargets.clear();

    // Dispose all composers
    for (const [name, composer] of this.pipelines) {
      composer.dispose();
      this.logger.debug(`Disposed pipeline: ${name}`);
    }
    this.pipelines.clear();

    this.isInitialized = false;
    this.logger.info("PostProcessingService disposed");
  }

  @logMethod
  getStats(): { pipelines: number; renderTargets: number; renderTime: number } {
    return {
      pipelines: this.pipelines.size,
      renderTargets: this.renderTargets.size,
      renderTime: this.renderTime,
    };
  }
}