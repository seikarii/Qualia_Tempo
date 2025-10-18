//! # Responsibility
//! Defines configuration for `GameLogicService`.
//!
//! ---
//!
//! This configuration is loaded from YAML at startup and injected into
//! `GameLogicService` via Shaku dependency injection.

use serde::Deserialize;

/// # Responsibility
/// Configuration parameters for game logic calculations.
///
/// ---
///
/// Values control intensity calculation, decay rates, combo multipliers, etc.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameLogicConfig {
    /// Base multiplier for intensity calculation from accuracy (default: 1.0)
    pub base_intensity_multiplier: f32,

    /// Rate at which harmony decays per second (default: 0.1)
    pub harmony_decay_rate: f32,

    /// Threshold above which chaos triggers penalties (default: 0.5)
    pub chaos_threshold: f32,

    /// Multiplier applied to score when combo is active (default: 1.5)
    pub combo_multiplier: f32,

    /// Number of consecutive hits required to start a combo (default: 5)
    pub combo_threshold: u32,

    /// Maximum combo value before cap (default: 100)
    pub max_combo: u32,
}

impl Default for GameLogicConfig {
    fn default() -> Self {
        Self {
            base_intensity_multiplier: 1.0,
            harmony_decay_rate: 0.1,
            chaos_threshold: 0.5,
            combo_multiplier: 1.5,
            combo_threshold: 5,
            max_combo: 100,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = GameLogicConfig::default();
        assert_eq!(config.base_intensity_multiplier, 1.0);
        assert_eq!(config.combo_threshold, 5);
    }

    #[test]
    fn test_deserialization() {
        let yaml = r#"
baseIntensityMultiplier: 1.2
harmonyDecayRate: 0.15
chaosThreshold: 0.6
comboMultiplier: 2.0
comboThreshold: 3
maxCombo: 150
        "#;

        let config: GameLogicConfig = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(config.base_intensity_multiplier, 1.2);
        assert_eq!(config.combo_threshold, 3);
    }
}
