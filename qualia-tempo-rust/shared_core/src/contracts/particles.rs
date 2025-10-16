//! # Responsibility
//! Defines all particle system data structures for visual effects and optimization.
//!
//! ---
//!
//! This module implements the particle data model from DATA.RUST.md and GDD.md.
//! Particles are the primary visual feedback mechanism in Qualia Tempo, representing
//! Qualia energy, boss attacks, player abilities, and environmental effects.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use crate::utils::math::Vector3;

/// # Responsibility
/// Defines the blend mode for particle rendering.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ParticleBlendMode {
    Additive,
    Alpha,
    Multiply,
    Screen,
}

/// # Responsibility
/// Defines the shape of particle emission.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EmissionShape {
    Point,
    Circle,
    Sphere,
    Cone,
    Box,
}

/// # Responsibility
/// Defines the color gradient for particle lifecycle.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ColorGradient {
    pub start_color: [f32; 4], // RGBA
    pub end_color: [f32; 4],   // RGBA
}

/// # Responsibility
/// Configuration for a particle system (emitter parameters).
///
/// ---
///
/// This is loaded from configuration files and used by ParticleEnginePoolManager
/// to spawn particle systems with specific visual characteristics.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ParticleSystemConfig {
    pub id: String,
    pub max_particles: u32,
    pub emission_rate: f32, // particles per second
    pub lifetime: f32,      // seconds
    pub emission_shape: EmissionShape,
    pub initial_velocity: Vector3,
    pub velocity_variance: Vector3,
    pub gravity: Vector3,
    pub size_start: f32,
    pub size_end: f32,
    pub color_gradient: ColorGradient,
    pub blend_mode: ParticleBlendMode,
    pub texture_path: String,
}

/// # Responsibility
/// Represents a single optimized particle for simulation.
///
/// ---
///
/// This is the runtime representation used by compute shaders and the
/// ParticleEnginePoolManager. Layout is optimized for GPU upload (aligned fields).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OptimizedParticle {
    pub position: Vector3,
    pub velocity: Vector3,
    pub color: [f32; 4], // RGBA
    pub size: f32,
    pub lifetime: f32,
    pub age: f32,
    pub is_alive: bool,
}

impl Default for OptimizedParticle {
    fn default() -> Self {
        Self {
            position: Vector3::ZERO,
            velocity: Vector3::ZERO,
            color: [1.0, 1.0, 1.0, 1.0],
            size: 1.0,
            lifetime: 1.0,
            age: 0.0,
            is_alive: false,
        }
    }
}

/// # Responsibility
/// Defines particle behavior types for different game systems.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ParticleBehavior {
    QualiaEnergy,      // Collectable Qualia particles
    BossAttack,        // Boss projectile particles
    PlayerAbility,     // Player skill effect particles
    Environmental,     // Ambient visual particles
    ComboEffect,       // Combo activation particles
}

/// # Responsibility
/// Complete particle system state for network serialization.
///
/// ---
///
/// This is sent from backend to frontend for authoritative particle state
/// (used when particle simulation is server-authoritative).
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ParticleSystemState {
    pub system_id: String,
    pub behavior: ParticleBehavior,
    pub active_particles: Vec<OptimizedParticle>,
    pub is_active: bool,
}
