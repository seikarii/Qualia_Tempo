//! # Responsibility
//! Defines particle system contracts.
//!
//! ---
//!
//! Contains particle configuration and optimized particle state structures.

use crate::utils::{Vec2, Vec3};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Configuration for a particle system instance.
///
/// ---
///
/// Loaded from configuration files, defines visual behavior.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ParticleSystemConfig {
    pub id: String,
    pub max_particles: u32,
    pub emission_rate: f32, // particles per second
    pub lifetime_min: f32, // seconds
    pub lifetime_max: f32,
    pub velocity_min: Vec2,
    pub velocity_max: Vec2,
    pub color_start: Vec3, // RGB 0.0-1.0
    pub color_end: Vec3,
    pub size_start: f32,
    pub size_end: f32,
    pub texture_id: Option<String>,
}

/// # Responsibility
/// Represents a single particle's state in an optimized format.
///
/// ---
///
/// Used by ParticleEngine for batch updates and rendering.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OptimizedParticle {
    pub position: Vec2,
    pub velocity: Vec2,
    pub color: Vec3,
    pub size: f32,
    pub lifetime_remaining: f32,
    pub is_active: bool,
}

impl Default for OptimizedParticle {
    fn default() -> Self {
        Self {
            position: Vec2::ZERO,
            velocity: Vec2::ZERO,
            color: Vec3::ONE,
            size: 1.0,
            lifetime_remaining: 0.0,
            is_active: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_particle_system_config_serialization() {
        let config = ParticleSystemConfig {
            id: "qualia_particles".to_string(),
            max_particles: 10000,
            emission_rate: 100.0,
            lifetime_min: 0.5,
            lifetime_max: 2.0,
            velocity_min: Vec2::new(-5.0, -5.0),
            velocity_max: Vec2::new(5.0, 5.0),
            color_start: Vec3::new(1.0, 0.0, 0.5),
            color_end: Vec3::new(0.0, 0.5, 1.0),
            size_start: 5.0,
            size_end: 0.5,
            texture_id: Some("glow_particle.png".to_string()),
        };

        let json = serde_json::to_string(&config).unwrap();
        let deserialized: ParticleSystemConfig = serde_json::from_str(&json).unwrap();

        assert_eq!(config, deserialized);
    }

    #[test]
    fn test_optimized_particle_default() {
        let particle = OptimizedParticle::default();
        assert!(!particle.is_active);
        assert_eq!(particle.lifetime_remaining, 0.0);
    }

    #[test]
    fn test_optimized_particle_serialization() {
        let particle = OptimizedParticle {
            position: Vec2::new(10.0, 20.0),
            velocity: Vec2::new(1.0, -1.0),
            color: Vec3::new(0.8, 0.2, 0.5),
            size: 3.5,
            lifetime_remaining: 1.2,
            is_active: true,
        };

        let json = serde_json::to_string(&particle).unwrap();
        let deserialized: OptimizedParticle = serde_json::from_str(&json).unwrap();

        assert_eq!(particle, deserialized);
    }
}
