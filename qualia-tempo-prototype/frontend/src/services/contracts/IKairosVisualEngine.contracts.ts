/**
 * QUALIA.CODE v1.1 - IKairosVisualEngine Contracts
 * Configuration contracts for the Kairos Visual Engine
 * 
 * ARCHITECTURE: Direct Configuration Injection pattern
 * REFERENCE: docs/VISUALS.GOLD.CODE.md
 * 
 * MISSION: Define all configuration for Three.js rendering engine
 */

/**
 * Render quality and performance configuration
 */
export interface RenderConfig {
  targetFPS: number; // Target framerate (default: 60)
  antialias: boolean; // Enable antialiasing
  pixelRatio: number; // Device pixel ratio multiplier (1-2)
  maxDevicePixelRatio: number; // Maximum device pixel ratio cap (prevents excessive resolution on high-DPI displays)
  shadowsEnabled: boolean; // Enable dynamic shadows
  shadowMapSize: number; // Shadow map resolution (512, 1024, 2048)
  toneMapping: 'None' | 'Linear' | 'Reinhard' | 'Cinematic' | 'ACESFilmic';
  toneMappingExposure: number; // Exposure adjustment (0.5-2.0)
}

/**
 * Lighting configuration
 */
export interface LightingConfig {
  ambientIntensity: number; // Ambient light intensity (default: 0.4)
  directionalIntensity: number; // Directional light intensity (default: 0.8)
  directionalPosition: { x: number; y: number; z: number }; // Directional light position
  shadowCameraNear: number; // Shadow camera near plane (default: 0.5)
  shadowCameraFar: number; // Shadow camera far plane (default: 500)
}

/**
 * SDF shader configuration
 */
export interface SdfShaderConfig {
  maxSteps: number; // Maximum raymarching steps (default: 64)
  maxDistance: number; // Maximum raymarch distance (default: 100.0)
  hitThreshold: number; // Surface hit threshold (default: 0.001)
}

/**
 * Camera configuration
 */
export interface CameraConfig {
  fov: number; // Field of view in degrees (default: 75)
  near: number; // Near clipping plane (default: 0.1)
  far: number; // Far clipping plane (default: 1000)
  position: { x: number; y: number; z: number }; // Initial camera position
  lookAt: { x: number; y: number; z: number }; // Camera target
}

/**
 * Post-processing effects configuration
 * VISUALS.GOLD.CODE: Controls which visual phases are active
 */
export interface EffectConfig {
  // PHASE 1: Atmospheric Effects
  bloomEnabled: boolean; // Advanced multi-pass bloom
  bloomThreshold: number; // Brightness threshold (default: 0.8)
  bloomIntensity: number; // Bloom strength (default: 1.5)
  bloomRadius: number; // Blur radius (default: 0.5)
  godRaysEnabled: boolean; // Volumetric lighting
  godRaysDecay: number; // Ray decay factor (default: 0.95)
  godRaysWeight: number; // Ray weight (default: 0.5)
  godRaysDensity: number; // Ray density (default: 0.8)
  godRaysExposure: number; // Ray exposure (default: 0.6)
  
  // PHASE 2: Audio Reactive (FFT)
  fftReactiveParticlesEnabled: boolean; // Enable FFT-reactive particles
  
  // PHASE 3: Reaction-Diffusion Ground
  reactionDiffusionEnabled: boolean; // Enable compute shader ground
  
  // PHASE 4: SDF Avatars
  sdfAvatarsEnabled: boolean; // Enable procedural avatars
  fractalMandelbulbEnabled: boolean; // Enable fractal transformation (transcendence > 0.9)
  
  // Standard post-processing
  taaEnabled: boolean; // Temporal Anti-Aliasing
  motionBlurEnabled: boolean; // Motion blur
  dofEnabled: boolean; // Depth of Field
  chromaticAberrationEnabled: boolean; // Chromatic aberration
  vignetteEnabled: boolean; // Vignette effect
}

/**
 * QualiaState to shader parameter mappings
 * VISUALS.GOLD.CODE: The heart of the visual system
 */
export interface QualiaStateMappingConfig {
  // PHASE 1: Bloom mappings
  intensityToBloomThreshold: {
    min: number; // QualiaState.intensity = 0 → threshold
    max: number; // QualiaState.intensity = 1 → threshold
  };
  transcendenceToBloomIntensity: {
    min: number; // QualiaState.transcendence = 0 → intensity
    max: number; // QualiaState.transcendence = 1 → intensity
  };
  
