//! # Responsibility
//! Boss AI service configuration.

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Configuration for Boss AI behavior and difficulty scaling.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BossAIConfig {
    /// Base aggression level (0.0-1.0)
    pub base_aggression: f32,
    
    /// Aggression increase per combo point
    pub aggression_per_combo: f32,
    
    /// Attack telegraph duration in seconds
    pub telegraph_duration_sec: f64,
    
    /// Chaos aggression multiplier
    pub chaos_aggression_multiplier: f32,
    
    /// Intensity aggression multiplier
    pub intensity_aggression_multiplier: f32,
}

impl Default for BossAIConfig {
    fn default() -> Self {
        Self {
            base_aggression: 0.3,
            aggression_per_combo: 0.01,
            telegraph_duration_sec: 1.0,
            chaos_aggression_multiplier: 0.5,
            intensity_aggression_multiplier: 0.3,
        }
    }
}
