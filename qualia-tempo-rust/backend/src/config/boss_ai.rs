//! # Responsibility
//! Configuration for BossAIService behavior.

use serde::Deserialize;

/// # Responsibility
/// Defines configurable parameters for boss AI behavior.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BossAIConfig {
    /// Multiplier for aggression based on player intensity (default: 1.5)
    pub aggression_multiplier: f32,

    /// Threshold above which boss will attack (default: 0.6)
    pub attack_threshold: f32,

    /// Minimum time between attacks in seconds (default: 2.0)
    pub attack_cooldown_sec: f64,

    /// Phase transition health thresholds (default: [0.75, 0.5, 0.25])
    pub phase_thresholds: Vec<f32>,
}

impl Default for BossAIConfig {
    fn default() -> Self {
        Self {
            aggression_multiplier: 1.5,
            attack_threshold: 0.6,
            attack_cooldown_sec: 2.0,
            phase_thresholds: vec![0.75, 0.5, 0.25],
        }
    }
}