  // PHASE 1: God Rays mappings
  precisionToGodRaysSharpness: {
    min: number; // QualiaState.precision = 0 → blur
    max: number; // QualiaState.precision = 1 → sharp
  };
  aggressionToColorTint: {
    lowAggression: { r: number; g: number; b: number }; // Cool tones
    highAggression: { r: number; g: number; b: number }; // Warm/red tones
  };
  
  // PHASE 2: FFT mappings
  bassToParticleSizeMultiplier: {
    min: number; // FFT bass = 0 → size multiplier
    max: number; // FFT bass = 1 → size multiplier
  };
  midToVelocityMultiplier: {
    min: number; // FFT mid = 0 → velocity multiplier
    max: number; // FFT mid = 1 → velocity multiplier
  };
  trebleToEmissiveMultiplier: {
    min: number; // FFT treble = 0 → emissive
    max: number; // FFT treble = 1 → emissive
  };
  
  // PHASE 3: Reaction-Diffusion mappings
  chaosToDiffusionRate: {
    min: number; // QualiaState.chaos = 0 → stable patterns
    max: number; // QualiaState.chaos = 1 → chaotic patterns
  };
  flowToDirection: {
    magnitude: number; // How strongly flow affects direction
  };
  recoveryToKillRate: {
    min: number; // QualiaState.recovery = 0 → persistent patterns
    max: number; // QualiaState.recovery = 1 → patterns fade quickly
  };
  
  // PHASE 4: SDF Avatar mappings
  precisionFlowToPlayerShape: {
    smoothness: number; // How geometric vs organic (0-1)
  };
  chaosAggressionToBossShape: {
    distortion: number; // Noise amplitude (0-1)
  };
  transcendenceToFractalIterations: {
    threshold: number; // transcendence value to trigger fractal (default: 0.9)
    minIterations: number; // Minimum fractal iterations
    maxIterations: number; // Maximum fractal iterations
  };
}

/**
 * Performance optimization configuration
 */
export interface PerformanceConfig {
  enableLOD: boolean; // Level of Detail system
  enableFrustumCulling: boolean; // Frustum culling
  enableOcclusionCulling: boolean; // Occlusion culling
  maxParticles: number; // Maximum particle count (default: 10000)
  particleUpdateBatchSize: number; // Particles updated per frame (default: 1000)
  gpuInstancing: boolean; // Enable GPU instancing for particles
  computeShaderSupport: boolean; // Use compute shaders if available
}

/**
 * Development and debugging configuration
 */
export interface DevConfig {
  showStats: boolean; // Show FPS/draw calls stats
  shaderHotReload: boolean; // Enable shader hot-reload
  debugMode: boolean; // Enable debug helpers (axes, grid, bounding boxes)
  logPerformance: boolean; // Log performance metrics
}

/**
 * Complete Kairos Visual Engine Configuration
 * ARCHITECTURE: Loaded from kairos-visual.yaml
 */
export interface KairosVisualEngineConfig {
  render: RenderConfig;
  lighting: LightingConfig;
  sdfShader: SdfShaderConfig;
  camera: CameraConfig;
  effects: EffectConfig;
  qualiaMapping: QualiaStateMappingConfig;
  performance: PerformanceConfig;
  dev: DevConfig;
}

/**
 * Constructor parameters for Direct Configuration Injection
 * QUALIA.CODE v1.1: Services receive config directly, not via ConfigurationService
 */
export interface KairosVisualEngineParams {
  config: KairosVisualEngineConfig;
  logger: any; // ILogger (avoiding circular import)
  gameStateStore: any; // IGameStateStore (avoiding circular import)
  eventBus: any; // IEventBus (avoiding circular import)
  httpService: any; // IHttpService (avoiding circular import)
  particleSystemService: any; // IParticleSystemService (avoiding circular import)
  reactionDiffusionService: any; // IReactionDiffusionService (avoiding circular import)
  viewLogicService: any; // IViewLogicService (avoiding circular import) - PHASE 5.6
  performanceService: any; // IPerformanceService (avoiding circular import) - PHASE 5.6
}
