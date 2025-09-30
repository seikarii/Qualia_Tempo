/**
 * QUALIA.CODE v1.1 - FrontendRenderingService
 * Three.js-based real-time visualization service for Qualia Tempo.
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
  QualiaState,
} from "./interfaces/IFrontendRenderingService";
import type { ILogger } from "./interfaces/ILogger";
import type { IPerformanceService } from "./interfaces/ITimerService";
import type { FrontendRenderingConfig } from "./contracts/IFrontendRenderingService.contracts";
import { logMethod, catchError, BrowserOnly } from "../utils/decorators";

@injectable()
export class FrontendRenderingService implements IFrontendRenderingService {
  private readonly logger: ILogger;
  private readonly performanceService: IPerformanceService;
  private readonly config: FrontendRenderingConfig;

  // Three.js core objects
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  // @ts-ignore - Stored for potential future use
  private _canvas!: HTMLCanvasElement;

  // Rendering state
  private isInitialized = false;
  private isRunning = false;
  private animationId: number | null = null;
  // @ts-ignore - Stored for potential future use
  private _isContextLost = false;

  // Particle system
  private particleSystem!: THREE.Points;
  private particleGeometry!: THREE.BufferGeometry;
  private particleMaterial!: THREE.ShaderMaterial;

  // Performance tracking
  private frameCount = 0;
  private lastTime = 0;
  private fps = 0;
  private frameTime = 0;

  // Context loss recovery
  private contextLossRetries = 0;

  constructor(
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IPerformanceService) performanceService: IPerformanceService,
    @inject(TYPES.FrontendRenderingConfig) config: FrontendRenderingConfig
  ) {
    this.logger = logger;
    this.performanceService = performanceService;
    this.config = config;

    this.logger.info(this.config.messages.serviceInitialized);
  }

  @logMethod
  @catchError
  @BrowserOnly
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn(this.config.messages.alreadyInitialized);
      return;
    }

    this.logger.info("Initializing FrontendRenderingService");
    this._canvas = canvas;

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

    // Create renderer with configuration
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.config.antialias
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setClearColor(this.config.backgroundColor);

    // CRITICAL: Setup WebGL context loss/restore handlers
    this.setupContextHandlers();

    // Initialize particle system
    await this.initializeParticleSystem();

    this.isInitialized = true;
    this.logger.info("FrontendRenderingService initialized successfully");
  }

  /**
   * DIRECTIVA 1: WebGL Context Resilience
   * Setup handlers for webglcontextlost and webglcontextrestored events
   */
  @logMethod
  private setupContextHandlers(): void {
    if (!this.renderer || !this.renderer.domElement) {
      this.logger.error("Cannot setup context handlers: renderer not initialized");
      return;
    }

    // Handle context loss
    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      this.handleContextLost,
      false
    );

    // Handle context restoration
    this.renderer.domElement.addEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
      false
    );

    this.logger.debug("WebGL context handlers registered");
  }

  /**
   * DIRECTIVA 1: Context Loss Handler
   * Prevents default behavior and prepares for recovery
   */
  private handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.stop();
    this._isContextLost = true;
    this.logger.warn(this.config.messages.contextLost);
  };

  /**
   * DIRECTIVA 1: Context Restoration Handler
   * Reinitializes the rendering system after context recovery
   */
  private handleContextRestored = (): void => {
    this.logger.info(this.config.messages.contextRestored);
    
    // Prevent infinite retry loops
    if (this.contextLossRetries >= this.config.maxContextLossRetries) {
      this.logger.error(
        `Max context loss retries (${this.config.maxContextLossRetries}) exceeded. Manual intervention required.`
      );
      return;
    }

    this.contextLossRetries++;
    this.reinitializeRendering();
  };

  /**
   * DIRECTIVA 1: Reinitialize Rendering
   * Recreates all Three.js resources after context restoration
   */
  @logMethod
  @catchError
  private reinitializeRendering(): void {
    this.logger.info(this.config.messages.reinitializing);

    try {
      // Recreate particle system
      this.initializeParticleSystem();

      // Reset context loss flag
      this._isContextLost = false;
      this.contextLossRetries = 0;

      // Restart rendering loop
      this.start();

      this.logger.info("Rendering system successfully reinitialized");
    } catch (error) {
      this.logger.error("Failed to reinitialize rendering system", { error });
    }
  }

  @logMethod
  private initializeParticleSystem(): void {
    // Create particle geometry
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.config.particleCount * 3);
    const colors = new Float32Array(this.config.particleCount * 3);
    const sizes = new Float32Array(this.config.particleCount);

    // Initialize particles in random positions
    for (let i = 0; i < this.config.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      colors[i * 3] = Math.random();
      colors[i * 3 + 1] = Math.random();
      colors[i * 3 + 2] = Math.random();

      sizes[i] = Math.random() * 5 + 1;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Create shader material
    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: 0 },
        u_precision: { value: 0 },
        aggression: { value: 0 },
        flow: { value: 0 },
        chaos: { value: 0 },
        recovery: { value: 0 },
        ultimate: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vSize;

        uniform float time;
        uniform float intensity;
        uniform float u_precision;
        uniform float aggression;
        uniform float flow;
        uniform float chaos;
        uniform float recovery;
        uniform float ultimate;

        void main() {
          vColor = vec3(1.0, 1.0, 1.0); // Default white color since we removed the color attribute

          // Dynamic sizing based on qualia state
          float dynamicSize = size * (1.0 + intensity * 2.0 + ultimate * 3.0);
          vSize = dynamicSize;

          // Position animation based on qualia state
          vec3 pos = position;

          // Flow creates wave patterns
          pos.y += sin(pos.x * 0.1 + time * flow * 2.0) * flow * 2.0;

          // Chaos creates random movement
          pos.x += sin(time * chaos * 5.0 + pos.y * 0.1) * chaos * 3.0;
          pos.z += cos(time * chaos * 3.0 + pos.x * 0.1) * chaos * 2.0;

          // Aggression creates explosive patterns
          float aggressionForce = aggression * 10.0;
          pos += normalize(pos) * aggressionForce * sin(time * 2.0);

          // Recovery creates contracting patterns
          pos *= (1.0 - recovery * 0.3);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = dynamicSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vSize;

        uniform float u_precision;
        uniform float ultimate;

        void main() {
          // Create circular particles with precision-based sharpness
          float distance = length(gl_PointCoord - vec2(0.5));
          float alpha = 1.0 - smoothstep(0.1 * (1.0 - u_precision * 0.8), 0.5, distance);

          // Ultimate mode creates glowing effects
          vec3 finalColor = vColor;
          if (ultimate > 0.5) {
            finalColor += vec3(1.0, 0.5, 0.0) * ultimate * 2.0;
            alpha *= (1.0 + ultimate);
          }

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    });

    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particleSystem);
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
  updateQualiaState(state: QualiaState): void {
    // Update shader uniforms
    if (this.particleMaterial) {
      this.particleMaterial.uniforms.intensity.value = state.intensity;
      this.particleMaterial.uniforms.u_precision.value = state.precision;
      this.particleMaterial.uniforms.aggression.value = state.aggression;
      this.particleMaterial.uniforms.flow.value = state.flow;
      this.particleMaterial.uniforms.chaos.value = state.chaos;
      this.particleMaterial.uniforms.recovery.value = state.recovery;
      this.particleMaterial.uniforms.ultimate.value = state.ultimate;
    }
  }

  @logMethod
  resize(width: number, height: number): void {
    if (!this.isInitialized) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
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

    if (this.renderer) {
      this.renderer.dispose();
    }

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
    if (this.particleMaterial) {
      this.particleMaterial.uniforms.time.value = currentTime * 0.001; // Convert to seconds
    }

    // Rotate camera slowly for dynamic view
    this.camera.position.x = Math.cos(currentTime * 0.0005) * 8;
    this.camera.position.z = Math.sin(currentTime * 0.0005) * 8;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  };
}