//! # Responsibility
//! Configuration for the particle engine system.
//!
//! ---
//!
//! Defines ParticleEngineConfig which controls particle simulation parameters.
//! Loaded from YAML config at startup.

use serde::Deserialize;

/// # Responsibility
/// Configuration for particle physics simulation.
///
/// ---
///
/// Controls max particle count, physics constants, and performance parameters.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ParticleEngineConfig {
    /// Maximum number of active particles (memory budget)
    pub max_particles: u32,

    /// Velocity damping factor (0.0-1.0)
    pub damping: f32,

    /// Gravity acceleration (units/sec²)
    pub gravity_y: f32,

    /// Enable spawn_blocking for particle updates
    pub use_blocking_compute: bool,

    /// Particle lifetime in seconds
    pub default_lifetime: f32,
}

impl Default for ParticleEngineConfig {
    fn default() -> Self {
        Self {
            max_particles: 10_000,
            damping: 0.98,
            gravity_y: -9.8,
            use_blocking_compute: false, // Disabled after profiling (ARCHITECTURE.RUST §3.2 compliance)
            default_lifetime: 2.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_particle_engine_config_defaults() {
        let config = ParticleEngineConfig::default();

        assert_eq!(config.max_particles, 10_000);
        assert_eq!(config.damping, 0.98);
        assert_eq!(config.gravity_y, -9.8);
        assert!(!config.use_blocking_compute);
        assert_eq!(config.default_lifetime, 2.0);
    }

    #[test]
    fn test_particle_engine_config_deserialize() {
        let yaml = r#"
max_particles: 5000
damping: 0.95
gravity_y: -10.0
use_blocking_compute: true
default_lifetime: 3.0
"#;

        let config: ParticleEngineConfig = serde_yaml::from_str(yaml).expect("Test should not panic");

        assert_eq!(config.max_particles, 5000);
        assert_eq!(config.damping, 0.95);
        assert_eq!(config.gravity_y, -10.0);
        assert!(config.use_blocking_compute);
        assert_eq!(config.default_lifetime, 3.0);
    }
}
