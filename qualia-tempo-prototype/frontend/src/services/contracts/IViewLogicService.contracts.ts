/**
 * QUALIA.CODE v1.1 - IViewLogicService Contracts
 * Type definitions for visual data processing and rendering properties.
 */

export interface BossVisualData {
  // Main boss properties
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  color: [number, number, number];
  opacity: number;
  intensity: number;
  phase: number;
  
  // Core-specific properties
  core: {
    scale: number;
    rotation: [number, number, number];
    color: [number, number, number];
    emissiveColor: [number, number, number]; 
    emissiveIntensity: number;
  };
  
  // Tentacles/appendages with segments
  tentacles: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
    segments: Array<{
      position: [number, number, number];
      rotation: [number, number, number];
      scale: number;
    }>;
  }>;
  
  // Power level particles
  powerParticles: Array<{
    position: [number, number, number];
    scale: number;
    opacity: number;
  }>;
  
  // Attack waves
  attackWaves: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
    opacity: number;
  }>;
  
  // Chaos aura
  chaosAura: {
    scale: number;
    opacity: number;
    color: [number, number, number];
  };
  
  // Attack states
  shouldShowAttack: boolean;
  attackIntensity: number;
}

export interface PlayerVisualData {
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  color: [number, number, number];
  glowIntensity: number;
  trailOpacity: number;
  isMoving: boolean;
  
  // Aura properties
  aura: {
    scale: number;
    rotation: [number, number, number];
    color: [number, number, number];
    opacity: number;
  };
  
  // Power core properties
  powerCore: {
    scale: number;
    rotation: [number, number, number];
    color: [number, number, number];
    emissiveIntensity: number;
  };
}

export interface ParticleData {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  color: [number, number, number, number]; // RGBA
  size: number;
  life: number;
  maxLife: number;
  type: 'qualia' | 'rhythm' | 'energy';
}

export interface NoteVisualData {
  id: string;
  position: [number, number, number];
  scale: [number, number, number];
  color: [number, number, number];
  opacity: number;
  pulseIntensity: number;
  approachProgress: number;
  geometryType: string; // For getGeometryForType selection
  rotation: [number, number, number];
  
  // Trail effect properties
  trail: {
    visible: boolean;
    color: [number, number, number];
    intensity: number;
    scale: number;
    opacity: number;
  };
  
  // State flags for rendering logic
  isActive: boolean;
  isInHitWindow: boolean;
  isMissed: boolean;
  isPerfectTiming: boolean;
}

export interface TileVisualData {
  key: string;
  position: [number, number, number];
  emissiveColor: [number, number, number];
  baseColor: [number, number, number];
  isPlayerTile: boolean;
  isActiveTile: boolean;
}

export interface GridVisualData {
  tiles: TileVisualData[];
  gridBorders: {
    size: number;
    color: [number, number, number];
  };
}

export interface QualiaFieldVisualData {
  // Field particles
  fieldParticles: {
    positions: Float32Array;
    colors: Float32Array;
    sizes: Float32Array;
    count: number;
    rotation: [number, number, number];
    materialSize: number;
    materialOpacity: number;
  };
  
  // Wave plane
  wavePlane: {
    positions: Float32Array;
    position: [number, number, number];
    rotation: [number, number, number];
    color: [number, number, number];
    opacity: number;
  };
  
  // Ambient light spheres
  ambientSpheres: Array<{
    position: [number, number, number];
    color: [number, number, number];
    opacity: number;
    scale: number;
  }>;
}

export interface ViewLogicConfig {
  particles: {
    maxCount: number;
    spawnRate: number;
    baseLifetime: number;
    assumedFrameTime: number;  // assumed frame time in milliseconds for 60fps
    frameTimeSeconds: number;  // frame time in seconds
  };
  boss: {
    baseScale: number;
    intensityMultiplier: number;
    phaseTransitionSpeed: number;
    particleMultiplier: number;
    particleAngleDivisor: number;
    baseRadius: number;
    radiusVariation: number;
    heightMultiplier: number;
    particleScale: number;
    particleOpacity: number;
  };
  player: {
    glowRange: [number, number];
    trailLength: number;
    movementSmoothness: number;
  };
  notes: {
    approachDistance: number;
    pulseFrequency: number;
    scaleRange: [number, number];
    rotationSpeed: number;
  };
  qualiaField: {
    gridSpacing: number;
    chaosSpread: number;
    orderRandomness: number;
    waveGridSize: number;
    wavePlaneSize: number;
    waveCenterOffset: number;
    waveFrequency: number;
    waveTimeMultiplier: number;
    waveAmplitudeAlpha: number;
    waveAmplitudeBeta: number;
    waveFrequencyX: number;
  };
}
