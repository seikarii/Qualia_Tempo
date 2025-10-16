//! # Responsibility
//! Game logic service configuration.

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Configuration for game logic calculations and parameters.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameLogicConfig {
    /// Qualia intensity multiplier
    pub intensity_multiplier: f32,
    
    /// Harmony decay rate per second
    pub harmony_decay_rate: f32,
    
    /// Chaos accumulation rate
    pub chaos_accumulation_rate: f32,
}

impl Default for GameLogicConfig {
    fn default() -> Self {
        Self {
            intensity_multiplier: 1.0,
            harmony_decay_rate: 0.05,
            chaos_accumulation_rate: 0.1,
        }
    }
}
