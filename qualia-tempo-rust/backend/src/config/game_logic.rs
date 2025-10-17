//! # Responsibility
//! Game logic configuration structure.

use serde::Deserialize;

/// # Responsibility
/// Configuration for game logic calculations (qualia, combat).
///
/// ---
///
/// Defines tuning parameters for gameplay mechanics.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameLogicConfig {
    /// Multiplier for intensity calculations (0.0 - 2.0)
    pub intensity_multiplier: f32,
    
    /// Decay rate for harmony per second (0.0 - 1.0)
    pub harmony_decay_rate: f32,
    
    /// Chaos growth rate per second (0.0 - 1.0)
    pub chaos_growth_rate: f32,
    
    /// Kairos threshold for perfect timing (ms)
    pub kairos_threshold_ms: u64,
    
    /// Base combo multiplier
    pub base_combo_multiplier: f32,
}

impl Default for GameLogicConfig {
    fn default() -> Self {
        Self {
            intensity_multiplier: 1.0,
            harmony_decay_rate: 0.05,
            chaos_growth_rate: 0.02,
            kairos_threshold_ms: 50,
            base_combo_multiplier: 1.5,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = GameLogicConfig::default();
        assert_eq!(config.intensity_multiplier, 1.0);
        assert_eq!(config.kairos_threshold_ms, 50);
    }

    #[test]
    fn test_deserialize_from_yaml() {
        let yaml = r#"
intensityMultiplier: 1.5
harmonyDecayRate: 0.1
chaosGrowthRate: 0.03
kairosThresholdMs: 100
baseComboMultiplier: 2.0
"#;
        let config: GameLogicConfig = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(config.intensity_multiplier, 1.5);
        assert_eq!(config.harmony_decay_rate, 0.1);
        assert_eq!(config.chaos_growth_rate, 0.03);
        assert_eq!(config.kairos_threshold_ms, 100);
        assert_eq!(config.base_combo_multiplier, 2.0);
    }
}
