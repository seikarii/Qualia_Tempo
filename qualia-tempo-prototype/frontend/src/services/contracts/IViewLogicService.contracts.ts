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
  
  // Tentacles/appendages
  tentacles: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
  }>;
  
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
}

export interface ViewLogicConfig {
  particles: {
    maxCount: number;
    spawnRate: number;
    baseLifetime: number;
  };
  boss: {
    baseScale: number;
    intensityMultiplier: number;
    phaseTransitionSpeed: number;
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
  };
}
