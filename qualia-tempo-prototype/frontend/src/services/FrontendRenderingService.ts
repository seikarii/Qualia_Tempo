/**
 * QUALIA.CODE v1.1 - FrontendRenderingService
 * Three.js-based real-time visualization servi    // Create render target for post-processing
    // NOTE: Render target is managed by PostProcessingService

    // Initialize post-processing service
    await this.postProcessingService.initialize(canvas);

    // Setup WebGL context loss/restore handlers - REMOVED: No direct renderer access

    // Initialize particle system
    this.initializeParticleSystem();

    this.isInitialized = true;
    this.logger.info("FrontendRenderingService initialized successfully");po.
 * Renders particle effects based on streamed QualiaState data.
 *
 * IMPROVEMENTS:
 * - WebGL context resilience with automatic recovery
 * - Full platform abstraction via IPerformanceService
 * - Externalized configuration (no hardcoded values)
 * - Optimized decorator usage for performance
 * - Enhanced error boundaries and validation
 */

import { injectable, inject } from "inversify";
import * as THREE from "three";
import { TYPES } from "./inversify.types";
import type {
  IFrontendRenderingService,
  RenderingStats,
} from "./interfaces/IFrontendRenderingService";
import type { ILogger } from "./interfaces/ILogger";
import type { IPerformanceService } from "./interfaces/IPerformanceService";
import type { IPostProcessingService } from "./interfaces/IPostProcessingService";
import type { IEventBus } from "./interfaces/IEventBus";
import type { IShaderLoaderService } from "./interfaces/IShaderLoaderService";
import type { IShaderIntrospectionService } from "./interfaces/IShaderIntrospectionService";
import type { FrontendRenderingConfig, FrontendRenderingServiceParams } from "./contracts/IFrontendRenderingService.contracts";
import type { 
  QualiaParticleDataReceivedEvent,
  WebGLContextLostEvent,
  WebGLContextRestoredEvent 
} from "./contracts/events.contracts";
import { logMethod, catchError, measureTime, BrowserOnly, OnEvent, IBaseService, initializeEventSubscriptions, cleanupEventSubscriptions } from "../utils/decorators";

@injectable()
export class FrontendRenderingService implements IFrontendRenderingService, IBaseService {
  private readonly logger: ILogger;
  private readonly performanceService: IPerformanceService;
  private readonly postProcessingService: IPostProcessingService;
  private readonly eventBus: IEventBus;
  private readonly shaderLoader: IShaderLoaderService;
  private readonly shaderIntrospection: IShaderIntrospectionService;
  private readonly config: FrontendRenderingConfig;

  // Three.js core objects
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  // Rendering state
  private isInitialized = false;
  private isRunning = false;
  private animationId: number | null = null;

  // Particle system - CRISALIDA.CODE v1.1: Using ShaderMaterial for G-Buffer rendering
  private particleSystem!: THREE.Points;
  private particleGeometry!: THREE.BufferGeometry;
  private particleMaterial!: THREE.ShaderMaterial;

  // Phase 3: Previous frame matrices for velocity calculation
  private previousViewMatrix: THREE.Matrix4;
  private previousProjectionMatrix: THREE.Matrix4;

  // Performance tracking
  private frameCount = 0;
  private lastTime = 0;
  private fps = 0;
  private frameTime = 0;

  // QUALIA.CODE v1.1: Required for @OnEvent lifecycle
  public _eventListeners: string[] = [];

  constructor(
    @inject(TYPES.FrontendRenderingServiceParams) params: FrontendRenderingServiceParams
  ) {
    this.logger = params.logger;
    this.performanceService = params.performanceService;
    this.postProcessingService = params.postProcessingService;
    this.eventBus = params.eventBus;
    this.shaderLoader = params.shaderLoader;
    this.shaderIntrospection = params.shaderIntrospection;
    this.config = params.config;

    // Phase 3: Initialize previous frame matrices (identity on first frame)
    this.previousViewMatrix = new THREE.Matrix4();
    this.previousProjectionMatrix = new THREE.Matrix4();

    this.logger.info(this.config.messages.serviceInitialized);
  }

