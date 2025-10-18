//! # Responsibility
//! Game logic configuration structure.
//!
//! ---
//!
//! Defines tunable parameters for gameplay mechanics.

use serde::Deserialize;

/// # Responsibility
/// Configuration for game logic calculations.
///
/// ---
///
/// Controls multipliers, decay rates, and thresholds for qualia calculations.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameLogicConfig {
    /// Base multiplier for intensity calculations
    pub base_intensity_multiplier: f32,
    
    /// Rate at which harmony decays per second
    pub harmony_decay_rate: f32,
    
    /// Threshold for chaos activation (0.0-1.0)
    pub chaos_threshold: f32,
    
    /// Multiplier applied to combo bonuses
    pub combo_multiplier: f32,
    
    /// Minimum accuracy required for combo continuation (0.0-1.0)
    pub min_combo_accuracy: f32,
    
    /// Maximum combo count before cap
    pub max_combo_count: u32,
}

impl Default for GameLogicConfig {
    fn default() -> Self {
        Self {
            base_intensity_multiplier: 1.5,
            harmony_decay_rate: 0.1,
            chaos_threshold: 0.7,
            combo_multiplier: 1.2,
            min_combo_accuracy: 0.7,
            max_combo_count: 100,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = GameLogicConfig::default();
        assert_eq!(config.base_intensity_multiplier, 1.5);
        assert_eq!(config.harmony_decay_rate, 0.1);
        assert_eq!(config.chaos_threshold, 0.7);
    }

    #[test]
    fn test_deserialize_from_yaml() {
        let yaml = r"
baseIntensityMultiplier: 2.0
harmonyDecayRate: 0.2
chaosThreshold: 0.8
comboMultiplier: 1.5
minComboAccuracy: 0.75
maxComboCount: 150
";
        let config: GameLogicConfig = serde_yaml::from_str(yaml).expect("Test should not panic");
        assert_eq!(config.base_intensity_multiplier, 2.0);
        assert_eq!(config.harmony_decay_rate, 0.2);
        assert_eq!(config.chaos_threshold, 0.8);
        assert_eq!(config.combo_multiplier, 1.5);
        assert_eq!(config.min_combo_accuracy, 0.75);
        assert_eq!(config.max_combo_count, 150);
    }
}
