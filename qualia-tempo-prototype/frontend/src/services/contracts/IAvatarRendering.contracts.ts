/**
 * AVATAR RENDERING CONTRACTS
 * PHASE 5.5 - VISUALS.GOLD.CODE Phase 4
 * Defines visual data structures for procedural SDF avatars
 */

import { Vector3 } from 'three';

/**
 * Player avatar visual parameters for SDF raymarching shader
 * Maps QualiaState to crystalline geometric forms
 */
export interface PlayerAvatarVisuals {
  /** Avatar position in 3D space */
  position: Vector3;
  /** Avatar scale multiplier */
  scale: number;
  /** Shader parameters derived from QualiaState */
  shapeParams: {
    /** Precision (0-1) - Controls geometric crystallinity */
    precision: number;
    /** Flow (0-1) - Controls smooth rotation/animation speed */
    flow: number;
    /** Complexity (0-1) - Adds torus rings and crystalline facets */
    complexity: number;
  };
  /** Material color (base tint) */
  color: { r: number; g: number; b: number };
  /** Emissive glow intensity */
  emissive: number;
  /** Toggle transcendence fractal mode */
  useFractal: boolean;
}

/**
 * Boss avatar visual parameters for SDF raymarching shader
 * Maps BossState to organic distorted forms
 */
export interface BossAvatarVisuals {
  /** Avatar position in 3D space */
  position: Vector3;
  /** Avatar scale multiplier */
  scale: number;
  /** Shader parameters derived from BossState */
  shapeParams: {
    /** Chaos (0-1) - Controls domain warping and noise distortion */
    chaos: number;
    /** Aggression (0-1) - Adds tendrils, pulsing, subsurface scattering */
    aggression: number;
    /** Distortion multiplier (twist intensity) */
    distortion: number;
  };
  /** Material color (base tint) */
  color: { r: number; g: number; b: number };
  /** Emissive glow intensity */
  emissive: number;
  /** Animation time offset for per-boss variation */
  timeOffset: number;
}

/**
 * Mandelbulb fractal visual parameters for transcendence state
 * Triggered when QualiaState.transcendence > 0.9
 */
export interface MandelbulbVisuals {
  /** Fractal position in 3D space */
  position: Vector3;
  /** Fractal scale multiplier */
  scale: number;
  /** Fractal iteration count (4-12, higher = more detail) */
  iterations: number;
  /** Fractal power parameter (typically 8.0 for Mandelbulb) */
  power: number;
  /** Color gradient (golden → warm orange) */
  colorGradient: {
    inner: { r: number; g: number; b: number };
    outer: { r: number; g: number; b: number };
  };
  /** Rim lighting intensity for divine transcendence effect */
  rimLightIntensity: number;
  /** Outer glow radius */
  glowRadius: number;
}

/**
 * Avatar rendering configuration loaded from avatar-rendering.yaml
 */
export interface AvatarRenderingConfig {
  player_avatar: {
    material: {
      base_color: { r: number; g: number; b: number };
      metalness: number;
      roughness: number;
      emissive_multiplier: number;
    };
    raymarching: {
      max_steps: number;
      max_distance: number;
      hit_threshold: number;
    };
    lod: {
      high_distance: number;
      medium_distance: number;
      low_distance: number;
    };
  };
  boss_avatar: {
    material: {
      base_color: { r: number; g: number; b: number };
      metalness: number;
      roughness: number;
      emissive_multiplier: number;
    };
    raymarching: {
      max_steps: number;
      max_distance: number;
      hit_threshold: number;
    };
    lod: {
      high_distance: number;
      medium_distance: number;
      low_distance: number;
    };
  };
  mandelbulb: {
    fractal: {
      power: number;
      min_iterations: number;
      max_iterations: number;
      bailout: number;
    };
    material: {
      color_gradient_inner: { r: number; g: number; b: number };
      color_gradient_outer: { r: number; g: number; b: number };
      rim_light_intensity: number;
      glow_radius: number;
    };
    raymarching: {
      max_steps: number;
      max_distance: number;
      hit_threshold: number;
    };
  };
  lighting: {
    key_light: {
      color: { r: number; g: number; b: number };
      intensity: number;
      position: { x: number; y: number; z: number };
    };
    fill_light: {
      color: { r: number; g: number; b: number };
      intensity: number;
      position: { x: number; y: number; z: number };
    };
    rim_light: {
      color: { r: number; g: number; b: number };
      intensity: number;
      position: { x: number; y: number; z: number };
    };
    ambient: {
      color: { r: number; g: number; b: number };
      intensity: number;
    };
  };
  fog: {
    enabled: boolean;
    color: { r: number; g: number; b: number };
    near: number;
    far: number;
  };
}
