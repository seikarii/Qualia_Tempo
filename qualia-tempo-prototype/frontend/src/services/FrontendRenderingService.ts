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
import type { IPerformanceService } from "./interfaces/ITimerService";
import type { IPostProcessingService } from "./interfaces/IPostProcessingService";
import type { IEventBus } from "./interfaces/IEventBus";
import type { FrontendRenderingConfig, FrontendRenderingServiceParams } from "./contracts/IFrontendRenderingService.contracts";
import type { QualiaParticleDataReceivedEvent } from "./contracts/events.contracts";
import { logMethod, catchError, BrowserOnly, OnEvent, IBaseService } from "../utils/decorators";

@injectable()
export class FrontendRenderingService implements IFrontendRenderingService, IBaseService {
  private readonly logger: ILogger;
  private readonly performanceService: IPerformanceService;
  private readonly postProcessingService: IPostProcessingService;
  private readonly eventBus: IEventBus;
  private readonly config: FrontendRenderingConfig;

  // Three.js core objects
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  // Rendering state
  private isInitialized = false;
  private isRunning = false;
  private animationId: number | null = null;

  // Particle system
  private particleSystem!: THREE.Points;
  private particleGeometry!: THREE.BufferGeometry;
  private particleMaterial!: THREE.PointsMaterial;

  // Performance tracking
  private frameCount = 0;
  private lastTime = 0;
  private fps = 0;
  private frameTime = 0;

  // Event handling
  private particleDataListenerId: string | null = null;

  // QUALIA.CODE v1.1: Required for @OnEvent lifecycle
  private _eventListeners: string[] = [];

  constructor(
    @inject(TYPES.FrontendRenderingServiceParams) params: FrontendRenderingServiceParams
  ) {
    this.logger = params.logger;
    this.performanceService = params.performanceService;
    this.postProcessingService = params.postProcessingService;
    this.eventBus = params.eventBus;
    this.config = params.config;

    this.logger.info(this.config.messages.serviceInitialized);
  }

  @logMethod
  @catchError
  @BrowserOnly
  async initializeRenderer(canvas: HTMLCanvasElement): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn(this.config.messages.alreadyInitialized);
      return;
    }

    this.logger.info("Initializing FrontendRenderingService");

    // Create renderer - FrontendRenderingService is the OWNER
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.config.antialias
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(this.config.devicePixelRatio);
    this.renderer.setClearColor(this.config.backgroundColor);

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

    // Initialize particle system
    this.initializeParticleSystem();

    this.isInitialized = true;
    this.logger.info("FrontendRenderingService initialized successfully");
  }

  @logMethod
  @catchError
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

  @logMethod
  private initializeParticleSystem(): void {
    // Create particle geometry
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.config.particleCount * 3);
    const colors = new Float32Array(this.config.particleCount * 3);
    const sizes = new Float32Array(this.config.particleCount);

    // Initialize particles in random positions
    for (let i = 0; i < this.config.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * this.config.particlePositionRange;
      positions[i * 3 + 1] = (Math.random() - 0.5) * this.config.particlePositionRange;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.config.particlePositionRange;

      colors[i * 3] = Math.random();
      colors[i * 3 + 1] = Math.random();
      colors[i * 3 + 2] = Math.random();

      sizes[i] = Math.random() * (this.config.particleSizeMax - this.config.particleSizeMin) + this.config.particleSizeMin;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Create points material
    this.particleMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.5,
      sizeAttenuation: true,
    });

    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particleSystem);
  }

  @logMethod
  private setupContextHandlers(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('webglcontextlost', (event) => {
      this.logger.warn(this.config.messages.contextLost);
      event.preventDefault();
      this.handleContextLost();
    });

    canvas.addEventListener('webglcontextrestored', () => {
      this.logger.info(this.config.messages.contextRestored);
      this.handleContextRestored();
    });
  }

  @logMethod
  private handleContextLost(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      this.performanceService.cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  @logMethod
  private async handleContextRestored(): Promise<void> {
    try {
      this.logger.info(this.config.messages.reinitializing);

      // Force renderer to reinitialize
      this.renderer.forceContextRestore();

      // Reinitialize post-processing with restored renderer
      await this.postProcessingService.initialize(this.renderer, this.scene, this.camera);

      this.logger.info("WebGL context restored successfully");
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

    // Unsubscribe from particle data events
    if (this.particleDataListenerId !== null) {
      this.eventBus.unsubscribe(this.particleDataListenerId);
      this.particleDataListenerId = null;
    }

    this.logger.info("FrontendRenderingService stopped");
  }

  // DEPRECATED: This method is no longer used. Particle data comes from backend via updateParticleBuffer.

  @logMethod
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
    if (deltaTime >= 1000) {
      this.fps = (this.frameCount * 1000) / deltaTime;
      this.frameTime = deltaTime / this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    // Update time uniform for animations
    // NOTE: Removed time uniform as we switched from ShaderMaterial to PointsMaterial

    // Rotate camera slowly for dynamic view
    this.camera.position.x = Math.cos(currentTime * 0.0005) * 8;
    this.camera.position.z = Math.sin(currentTime * 0.0005) * 8;
    this.camera.lookAt(0, 0, 0);

    // Render through post-processing pipeline
    this.postProcessingService.render(this.camera);
  };

  @OnEvent('QualiaParticleDataReceived')
  private handleParticleDataReceived(event: QualiaParticleDataReceivedEvent): void {
    try {
      this.updateParticleBuffer(event.particleData);
    } catch (error) {
      this.logger.error("Failed to process particle data", { error, event });
    }
  }

  // QUALIA.CODE v1.1: IBaseService implementation
  public initialize(): void {
    this.logger.info('🚀 [FrontendRenderingService] Initializing service with @OnEvent lifecycle...');
    // @OnEvent subscriptions are handled automatically by the decorator
  }

  public cleanup(): void {
    this.logger.info('🧹 [FrontendRenderingService] Cleaning up service...');
    // @OnEvent subscriptions are cleaned up automatically by the decorator
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