  /**
   * Create WebGL 2.0 context and Three.js renderer
   * @param canvas Target canvas element
   * @returns Configured WebGLRenderer
   */
  private createWebGL2Renderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
    // QUALIA.CODE: Explicit WebGL 2.0 context request ensures modern shader features (sampler3D, etc.)
    const context = canvas.getContext('webgl2');
    if (!context) {
      throw new Error('WebGL 2.0 not supported. Modern browser required.');
    }
    
    const renderer = new THREE.WebGLRenderer({
      canvas,
      context,
      antialias: this.config.antialias
    });
    
    this.logger.info('WebGL 2.0 context successfully initialized');
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(this.config.devicePixelRatio);
    renderer.setClearColor(this.config.backgroundColor);
    
    return renderer;
  }

  @logMethod
  @catchError
  @measureTime
  @BrowserOnly
  async initializeRenderer(canvas: HTMLCanvasElement): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn(this.config.messages.alreadyInitialized);
      return;
    }

    this.logger.info("Initializing FrontendRenderingService");

    // Create WebGL 2.0 renderer
    this.renderer = this.createWebGL2Renderer(canvas);

    // Create scene
    this.scene = new THREE.Scene();

    // Create camera with configuration
    this.camera = new THREE.PerspectiveCamera(
      this.config.cameraFov,
      canvas.clientWidth / canvas.clientHeight,
      this.config.cameraNear,
      this.config.cameraFar
    );
    this.camera.position.z = this.config.cameraDistance;

    // Initialize post-processing service with shared renderer
    await this.postProcessingService.initialize(this.renderer, this.scene, this.camera);

    // Setup WebGL context loss/restore handlers
    this.setupContextHandlers();

    // Initialize particle system - CRISALIDA.CODE v1.1: Now async for shader loading
    await this.initializeParticleSystem();

    this.isInitialized = true;
    this.logger.info("FrontendRenderingService initialized successfully");
  }

  @logMethod
  @catchError
  @measureTime
  updateParticleBuffer(data: Float32Array): void {
    if (!this.isInitialized) {
      this.logger.warn("Cannot update particle buffer: service not initialized");
      return;
    }

    try {
      this.decodeParticleData(data);
    } catch (error) {
      this.logger.error("Failed to update particle buffer", { error });
    }
  }

  /**
   * Decode binary particle data and update geometry buffers
   */
  @logMethod
  private decodeParticleData(data: Float32Array): void {
    // Data is already a Float32Array from the event
    const floatArray = data;
    
    // Validate data length
    if (floatArray.length % this.config.componentsPerParticle !== 0) {
      this.logger.error(
        `Invalid particle data length: ${floatArray.length}, expected multiple of ${this.config.componentsPerParticle}`
      );
      return;
    }

    const particleCount = floatArray.length / this.config.componentsPerParticle;
    
    // Extract rendering data
    this.extractRenderingData(floatArray, particleCount);
    
    this.logger.debug(`Updated particle buffer with ${particleCount} particles`);
  }

  /**
   * Extract position, color, and size data for rendering
   */
  @logMethod
  private extractRenderingData(floatArray: Float32Array, particleCount: number): void {
    // Extract position, color, and size for rendering
    const positions = new Float32Array(particleCount * this.config.positionComponents);
    const colors = new Float32Array(particleCount * this.config.colorComponents);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const offset = i * this.config.componentsPerParticle;
      
      // Position (x, y, z)
      positions[i * this.config.positionComponents] = floatArray[offset + this.config.positionOffset];
      positions[i * this.config.positionComponents + 1] = floatArray[offset + this.config.positionOffset + 1];
      positions[i * this.config.positionComponents + 2] = floatArray[offset + this.config.positionOffset + 2];
      
      // Color (r, g, b) - use RGB for now
      colors[i * this.config.colorComponents] = floatArray[offset + this.config.colorOffset];     // r
      colors[i * this.config.colorComponents + 1] = floatArray[offset + this.config.colorOffset + 1]; // g
      colors[i * this.config.colorComponents + 2] = floatArray[offset + this.config.colorOffset + 2]; // b
      
      // Size
      sizes[i] = floatArray[offset + this.config.sizeOffset];
    }

    this.updateGeometryBuffers(positions, colors, sizes);
  }

  /**
   * Update Three.js geometry buffers with extracted data
   */
  @logMethod
  private updateGeometryBuffers(positions: Float32Array, colors: Float32Array, sizes: Float32Array): void {
    // Update geometry buffers
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, this.config.positionComponents));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, this.config.colorComponents));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Mark for update
    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.particleGeometry.attributes.size.needsUpdate = true;
  }

    // Event handlers removed - particle data handled by StateStreamingService

    // WebGL context handlers removed - handled by PostProcessingService

    // WebGL context handlers removed - handled by PostProcessingService

    // Context loss recovery removed - handled by PostProcessingService

  /**
   * CRISALIDA.CODE v1.1 - Phase 2: G-Buffer Activation
   * Initialize particle system with ShaderMaterial for deferred rendering
   */
  @logMethod
  @catchError
  private async initializeParticleSystem(): Promise<void> {
    // Create and populate particle geometry
    this.particleGeometry = this.createParticleGeometry();
    
    // Load and create shader material
    this.particleMaterial = await this.createParticleShaderMaterial();

    // Create particle system and add to scene
    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particleSystem);
    
    this.logger.info(`Initialized particle system with ${this.config.particleCount} particles using G-Buffer shader`);
  }

  /**
   * Create and populate particle geometry with random attributes
   * QUALIA.CODE: Extracted method to reduce complexity (complexity: 3)
   */
  private createParticleGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.config.particleCount * 3);
    const colors = new Float32Array(this.config.particleCount * 3);
    const sizes = new Float32Array(this.config.particleCount);
    const materialProps = new Float32Array(this.config.particleCount * 2);

    for (let i = 0; i < this.config.particleCount; i++) {
      this.initializeParticleAttributes({ index: i, positions, colors, sizes, materialProps });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('materialProps', new THREE.BufferAttribute(materialProps, 2));

    return geometry;
  }

  /**
   * Initialize random attributes for a single particle
   * QUALIA.CODE: Extracted method (complexity: 1, params object to avoid max-params violation)
   */
  private initializeParticleAttributes(params: {
    index: number;
    positions: Float32Array;
    colors: Float32Array;
    sizes: Float32Array;
    materialProps: Float32Array;
  }): void {
    const { index, positions, colors, sizes, materialProps } = params;
    
    // Position
    positions[index * 3] = (Math.random() - 0.5) * this.config.particlePositionRange;
    positions[index * 3 + 1] = (Math.random() - 0.5) * this.config.particlePositionRange;
    positions[index * 3 + 2] = (Math.random() - 0.5) * this.config.particlePositionRange;

    // Color
    colors[index * 3] = Math.random();
    colors[index * 3 + 1] = Math.random();
    colors[index * 3 + 2] = Math.random();

    // Size
    sizes[index] = Math.random() * (this.config.particleSizeMax - this.config.particleSizeMin) + this.config.particleSizeMin;
    
    // Material properties (metallic, roughness)
    const metallicRange = this.config.particleMetallicMax - this.config.particleMetallicMin;
    const roughnessRange = this.config.particleRoughnessMax - this.config.particleRoughnessMin;
    materialProps[index * 2] = Math.random() * metallicRange + this.config.particleMetallicMin;
    materialProps[index * 2 + 1] = Math.random() * roughnessRange + this.config.particleRoughnessMin;
  }

  /**
   * Load gbuffer_particles shader and create RawShaderMaterial
   * QUALIA.CODE: Extracted method to reduce complexity (complexity: 2)
   * 
   * CRITICAL: Uses RawShaderMaterial for GLSL 300 es (WebGL 2.0) shaders.
   * RawShaderMaterial does NOT prepend Three.js shader chunks, allowing
   * #version to remain at the top as required by GLSL specification.
   */
  private async createParticleShaderMaterial(): Promise<THREE.ShaderMaterial> {
    const shaderSource = await this.shaderLoader.load('gbuffer_particles');
    const shader = await this.shaderIntrospection.introspect(shaderSource);

    // CRITICAL: Use RawShaderMaterial for GLSL 300 es to prevent Three.js from
    // prepending shader chunks that would push #version directive down
    return new THREE.RawShaderMaterial({
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      uniforms: {
        ...shader.uniforms,
        particleScale: { value: this.config.particleScale },
        cameraNear: { value: this.camera.near },
        cameraFar: { value: this.camera.far },
        time: { value: 0.0 },
        // Phase 3: Previous frame matrices for velocity calculation
        prevViewMatrix: { value: this.previousViewMatrix },
        prevProjectionMatrix: { value: this.previousProjectionMatrix }
      },
      transparent: true,
      depthWrite: true,
      depthTest: true,
      blending: THREE.NormalBlending,
      glslVersion: THREE.GLSL3 // Explicitly specify GLSL 3.0 (WebGL 2.0)
    }) as THREE.ShaderMaterial; // Type assertion for compatibility
  }

  /**
   * QUALIA.CODE v1.1: Platform Abstraction - WebGL Context Handlers
   * 
   * Setup handlers for WebGL context loss/restoration.
   * While these are canvas-specific events (not global browser events),
   * we emit events on the EventBus for system-wide observability.
   */
  @logMethod
  @BrowserOnly
  private setupContextHandlers(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('webglcontextlost', (event) => {
      this.logger.warn(this.config.messages.contextLost);
      event.preventDefault();
      this.handleContextLost(canvas);
    });

    canvas.addEventListener('webglcontextrestored', () => {
      this.logger.info(this.config.messages.contextRestored);
      this.handleContextRestored(canvas);
    });
  }

  @logMethod
  private handleContextLost(canvas: HTMLCanvasElement): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      this.performanceService.cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // QUALIA.CODE v1.1: Emit event for system-wide observability
    const lostEvent: WebGLContextLostEvent = {
      type: 'WebGLContextLost',
      timestamp: new Date(),
      source: 'FrontendRenderingService',
      canvas
    };
    this.eventBus.emit(lostEvent);
  }

  @logMethod
  private async handleContextRestored(canvas: HTMLCanvasElement): Promise<void> {
    try {
      this.logger.info(this.config.messages.reinitializing);

      // Force renderer to reinitialize
      this.renderer.forceContextRestore();

      // Reinitialize post-processing with restored renderer
      await this.postProcessingService.initialize(this.renderer, this.scene, this.camera);

      this.logger.info("WebGL context restored successfully");

      // QUALIA.CODE v1.1: Emit event for system-wide observability
      const restoredEvent: WebGLContextRestoredEvent = {
        type: 'WebGLContextRestored',
        timestamp: new Date(),
        source: 'FrontendRenderingService',
        canvas
      };
      this.eventBus.emit(restoredEvent);
    } catch (error) {
      this.logger.error("Failed to restore WebGL context", { error });
    }
  }

  @logMethod
  start(): void {
    if (!this.isInitialized) {
      throw new Error("FrontendRenderingService must be initialized before starting");
    }

    if (this.isRunning) {
      this.logger.warn("FrontendRenderingService already running");
      return;
    }

    this.isRunning = true;
    this.lastTime = this.performanceService.now();
    this.animate();

    // Subscribe to particle data events
    // QUALIA.CODE v1.1: @OnEvent subscriptions handled automatically

    this.logger.info("FrontendRenderingService started");
  }

  @logMethod
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.animationId !== null) {
      this.performanceService.cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.logger.info("FrontendRenderingService stopped");
  }

  @logMethod
  @measureTime
  resize(width: number, height: number): void {
    if (!this.isInitialized) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.postProcessingService.resize(width, height);
  }

  @logMethod
  getStats(): RenderingStats {
    return {
      fps: this.fps,
      frameTime: this.frameTime,
      triangles: this.config.particleCount,
      drawCalls: 1, // Single draw call for particles
    };
  }

  @logMethod
  @measureTime
  dispose(): void {
    this.stop();

    if (this.particleGeometry) {
      this.particleGeometry.dispose();
    }

    if (this.particleMaterial) {
      this.particleMaterial.dispose();
    }

    this.postProcessingService.dispose();

    this.isInitialized = false;
    this.logger.info("FrontendRenderingService disposed");
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationId = this.performanceService.requestAnimationFrame(this.animate);

    const currentTime = this.performanceService.now();
    const deltaTime = currentTime - this.lastTime;

    // Update FPS calculation
    this.frameCount++;
    if (deltaTime >= this.config.fpsUpdateInterval) {
      this.fps = (this.frameCount * this.config.fpsUpdateInterval) / deltaTime;
      this.frameTime = deltaTime / this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    // CRISALIDA.CODE v1.1: Update time uniform for G-Buffer particle shader animations
    if (this.particleMaterial?.uniforms.time) {
      this.particleMaterial.uniforms.time.value = currentTime * 0.001; // Convert to seconds
    }

    // Rotate camera slowly for dynamic view
    this.camera.position.x = Math.cos(currentTime * this.config.cameraOrbitSpeed) * this.config.cameraOrbitRadius;
    this.camera.position.z = Math.sin(currentTime * this.config.cameraOrbitSpeed) * this.config.cameraOrbitRadius;
    // QUALIA.CODE v1.1: Use externalized configuration for camera look-at target
    this.camera.lookAt(...this.config.scene.lookAtTarget);

    // Phase 3: Update camera matrices (needed before rendering)
    this.camera.updateMatrixWorld();
    this.camera.updateProjectionMatrix();

    // Phase 3: Store current matrices as "previous" for next frame
    // This must happen BEFORE rendering so velocity calculation uses last frame's matrices
    this.previousViewMatrix.copy(this.camera.matrixWorldInverse);
    this.previousProjectionMatrix.copy(this.camera.projectionMatrix);

    // Render through post-processing pipeline
    this.postProcessingService.render(this.camera);
  };

  @logMethod
  @OnEvent('Qualia.ParticleData.Received')
  public _handleParticleDataReceived(event: QualiaParticleDataReceivedEvent): void {
    try {
      this.updateParticleBuffer(event.particleData);
    } catch (error) {
      this.logger.error("Failed to process particle data", { error, event });
    }
  }

  // QUALIA.CODE v1.1: IBaseService implementation
  public initialize(): void {
    this.logger.info('🚀 [FrontendRenderingService] Initializing service with @OnEvent lifecycle...');
    // Activa todas las suscripciones de eventos declaradas con @OnEvent
    initializeEventSubscriptions(this);
  }

  @logMethod
  public cleanup(): void {
    this.logger.info('🧹 [FrontendRenderingService] Cleaning up service...');
    // Limpia todas las suscripciones de eventos para prevenir memory leaks
    cleanupEventSubscriptions(this);
    // Additional cleanup for rendering resources
    if (this.isRunning) {
      this.stop();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.particleGeometry) {
      this.particleGeometry.dispose();
    }
    if (this.particleMaterial) {
      this.particleMaterial.dispose();
    }
  }
}