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
import type { IShaderLoaderService } from "./interfaces/IShaderLoaderService";
import type { PostProcessingConfig, PostProcessingPass } from "./contracts/IPostProcessingService.contracts";
import { logMethod, catchError, BrowserOnly } from "../utils/decorators";
import { GBufferPass } from "./postprocessing/GBufferPass.js";

@injectable()
export class PostProcessingService implements IPostProcessingService {
  private readonly logger: ILogger;
  private readonly shaderLoader: IShaderLoaderService;
  private readonly config: PostProcessingConfig;

  private isInitialized = false;

  // Dynamic pipeline graph storage
  private readonly pipelines = new Map<string, EffectComposer>();
  private readonly renderTargets = new Map<string, THREE.WebGLRenderTarget>();

  // Shared objects from FrontendRenderingService
  private renderer!: THREE.WebGLRenderer;
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

      this.renderTargets.set(rtConfig.name, renderTarget);
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
      } else if (outputTarget) {
        // Este pipeline renderiza a un render target específico
        composer = new EffectComposer(this.renderer, outputTarget);
        composer.renderToScreen = false; // CRÍTICO: Desactivar render a pantalla
      } else {
        this.logger.error(`Output render target '${pipelineConfig.output}' not found for pipeline '${pipelineConfig.name}'`);
        continue;
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
              if (this.renderTargets.has(uniformValue)) {
                pass.uniforms[uniformName].value = this.renderTargets.get(uniformValue)!.texture;
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

      case 'GBufferPass': {
        return new GBufferPass(this.scene, this.camera, this.config.renderTargetWidth, this.config.renderTargetHeight);
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

  /**
   * QUALIA.CODE v4.2: Just-in-time pipeline input connections
   * Connects G-Buffer textures directly from GBufferPass to dependent passes
   * Eliminates frame lag by connecting textures immediately before rendering
   */
  private _connectPipelineInputs(composer: EffectComposer): void {
    const gbufferPass = composer.passes.find(p => p instanceof GBufferPass) as GBufferPass;
    if (!gbufferPass) return;

    // Connect G-Buffer textures to all passes that need them
    for (const pass of composer.passes) {
      if (pass instanceof ShaderPass && pass.uniforms) {
        // Connect color texture
        if ('tDiffuse' in pass.uniforms) {
          pass.uniforms.tDiffuse.value = gbufferPass.targets.color;
        }
        // Connect normal texture
        if ('tNormal' in pass.uniforms) {
          pass.uniforms.tNormal.value = gbufferPass.targets.normal;
        }
        // Connect depth texture
        if ('tDepth' in pass.uniforms) {
          pass.uniforms.tDepth.value = gbufferPass.targets.depth;
        }
      }
    }
  }

  @logMethod
  @catchError
  render(): void {
    if (!this.isInitialized) {
      throw new Error("PostProcessingService must be initialized before rendering");
    }

    const startTime = performance.now();

    // Execute pipelines in the order defined in configuration
    for (const pipelineName of this.config.pipelineOrder || []) {
      const composer = this.pipelines.get(pipelineName);
      if (composer) {
        // QUALIA.CODE v4.2: Just-in-time pipeline connections
        // Connect G-Buffer textures directly before rendering each pipeline
        this._connectPipelineInputs(composer);

        composer.render();
        this.logger.debug(`Rendered pipeline: ${pipelineName}`);
      } else {
        this.logger.warn(`Pipeline not found: ${pipelineName}`);
      }
    }

    this.renderTime = performance.now() - startTime;
  }

  @logMethod
  resize(width: number, height: number): void {
    if (!this.isInitialized) return;

    // Resize all render targets
    for (const [name, renderTarget] of this.renderTargets) {
      renderTarget.setSize(width, height);
      this.logger.debug(`Resized render target: ${name}`);
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
    for (const [name, renderTarget] of this.renderTargets) {
      renderTarget.dispose();
      this.logger.debug(`Disposed render target: ${name}`);
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