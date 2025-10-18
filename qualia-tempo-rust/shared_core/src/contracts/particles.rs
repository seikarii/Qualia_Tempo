//! # Responsibility
//! Defines particle system configuration and particle data structures.
//!
//! ---
//!
//! This module contains structs for the particle engine used by the backend
//! worker pool to calculate particle trajectories and effects. Optimized for
//! performance with minimal heap allocations.

use crate::utils::Vec2;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Defines the configuration for a particle system.
///
/// ---
///
/// Loaded from configuration files at startup. Defines emission rules,
/// visual properties, and physical behavior of particle systems.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ParticleSystemConfig {
    /// System identifier
    pub id: String,
    /// Maximum number of particles in this system
    pub max_particles: u32,
    /// Emission rate (particles per second)
    pub emission_rate: f32,
    /// Particle lifetime in seconds
    pub lifetime: f32,
    /// Particle lifetime variance (randomness)
    pub lifetime_variance: f32,
    /// Initial velocity
    pub initial_velocity: Vec2,
    /// Velocity variance
    pub velocity_variance: Vec2,
    /// Acceleration (e.g., gravity)
    pub acceleration: Vec2,
    /// Initial particle size
    pub size: f32,
    /// Size variance
    pub size_variance: f32,
    /// Color (RGBA format)
    pub color: [f32; 4],
    /// Whether particles respond to Qualia state
    pub is_qualia_reactive: bool,
}

/// # Responsibility
/// Represents a single optimized particle for efficient computation.
///
/// ---
///
/// This struct uses primitive types exclusively to maximize cache efficiency
/// in the backend's particle engine. No heap allocations, no Arc/Box.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OptimizedParticle {
    /// Particle position
    pub position: Vec2,
    /// Particle velocity
    pub velocity: Vec2,
    /// Particle acceleration
    pub acceleration: Vec2,
    /// Current lifetime remaining (seconds)
    pub lifetime: f32,
    /// Maximum lifetime for interpolation
    pub max_lifetime: f32,
    /// Current size
    pub size: f32,
    /// Color (RGBA format)
    pub color: [f32; 4],
    /// Is this particle slot active?
    pub is_active: bool,
}

impl Default for OptimizedParticle {
    fn default() -> Self {
        Self {
            position: Vec2::ZERO,
            velocity: Vec2::ZERO,
            acceleration: Vec2::ZERO,
            lifetime: 0.0,
            max_lifetime: 1.0,
            size: 1.0,
            color: [1.0, 1.0, 1.0, 1.0],
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
            id: "test_particles".to_string(),
            max_particles: 1000,
            emission_rate: 50.0,
            lifetime: 2.0,
            lifetime_variance: 0.5,
            initial_velocity: Vec2::new(0.0, 100.0),
            velocity_variance: Vec2::new(10.0, 10.0),
            acceleration: Vec2::new(0.0, -9.8),
            size: 1.0,
            size_variance: 0.2,
            color: [1.0, 0.5, 0.0, 1.0],
            is_qualia_reactive: true,
        };

        let json = serde_json::to_string(&config).unwrap(); // Failed to serialize");
        let deserialized: ParticleSystemConfig = serde_json::from_str(&json).unwrap(); // Failed to deserialize");

        assert_eq!(config, deserialized);
    }

    #[test]
    fn test_optimized_particle_default() {
        let particle = OptimizedParticle::default();
        assert!(!particle.is_active);
        assert_eq!(particle.lifetime, 0.0);
    }

    #[test]
    fn test_optimized_particle_serialization() {
        let particle = OptimizedParticle {
            position: Vec2::new(100.0, 200.0),
            velocity: Vec2::new(10.0, 20.0),
            acceleration: Vec2::new(0.0, -9.8),
            lifetime: 1.5,
            max_lifetime: 2.0,
            size: 5.0,
            color: [1.0, 0.0, 0.0, 1.0],
            is_active: true,
        };

        let json = serde_json::to_string(&particle).unwrap(); // Failed to serialize");
        let deserialized: OptimizedParticle = serde_json::from_str(&json).unwrap(); // Failed to deserialize");

        assert_eq!(particle, deserialized);
    }
}
